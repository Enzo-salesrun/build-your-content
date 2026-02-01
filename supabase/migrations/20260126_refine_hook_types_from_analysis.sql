-- Migration: Refine hook_types based on real data analysis from viral_posts_bank
-- Analysis of 861 classified hooks revealed patterns and high-performing examples
-- Run after 006_enrich_hook_types.sql

-- ============================================
-- 1. ANNOUNCEMENT - Most used (199 posts, avg engagement 152)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Le Paris Saint-Germain est Champion d''Europe ! 🏆✨',
    'Merci internet. Merci notre génération ❤️',
    'lemlist just hit $35M ARR, +$2M vs. August',
    '9 mois que j''essaie de créer un outil performant...',
    'Big news: we just signed our 100th client'
  ],
  classification_keywords = ARRAY['breaking', 'announcing', 'just', 'news', 'excited', 'launched', 'released', 'introducing', 'annonce', 'nouveau', 'officiel', 'champion', 'merci', 'fier', 'heureux'],
  classification_patterns = ARRAY['^breaking', '^big news', '^just (launched|released|hit|signed)', '^really excited', '^introducing', '^annonce', '^c''est officiel', '🏆', '🎉', '✨'],
  prompt_instruction = 'Annonce une nouveauté avec enthousiasme. Utilise des marqueurs d''urgence ou d''émotion: "BREAKING:", "Big news:", "Merci...", "C''est officiel:". Les emojis 🏆🎉 renforcent l''impact.'
WHERE name = 'announcement';

-- ============================================
-- 2. NUMBER_RESULT - 2nd most used (105 posts, avg engagement 180)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'lemlist just hit $35M ARR, +$2M vs. August (+6% MoM)',
    '1980–2010: CEOs were former CFOs. 2010–2025: CEOs came from Sales',
    'lemlist ended October at 37M$ ARR, +2M$ vs September',
    '$2.5M in pipeline from one campaign',
    '73% reply rate on cold emails'
  ],
  classification_keywords = ARRAY['$', '€', '%', 'x', 'million', 'billion', 'revenue', 'ARR', 'MRR', 'pipeline', 'meetings', 'leads', 'CA', 'chiffre', 'croissance', 'growth'],
  classification_patterns = ARRAY['^\$\d+', '^€\d+', '^\d+%', '^\d+x', '\$\d+.*ARR', '\d+M\$', '\d+€', '\d+k€', '^\d{4}[-–]\d{4}'],
  prompt_instruction = 'Combine chiffre précis + résultat impressionnant. Les formats qui marchent: "$XM ARR", "X% growth", "De X à Y", "1980-2010: X. 2025: Y". Les montants en dollars performent mieux.'
WHERE name = 'number_result';

-- ============================================
-- 3. CURIOSITY_GAP - High engagement (89 posts, avg 259)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Voici ce qu''ils ne te disent jamais sur l''appel à froid...',
    'Je suis allé braquer Google ! La méthode pour obtenir des mobiles en masse !',
    'Le jour où j''ai failli perdre 70% de mon CA du jour au lendemain...',
    'Here''s the exact formula I use...',
    'Le secret que personne ne vous dit sur la prospection...'
  ],
  classification_keywords = ARRAY['secret', 'nobody', 'hidden', 'unknown', 'discover', 'reveal', 'real reason', 'exact', 'actually', 'personne ne', 'jamais', 'failli', 'méthode', 'voici ce que', 'braquer'],
  classification_patterns = ARRAY['secret', 'nobody.*knows', 'here''s the (exact|real)', 'the hidden', 'ce que.*cache', 'voici ce qu''', 'ne.*dit.*jamais', 'j''ai failli', 'la méthode pour'],
  prompt_instruction = 'Crée un gap d''information irrésistible. Formules qui marchent: "Voici ce qu''ils ne te disent jamais sur X...", "Le jour où j''ai failli...", "La méthode secrète pour...". Promets une révélation exclusive.'
WHERE name = 'curiosity_gap';

-- ============================================
-- 4. CONTROVERSIAL_OPINION - Debate driver (75 posts, avg 169)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'La plupart des commerciaux confondent publier et prospecter.',
    'Les séquences de prospection linéaires sont une addiction dangereuse.',
    'Ton SDR n''a pas besoin d''un manager.',
    'Unpopular opinion: cold calling is dead.',
    'Hot take: AI won''t replace marketers.'
  ],
  classification_keywords = ARRAY['unpopular opinion', 'hot take', 'controversial', 'disagree', 'wrong', 'overrated', 'underrated', 'plupart', 'confondent', 'addiction', 'danger', 'pas besoin', 'n''existeront plus'],
  classification_patterns = ARRAY['^unpopular opinion', '^hot take', '^controversial', '^I disagree', 'is overrated', 'is underrated', '^la plupart', 'confondent', 'n''a pas besoin', 'n''existeront plus'],
  prompt_instruction = 'Exprime une opinion tranchée qui divise. Formules: "La plupart des X confondent Y et Z", "X n''a pas besoin de Y", "Les X sont une addiction dangereuse". Ose être provocant.'
