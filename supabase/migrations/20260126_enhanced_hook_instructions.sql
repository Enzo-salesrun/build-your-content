-- Migration: Enhanced prompt_instruction for each hook_type with advanced copywriting techniques
-- Based on research: Alex Cattoni (69x engagement), PAS/AIDA formulas, Open Loop technique
-- These instructions guide the AI to generate higher-converting hooks

-- ============================================
-- 1. ANNOUNCEMENT
-- Technique: Pattern Interrupt + Emotion Marker
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Pattern Interrupt + Marqueur Émotionnel

PRINCIPE: Créer un effet d''annonce qui arrête le scroll immédiatement.

FORMULES QUI MARCHENT:
• "C''est officiel : [annonce]"
• "[Chiffre précis] jours/mois pour [résultat]. C''est fait."
• "On l''a fait. [Détail émotionnel]"
• "Merci [X]. [Réalisation]"

RÈGLES:
- Commence par le résultat, pas le contexte
- Un emoji MAX au début (🏆 🎉 ✨)
- Chiffre précis > "on a réussi"
- Émotion authentique, pas corporate

EXEMPLE TRANSFORMATION:
❌ "Nous sommes heureux d''annoncer que notre entreprise a atteint un nouveau jalon"
✅ "37M$ ARR. +2M$ en un mois. L''équipe est en larmes."'
WHERE name = 'announcement';

-- ============================================
-- 2. NUMBER_RESULT  
-- Technique: Specificity + Contrast
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Spécificité Extrême + Contraste

PRINCIPE: Les chiffres précis créent la crédibilité. Le contraste crée la tension.

FORMULES QUI MARCHENT:
• "[Chiffre précis] [métrique]. [Contexte court]."
• "De [X] à [Y] en [temps]. Sans [méthode commune]."
• "[Année]: [situation A]. [Année]: [situation B]."
• "[X]% de [groupe] font [chose]. Les [Y]% restants [résultat]."

RÈGLES:
- Chiffres EXACTS (73% > "environ 70%")
- Format $ ou € visible immédiatement
- Contraste temporel ou situationnel
- Max 2 données par hook

EXEMPLE TRANSFORMATION:
❌ "On a eu beaucoup de croissance cette année"
✅ "147 appels. 3 clients. 89k€. Le ratio exact de la prospection froide."'
WHERE name = 'number_result';

-- ============================================
-- 3. CURIOSITY_GAP
-- Technique: Open Loop (le cerveau DOIT fermer la boucle)
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Open Loop (Boucle Ouverte)

PRINCIPE: Créer un "gap" d''information que le cerveau DOIT combler pour se sentir complet.

FORMULES QUI MARCHENT:
• "Voici ce qu''ils ne te disent jamais sur [sujet]..."
• "Le jour où j''ai failli [catastrophe]. [Twist]."
• "J''ai découvert [chose contre-intuitive]. Et ça change tout."
• "Le [Nème] point m''a coûté [perte]. Puis [gain inattendu]."

RÈGLES:
- Promettre SANS révéler
- Utiliser "..." pour créer le suspense
- Mentionner une perte/risque pour amplifier
- Le lecteur doit se dire "je DOIS savoir"

EXEMPLE TRANSFORMATION:
❌ "Voici 5 conseils pour mieux prospecter"
✅ "Le 3ème conseil m''a fait perdre un client. Puis tripler mon CA."'
WHERE name = 'curiosity_gap';

-- ============================================
-- 4. CONTROVERSIAL_OPINION
-- Technique: Hot Take + Ego Challenge
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Hot Take + Challenge de l''Ego

PRINCIPE: Remettre en question une croyance commune. Le lecteur veut prouver qu''il a raison (ou découvrir s''il a tort).

FORMULES QUI MARCHENT:
• "La plupart des [métier] confondent [X] et [Y]."
• "[Pratique commune] est une addiction dangereuse."
• "Opinion impopulaire : [statement provocant]"
• "Tu penses [croyance] ? Réfléchis encore."

RÈGLES:
- Attaquer l''IDÉE, pas la personne
- Être prêt à défendre la position
- Créer un débat, pas une insulte
- Cibler une croyance SPÉCIFIQUE au métier

