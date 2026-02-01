-- Migration: Enrich hook_types with classification columns and add missing types
-- Based on analysis of 3000+ viral posts - Total: 20 hook types
-- Run after 005_knowledge.sql

-- 1. Add classification columns if they don't exist
ALTER TABLE hook_types 
  ADD COLUMN IF NOT EXISTS classification_keywords text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS classification_patterns text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prompt_instruction text;

-- 2. Update existing 15 hook types with descriptions and classification rules
UPDATE hook_types SET 
  description = 'Annonce une nouveauté, un lancement ou une news importante. Crée de l''urgence et de l''exclusivité.',
  examples = ARRAY['BREAKING NEWS: GPT 5.1 is out.', 'Big news: we just bought Claap.', 'Really excited to share...'],
  classification_keywords = ARRAY['breaking', 'announcing', 'just', 'news', 'excited', 'launched', 'released', 'introducing'],
  classification_patterns = ARRAY['^breaking', '^big news', '^just (launched|released)', '^really excited', '^introducing'],
  prompt_instruction = 'Annonce une nouveauté avec enthousiasme. Utilise des marqueurs d''urgence: "BREAKING:", "Just launched:", "Big news:".'
WHERE name = 'announcement';

UPDATE hook_types SET 
  description = 'Montre une transformation avec un avant/après. Crée un contraste saisissant qui prouve le changement.',
  examples = ARRAY['Before: 2 meetings/month. After: 50 meetings/month.', '2020: struggling. 2024: thriving.', 'I used to hate sales. Now I love it.'],
  classification_keywords = ARRAY['before', 'after', 'avant', 'après', 'then', 'now', 'was', 'became', 'used to'],
  classification_patterns = ARRAY['^before', '^avant', 'before.*after', 'avant.*après', '^I used to', '^then.*now'],
  prompt_instruction = 'Montre une transformation avec un avant/après. Crée un contraste saisissant. Formats: "Before: X. After: Y", "I used to X. Now I Y".'
WHERE name = 'before_after';

UPDATE hook_types SET 
  description = 'Commence directement par un appel à l''action ou une invitation. Engage immédiatement le lecteur.',
  examples = ARRAY['Save this post.', 'Stop scrolling.', 'Read this twice.', 'Bookmark this.'],
  classification_keywords = ARRAY['save', 'stop', 'read', 'bookmark', 'share', 'comment', 'like', 'follow', 'click', 'join'],
  classification_patterns = ARRAY['^save', '^stop', '^read this', '^bookmark', '^share this', '^don''t scroll'],
  prompt_instruction = 'Commence par un appel à l''action direct. Engage immédiatement. Formats: "Save this.", "Stop scrolling.", "Read this twice."'
WHERE name = 'call_to_action_opener';

UPDATE hook_types SET 
  description = 'Exprime une opinion controversée qui divise. Crée du débat et de l''engagement.',
  examples = ARRAY['Unpopular opinion: cold calling is dead.', 'Hot take: AI won''t replace marketers.', 'Controversial: hustle culture is toxic.'],
  classification_keywords = ARRAY['unpopular opinion', 'hot take', 'controversial', 'disagree', 'wrong', 'overrated', 'underrated'],
  classification_patterns = ARRAY['^unpopular opinion', '^hot take', '^controversial', '^I disagree', 'is overrated', 'is underrated'],
  prompt_instruction = 'Exprime une opinion controversée. Utilise des marqueurs: "Unpopular opinion:", "Hot take:", "Controversial:".'
WHERE name = 'controversial_opinion';

UPDATE hook_types SET 
  description = 'Affirme quelque chose qui semble contre-intuitif mais qui est vrai. Crée de la curiosité cognitive.',
  examples = ARRAY['The best salespeople don''t sell.', 'Working less made me more productive.', 'Raising prices increased our sales.'],
  classification_keywords = ARRAY['actually', 'surprisingly', 'counterintuitively', 'paradox', 'opposite', 'less is more'],
  classification_patterns = ARRAY['the best.*don''t', 'working less', 'doing less', 'the opposite', 'surprisingly'],
  prompt_instruction = 'Affirme quelque chose de contre-intuitif. Formats: "The best X don''t Y", "Doing less X made me more Y".'