WHERE name = 'controversial_opinion';

-- ============================================
-- 5. COUNTERINTUITIVE_CLAIM - Mind shift (67 posts, avg 203)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Ne faites pas de ventes. Faites du nurturing.',
    'Ma prédiction : les agences de prospection n''existeront plus dans 5 ans.',
    'The best salespeople don''t sell.',
    'Working less made me more productive.',
    'Vous avez beau avoir le meilleur discours du monde...'
  ],
  classification_keywords = ARRAY['actually', 'surprisingly', 'counterintuitively', 'paradox', 'opposite', 'less is more', 'ne faites pas', 'prédiction', 'n''existeront plus', 'vous avez beau'],
  classification_patterns = ARRAY['the best.*don''t', 'working less', 'doing less', 'the opposite', 'surprisingly', '^ne faites pas', '^ma prédiction', 'n''existeront plus', 'vous avez beau'],
  prompt_instruction = 'Affirme quelque chose de contre-intuitif. Formules: "Ne faites pas X. Faites Y.", "Ma prédiction: X n''existeront plus dans Y ans", "Vous avez beau avoir X, sans Y...". Inverse les attentes.'
WHERE name = 'counterintuitive_claim';

-- ============================================
-- 6. QUESTION_HOOK - Engagement driver (65 posts, avg 116)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Pourquoi l''ABM est l''approche sortante la plus efficace ?',
    'Quel est le moyen le plus rapide de développer votre entreprise ?',
    'Quelle est la plus grosse erreur en prospection téléphonique ?',
    'What if you could 10x your results?',
    'Have you ever wondered why most startups fail?'
  ],
  classification_keywords = ARRAY['?', 'what if', 'why', 'how', 'have you', 'do you', 'ever wondered', 'what', 'when', 'pourquoi', 'quel', 'quelle', 'comment', 'avez-vous'],
  classification_patterns = ARRAY['\?$', '^what if', '^why', '^how', '^have you', '^do you', '^ever wondered', '^pourquoi', '^quel(le)?', '^comment', '^avez-vous'],
  prompt_instruction = 'Pose une question engageante qui fait réfléchir. Formules: "Pourquoi X est Y ?", "Quelle est la plus grosse erreur en X ?", "Comment X sans Y ?". Évite les questions fermées (oui/non).'
WHERE name = 'question_hook';

-- ============================================
-- 7. TEASER - Content preview (63 posts, avg 201)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    '2024 commence de manière… Explosive !',
    '𝗝𝗼𝗯𝗵𝗮𝗰𝗸#𝟭',
    'Le pari fou continue.',
    'Je vous explique tout dans une vidéo ⤵️',
    'Thread: How I built a $1M business'
  ],
  classification_keywords = ARRAY['video', 'thread', 'guide', 'slides', 'here''s', 'voici', 'je vous', 'check out', 'watch', 'commence', 'continue', 'pari', 'explosive', 'tuto', 'marketing'],
  classification_patterns = ARRAY['dans (une|cette) vidéo', 'here''s (a|the)', 'voici', '^thread:', 'check (this|out)', '⤵️', '👇', 'commence de', 'le pari.*continue', '#\d+'],
  prompt_instruction = 'Annonce du contenu à venir et crée de l''anticipation. Formules: "2024 commence de manière… X !", "Le pari fou continue.", "Thread: X". Utilise des emojis directionnels (⤵️ 👇) ou du suspense.'
WHERE name = 'teaser';

-- ============================================
-- 8. PAIN_POINT - Empathy (35 posts, avg 207)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Chaque détail compte dans votre conquête de nouveaux clients…',
    'Le marché est saturé, mes leads n''ont le budget…',
    'Les cycles de ventes B2B en France sont interminables (c''est pas normal)',
    'Stuck in a job you hate?',
    'Tired of sending emails that get ignored?'
  ],
  classification_keywords = ARRAY['tired', 'frustrated', 'struggling', 'hate', 'problem', 'stuck', 'overwhelmed', 'exhausted', 'marre', 'saturé', 'interminable', 'pas normal', 'galère', 'difficile'],
  classification_patterns = ARRAY['^tired of', '^marre de', 'struggling with', '^stuck', '^if you''ve been', 'killing your', 'est saturé', 'interminable', 'c''est pas normal', 'chaque détail compte'],
  prompt_instruction = 'Identifie une frustration commune de ton audience. Formules: "Le marché est saturé, les leads n''ont pas le budget…", "Les X sont interminables (c''est pas normal)", "Chaque détail compte dans votre X…".'