EXEMPLE TRANSFORMATION:
❌ "Le cold calling ne marche plus"
✅ "Le cold calling n''est pas mort. C''est ton script qui l''est."'
WHERE name = 'controversial_opinion';

-- ============================================
-- 5. COUNTERINTUITIVE_CLAIM
-- Technique: Paradox + Mind Shift
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Paradoxe + Changement de Perspective

PRINCIPE: Affirmer le contraire de ce que le lecteur croit. Créer une dissonance cognitive qu''il veut résoudre.

FORMULES QUI MARCHENT:
• "Ne faites pas [X]. Faites [contraire de X]."
• "J''ai arrêté de [pratique commune]. Mes résultats ont explosé."
• "Le meilleur moyen de [objectif] ? Ne pas [action attendue]."
• "Moins de [ressource] = plus de [résultat]."

RÈGLES:
- L''affirmation doit CHOQUER légèrement
- Doit être VRAIE et défendable
- Inverser une croyance SPÉCIFIQUE au métier
- Court et percutant (< 15 mots)

EXEMPLE TRANSFORMATION:
❌ "Il faut travailler intelligemment, pas durement"
✅ "J''ai divisé mon temps de travail par 2. Mon CA a doublé."'
WHERE name = 'counterintuitive_claim';

-- ============================================
-- 6. QUESTION_HOOK
-- Technique: Rhetorical + Implied Answer
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Question Rhétorique + Réponse Implicite

PRINCIPE: Poser une question dont le lecteur VEUT connaître la réponse. La question doit impliquer qu''il y a une meilleure façon.

FORMULES QUI MARCHENT:
• "Pourquoi [résultat frustrant] alors que [effort] ?"
• "Et si [possibilité inattendue] ?"
• "Quelle est la vraie raison pour laquelle [problème] ?"
• "Comment [expert] fait [résultat] sans [méthode commune] ?"

RÈGLES:
- JAMAIS de question oui/non
- La question doit créer une tension
- Impliquer qu''il y a un secret à découvrir
- Cibler une frustration SPÉCIFIQUE

EXEMPLE TRANSFORMATION:
❌ "Avez-vous du mal à prospecter ?"
✅ "Pourquoi certains closent en 2 appels ce qui t''en prend 10 ?"'
WHERE name = 'question_hook';

-- ============================================
-- 7. TEASER
-- Technique: Anticipation Builder
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Construction d''Anticipation

PRINCIPE: Annoncer du contenu à venir en créant une attente irrésistible.

FORMULES QUI MARCHENT:
• "[Durée] à [action]. Voici ce que j''ai appris."
• "Le pari fou continue. [Teaser du contenu]"
• "Thread : [promesse de valeur spécifique]"
• "Je vous explique [sujet complexe] en [format simple]"

RÈGLES:
- Promettre une VALEUR claire
- Utiliser ⤵️ 👇 pour diriger l''attention
- Créer l''urgence sans être clickbait
- Le contenu doit TENIR la promesse

EXEMPLE TRANSFORMATION:
❌ "Nouvelle vidéo sur la prospection"
✅ "147 refus avant mon premier oui. La vidéo complète ⤵️"'
WHERE name = 'teaser';

-- ============================================
-- 8. PAIN_POINT
-- Technique: PAS (Problem-Agitate-Solution) - Focus Problem
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: PAS - Phase Problem + Agitate

PRINCIPE: Identifier une douleur SPÉCIFIQUE et l''amplifier juste assez pour que le lecteur se sente compris.

FORMULES QUI MARCHENT:
• "[Problème spécifique]. (C''est pas normal)."
• "Le marché est [état]. Les leads [problème]. Et pourtant..."
• "Chaque [fréquence], tu [action douloureuse]. Stop."
• "[Frustration commune] ? Tu n''es pas seul."

RÈGLES:
- Décrire la douleur avec des MOTS DU MÉTIER
- Montrer qu''on COMPREND, pas qu''on juge
- Agiter légèrement, pas culpabiliser
- Toujours finir sur une note d''espoir implicite

EXEMPLE TRANSFORMATION:
❌ "La prospection est difficile"
✅ "50 appels. 47 raccroché au nez. 3 peut-être. 0 rdv. Chaque. Jour. (C''est pas toi le problème)"'
WHERE name = 'pain_point';

