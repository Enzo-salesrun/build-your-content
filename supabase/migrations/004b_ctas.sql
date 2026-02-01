-- Migration: Add CTAs (Call-to-Action) table for reusable CTAs
-- This allows the team to create, edit, and reuse CTAs across posts

-- 1. Create CTA types enum
create type cta_type as enum (
  'calendar_link',
  'newsletter',
  'product',
  'lead_magnet',
  'social_follow',
  'website',
  'custom'
);

-- 2. Create CTAs table
create table ctas (
  id uuid default gen_random_uuid() primary key,
  
  -- Basic info
  name text not null,
  description text,
  
  -- CTA content
  cta_type cta_type not null default 'custom',
  text_template text not null,
  url text,
  
  -- Calendar-specific fields
  calendar_provider text, -- 'calendly', 'cal.com', 'hubspot', 'acuity', etc.
  calendar_event_type text, -- e.g., '30-min-discovery', 'strategy-call'
  
  -- Usage tracking
  usage_count int default 0,
  last_used_at timestamptz,
  
  -- Organization
  is_active boolean default true,
  is_favorite boolean default false,
  tags text[] default '{}',
  
  -- Ownership
  created_by uuid references profiles(id),
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Add cta_id to production_posts for tracking which CTA was used
alter table production_posts 
  add column cta_id uuid references ctas(id);

-- 4. Enable RLS
alter table ctas enable row level security;

-- 5. Create RLS policies
create policy "CTAs are viewable by everyone"
  on ctas for select
  using (true);

create policy "CTAs are insertable by authenticated users"
  on ctas for insert
  with check (true);

create policy "CTAs are updatable by authenticated users"
  on ctas for update
  using (true);

-- 6. Create indexes
create index idx_ctas_type on ctas(cta_type);
create index idx_ctas_is_active on ctas(is_active);
create index idx_ctas_is_favorite on ctas(is_favorite);
create index idx_ctas_created_by on ctas(created_by);
create index idx_production_posts_cta on production_posts(cta_id);

-- 7. Create function to update usage stats
create or replace function update_cta_usage()
returns trigger as $$
begin
  if NEW.cta_id is not null and (OLD.cta_id is null or NEW.cta_id != OLD.cta_id) then
    update ctas 
    set usage_count = usage_count + 1,
        last_used_at = now()
    where id = NEW.cta_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- 8. Create trigger for usage tracking
create trigger track_cta_usage
  after insert or update on production_posts
  for each row
  execute function update_cta_usage();

-- 9. Insert default CTAs
insert into ctas (name, description, cta_type, text_template, url, calendar_provider, is_favorite, tags) values
(
  'Calendly - Discovery Call',
  'Lien Calendly pour un appel découverte de 30 minutes',
  'calendar_link',
  '📅 Réservez un appel découverte gratuit de 30 minutes: {{url}}',
  null,
  'calendly',
  true,
  array['calendar', 'discovery', 'sales']
),
(
  'Cal.com - Strategy Session',
  'Lien Cal.com pour une session stratégie',
  'calendar_link',
  '🎯 Prenez rendez-vous pour une session stratégie: {{url}}',
  null,
  'cal.com',
  false,
  array['calendar', 'strategy']
),
(
  'Newsletter Signup',
  'Inscription à la newsletter',
  'newsletter',
  '📬 Rejoignez {{subscriber_count}}+ abonnés qui reçoivent mes conseils chaque semaine: {{url}}',
  null,
  null,
  true,
  array['newsletter', 'lead-gen']
),
(
  'Free Resource Download',
  'Téléchargement d''une ressource gratuite',
  'lead_magnet',
  '🎁 Téléchargez gratuitement mon guide: {{url}}',
  null,
  null,
  false,
  array['lead-magnet', 'download']
),
(
  'Comment Engagement',
  'Demande de commentaire pour engagement',
  'custom',
  '💬 Commentez "{{keyword}}" et je vous envoie {{resource}} en DM.',
  null,
  null,
  true,
  array['engagement', 'comments']
),
(
  'Question Engagement',
  'Question ouverte pour engagement',
  'custom',
  '👇 Quelle est votre plus grande difficulté avec {{topic}}? Partagez en commentaire.',
  null,
  null,
  true,
  array['engagement', 'question']
),
(
  'Repost Request',
  'Demande de repost',
  'social_follow',
  '♻️ Si ce post vous a aidé, repostez-le pour aider votre réseau.',
  null,
  null,
  false,
  array['engagement', 'repost']
),
(
  'Follow CTA',
  'Demande de follow',
  'social_follow',
  '🔔 Suivez-moi pour plus de conseils sur {{topic}}.',
  null,
  null,
  false,
  array['follow', 'growth']
);

-- 10. Create updated_at trigger
create or replace function update_ctas_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger set_ctas_updated_at
  before update on ctas
  for each row
  execute function update_ctas_updated_at();
