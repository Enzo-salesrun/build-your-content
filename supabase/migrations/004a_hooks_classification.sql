-- Migration: Add generated_hooks table for storing and classifying AI-generated hooks
-- This allows proper tracking, classification, and linking of hooks to production posts

-- 1. Create generated_hooks table
create table generated_hooks (
  id uuid default gen_random_uuid() primary key,
  
  -- Link to production post
  production_post_id uuid references production_posts(id) on delete cascade,
  
  -- Hook content
  text text not null,
  score int default 0 check (score >= 0 and score <= 100),
  
  -- Classification (linked to reference tables)
  hook_type_id uuid references hook_types(id),
  
  -- Selection status
  is_selected boolean default false,
  
  -- Metadata
  generation_batch int default 1,
  created_at timestamptz default now()
);

-- 2. Add classification rules to hook_types table
alter table hook_types 
  add column if not exists classification_keywords text[],
  add column if not exists classification_patterns text[],
  add column if not exists prompt_instruction text;

-- 3. Update hook_types with classification rules
update hook_types set 
  classification_keywords = ARRAY['stop', 'don''t', 'never', 'wrong', 'myth', 'lie', 'truth is', 'actually'],
  classification_patterns = ARRAY['^stop', '^don''t', '^never', 'everyone.*wrong'],
  prompt_instruction = 'Commence par contredire une croyance populaire. Utilise des mots comme "Stop", "Arrêtez", "Non", "La vérité".'
where name = 'contrarian';

update hook_types set 
  classification_keywords = ARRAY['?', 'what if', 'how', 'why', 'have you', 'do you', 'ever wondered'],
  classification_patterns = ARRAY['\?$', '^what if', '^how', '^why'],
  prompt_instruction = 'Pose une question engageante qui fait réfléchir le lecteur. Évite les questions fermées (oui/non).'
where name = 'question';

update hook_types set 
  classification_keywords = ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '%', 'million', 'billion'],
  classification_patterns = ARRAY['^\d+', '\d+%', '\$\d+', '\d+ (jours|mois|ans|heures)'],
  prompt_instruction = 'Utilise un chiffre précis et impactant dès le début. Les chiffres impairs et spécifiques (ex: 7, 143) performent mieux.'
where name = 'number';

update hook_types set 
  classification_keywords = ARRAY['years ago', 'last week', 'yesterday', 'once', 'remember', 'happened', 'story', 'il y a'],
  classification_patterns = ARRAY['^(il y a|last|yesterday|once upon)', '^\d+ (years|months|days) ago'],
  prompt_instruction = 'Commence par un marqueur temporel pour initier une narration. Ex: "Il y a 3 ans...", "La semaine dernière..."'
where name = 'story_opener';

update hook_types set 
  classification_keywords = ARRAY['$', 'revenue', 'generated', 'made', 'earned', 'grew', 'increased', 'result'],
  classification_patterns = ARRAY['\$\d+', '\d+%.*growth', 'from.*to', '\d+x'],
  prompt_instruction = 'Mets en avant un résultat concret et impressionnant. Utilise des métriques précises (revenus, croissance, temps).'
where name = 'result';

update hook_types set 
  classification_keywords = ARRAY['you', 'your', 'tu', 'ton', 'ta', 'tes', 'vous', 'votre'],
  classification_patterns = ARRAY['^you', '^tu', '^vous', 'your.*is', 'ton.*est'],
  prompt_instruction = 'Adresse-toi directement au lecteur avec "Tu" ou "Vous". Crée une connexion personnelle immédiate.'
where name = 'direct_address';

update hook_types set 
  classification_keywords = ARRAY['tired', 'frustrated', 'struggling', 'hate', 'problem', 'issue', 'marre', 'difficile'],
  classification_patterns = ARRAY['^tired of', '^marre de', 'struggling with', 'le problème'],
  prompt_instruction = 'Identifie une frustration commune de ton audience. Montre que tu comprends leur douleur.'
where name = 'pain_point';

update hook_types set 
  classification_keywords = ARRAY['secret', 'nobody', 'hidden', 'unknown', 'discover', 'reveal', 'personne ne'],
  classification_patterns = ARRAY['secret', 'nobody.*knows', 'personne ne.*sait', 'ce que.*cache'],
  prompt_instruction = 'Crée un gap d''information qui pousse à lire la suite. Promets une révélation exclusive.'
where name = 'curiosity_gap';

update hook_types set 
  classification_keywords = ARRAY['after', 'years of', 'experience', 'worked with', 'clients', 'companies', 'après'],
  classification_patterns = ARRAY['after \d+', 'après \d+', '\d+ (clients|companies|années)'],
  prompt_instruction = 'Établis ta crédibilité avec ton expérience ou tes accomplissements. Utilise des chiffres concrets.'
where name = 'social_proof';

update hook_types set 
  classification_keywords = ARRAY['this', 'everything', 'changed', 'truth', 'reality', 'fact', 'brutal'],
  classification_patterns = ARRAY['^this', '^the truth', '^here''s', 'brutal truth'],
  prompt_instruction = 'Fais une affirmation forte et directe qui capte l''attention. Sois audacieux et confiant.'
where name = 'bold_claim';

-- 4. Enable RLS
alter table generated_hooks enable row level security;

-- 5. Create RLS policies
create policy "Allow all for authenticated users" on generated_hooks for all using (true);

-- 6. Create indexes for performance
create index idx_generated_hooks_post on generated_hooks(production_post_id);
create index idx_generated_hooks_type on generated_hooks(hook_type_id);
create index idx_generated_hooks_selected on generated_hooks(is_selected) where is_selected = true;

-- 7. Add constraint: only one selected hook per post
create unique index idx_one_selected_hook_per_post 
  on generated_hooks(production_post_id) 
  where is_selected = true;

-- 8. Create function to get hooks with their type info
create or replace function get_hooks_with_classification(p_post_id uuid)
returns table (
  id uuid,
  text text,
  score int,
  is_selected boolean,
  hook_type_name text,
  hook_type_description text,
  prompt_instruction text
) language sql stable as $$
  select 
    gh.id,
    gh.text,
    gh.score,
    gh.is_selected,
    ht.name as hook_type_name,
    ht.description as hook_type_description,
    ht.prompt_instruction
  from generated_hooks gh
  left join hook_types ht on gh.hook_type_id = ht.id
  where gh.production_post_id = p_post_id
  order by gh.score desc;
$$;