WHERE name = 'pain_point';

-- ============================================
-- 9. CONFESSION - High engagement (31 posts, avg 220)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Pendant 4 ans j''étais esclave de mon business (peu sur LinkedIn ont l''honnêteté de le dire)',
    'Fixer mes prix au feeling était une de mes plus grosses erreurs',
    'J''ai 34 ans, en pleine forme, mais 2 marqueurs cardiaques dans le rouge…',
    'I didn''t have it figured out when I started.',
    'I failed 3 businesses before this one worked.'
  ],
  classification_keywords = ARRAY['didn''t', 'had no idea', 'failed', 'mistake', 'wrong', 'raté', 'échoué', 'confess', 'admit', 'honestly', 'esclave', 'erreur', 'mais', 'honnêteté', 'pendant.*ans'],
  classification_patterns = ARRAY['^I didn''t', '^I had no idea', '^I failed', '^I made a mistake', '^j''ai raté', '^j''ai échoué', '^honestly', '^pendant \d+ ans', 'une de mes.*erreurs', 'mais.*dans le rouge'],
  prompt_instruction = 'Partage un aveu personnel vulnérable. Formules: "Pendant X ans j''étais Y (peu osent le dire)", "X était une de mes plus grosses erreurs", "J''ai X ans, en pleine forme, mais Y…". Sois authentique.'
WHERE name = 'confession';

-- ============================================
-- 10. QUOTE_AUTHORITY - Social proof (30 posts, avg 219)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'B. Tapie disait : Seul ceux qui s''entourent des compétences complémentaires réussissent.',
    'Il y a un million de raisons de ne pas se lancer, moi je trouve toujours un million de raisons de le faire.',
    'C''est le premier outil de performance d''un CMO / Head of Growth selon moi.',
    'Warren Buffett once said:',
    'According to Harvard research:'
  ],
  classification_keywords = ARRAY['said', 'according to', 'research', 'study', 'expert', 'scientist', 'professor', 'CEO', 'founder', 'disait', 'selon', 'moi je', 'il y a un million'],
  classification_patterns = ARRAY['once said', 'according to', 'research shows', 'study found', 'as.*put it', '.*disait\s*:', 'selon moi', 'il y a un million de'],
  prompt_instruction = 'Cite une autorité ou ta propre sagesse. Formules: "X disait : Y", "Selon moi, le premier outil de X...", "Il y a un million de raisons de ne pas X, moi je trouve toujours...".'
WHERE name = 'quote_authority';

-- ============================================
-- 11. SIMPLE_LIST_PROMISE - Structured value (29 posts, avg 229)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Voici les 5 questions (PRIMORDIALES) qui permettent de mieux vendre + la matrice',
    'Je vous offre un tuto complet pour prospecter pile au bon moment',
    '3 erreurs à éviter si vous souhaitez créer une communauté :',
    '5 things I wish I knew earlier:',
    '10 mistakes killing your sales:'
  ],
  classification_keywords = ARRAY['things', 'tips', 'ways', 'mistakes', 'habits', 'rules', 'steps', 'secrets', 'lessons', 'erreurs', 'questions', 'voici', 'tuto', 'conseils', 'clés'],
  classification_patterns = ARRAY['^\d+ (things|tips|ways|mistakes|habits|rules|steps|secrets|lessons)', '^voici les \d+', '^\d+ erreurs', '^\d+ questions', '^\d+ conseils', '^\d+ clés'],
  prompt_instruction = 'Promet une liste de valeur. Formules: "Voici les X Y (PRIMORDIALES) qui permettent de Z", "X erreurs à éviter si vous souhaitez Y :", "Je vous offre un tuto complet pour X".'
WHERE name = 'simple_list_promise';

-- ============================================
-- 12. PROVOCATIVE_CHALLENGE - Highest engagement (20 posts, avg 307!)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Arrêtez de pitcher votre solution dès le premier email.',
    'Petite question, votre calendrier éditorial 2026 fait combien de lignes ?',
    'Arrêtez de penser que vous "devez" utiliser votre page entreprise sur LinkedIn.',
    'I dare you to try this for 30 days.',
    'Most people won''t do this.'
  ],
  classification_keywords = ARRAY['dare', 'challenge', 'brave', 'most people won''t', 'bet you can''t', 'try this', 'arrêtez', 'stop', 'petite question', 'linkedin', 'combien'],
  classification_patterns = ARRAY['^I dare', '^I challenge', '^most people won''t', '^are you brave', '^bet you can''t', '^arrêtez de', '^stop', '^petite question'],
  prompt_instruction = 'Lance un défi provocant. Formules: "Arrêtez de X dès le premier Y.", "Petite question, votre X fait combien de Y ?", "Arrêtez de penser que vous devez X". Challenge les croyances.'
