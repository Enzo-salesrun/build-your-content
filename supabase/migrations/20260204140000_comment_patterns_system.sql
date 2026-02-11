-- Migration: Comment Patterns System
-- Système de patterns diversifiés pour les commentaires automatiques
-- Objectif : rendre les commentaires indétectables comme étant générés par IA

-- ============================================
-- 1. Table des patterns de commentaires
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_patterns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('questions', 'experience', 'emotions', 'valeur', 'social')),
  personality TEXT NOT NULL,
  tone TEXT NOT NULL,
  length_min INTEGER NOT NULL DEFAULT 20,
  length_max INTEGER NOT NULL DEFAULT 80,
  asks_question BOOLEAN NOT NULL DEFAULT false,
  prompt_instructions TEXT NOT NULL,
  examples TEXT[] NOT NULL DEFAULT '{}',
  weight INTEGER NOT NULL DEFAULT 10, -- Pondération pour la sélection (1-100)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Ajouter le tracking dans engagement_logs
-- ============================================
ALTER TABLE public.engagement_logs 
ADD COLUMN IF NOT EXISTS comment_pattern_id INTEGER REFERENCES public.comment_patterns(id);

-- Index pour les requêtes de rotation
CREATE INDEX IF NOT EXISTS idx_engagement_logs_pattern ON public.engagement_logs(comment_pattern_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_engager_created ON public.engagement_logs(engager_profile_id, created_at DESC);

-- Index pour la table comment_patterns
CREATE INDEX IF NOT EXISTS idx_comment_patterns_active ON public.comment_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_comment_patterns_category ON public.comment_patterns(category);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_comment_patterns_updated_at ON public.comment_patterns;
CREATE TRIGGER update_comment_patterns_updated_at
  BEFORE UPDATE ON public.comment_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. RLS Policies
-- ============================================
ALTER TABLE public.comment_patterns ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access comment_patterns" ON public.comment_patterns
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can read patterns (needed for debugging/admin)
CREATE POLICY "Authenticated users can read patterns" ON public.comment_patterns
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 4. Fonction pour sélectionner un pattern avec rotation
-- ============================================
CREATE OR REPLACE FUNCTION select_comment_pattern(
  p_engager_profile_id UUID,
  p_exclude_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  pattern_id INTEGER,
  pattern_name TEXT,
  prompt_instructions TEXT,
  length_min INTEGER,
  length_max INTEGER,
  asks_question BOOLEAN,
  examples TEXT[]
) AS $$
DECLARE
  recent_patterns INTEGER[];
BEGIN
  -- Récupérer les N derniers patterns utilisés par ce profil
  SELECT ARRAY_AGG(el.comment_pattern_id)
  INTO recent_patterns
  FROM (
    SELECT DISTINCT comment_pattern_id
    FROM public.engagement_logs
    WHERE engager_profile_id = p_engager_profile_id
      AND comment_pattern_id IS NOT NULL
      AND comment_success = true
    ORDER BY created_at DESC
    LIMIT p_exclude_count
  ) el;

  -- Si pas assez de patterns disponibles après exclusion, réduire l'exclusion
  IF (SELECT COUNT(*) FROM public.comment_patterns WHERE is_active = true) - COALESCE(array_length(recent_patterns, 1), 0) < 5 THEN
    recent_patterns := '{}';
  END IF;

  -- Sélectionner un pattern aléatoire pondéré, excluant les récents
  RETURN QUERY
  SELECT 
    cp.id as pattern_id,
    cp.name as pattern_name,
    cp.prompt_instructions,
    cp.length_min,
    cp.length_max,
    cp.asks_question,
    cp.examples
  FROM public.comment_patterns cp
  WHERE cp.is_active = true
    AND (recent_patterns IS NULL OR NOT (cp.id = ANY(recent_patterns)))
  ORDER BY random() * cp.weight DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. SEED DATA : Les 30 patterns
-- ============================================

-- CATÉGORIE 1 : QUESTIONS (6 patterns)
INSERT INTO public.comment_patterns (name, category, personality, tone, length_min, length_max, asks_question, weight, prompt_instructions, examples) VALUES
(
  'question_courte_naive',
  'questions',
  'Curieux, un peu naïf, direct',
  'conversationnel',
  15, 40,
  true,
  12,
  'Pose une question très courte et simple, comme si tu découvrais le sujet. Pas de formule de politesse. Juste la question brute. Ton curieux, presque enfantin. Maximum 40 caractères.',
  ARRAY['Et ça marche aussi pour les petites boîtes ?', 'Tu as mis combien de temps à t''en rendre compte ?', 'C''est quoi le piège du coup ?', 'Ça vient d''où cette stat ?', 'Y a des contre-exemples ?']
),
(
  'question_experience_perso',
  'questions',
  'Intrigué, veut comparer à sa propre expérience',
  'réfléchi',
  40, 80,
  true,
  10,
  'Pose une question en la reliant à ta propre situation. Commence par mentionner brièvement ton contexte avant de poser la question.',
  ARRAY['Dans mon secteur c''est un peu différent, tu penses que ça s''applique aussi au B2B ?', 'J''ai vécu l''inverse en fait. C''était peut-être lié au timing, t''en penses quoi ?', 'On a testé un truc similaire l''an dernier. Le ROI était comment de ton côté ?']
),
(
  'question_approfondissement',
  'questions',
  'Analytique, veut creuser un point précis',
  'intellectuel',
  50, 100,
  true,
  8,
  'Identifie un point spécifique du post et demande plus de détails dessus. Montre que tu as vraiment lu en réagissant à un élément précis.',
  ARRAY['Le passage sur ce sujet m''interpelle. Tu pourrais développer ? J''ai du mal à voir comment l''appliquer concrètement.', 'Intéressant ton point. Tu fais comment pour mesurer ça exactement ?']
),
(
  'question_rhetorique_douce',
  'questions',
  'Réfléchi, pousse à la réflexion sans confronter',
  'philosophique',
  40, 70,
  true,
  7,
  'Pose une question qui fait réfléchir, sans remettre en cause le post. La question doit ouvrir une nouvelle perspective, pas critiquer.',
  ARRAY['Et si le vrai problème c''était pas ça mais plutôt notre façon de le mesurer ?', 'Je me demande si ça marcherait dans un contexte différent...', 'La vraie question c''est peut-être : est-ce qu''on veut vraiment ça ?']
),
(
  'question_pratique',
  'questions',
  'Pragmatique, orienté action',
  'direct',
  30, 60,
  true,
  12,
  'Pose une question très pratique, orientée comment faire. Tu veux des conseils actionnables, pas de la théorie.',
  ARRAY['Tu commences par quoi concrètement le lundi matin ?', 'Y a un outil que tu recommandes pour ça ?', 'Ça prend combien de temps à mettre en place réalistement ?']
),
(
  'question_clarification',
  'questions',
  'Humble, veut être sûr d''avoir compris',
  'humble',
  25, 50,
  true,
  10,
  'Demande une clarification simple, comme si tu voulais être sûr d''avoir bien compris. Ton humble et sincère.',
  ARRAY['Attends, tu veux dire que c''est vraiment comme ça ?', 'Je comprends bien ou j''ai loupé un truc ?', 'C''est valable même dans ce cas ?']
);

-- CATÉGORIE 2 : EXPÉRIENCE (6 patterns)
INSERT INTO public.comment_patterns (name, category, personality, tone, length_min, length_max, asks_question, weight, prompt_instructions, examples) VALUES
(
  'experience_similaire_courte',
  'experience',
  'Connecté, veut montrer qu''il comprend',
  'complice',
  30, 60,
  false,
  12,
  'Partage une expérience très brève qui fait écho au post. Maximum une phrase. Pas de leçon, juste le partage.',
  ARRAY['Vécu exactement ça le mois dernier. Dur sur le moment.', 'Ah tiens, on a eu le même déclic avec mon équipe en janvier.', 'Ça me rappelle mon premier client, même erreur.']
),
(
  'experience_contraste',
  'experience',
  'Nuancé, apporte un autre angle sans contredire',
  'nuancé',
  60, 100,
  false,
  8,
  'Partage une expérience légèrement différente pour nuancer. Pas de contradiction, juste chez moi c''était un peu différent.',
  ARRAY['Intéressant. De mon côté j''ai plutôt observé autre chose. Peut-être une question de contexte.', 'Marrant, j''aurais dit l''inverse avant de tester. Au final tu as raison.', 'Mon expérience est un peu différente mais le fond reste vrai.']
),
(
  'experience_apprentissage',
  'experience',
  'Humble, partage ce qu''il a appris',
  'humble',
  50, 90,
  false,
  10,
  'Partage un apprentissage personnel lié au sujet. Ton humble, comme si tu avais fait l''erreur toi-même avant.',
  ARRAY['J''ai mis du temps à comprendre ça. Maintenant c''est devenu un réflexe.', 'Si j''avais lu ça y a 2 ans, j''aurais évité quelques galères.', 'Le déclic est venu quand j''ai arrêté de faire autrement. Ça a tout changé.']
),
(
  'experience_anecdote',
  'experience',
  'Narratif, aime raconter',
  'storytelling',
  80, 150,
  false,
  6,
  'Raconte une mini-anecdote concrète liée au sujet. Avec un peu de contexte, des détails qui rendent ça vivant.',
  ARRAY['Ça me rappelle un échange avec un client l''an dernier. Il m''a dit un truc qui m''a marqué. J''ai compris à ce moment-là.', 'Mon ancien boss avait cette phrase. Sur le moment je trouvais ça bateau, avec le recul c''était juste.']
),
(
  'experience_echec',
  'experience',
  'Vulnérable, partage un échec',
  'authentique',
  50, 100,
  false,
  8,
  'Partage brièvement un échec ou une erreur en lien avec le sujet. Ton honnête, pas de fausse modestie.',
  ARRAY['J''ai fait l''erreur inverse pendant des mois. Cher payé mais leçon retenue.', 'Ah si j''avais su ça avant de me planter sur ce projet...', 'Classique. J''y suis passé aussi. Pas ma plus grande fierté.']
),
(
  'experience_confirmation',
  'experience',
  'Validant, confirme par l''expérience',
  'affirmatif',
  40, 70,
  false,
  12,
  'Confirme le propos du post par ton expérience, sans être dans l''excès. Simple validation basée sur du vécu.',
  ARRAY['Je confirme, testé et approuvé. Les résultats sont là.', 'Exactement. On fait pareil depuis 6 mois et ça change tout.', 'C''est ce qu''on observe chez nos clients aussi.']
);

-- CATÉGORIE 3 : ÉMOTIONS (6 patterns)
INSERT INTO public.comment_patterns (name, category, personality, tone, length_min, length_max, asks_question, weight, prompt_instructions, examples) VALUES
(
  'reaction_enthousiaste',
  'emotions',
  'Énergique, vraiment touché par le post',
  'enthousiaste',
  20, 50,
  false,
  10,
  'Réagis avec enthousiasme sincère à un point précis. Pas de Super post!, mais une réaction à quelque chose de spécifique.',
  ARRAY['Le passage sur ce sujet m''a fait tilter. Tellement vrai.', 'Enfin quelqu''un qui le dit clairement.', 'Ça fait du bien de lire ça.']
),
(
  'reaction_surprise',
  'emotions',
  'Étonné, découvre quelque chose',
  'surpris',
  25, 50,
  false,
  10,
  'Exprime une surprise sincère face à une info ou un angle du post. Comme si tu n''y avais jamais pensé sous cet angle.',
  ARRAY['Ah tiens, j''avais jamais vu ça sous cet angle.', 'Étonnant. Je pensais que c''était l''inverse en fait.', 'Wow, ça m''a scotché.']
),
(
  'reaction_identification',
  'emotions',
  'Connecté émotionnellement, se reconnaît',
  'personnel',
  30, 60,
  false,
  10,
  'Exprime que tu te reconnais dans ce qui est dit. Sentiment d''identification, de moi aussi.',
  ARRAY['Je me suis tellement reconnu dans ce que tu décris.', 'On dirait que tu as écrit ça pour moi.', 'Ça résonne fort. Pile ce que je vis en ce moment.']
),
(
  'reaction_humour_leger',
  'emotions',
  'Décontracté, touche d''humour',
  'léger',
  20, 45,
  false,
  8,
  'Ajoute une touche d''humour léger et bienveillant. Pas de blague lourde, juste un sourire dans le commentaire.',
  ARRAY['Je vais imprimer ça et l''afficher au bureau.', 'Mon moi d''il y a 5 ans aurait eu besoin de lire ça.', 'Prends mon like, tu l''as mérité.']
),
(
  'reaction_gratitude',
  'emotions',
  'Reconnaissant, remercie sincèrement',
  'reconnaissant',
  25, 50,
  false,
  10,
  'Remercie pour quelque chose de spécifique, pas un merci générique. Explique brièvement pourquoi c''est utile pour toi.',
  ARRAY['Merci pour la clarté. Je cherchais exactement ça.', 'Ça tombe pile au bon moment, merci du partage.', 'Précieux. Je garde ça sous le coude.']
),
(
  'reaction_reflexion',
  'emotions',
  'Pensif, le post déclenche une réflexion',
  'introspectif',
  40, 70,
  false,
  8,
  'Montre que le post t''a fait réfléchir, sans conclure. Tu restes dans la réflexion, pas dans la certitude.',
  ARRAY['Ça me fait réfléchir à ma propre approche. Pas sûr d''être sur la bonne voie.', 'Intéressant. Je vais ruminer ça ce weekend.', 'Y a quelque chose là-dedans qui me travaille. Je sais pas encore quoi.']
);

-- CATÉGORIE 4 : VALEUR (6 patterns)
INSERT INTO public.comment_patterns (name, category, personality, tone, length_min, length_max, asks_question, weight, prompt_instructions, examples) VALUES
(
  'ajout_complement',
  'valeur',
  'Contributif, enrichit la discussion',
  'expert',
  60, 120,
  false,
  8,
  'Ajoute une information ou perspective complémentaire au post. Pas de contradiction, juste un et aussi...',
  ARRAY['J''ajouterais un point. Ça renforce ce que tu dis.', 'Dans la même veine, j''ai remarqué autre chose. Ça va dans ton sens.', 'Pour compléter, ça peut aider ceux qui débutent.']
),
(
  'ajout_ressource',
  'valeur',
  'Généreux, partage une ressource',
  'généreux',
  40, 80,
  false,
  6,
  'Suggère une ressource (livre, article, outil) en lien avec le sujet. De façon naturelle, pas commerciale.',
  ARRAY['Si le sujet t''intéresse, y a un bouquin qui creuse bien ça.', 'Ça rejoint ce que dit cet auteur dans son dernier article.', 'Pour ceux qui veulent aller plus loin, y a des ressources top là-dessus.']
),
(
  'ajout_nuance',
  'valeur',
  'Nuancé, apporte de la complexité',
  'nuancé',
  60, 100,
  false,
  7,
  'Apporte une nuance sans contredire. C''est vrai, et en même temps...',
  ARRAY['D''accord sur le fond. La nuance c''est que le contexte peut changer la donne.', 'Vrai dans la plupart des cas. Attention juste aux exceptions.', 'Je plussoie, avec un bémol. Mais le principe reste bon.']
),
(
  'ajout_exemple',
  'valeur',
  'Concret, illustre par l''exemple',
  'concret',
  50, 100,
  false,
  8,
  'Donne un exemple concret qui illustre le propos du post. Rends la théorie tangible.',
  ARRAY['Exemple concret : exactement ce que tu décris.', 'Je l''ai vu en action. Ils ont fait ça et ça a marché.', 'Un cas typique que je connais. Ça illustre bien ton point.']
),
(
  'ajout_mise_en_garde',
  'valeur',
  'Protecteur, prévient les erreurs',
  'bienveillant',
  50, 90,
  false,
  7,
  'Ajoute une mise en garde bienveillante, un piège à éviter. Ton de conseil amical, pas de leçon.',
  ARRAY['Un truc à surveiller quand même. J''y suis passé, c''est traître.', 'Attention juste à un point. C''est le seul endroit où ça peut coincer.', 'Petit conseil au passage. Ça évite les mauvaises surprises.']
),
(
  'ajout_action',
  'valeur',
  'Engagé, annonce une action',
  'déterminé',
  25, 50,
  false,
  10,
  'Annonce que tu vas mettre en pratique ce qui est dit. Engagement concret et immédiat.',
  ARRAY['Je teste ça dès lundi.', 'Noté. Je l''intègre dans ma routine cette semaine.', 'J''en parle à mon équipe demain.']
);

-- CATÉGORIE 5 : SOCIAL (6 patterns)
INSERT INTO public.comment_patterns (name, category, personality, tone, length_min, length_max, asks_question, weight, prompt_instructions, examples) VALUES
(
  'connexion_tag',
  'social',
  'Social, pense à quelqu''un d''autre',
  'social',
  30, 60,
  false,
  8,
  'Mentionne que ce post devrait être lu par d''autres. Pas de tag réel, juste l''intention de partager.',
  ARRAY['Je connais 3 personnes qui ont besoin de lire ça.', 'Je forwarde à mon équipe direct.', 'Pile le sujet qu''on abordait avec un collègue hier.']
),
(
  'connexion_communaute',
  'social',
  'Inclusif, parle au nom d''un groupe',
  'communautaire',
  40, 70,
  false,
  8,
  'Réagis en parlant au nom d''un groupe ou d''une communauté. Nous les...',
  ARRAY['Ça parle à tous ceux qui font ce métier je pense.', 'Classique dans notre domaine. On devrait en parler plus.', 'Beaucoup vont se reconnaître là-dedans.']
),
(
  'connexion_suite',
  'social',
  'Intéressé par la suite',
  'curieux',
  25, 50,
  false,
  8,
  'Exprime ton intérêt pour un prochain post ou une suite. Montre que tu veux en savoir plus.',
  ARRAY['Hâte de voir la suite sur ce sujet.', 'Tu comptes développer cet aspect ? Ça m''intéresse.', 'J''attends le prochain post avec impatience.']
),
(
  'connexion_debat',
  'social',
  'Engageant, ouvre le débat',
  'inclusif',
  50, 90,
  true,
  7,
  'Pose une question ouverte à la communauté, pas juste à l''auteur. Invite les autres lecteurs à réagir aussi.',
  ARRAY['Curieux de voir ce qu''en pensent les autres. Vous faites comment vous ?', 'Ça divise souvent ce sujet. Y a des avis contraires ici ?', 'Intéressé par les retours d''expérience des autres.']
),
(
  'connexion_encouragement',
  'social',
  'Supportif, encourage l''auteur',
  'encourageant',
  30, 60,
  false,
  10,
  'Encourage l''auteur à continuer, de façon sincère. Pas de flatterie vide, reconnaissance du travail.',
  ARRAY['Continue comme ça, c''est précieux ce que tu partages.', 'Tes posts sont toujours pertinents. Merci de prendre le temps.', 'Content de te lire, comme d''hab.']
),
(
  'connexion_authentique',
  'social',
  'Sincère, parle de sa vraie réaction',
  'authentique',
  40, 80,
  false,
  9,
  'Décris ta vraie réaction en lisant le post. Méta-commentaire sur comment tu as reçu le message.',
  ARRAY['J''ai dû relire deux fois. Ça fait réfléchir.', 'Premier post LinkedIn qui me fait réagir depuis longtemps.', 'Je scrollais vite, et là j''ai dû m''arrêter. Bien joué.']
);

-- ============================================
-- 6. Comments
-- ============================================
COMMENT ON TABLE public.comment_patterns IS 'Bibliothèque de 30 patterns pour générer des commentaires humains diversifiés';
COMMENT ON COLUMN public.comment_patterns.weight IS 'Pondération pour la sélection aléatoire (plus élevé = plus fréquent)';
COMMENT ON COLUMN public.comment_patterns.prompt_instructions IS 'Instructions pour l''IA pour générer un commentaire selon ce pattern';
COMMENT ON FUNCTION select_comment_pattern IS 'Sélectionne un pattern aléatoire avec rotation pour éviter les répétitions';
