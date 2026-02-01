-- Migration: Add platforms table for multi-platform content adaptation
-- This allows copywriting to be adapted based on platform-specific constraints

-- 1. Create platforms table
create table platforms (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  slug text not null unique,
  
  -- Platform constraints for copywriting
  max_characters int not null default 3000,
  max_hashtags int default 5,
  supports_emojis boolean default true,
  supports_links boolean default true,
  supports_mentions boolean default true,
  
  -- Copywriting guidelines stored as prompt instructions
  tone_guidelines text,
  format_guidelines text,
  best_practices text,
  
  -- Platform-specific metadata
  icon_name text,
  color text,
  
  created_at timestamptz default now()
);

-- 2. Add platform_id to production_posts
alter table production_posts 
  add column platform_id uuid references platforms(id);

-- 3. Enable RLS
alter table platforms enable row level security;

-- 4. Create RLS policies (allow read for all authenticated users)
create policy "Allow read access to platforms" on platforms
  for select using (true);

-- 5. Insert default platforms with copywriting guidelines
insert into platforms (name, slug, max_characters, max_hashtags, supports_emojis, supports_links, supports_mentions, tone_guidelines, format_guidelines, best_practices, icon_name, color) values
(
  'LinkedIn',
  'linkedin',
  3000,
  0,
  true,
  true,
  true,
  'Conversationnel et direct, mélange formel/informel. Utilise l''humour et le sarcasme avec parcimonie. Authentique et relatable - évite le corporate speak. Tutoiement ou vouvoiement selon la cible.',
  'Hook percutant en 1 ligne (max 10 mots). Paragraphes de 1-3 lignes max. Saut de ligne après CHAQUE phrase. Listes à puces fréquentes (70%+ des posts). Longueur idéale: 300-600 mots. Les 210 premiers caractères sont cruciaux (avant "See more"). Structure: HOOK → CONTEXTE → DÉVELOPPEMENT → TAKEAWAY → CTA.',
  'Évite les hashtags (les top créateurs FR n''en utilisent pas). Emojis modérés: 3-5 max, jamais dans le hook. Utilise des anecdotes personnelles et storytelling. Inclus des données/chiffres. Termine par un CTA clair (question ouverte, lien, ou réflexion). Hooks efficaces: question provocante, affirmation choc, anecdote, contre-intuition, ou chiffre. Phrases signatures: "C''est cadeau", "Voici ce que j''ai appris", "La vraie raison c''est...", "Spoiler:", "DM moi si tu veux...".',
  'Linkedin',
  '#0A66C2'
),
(
  'Twitter / X',
  'twitter',
  280,
  2,
  true,
  true,
  true,
  'Direct et percutant. Conversationnel. Opinions tranchées. Humour bienvenu.',
  'Une idée par tweet. Threads pour développer. Pas de hashtags dans le corps du texte.',
  'Engagement rapide crucial. Répondre aux commentaires. Les threads performent bien pour le contenu éducatif.',
  'Twitter',
  '#1DA1F2'
),
(
  'Instagram',
  'instagram',
  2200,
  30,
  true,
  false,
  true,
  'Authentique et visuel. Storytelling personnel. Émotionnel et inspirant.',
  'Première ligne = hook (visible avant "voir plus"). Emojis pour structurer. Hashtags en commentaire ou fin de caption.',
  'Le visuel est roi. Carousel pour le contenu éducatif. Stories pour l''engagement quotidien. Reels pour la découvrabilité.',
  'Instagram',
  '#E4405F'
),
(
  'Threads',
  'threads',
  500,
  0,
  true,
  true,
  true,
  'Conversationnel et décontracté. Moins formel que LinkedIn. Plus réflexif que Twitter.',
  'Format court. Pas de hashtags. Ton naturel comme une conversation.',
  'Plateforme en croissance. Bon pour les réflexions spontanées et le personal branding authentique.',
  'AtSign',
  '#000000'
),
(
  'Newsletter',
  'newsletter',
  10000,
  0,
  false,
  true,
  false,
  'Approfondi et expert. Valeur ajoutée claire. Ton personnel et direct avec le lecteur.',
  'Structure claire avec titres. Introduction captivante. Bullet points pour les takeaways. CTA clair en fin.',
  'Sujet d''email crucial pour le taux d''ouverture. Apporter de la valeur unique non disponible ailleurs.',
  'Mail',
  '#6366F1'
),
(
  'YouTube',
  'youtube',
  5000,
  15,
  true,
  true,
  true,
  'Engageant et dynamique. Conversationnel comme si on parlait à un ami. Créer de l''anticipation et de la curiosité.',
  'Titre accrocheur (60 chars max). Description avec timestamps. Premiers 150 caractères cruciaux pour le SEO. Inclure des CTA pour s''abonner.',
  'Miniature et titre = 80% du succès. Les 30 premières secondes déterminent la rétention. Poser une question ou promettre une valeur dès le début. Utiliser des chapitres pour les vidéos longues.',
  'Youtube',
  '#FF0000'
);

-- 6. Create index for faster lookups
create index idx_production_posts_platform on production_posts(platform_id);
create index idx_platforms_slug on platforms(slug);
