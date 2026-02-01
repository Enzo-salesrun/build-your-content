-- Migration: Add knowledge base for enterprise content
-- This allows the team to insert company knowledge to help AI write better content

-- 1. Create knowledge type enum
create type knowledge_type as enum (
  'product',
  'case_study',
  'testimonial',
  'methodology',
  'statistics',
  'faq',
  'talking_points',
  'competitor_info',
  'industry_trends',
  'company_values',
  'custom'
);

-- 2. Create topics table (if not exists)
create table if not exists topics (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  color text default '#6B7280',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Create knowledge table
create table knowledge (
  id uuid default gen_random_uuid() primary key,
  
  -- Basic info
  title text not null,
  content text not null,
  summary text,
  
  -- Classification
  knowledge_type knowledge_type not null default 'custom',
  tags text[] default '{}',
  
  -- Source tracking
  source_url text,
  source_name text,
  
  -- Usage tracking
  usage_count int default 0,
  last_used_at timestamptz,
  
  -- Status
  is_active boolean default true,
  is_verified boolean default false,
  
  -- Ownership
  created_by uuid references profiles(id),
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Create topic_knowledge junction table (many-to-many)
create table topic_knowledge (
  id uuid default gen_random_uuid() primary key,
  topic_id uuid not null references topics(id) on delete cascade,
  knowledge_id uuid not null references knowledge(id) on delete cascade,
  relevance_score int default 100,
  created_at timestamptz default now(),
  
  -- Ensure unique combinations
  unique(topic_id, knowledge_id)
);

-- 5. Add topic_id to production_posts for topic tracking
alter table production_posts 
  add column if not exists topic_id uuid references topics(id);

-- 6. Enable RLS
alter table topics enable row level security;
alter table knowledge enable row level security;
alter table topic_knowledge enable row level security;

-- 7. Create RLS policies
create policy "Topics are viewable by everyone"
  on topics for select using (true);

create policy "Topics are insertable by authenticated users"
  on topics for insert with check (true);

create policy "Topics are updatable by authenticated users"
  on topics for update using (true);

create policy "Knowledge is viewable by everyone"
  on knowledge for select using (true);

create policy "Knowledge is insertable by authenticated users"
  on knowledge for insert with check (true);

create policy "Knowledge is updatable by authenticated users"
  on knowledge for update using (true);

create policy "Topic_knowledge is viewable by everyone"
  on topic_knowledge for select using (true);

create policy "Topic_knowledge is insertable by authenticated users"
  on topic_knowledge for insert with check (true);

create policy "Topic_knowledge is deletable by authenticated users"
  on topic_knowledge for delete using (true);

-- 8. Create indexes
create index idx_knowledge_type on knowledge(knowledge_type);
create index idx_knowledge_is_active on knowledge(is_active);
create index idx_knowledge_created_by on knowledge(created_by);
create index idx_topic_knowledge_topic on topic_knowledge(topic_id);
create index idx_topic_knowledge_knowledge on topic_knowledge(knowledge_id);
create index idx_topics_is_active on topics(is_active);
create index idx_production_posts_topic on production_posts(topic_id);

-- 9. Create function to update usage stats
create or replace function update_knowledge_usage()
returns trigger as $$
begin
  -- Update usage when knowledge is linked to a topic that's used in a post
  update knowledge 
  set usage_count = usage_count + 1,
      last_used_at = now()
  where id in (
    select knowledge_id from topic_knowledge where topic_id = NEW.topic_id
  );
  return NEW;
end;
$$ language plpgsql;

-- 10. Create updated_at triggers
create or replace function update_knowledge_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger set_knowledge_updated_at
  before update on knowledge
  for each row
  execute function update_knowledge_updated_at();

create or replace function update_topics_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger set_topics_updated_at
  before update on topics
  for each row
  execute function update_topics_updated_at();

-- 11. Insert default topics
insert into topics (name, slug, description, color) values
('Growth & Acquisition', 'growth-acquisition', 'Stratégies de croissance, acquisition clients, lead generation', '#10B981'),
('Sales & Prospection', 'sales-prospection', 'Techniques de vente, prospection, closing', '#3B82F6'),
('Product & Tech', 'product-tech', 'Produit, technologie, développement, innovation', '#8B5CF6'),
('Leadership & Management', 'leadership-management', 'Leadership, gestion d''équipe, culture d''entreprise', '#F59E0B'),
('Personal Branding', 'personal-branding', 'Marque personnelle, storytelling, carrière', '#EC4899'),
('Marketing & Content', 'marketing-content', 'Marketing digital, content marketing, SEO', '#06B6D4'),
('Entrepreneurship', 'entrepreneurship', 'Entrepreneuriat, startup, levée de fonds', '#EF4444'),
('AI & Automation', 'ai-automation', 'Intelligence artificielle, automatisation, outils', '#6366F1')
on conflict (slug) do nothing;

-- 12. Insert example knowledge entries
insert into knowledge (title, content, summary, knowledge_type, tags, is_verified) values
(
  'Proposition de valeur principale',
  'Notre solution permet aux équipes sales de générer 3x plus de meetings qualifiés en automatisant la prospection multicanale tout en gardant une approche personnalisée.',
  'Proposition de valeur: 3x plus de meetings qualifiés via prospection automatisée personnalisée',
  'talking_points',
  array['value-prop', 'sales', 'automation'],
  true
),
(
  'Statistique clé - Taux de réponse',
  'Nos clients observent en moyenne un taux de réponse de 12% sur leurs campagnes outbound, contre 2-3% pour la moyenne du marché.',
  'Taux de réponse: 12% vs 2-3% marché',
  'statistics',
  array['stats', 'outbound', 'performance'],
  true
),
(
  'Méthodologie AIDA pour les hooks',
  'Attention: Capturer l''attention avec une accroche forte. Interest: Susciter l''intérêt avec un problème reconnaissable. Desire: Créer le désir avec une solution. Action: Appeler à l''action claire.',
  'Framework AIDA: Attention → Interest → Desire → Action',
  'methodology',
  array['copywriting', 'framework', 'hooks'],
  true
);
