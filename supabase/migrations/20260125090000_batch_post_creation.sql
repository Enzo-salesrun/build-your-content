-- Migration: Support batch post creation
-- Adds post_batches table and extends production_posts for the new workflow

-- ============================================
-- 1. CREATE POST_BATCHES TABLE
-- ============================================
-- Groups multiple posts created from the same source/idea

DO $$ BEGIN
  CREATE TYPE batch_mode AS ENUM ('single', 'multi');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

create table if not exists post_batches (
  id uuid default gen_random_uuid() primary key,
  
  -- Source content (shared by all posts in batch)
  source_text text not null,
  
  -- Batch configuration
  mode batch_mode default 'single',
  language text default 'fr' check (language in ('fr', 'en')),
  
  -- Metadata
  total_posts int default 0,
  completed_posts int default 0,
  
  -- Status tracking
  status text default 'draft' check (status in ('draft', 'generating_hooks', 'hooks_ready', 'generating_bodies', 'bodies_ready', 'publishing', 'completed', 'failed')),
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

-- ============================================
-- 2. EXTEND PRODUCTION_POSTS TABLE
-- ============================================
-- Add batch reference and slot-specific config

-- Add batch reference
alter table production_posts
  add column if not exists batch_id uuid references post_batches(id) on delete set null;

-- Add template reference (per-author config)
alter table production_posts
  add column if not exists template_id uuid references post_templates(id);

-- Add audience reference if not exists
alter table production_posts
  add column if not exists audience_id uuid references audiences(id);

-- Add knowledge references (JSONB array of IDs)
alter table production_posts
  add column if not exists knowledge_ids uuid[] default '{}';

-- Add slot order within batch
alter table production_posts
  add column if not exists batch_slot_order int default 0;

-- Add generated body storage (structured)
alter table production_posts
  add column if not exists generated_body_intro text,
  add column if not exists generated_body_main text,
  add column if not exists generated_body_conclusion text;

-- Add final content (hook + body + cta combined)
alter table production_posts
  add column if not exists final_content text;

-- ============================================
-- 3. CREATE BATCH_AUTHOR_CONFIG TABLE
-- ============================================
-- Stores per-author configuration within a batch

create table if not exists batch_author_configs (
  id uuid default gen_random_uuid() primary key,
  
  -- Links
  batch_id uuid not null references post_batches(id) on delete cascade,
  author_id uuid not null references profiles(id),
  
  -- Author-specific config for this batch
  topic_id uuid references topics(id),
  template_id uuid references post_templates(id),
  knowledge_ids uuid[] default '{}',
  
  -- Metadata
  created_at timestamptz default now(),
  
  -- Ensure unique author per batch
  unique(batch_id, author_id)
);

-- ============================================
-- 4. UPDATE POST_STATUS ENUM
-- ============================================
-- Add new statuses for batch workflow

alter type post_status add value if not exists 'pending';
alter type post_status add value if not exists 'hooks_generating';
alter type post_status add value if not exists 'body_generating';
alter type post_status add value if not exists 'ready';

-- ============================================
-- 5. CREATE INDEXES
-- ============================================

create index if not exists idx_production_posts_batch on production_posts(batch_id);
create index if not exists idx_production_posts_audience on production_posts(audience_id);
create index if not exists idx_production_posts_template on production_posts(template_id);
create index if not exists idx_batch_author_configs_batch on batch_author_configs(batch_id);
create index if not exists idx_batch_author_configs_author on batch_author_configs(author_id);
create index if not exists idx_post_batches_status on post_batches(status);

-- ============================================
-- 6. ENABLE RLS
-- ============================================

alter table post_batches enable row level security;
alter table batch_author_configs enable row level security;

DO $$ BEGIN
  CREATE POLICY "Allow all for authenticated users" ON post_batches FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all for authenticated users" ON batch_author_configs FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to create a batch with its posts
create or replace function create_post_batch(
  p_source_text text,
  p_mode batch_mode,
  p_language text,
  p_slots jsonb -- Array of { author_id, topic_id, template_id, audience_id, knowledge_ids }
)
returns uuid
language plpgsql
as $$
declare
  v_batch_id uuid;
  v_slot jsonb;
  v_post_id uuid;
  v_slot_order int := 0;
begin
  -- Create batch
  insert into post_batches (source_text, mode, language, total_posts)
  values (p_source_text, p_mode, p_language, jsonb_array_length(p_slots))
  returning id into v_batch_id;
  
  -- Create production posts for each slot
  for v_slot in select * from jsonb_array_elements(p_slots)
  loop
    insert into production_posts (
      batch_id,
      author_id,
      topic_id,
      template_id,
      audience_id,
      knowledge_ids,
      batch_slot_order,
      status
    ) values (
      v_batch_id,
      (v_slot->>'author_id')::uuid,
      (v_slot->>'topic_id')::uuid,
      (v_slot->>'template_id')::uuid,
      (v_slot->>'audience_id')::uuid,
      coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(v_slot->'knowledge_ids') x), '{}'),
      v_slot_order,
      'pending'
    );
    v_slot_order := v_slot_order + 1;
  end loop;
  
  return v_batch_id;