WHERE name = 'provocative_challenge';

-- ============================================
-- 13. PERSONAL_ORIGIN - 2nd highest engagement (19 posts, avg 332!)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Chez Job Leads, nous en avions assez de présenter nos offres de manière générique.',
    'Il y a 3 ans, Bulldozer signait son premier client. Aujourd''hui si je fais le point...',
    'In this episode of The Spirit Guides, I sat down with Amanda McCrossin...',
    'I started with nothing but a laptop.',
    '5 years ago, I was broke and lost.'
  ],
  classification_keywords = ARRAY['started', 'began', 'origin', 'journey', 'years ago', 'back when', 'first', 'beginning', 'il y a', 'ans', 'premier client', 'chez', 'en avions assez'],
  classification_patterns = ARRAY['^I started', '^my journey', '^\d+ years ago', '^back when', '^when I first', '^il y a \d+ ans', '^chez.*nous', 'signait son premier', 'en avions assez'],
  prompt_instruction = 'Raconte ton origine avec émotion. Formules: "Il y a X ans, Y signait son premier client...", "Chez X, nous en avions assez de Y", "Il y a X ans, j''étais Y. Aujourd''hui...". Montre la transformation.'
WHERE name = 'personal_origin';

-- ============================================
-- 14. LESSON_LEARNED - Highest engagement! (15 posts, avg 339!)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'J''ai plus appris en faisant qu''en étudiant. C''est la plus grande leçon de ma vie.',
    'Tant que tu ne fais pas 20-30k€/mois, arrête de perdre ton temps. J''ai compris ça...',
    'Voilà 6 ans que j''interviens dans un programme Master d''HEC. Quelques apprentissages...',
    'The biggest lesson from 10 years in sales:',
    'What I wish I knew when I started:'
  ],
  classification_keywords = ARRAY['lesson', 'learned', 'wish I knew', 'realized', 'discovered', 'taught me', 'hard way', 'appris', 'leçon', 'compris', 'apprentissages', 'voilà.*ans'],
  classification_patterns = ARRAY['lesson.*from', 'what I learned', 'wish I knew', 'taught me', 'learned.*hard way', 'plus appris', 'plus grande leçon', 'j''ai compris', 'voilà \d+ ans que', 'quelques apprentissages'],
  prompt_instruction = 'Partage une leçon durement apprise. Formules: "J''ai plus appris en X qu''en Y. C''est la plus grande leçon de ma vie.", "Voilà X ans que je Y. Quelques apprentissages...", "Tant que tu ne fais pas X, arrête de Y".'
WHERE name = 'lesson_learned';

-- ============================================
-- 15. BEFORE_AFTER - Transformation (22 posts, avg 139)
-- ============================================
UPDATE hook_types SET 
  examples = ARRAY[
    'Notre ancien nom était un piège -> "Salesrun".',
    'J''ai arrêté de me plaindre que mes leads n''étaient pas qualifiés. J''ai doublé...',
    'Before: 2 meetings/month. After: 50 meetings/month.',
    '2020: struggling. 2024: thriving.',
    'I used to hate sales. Now I love it.'
  ],
  classification_keywords = ARRAY['before', 'after', 'avant', 'après', 'then', 'now', 'was', 'became', 'used to', 'ancien', 'nouveau', 'arrêté de', 'doublé', 'piège'],
  classification_patterns = ARRAY['^before', '^avant', 'before.*after', 'avant.*après', '^I used to', '^then.*now', 'ancien.*était', 'j''ai arrêté de.*j''ai', '->'],
  prompt_instruction = 'Montre une transformation avant/après. Formules: "Notre ancien X était Y -> maintenant Z", "J''ai arrêté de X. J''ai doublé Y.", "Before: X. After: Y".'
WHERE name = 'before_after';

-- ============================================
-- Create index for faster hook analysis queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_viral_posts_hook_type ON viral_posts_bank(hook_type_id) WHERE hook IS NOT NULL;

-- ============================================
-- Add analytics comment
-- ============================================
COMMENT ON TABLE hook_types IS 'Hook types refined based on analysis of 861 real posts from viral_posts_bank. Top performers: lesson_learned (339 avg), personal_origin (332 avg), provocative_challenge (307 avg). Updated Jan 2026.';