WHERE name = 'counterintuitive_claim';

UPDATE hook_types SET 
  description = 'Montre de l''empathie envers une situation difficile du lecteur. Crée une connexion émotionnelle.',
  examples = ARRAY['If you''re feeling stuck right now...', 'I know how hard it is to...', 'You''re not alone if you...'],
  classification_keywords = ARRAY['if you''re feeling', 'I know how', 'you''re not alone', 'it''s okay to', 'I understand', 'been there'],
  classification_patterns = ARRAY['^if you''re feeling', '^I know how', '^you''re not alone', '^it''s okay', '^I understand'],
  prompt_instruction = 'Montre de l''empathie. Formats: "If you''re feeling X...", "I know how hard it is to X", "You''re not alone if...".'
WHERE name = 'empathy_hook';

UPDATE hook_types SET 
  description = 'Prend une peur commune et la recadre positivement. Transforme l''anxiété en opportunité.',
  examples = ARRAY['The fear of failure is actually a sign you care.', 'Rejection isn''t failure, it''s redirection.', 'Anxiety means you''re growing.'],
  classification_keywords = ARRAY['fear', 'afraid', 'scared', 'anxiety', 'worry', 'actually', 'isn''t', 'reframe'],
  classification_patterns = ARRAY['^the fear of', 'fear.*actually', 'afraid.*but', 'isn''t.*it''s'],
  prompt_instruction = 'Recadre une peur positivement. Formats: "The fear of X is actually Y", "X isn''t failure, it''s Y".'
WHERE name = 'fear_reframe';

UPDATE hook_types SET 
  description = 'Partage une leçon apprise de l''expérience. Positionne comme mentor avec sagesse pratique.',
  examples = ARRAY['The biggest lesson from 10 years in sales:', 'What I wish I knew when I started:', 'One thing I learned the hard way:'],
  classification_keywords = ARRAY['lesson', 'learned', 'wish I knew', 'realized', 'discovered', 'taught me', 'hard way'],
  classification_patterns = ARRAY['lesson.*from', 'what I learned', 'wish I knew', 'taught me', 'learned.*hard way'],
  prompt_instruction = 'Partage une leçon apprise. Formats: "The biggest lesson from X:", "What I wish I knew when...", "One thing I learned:".'
WHERE name = 'lesson_learned';

UPDATE hook_types SET 
  description = 'Combine un chiffre précis avec un résultat impressionnant. Crée de la crédibilité avec des données.',
  examples = ARRAY['$2.5M in pipeline from one campaign.', '73% reply rate on cold emails.', '10x ROI in 90 days.'],
  classification_keywords = ARRAY['$', '%', 'x', 'million', 'billion', 'revenue', 'ARR', 'MRR', 'pipeline', 'meetings', 'leads'],
  classification_patterns = ARRAY['^\$\d+', '^\d+%', '^\d+x', '\$\d+.*in', '\d+%.*rate', '\d+.*meetings'],
  prompt_instruction = 'Combine chiffre + résultat. Formats: "$X in Y", "X% reply rate", "Xx ROI in Y days".'
WHERE name = 'number_result';

UPDATE hook_types SET 
  description = 'Raconte l''origine personnelle d''un parcours ou d''une idée. Crée une connexion authentique.',
  examples = ARRAY['I started with nothing but a laptop.', '5 years ago, I was broke and lost.', 'My journey began in a small town.'],
  classification_keywords = ARRAY['started', 'began', 'origin', 'journey', 'years ago', 'back when', 'first', 'beginning'],
  classification_patterns = ARRAY['^I started', '^my journey', '^\d+ years ago', '^back when', '^when I first'],
  prompt_instruction = 'Raconte ton origine. Formats: "I started with X", "X years ago, I was Y", "My journey began when...".'
WHERE name = 'personal_origin';

