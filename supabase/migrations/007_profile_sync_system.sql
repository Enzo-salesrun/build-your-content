-- Migration: Profile Sync System
-- Weekly scraping of LinkedIn profiles for new posts and cascade updates

-- Track sync job executions
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('profile_scrape', 'embedding_update', 'hook_classification', 'style_analysis', 'full_cascade')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  
  -- Stats
  profiles_processed INTEGER DEFAULT 0,
  posts_scraped INTEGER DEFAULT 0,
  posts_new INTEGER DEFAULT 0,
  embeddings_updated INTEGER DEFAULT 0,
  hooks_classified INTEGER DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track individual profile sync status
CREATE TABLE IF NOT EXISTS public.profile_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Sync tracking
  last_scraped_at TIMESTAMPTZ,
  last_post_date TIMESTAMPTZ,
  total_posts_scraped INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  sync_priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
  
  -- Error tracking
  consecutive_failures INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add scrape metadata to viral_posts_bank
ALTER TABLE public.viral_posts_bank 
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS original_post_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS needs_embedding BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS needs_hook_classification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT now();

-- Add sync metadata to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_style_analysis_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_engagement NUMERIC;

-- Indexes for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON public.sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_type_created ON public.sync_jobs(job_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_sync_active ON public.profile_sync_status(sync_enabled, is_active);
CREATE INDEX IF NOT EXISTS idx_profile_sync_last_scraped ON public.profile_sync_status(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_viral_posts_needs_embedding ON public.viral_posts_bank(needs_embedding) WHERE needs_embedding = true;
CREATE INDEX IF NOT EXISTS idx_viral_posts_needs_classification ON public.viral_posts_bank(needs_hook_classification) WHERE needs_hook_classification = true;
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON public.profiles(linkedin_id) WHERE linkedin_id IS NOT NULL;

-- Function to get profiles needing sync
CREATE OR REPLACE FUNCTION get_profiles_to_sync(max_profiles INTEGER DEFAULT 20)
RETURNS TABLE (
  profile_id UUID,
  linkedin_id TEXT,
  full_name TEXT,
  last_scraped_at TIMESTAMPTZ,
  sync_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.linkedin_id,
    p.full_name,
    pss.last_scraped_at,
    COALESCE(pss.sync_priority, 1) as sync_priority
  FROM public.profiles p
  LEFT JOIN public.profile_sync_status pss ON p.id = pss.profile_id
  WHERE 
    p.linkedin_id IS NOT NULL
    AND p.type = 'external_influencer'
    AND (pss.sync_enabled IS NULL OR pss.sync_enabled = true)
    AND (pss.is_active IS NULL OR pss.is_active = true)
    AND (pss.consecutive_failures IS NULL OR pss.consecutive_failures < 5)
    AND (
      pss.last_scraped_at IS NULL 
      OR pss.last_scraped_at < now() - INTERVAL '7 days'
    )
  ORDER BY 
    pss.sync_priority ASC NULLS FIRST,
    pss.last_scraped_at ASC NULLS FIRST
  LIMIT max_profiles;
END;
$$ LANGUAGE plpgsql;

-- Function to get posts needing embedding
CREATE OR REPLACE FUNCTION get_posts_needing_embedding(max_posts INTEGER DEFAULT 100)
RETURNS TABLE (
  post_id UUID,
  content TEXT,
  hook TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as post_id,
    vpb.content,
    vpb.hook
  FROM public.viral_posts_bank vpb
  WHERE 
    vpb.needs_embedding = true
    AND vpb.embedding IS NULL
  ORDER BY vpb.created_at DESC
  LIMIT max_posts;
END;
$$ LANGUAGE plpgsql;

-- Function to get posts needing hook classification
CREATE OR REPLACE FUNCTION get_posts_needing_classification(max_posts INTEGER DEFAULT 100)
RETURNS TABLE (
  post_id UUID,
  hook TEXT,
  content TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as post_id,
    vpb.hook,
    vpb.content
  FROM public.viral_posts_bank vpb
  WHERE 
    vpb.needs_hook_classification = true
    AND vpb.hook_type_id IS NULL
    AND vpb.hook IS NOT NULL
    AND vpb.hook != ''
  ORDER BY vpb.created_at DESC
  LIMIT max_posts;
END;
$$ LANGUAGE plpgsql;

-- Function to update profile stats after sync
CREATE OR REPLACE FUNCTION update_profile_stats(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET 
    posts_count = (
      SELECT COUNT(*) FROM public.viral_posts_bank WHERE author_id = p_profile_id
    ),
    avg_engagement = (
      SELECT AVG(COALESCE((metrics->>'likes')::numeric, 0) + COALESCE((metrics->>'comments')::numeric, 0))
      FROM public.viral_posts_bank 
      WHERE author_id = p_profile_id
    )
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_updated_at on viral_posts_bank
CREATE OR REPLACE FUNCTION update_viral_post_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_viral_post_timestamp ON public.viral_posts_bank;
CREATE TRIGGER update_viral_post_timestamp
  BEFORE UPDATE ON public.viral_posts_bank
  FOR EACH ROW EXECUTE FUNCTION update_viral_post_timestamp();

-- Trigger to update profile_sync_status.updated_at
DROP TRIGGER IF EXISTS update_profile_sync_status_timestamp ON public.profile_sync_status;
CREATE TRIGGER update_profile_sync_status_timestamp
  BEFORE UPDATE ON public.profile_sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_sync_status ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users
CREATE POLICY "Authenticated users can view sync jobs" ON public.sync_jobs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view profile sync status" ON public.profile_sync_status
  FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access sync_jobs" ON public.sync_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access profile_sync_status" ON public.profile_sync_status
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.sync_jobs IS 'Tracks execution of sync jobs (scraping, embedding, classification)';
COMMENT ON TABLE public.profile_sync_status IS 'Tracks sync status per profile for incremental updates';
COMMENT ON FUNCTION get_profiles_to_sync IS 'Returns profiles that need to be scraped (not scraped in 7+ days)';
COMMENT ON FUNCTION get_posts_needing_embedding IS 'Returns posts that need embedding generation';
COMMENT ON FUNCTION get_posts_needing_classification IS 'Returns posts that need hook type classification';