-- ============================================
-- 9. CONFESSION
-- Technique: Vulnerability + Relatability
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Vulnérabilité Stratégique

PRINCIPE: Partager un échec ou une erreur pour créer une connexion authentique. La vulnérabilité = confiance.

FORMULES QUI MARCHENT:
• "Pendant [durée], j''ai [erreur]. (Peu osent l''avouer)"
• "[Erreur] était ma plus grosse faute. Voici ce que j''aurais dû faire."
• "J''ai [X] ans. [Réussite apparente]. Mais [vérité cachée]."
• "J''ai changé d''avis sur [croyance]. Voici pourquoi."

RÈGLES:
- L''erreur doit être RÉELLE et spécifique
- Montrer la leçon apprise
- Pas de fausse modestie ("j''ai trop bien réussi")
- Le lecteur doit pouvoir s''identifier

EXEMPLE TRANSFORMATION:
❌ "J''ai fait des erreurs au début de ma carrière"
✅ "4 ans à facturer au temps passé. J''ai calculé : 340k€ laissés sur la table."'
WHERE name = 'confession';

-- ============================================
-- 10. QUOTE_AUTHORITY
-- Technique: Social Proof + Borrowed Credibility
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Preuve Sociale + Crédibilité Empruntée

PRINCIPE: Utiliser une citation ou référence d''autorité pour établir la crédibilité immédiatement.

FORMULES QUI MARCHENT:
• "[Nom connu] disait : [citation]. Il avait raison."
• "Selon [source crédible] : [stat/insight]. Et pourtant..."
• "Le [rôle] de [entreprise connue] m''a dit [insight]"
• "[Expert] a [réalisation]. Sa règle #1 : [conseil]"

RÈGLES:
- La source DOIT être reconnue par l''audience
- Ajouter ton propre angle après la citation
- Pas de citations bateau ("le succès c''est...")
- Lier à une application concrète

EXEMPLE TRANSFORMATION:
❌ "Comme disait Steve Jobs, il faut innover"
✅ "Bezos refuse les PowerPoints. Uniquement des mémos de 6 pages. J''ai testé avec mon équipe."'
WHERE name = 'quote_authority';

-- ============================================
-- 11. SIMPLE_LIST_PROMISE
-- Technique: Specific Value Promise
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Promesse de Valeur Spécifique

PRINCIPE: Promettre un nombre précis d''éléments actionnables. Le chiffre crée l''engagement.

FORMULES QUI MARCHENT:
• "Voici les [N] [éléments] qui [résultat]. (Le [Nème] est contre-intuitif)"
• "[N] erreurs qui [conséquence]. La #[N] m''a coûté [perte]."
• "[N] ans. [N] leçons. [N] minutes de lecture."
• "Le seul [élément] que [groupe] utilisent pour [résultat]."

RÈGLES:
- Chiffres impairs performent mieux (3, 5, 7)
- Ajouter un hook DANS le hook (teaser d''un élément)
- Promettre du CONCRET, pas du vague
- Le lecteur doit pouvoir APPLIQUER

EXEMPLE TRANSFORMATION:
❌ "Quelques conseils pour mieux vendre"
✅ "5 questions. 2 minutes. 80% de closing en plus. (La #3 est bizarre mais elle marche)"'
WHERE name = 'simple_list_promise';

-- ============================================
-- 12. PROVOCATIVE_CHALLENGE
-- Technique: Stop Command + Ego Trigger
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Commande d''Arrêt + Trigger Ego

PRINCIPE: Dire au lecteur d''ARRÊTER quelque chose crée une urgence immédiate et une envie de savoir pourquoi.

FORMULES QUI MARCHENT:
• "ARRÊTE de [pratique]. Fais [alternative] à la place."
• "Si tu fais encore [méthode], tu te trompes."
• "Tu fais [X] tout faux. Voici la vraie méthode."
• "Petite question : ton [métrique] fait combien ? (Sois honnête)"

RÈGLES:
- Attaquer la MÉTHODE, pas la personne
- Avoir une vraie alternative à proposer
- Le challenge doit être spécifique au métier
- Ton direct mais pas insultant