UPDATE hook_types SET 
  description = 'Lance un défi provocant au lecteur. Crée une réaction émotionnelle forte.',
  examples = ARRAY['I dare you to try this for 30 days.', 'Most people won''t do this.', 'Are you brave enough to...?'],
  classification_keywords = ARRAY['dare', 'challenge', 'brave', 'most people won''t', 'bet you can''t', 'try this'],
  classification_patterns = ARRAY['^I dare', '^I challenge', '^most people won''t', '^are you brave', '^bet you can''t'],
  prompt_instruction = 'Lance un défi provocant. Formats: "I dare you to X", "Most people won''t do X", "Are you brave enough to X?".'
WHERE name = 'provocative_challenge';

UPDATE hook_types SET 
  description = 'Pose une question engageante qui fait réfléchir. Crée une connexion immédiate.',
  examples = ARRAY['What if you could 10x your results?', 'Have you ever wondered why...?', 'Why do most startups fail?'],
  classification_keywords = ARRAY['?', 'what if', 'why', 'how', 'have you', 'do you', 'ever wondered', 'what', 'when'],
  classification_patterns = ARRAY['\?$', '^what if', '^why', '^how', '^have you', '^do you', '^ever wondered'],
  prompt_instruction = 'Pose une question engageante. Évite les questions fermées. Formats: "What if you could X?", "Why do most Y?".'
WHERE name = 'question_hook';

UPDATE hook_types SET 
  description = 'Cite une autorité ou un expert pour établir la crédibilité. Utilise le social proof.',
  examples = ARRAY['Warren Buffett once said:', 'According to Harvard research:', 'As Steve Jobs put it:'],
  classification_keywords = ARRAY['said', 'according to', 'research', 'study', 'expert', 'scientist', 'professor', 'CEO', 'founder'],
  classification_patterns = ARRAY['once said', 'according to', 'research shows', 'study found', 'as.*put it'],
  prompt_instruction = 'Cite une autorité. Formats: "X once said:", "According to Y research:", "As X put it:".'
WHERE name = 'quote_authority';

UPDATE hook_types SET 
  description = 'Offre une nouvelle perspective sur un sujet connu. Change la façon de voir les choses.',
  examples = ARRAY['Failure isn''t the opposite of success.', 'What if rejection was actually protection?', 'Sales isn''t about selling.'],
  classification_keywords = ARRAY['isn''t', 'actually', 'really', 'what if', 'perspective', 'think about', 'consider'],
  classification_patterns = ARRAY['isn''t.*it''s', 'what if.*actually', 'isn''t about', 'is really about'],
  prompt_instruction = 'Offre une nouvelle perspective. Formats: "X isn''t Y, it''s Z", "What if X was actually Y?".'
WHERE name = 'reframe_insight';

UPDATE hook_types SET 
  description = 'Promet une liste de conseils ou d''éléments. Crée une attente claire et structurée.',
  examples = ARRAY['5 things I wish I knew earlier:', '10 mistakes killing your sales:', '3 habits of top performers:'],
  classification_keywords = ARRAY['things', 'tips', 'ways', 'mistakes', 'habits', 'rules', 'steps', 'secrets', 'lessons'],
  classification_patterns = ARRAY['^\d+ (things|tips|ways|mistakes|habits|rules|steps|secrets|lessons)'],
  prompt_instruction = 'Promet une liste. Formats: "X things I wish I knew:", "X mistakes killing your Y:", "X habits of Z:".'
WHERE name = 'simple_list_promise';

