-- Migration: Fix missing classification columns and RPC functions
-- Fixes the profile sync workflow to properly classify topics and audiences

-- Add missing columns to viral_posts_bank
ALTER TABLE public.viral_posts_bank 
ADD COLUMN IF NOT EXISTS needs_topic_classification BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS needs_audience_classification BOOLEAN DEFAULT true;

-- Update existing posts that already have topic/audience to not need classification
UPDATE public.viral_posts_bank 
SET needs_topic_classification = false 
WHERE topic_id IS NOT NULL;

UPDATE public.viral_posts_bank 
SET needs_audience_classification = false 
WHERE audience_id IS NOT NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_viral_posts_needs_topic ON public.viral_posts_bank(needs_topic_classification) 
WHERE needs_topic_classification = true;

CREATE INDEX IF NOT EXISTS idx_viral_posts_needs_audience ON public.viral_posts_bank(needs_audience_classification) 
WHERE needs_audience_classification = true;

-- Function to get posts needing topic classification
DROP FUNCTION IF EXISTS get_posts_needing_topic_classification(integer);
CREATE OR REPLACE FUNCTION get_posts_needing_topic_classification(max_posts INTEGER DEFAULT 50)
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
    vpb.needs_topic_classification = true
    AND vpb.topic_id IS NULL
    AND vpb.content IS NOT NULL
    AND vpb.content != ''
  ORDER BY vpb.created_at DESC
  LIMIT max_posts;
END;
$$ LANGUAGE plpgsql;

-- Function to get posts needing audience classification
DROP FUNCTION IF EXISTS get_posts_needing_audience_classification(integer);
CREATE OR REPLACE FUNCTION get_posts_needing_audience_classification(max_posts INTEGER DEFAULT 50)
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
    vpb.needs_audience_classification = true
    AND vpb.audience_id IS NULL
    AND vpb.content IS NOT NULL
    AND vpb.content != ''
  ORDER BY vpb.created_at DESC
  LIMIT max_posts;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_posts_needing_topic_classification IS 'Returns posts that need topic classification';
COMMENT ON FUNCTION get_posts_needing_audience_classification IS 'Returns posts that need audience classification';