EXEMPLE TRANSFORMATION:
❌ "Il faut changer sa façon de prospecter"
✅ "ARRÊTE de pitcher dans le premier email. (Oui, même si ton manager te dit de le faire)"'
WHERE name = 'provocative_challenge';

-- ============================================
-- 13. PERSONAL_ORIGIN
-- Technique: Story Hook + Transformation Arc
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Accroche Narrative + Arc de Transformation

PRINCIPE: Commencer une histoire personnelle avec un point de départ identifiable et une promesse de transformation.

FORMULES QUI MARCHENT:
• "Il y a [durée], [situation de départ]. Aujourd''hui, [situation d''arrivée]."
• "Chez [entreprise], on en avait marre de [frustration]. On a [action]."
• "[Année] : [situation difficile]. [Année] : [résultat impressionnant]. Entre les deux : [teaser]."
• "Mon premier [métier/projet] : [échec]. Le dernier : [succès]. Voici ce qui a changé."

RÈGLES:
- Démarrer par un moment PRÉCIS
- Contraste avant/après visible
- Teaser la transformation sans tout révéler
- Le lecteur doit vouloir connaître le "comment"

EXEMPLE TRANSFORMATION:
❌ "J''ai commencé il y a quelques années"
✅ "2019 : 0€ de CA, salon de mes parents. 2024 : 2.3M€, équipe de 12. Le point de bascule ? Un email de refus."'
WHERE name = 'personal_origin';

-- ============================================
-- 14. LESSON_LEARNED (HIGHEST ENGAGEMENT!)
-- Technique: Wisdom Distillation + Time Investment
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Distillation de Sagesse (TOP PERFORMER - 339 avg engagement)

PRINCIPE: Condenser des années d''expérience en une leçon actionnable. Le temps investi = crédibilité.

FORMULES QUI MARCHENT:
• "[N] ans à [activité]. La plus grande leçon : [insight]."
• "J''ai plus appris en [faisant X] qu''en [étudiant Y]."
• "Tant que tu ne [milestone], arrête de [distraction]. J''ai compris ça [moment]."
• "Voilà [N] ans que [expérience]. Ce que personne ne m''avait dit : [leçon]."

RÈGLES:
- Le temps investi doit être SIGNIFICATIF
- UNE seule leçon claire, pas une liste
- Formuler comme un conseil direct
- Inclure le moment de prise de conscience

EXEMPLE TRANSFORMATION:
❌ "J''ai appris beaucoup de choses en vente"
✅ "2847 appels froids. 1 leçon : ce n''est pas ce que tu dis. C''est ce que tu fais APRÈS qu''ils disent non."'
WHERE name = 'lesson_learned';

-- ============================================
-- 15. BEFORE_AFTER (BAB Technique)
-- Technique: Before-After-Bridge
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Before-After-Bridge (BAB)

PRINCIPE: Montrer le contraste entre l''avant et l''après pour créer le désir de transformation.

FORMULES QUI MARCHENT:
• "Avant : [situation douloureuse]. Après : [situation désirable]. Le pont : [teaser]."
• "J''ai arrêté de [ancienne habitude]. J''ai [nouvelle habitude]. Résultat : [transformation]."
• "Notre ancien [élément] était [problème] → [nouvelle version]."
• "[Date] : [situation A]. Aujourd''hui : [situation B]. Un seul changement."

RÈGLES:
- Le contraste doit être VISUEL et immédiat
- L''après doit être désirable pour l''audience
- Teaser le "comment" sans tout révéler
- Utiliser → pour le visuel du changement

EXEMPLE TRANSFORMATION:
❌ "On a amélioré notre processus de vente"
✅ "Avant : 2 rdv/mois. Après : 50. Même équipe. Même produit. 1 seul changement dans le script d''appel."'
WHERE name = 'before_after';

-- ============================================
-- 16. METAPHOR
-- Technique: Analogie Puissante
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Analogie Mémorable

PRINCIPE: Expliquer un concept complexe via une image familière. Les métaphores créent des "a-ha moments".

FORMULES QUI MARCHENT:
• "[Concept business] c''est comme [analogie quotidienne]."
• "La plupart traitent [sujet] comme [mauvaise analogie]. En réalité, c''est plus comme [bonne analogie]."
• "Imagine [scénario familier]. C''est exactement ce que tu fais quand [comportement pro]."
• "[Domaine inattendu] m''a appris [leçon business]."