-- 3. Add 5 missing hook types to reach 20 total
INSERT INTO hook_types (name, description, formula, examples, classification_keywords, classification_patterns, prompt_instruction) VALUES
(
  'curiosity_gap',
  'Crée un gap d''information qui pousse à lire la suite. Promets une révélation exclusive.',
  '[Révélation exclusive] + [Promesse de valeur]',
  ARRAY['Here''s the exact formula I use...', 'The hidden cost of comfort is brutal.', 'Here''s the real reason Apollo was banned.', 'Le secret que personne ne vous dit...'],
  ARRAY['secret', 'nobody', 'hidden', 'unknown', 'discover', 'reveal', 'real reason', 'exact', 'actually'],
  ARRAY['secret', 'nobody.*knows', 'here''s the (exact|real)', 'the hidden', 'ce que.*cache'],
  'Crée un gap d''information qui pousse à lire la suite. Promets une révélation exclusive. Formats: "Here''s the exact X...", "The hidden X...", "The real reason...".'
),
(
  'pain_point',
  'Identifie une frustration commune de l''audience. Montre que tu comprends leur douleur.',
  '[Frustration identifiée] + [Empathie]',
  ARRAY['Stuck in a job you hate?', 'Tired of sending emails that get ignored?', 'Struggling to get meetings?', 'Marre de prospecter dans le vide?'],
  ARRAY['tired', 'frustrated', 'struggling', 'hate', 'problem', 'stuck', 'overwhelmed', 'exhausted', 'marre'],
  ARRAY['^tired of', '^marre de', 'struggling with', '^stuck', '^if you''ve been', 'killing your'],
  'Identifie une frustration commune de ton audience. Montre que tu comprends leur douleur. Formats: "Stuck in X?", "Tired of X?", "Struggling with X?".'
),
(
  'teaser',
  'Annonce du contenu à venir (vidéo, thread, guide). Crée de l''anticipation.',
  '[Annonce de contenu] + [Emoji directionnel]',
  ARRAY['Je vous explique tout dans une vidéo ⤵️', 'Here''s a quick tip on how to... 👇', 'Thread: How I built a $1M business', 'JUST wrapped up the final slides...'],
  ARRAY['video', 'thread', 'guide', 'slides', 'here''s', 'voici', 'je vous', 'check out', 'watch'],
  ARRAY['dans (une|cette) vidéo', 'here''s (a|the)', 'voici', '^thread:', 'check (this|out)', '⤵️', '👇'],
  'Annonce du contenu à venir et crée de l''anticipation. Utilise des emojis directionnels (⤵️ 👇). Formats: "Here''s how to X 👇", "Thread: X".'
),
(
  'metaphor',
  'Utilise une métaphore ou analogie percutante pour illustrer une idée complexe de façon mémorable.',
  '[Concept abstrait] = [Image concrète]',
  ARRAY['We''ve been selling hammers to people without hands.', 'Your comfort zone is charging interest.', 'Don''t build your house on rented land.', 'Entrepreneurship is a marathon, not a sprint.'],
  ARRAY['like', 'is a', 'imagine', 'think of', 'picture', 'comme', 'c''est comme'],
  ARRAY['is (a|the|like)', 'like a', 'imagine', 'picture this', 'think of.*as'],
  'Utilise une métaphore ou analogie percutante. Rends une idée complexe mémorable avec une image forte. Ex: "X is like Y", "We''ve been doing X to Y".'
),
(
  'confession',
  'Aveu personnel ou vulnérabilité. Crée une connexion authentique par l''honnêteté.',
  '[Aveu vulnérable] + [Leçon implicite]',
  ARRAY['I didn''t have it figured out when I started.', 'I had no idea I had ADHD until 47.', 'J''ai raté mes concours pour HEC.', 'I failed 3 businesses before this one worked.'],
  ARRAY['didn''t', 'had no idea', 'failed', 'mistake', 'wrong', 'raté', 'échoué', 'confess', 'admit', 'honestly'],
  ARRAY['^I didn''t', '^I had no idea', '^I failed', '^I made a mistake', '^j''ai raté', '^j''ai échoué', '^honestly'],
  'Partage un aveu personnel ou une vulnérabilité. Sois authentique. Formats: "I didn''t have it figured out...", "I failed at X...", "I had no idea...".'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  formula = EXCLUDED.formula,
  examples = EXCLUDED.examples,
  classification_keywords = EXCLUDED.classification_keywords,
  classification_patterns = EXCLUDED.classification_patterns,
  prompt_instruction = EXCLUDED.prompt_instruction;

-- 4. Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_hook_types_name ON hook_types(name);