end;
$$;

-- Function to get batch with all its posts
create or replace function get_batch_with_posts(p_batch_id uuid)
returns table (
  batch_id uuid,
  source_text text,
  mode batch_mode,
  language text,
  batch_status text,
  post_id uuid,
  author_id uuid,
  author_name text,
  topic_id uuid,
  topic_name text,
  audience_id uuid,
  audience_name text,
  template_id uuid,
  template_name text,
  post_status post_status,
  slot_order int,
  hooks_count int,
  selected_hook_text text
)
language sql stable
as $$
  select 
    b.id as batch_id,
    b.source_text,
    b.mode,
    b.language,
    b.status as batch_status,
    pp.id as post_id,
    pp.author_id,
    p.full_name as author_name,
    pp.topic_id,
    t.name as topic_name,
    pp.audience_id,
    a.name as audience_name,
    pp.template_id,
    pt.name as template_name,
    pp.status as post_status,
    pp.batch_slot_order as slot_order,
    (select count(*) from generated_hooks gh where gh.production_post_id = pp.id)::int as hooks_count,
    (select gh.text from generated_hooks gh where gh.production_post_id = pp.id and gh.is_selected = true limit 1) as selected_hook_text
  from post_batches b
  left join production_posts pp on pp.batch_id = b.id
  left join profiles p on pp.author_id = p.id
  left join topics t on pp.topic_id = t.id
  left join audiences a on pp.audience_id = a.id
  left join post_templates pt on pp.template_id = pt.id
  where b.id = p_batch_id
  order by pp.batch_slot_order;
$$;

-- Function to update batch progress
create or replace function update_batch_progress(p_batch_id uuid)
returns void
language plpgsql
as $$
declare
  v_total int;
  v_completed int;
  v_all_hooks_done boolean;
  v_all_bodies_done boolean;
begin
  -- Count posts
  select 
    count(*),
    count(*) filter (where status in ('ready', 'validated', 'scheduled', 'published'))
  into v_total, v_completed
  from production_posts
  where batch_id = p_batch_id;
  
  -- Check if all hooks are done
  select bool_and(
    exists (select 1 from generated_hooks where production_post_id = pp.id and is_selected = true)
  )
  into v_all_hooks_done
  from production_posts pp
  where pp.batch_id = p_batch_id;
  
  -- Check if all bodies are done
  select bool_and(final_content is not null and final_content != '')
  into v_all_bodies_done
  from production_posts
  where batch_id = p_batch_id;
  
  -- Update batch
  update post_batches
  set 
    completed_posts = v_completed,
    status = case
      when v_completed = v_total then 'completed'
      when v_all_bodies_done then 'bodies_ready'
      when v_all_hooks_done then 'hooks_ready'
      else status
    end,
    completed_at = case when v_completed = v_total then now() else null end,
    updated_at = now()
  where id = p_batch_id;
end;
$$;

-- ============================================
-- 8. TRIGGER TO AUTO-UPDATE BATCH PROGRESS
-- ============================================

create or replace function trigger_update_batch_progress()
returns trigger
language plpgsql
as $$
begin
  if NEW.batch_id is not null then
    perform update_batch_progress(NEW.batch_id);
  end if;
  return NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_production_post_update_batch ON production_posts;
CREATE TRIGGER trg_production_post_update_batch
  AFTER UPDATE ON production_posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_batch_progress();

-- ============================================
-- 9. UPDATE TIMESTAMP TRIGGER
-- ============================================

create or replace function update_post_batches_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_post_batches_updated_at ON post_batches;
CREATE TRIGGER set_post_batches_updated_at
  BEFORE UPDATE ON post_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_post_batches_updated_at();