RÈGLES:
- L''analogie doit être INSTANTANÉMENT comprise
- Révéler une vérité cachée via la comparaison
- Éviter les métaphores clichées (marathon, iceberg)
- L''image doit surprendre légèrement

EXEMPLE TRANSFORMATION:
❌ "La vente c''est comme un marathon"
✅ "Prospecter sans CRM, c''est comme jouer aux échecs sans voir le plateau. Tu bouges des pièces au hasard."'
WHERE name = 'metaphor';

-- ============================================
-- 17. EMPATHY_HOOK
-- Technique: Validation + Mirror
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Validation + Effet Miroir

PRINCIPE: Montrer qu''on comprend EXACTEMENT ce que ressent le lecteur. Se sentir compris = engagement.

FORMULES QUI MARCHENT:
• "Si tu te sens [émotion] face à [situation], tu n''es pas seul."
• "Je comprends. [Situation frustrante]. On est passé par là."
• "Petit message pour [groupe en difficulté] : [validation]."
• "On te dit de [conseil commun]. Mais personne ne dit que [réalité cachée]."

RÈGLES:
- Décrire l''émotion avec les MOTS du lecteur
- Valider sans condescendance
- Montrer qu''on a VÉCU la même chose
- Finir sur une note d''espoir

EXEMPLE TRANSFORMATION:
❌ "La prospection peut être difficile parfois"
✅ "Lundi matin. 47 emails envoyés. 0 réponse. Cette boule au ventre ? Je connais. (Et voici ce qui a changé)"'
WHERE name = 'empathy_hook';

-- ============================================
-- 18. FEAR_REFRAME
-- Technique: Fear → Opportunity Flip
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Retournement Peur → Opportunité

PRINCIPE: Prendre une peur commune et montrer qu''elle est en fait une opportunité déguisée.

FORMULES QUI MARCHENT:
• "Ce qui te fait peur dans [sujet] ? C''est exactement ce qui va te [bénéfice]."
• "Tu as peur de [chose]. En fait, c''est le meilleur signe que [insight positif]."
• "[Peur commune] n''est pas ton ennemi. C''est [reframe]."
• "Tout le monde évite [chose effrayante]. C''est pour ça que [opportunité]."

RÈGLES:
- Nommer la peur SPÉCIFIQUEMENT
- Le reframe doit être crédible et logique
- Ne pas minimiser la peur, la transformer
- Finir sur l''action positive possible

EXEMPLE TRANSFORMATION:
❌ "N''aie pas peur du rejet en prospection"
✅ "Les 9 ''non'' avant le ''oui'' ? Chacun te rapproche. Mathématiquement. (Je t''explique le calcul)"'
WHERE name = 'fear_reframe';

-- ============================================
-- 19. REFRAME_INSIGHT
-- Technique: Perspective Shift
-- ============================================
UPDATE hook_types SET 
  prompt_instruction = '🎯 TECHNIQUE: Changement de Perspective

PRINCIPE: Prendre un sujet connu et offrir un angle de vue totalement nouveau.

FORMULES QUI MARCHENT:
• "[Sujet] n''est pas [croyance commune]. C''est [nouvelle perspective]."
• "On croit que [X] dépend de [Y]. En réalité, ça dépend de [Z]."
• "Le vrai problème n''est pas [problème apparent]. C''est [problème réel]."
• "Rappel : [insight] (mais personne n''en parle)"

RÈGLES:
- Le shift doit être SURPRENANT mais vrai
- Remettre en question une croyance acceptée
- Offrir une perspective actionnable
- Le lecteur doit avoir un "déclic"

EXEMPLE TRANSFORMATION:
❌ "Il faut bien connaître son produit pour vendre"
✅ "Tu ne vends pas ton produit. Tu vends la version de lui-même que ton prospect veut devenir."'
WHERE name = 'reframe_insight';

-- ============================================
-- Add metadata
-- ============================================
COMMENT ON TABLE hook_types IS 'Hook types with advanced copywriting techniques in prompt_instruction. Based on research: Alex Cattoni (69x engagement), PAS/AIDA/BAB formulas, Open Loop technique. Updated Jan 2026.';
