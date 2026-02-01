-- Extensions
create extension if not exists vector;

-- Enums
create type post_status as enum ('draft_input', 'hook_gen', 'hook_selected', 'body_gen', 'validated', 'scheduled', 'published');
create type author_type as enum ('internal', 'external_influencer');

-- 1. Table PROFILS (Auteurs)
create table profiles (
  id uuid default gen_random_uuid() primary key,
  linkedin_id text unique,
  full_name text not null,
  type author_type default 'internal',
  writing_style_prompt text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. Table VIRAL_POSTS_BANK (RAG)
create table viral_posts_bank (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  hook text,
  metrics jsonb default '{"likes":0}',
  embedding vector(1536),
  created_at timestamptz default now()
);

-- 3. Table CONTENT_SOURCES (Input)
create table content_sources (
  id uuid default gen_random_uuid() primary key,
  raw_text text not null,
  summary text,
  created_at timestamptz default now()
);

-- 4. Table PRODUCTION_POSTS (Output)
create table production_posts (
  id uuid default gen_random_uuid() primary key,
  source_id uuid references content_sources(id),
  author_id uuid references profiles(id),
  status post_status default 'draft_input',
  target_topic text,
  
  -- JSONB STORAGE
  ai_hooks_draft jsonb,
  selected_hook_data jsonb,
  ai_body_draft jsonb,
  user_feedback_history jsonb default '[]',
  
  publication_date timestamptz,
  created_at timestamptz default now()
);

-- Index Vectoriel
create index on viral_posts_bank using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS Policies (basic - enable for all authenticated users)
alter table profiles enable row level security;
alter table viral_posts_bank enable row level security;
alter table content_sources enable row level security;
alter table production_posts enable row level security;

create policy "Allow all for authenticated users" on profiles for all using (true);
create policy "Allow all for authenticated users" on viral_posts_bank for all using (true);
create policy "Allow all for authenticated users" on content_sources for all using (true);
create policy "Allow all for authenticated users" on production_posts for all using (true);
