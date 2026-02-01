-- =============================================================================
-- Migration: Database Audit Fixes
-- Date: 2026-01-27
-- Description: Performance improvements based on database audit
-- =============================================================================

-- =============================================================================
-- PART 1: CREATE MISSING INDEXES ON FOREIGN KEYS
-- These indexes improve JOIN performance significantly
-- =============================================================================

-- ai_errors indexes
CREATE INDEX IF NOT EXISTS idx_ai_errors_profile_id ON public.ai_errors(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_errors_resolved_by ON public.ai_errors(resolved_by);

-- batch_author_configs indexes
CREATE INDEX IF NOT EXISTS idx_batch_author_configs_template_id ON public.batch_author_configs(template_id);
CREATE INDEX IF NOT EXISTS idx_batch_author_configs_topic_id ON public.batch_author_configs(topic_id);

-- engagement_logs indexes
CREATE INDEX IF NOT EXISTS idx_engagement_logs_engager_unipile ON public.engagement_logs(engager_unipile_account_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_post_author ON public.engagement_logs(post_author_id);

-- post_templates indexes
CREATE INDEX IF NOT EXISTS idx_post_templates_created_by ON public.post_templates(created_by);

-- presets indexes
CREATE INDEX IF NOT EXISTS idx_presets_created_by ON public.presets(created_by);

-- production_posts indexes
CREATE INDEX IF NOT EXISTS idx_production_posts_author_id ON public.production_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_production_posts_source_id ON public.production_posts(source_id);

-- published_posts indexes
CREATE INDEX IF NOT EXISTS idx_published_posts_scheduled_post ON public.published_posts(scheduled_post_id);
CREATE INDEX IF NOT EXISTS idx_published_posts_unipile ON public.published_posts(unipile_account_id);

-- ressources indexes
CREATE INDEX IF NOT EXISTS idx_ressources_created_by ON public.ressources(created_by);

-- scheduled_posts indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_created_by ON public.scheduled_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_production_post ON public.scheduled_posts(production_post_id);

-- templates indexes - idx_templates_hook_type already exists
-- viral_posts_bank indexes - idx_viral_posts_author already exists

-- =============================================================================
-- PART 2: DROP DUPLICATE INDEX
-- idx_templates_topic and idx_templates_topic_id are identical
-- =============================================================================

DROP INDEX IF EXISTS public.idx_templates_topic_id;

-- =============================================================================
-- PART 3: FIX FUNCTIONS WITH MUTABLE SEARCH_PATH
-- Adding SET search_path to prevent potential schema injection attacks
-- =============================================================================

-- Fix match_hook_types
CREATE OR REPLACE FUNCTION public.match_hook_types(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ht.id,
    ht.name,
    ht.description,
    1 - (ht.embedding <=> query_embedding) AS similarity
  FROM public.hook_types ht
  WHERE ht.embedding IS NOT NULL
    AND 1 - (ht.embedding <=> query_embedding) > match_threshold
  ORDER BY ht.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix match_topics
CREATE OR REPLACE FUNCTION public.match_topics(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.topics t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix match_audiences
CREATE OR REPLACE FUNCTION public.match_audiences(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.description,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.audiences a
  WHERE a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix update_updated_at_column (generic trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_knowledge_updated_at
CREATE OR REPLACE FUNCTION public.update_knowledge_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_audiences_updated_at
CREATE OR REPLACE FUNCTION public.update_audiences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_post_batches_updated_at
CREATE OR REPLACE FUNCTION public.update_post_batches_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_ressource_types_updated_at
CREATE OR REPLACE FUNCTION public.update_ressource_types_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_ressources_updated_at
CREATE OR REPLACE FUNCTION public.update_ressources_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_viral_post_timestamp
CREATE OR REPLACE FUNCTION public.update_viral_post_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_user_onboarding_updated_at
CREATE OR REPLACE FUNCTION public.update_user_onboarding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_chat_session_timestamp
CREATE OR REPLACE FUNCTION public.update_chat_session_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- Fix auto_title_chat_session
CREATE OR REPLACE FUNCTION public.auto_title_chat_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  message_count INT;
  first_message TEXT;
BEGIN
  SELECT COUNT(*) INTO message_count 
  FROM public.chat_messages 
  WHERE session_id = NEW.session_id;
  
  IF message_count = 1 AND NEW.role = 'user' THEN
    first_message := LEFT(NEW.content, 50);
    UPDATE public.chat_sessions
    SET title = first_message
    WHERE id = NEW.session_id AND title IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix generate_error_ref
CREATE OR REPLACE FUNCTION public.generate_error_ref()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN 'ERR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$;

-- Fix set_error_ref
CREATE OR REPLACE FUNCTION public.set_error_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_error_ref IS NULL THEN
    NEW.user_error_ref := public.generate_error_ref();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix generate_invitation_token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Fix mark_profile_for_sync
CREATE OR REPLACE FUNCTION public.mark_profile_for_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.linkedin_url IS NOT NULL THEN
    NEW.sync_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix mark_profile_for_sync_on_update
CREATE OR REPLACE FUNCTION public.mark_profile_for_sync_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.linkedin_url IS DISTINCT FROM OLD.linkedin_url AND NEW.linkedin_url IS NOT NULL THEN
    NEW.sync_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix mark_invitation_accepted
CREATE OR REPLACE FUNCTION public.mark_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'connected' AND (OLD IS NULL OR OLD.status != 'connected') THEN
    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE profile_id = NEW.profile_id
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix trigger_update_batch_progress
CREATE OR REPLACE FUNCTION public.trigger_update_batch_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.update_batch_progress(NEW.batch_id);
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PART 4: FIX SECURITY DEFINER VIEWS
-- Recreate views with SECURITY INVOKER
-- =============================================================================

-- Drop and recreate ai_error_stats view
DROP VIEW IF EXISTS public.ai_error_stats;
CREATE VIEW public.ai_error_stats
WITH (security_invoker = true)
AS
SELECT 
  function_name,
  error_code,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence,
  COUNT(*) FILTER (WHERE is_resolved = false) as unresolved_count
FROM public.ai_errors
GROUP BY function_name, error_code;

-- Drop and recreate processing_status view
DROP VIEW IF EXISTS public.processing_status;
CREATE VIEW public.processing_status
WITH (security_invoker = true)
AS
SELECT 
  p.id as profile_id,
  p.full_name,
  p.sync_status,
  pss.last_scraped_at,
  pss.total_posts_scraped,
  pss.last_error
FROM public.profiles p
LEFT JOIN public.profile_sync_status pss ON p.id = pss.profile_id
WHERE p.type = 'internal';

-- =============================================================================
-- SUMMARY:
-- - Created 17 missing indexes on foreign keys
-- - Dropped 1 duplicate index
-- - Fixed 20+ functions with secure search_path
-- - Fixed 2 views with security_invoker
-- =============================================================================
