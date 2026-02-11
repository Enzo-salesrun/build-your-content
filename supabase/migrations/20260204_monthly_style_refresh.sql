-- Migration: Monthly Writing Style Refresh
-- This creates a cron job that refreshes writing styles monthly using latest posts

-- Function to trigger style refresh for all active profiles
CREATE OR REPLACE FUNCTION public.trigger_monthly_style_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profiles RECORD;
  v_count INT := 0;
BEGIN
  -- Find profiles with:
  -- 1. LinkedIn ID (external creators)
  -- 2. At least 10 posts scraped
  -- 3. Last style analysis > 30 days ago OR never analyzed
  FOR v_profiles IN 
    SELECT p.id, p.full_name, p.last_style_analysis_at
    FROM profiles p
    WHERE p.linkedin_id IS NOT NULL
      AND p.type = 'external_influencer'
      AND p.posts_count >= 10
      AND (
        p.last_style_analysis_at IS NULL 
        OR p.last_style_analysis_at < NOW() - INTERVAL '30 days'
      )
    ORDER BY p.last_style_analysis_at ASC NULLS FIRST
    LIMIT 10  -- Process max 10 profiles per run to avoid timeouts
  LOOP
    -- Mark profile for style re-analysis by clearing writing_style_prompt
    -- The continue-processing cron will pick it up and regenerate
    UPDATE profiles 
    SET 
      writing_style_prompt = NULL,
      sync_status = 'processing'
    WHERE id = v_profiles.id;
    
    v_count := v_count + 1;
    RAISE NOTICE 'Queued style refresh for: % (last analyzed: %)', 
      v_profiles.full_name, 
      COALESCE(v_profiles.last_style_analysis_at::text, 'never');
  END LOOP;
  
  RAISE NOTICE 'Monthly style refresh: queued % profiles for re-analysis', v_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_monthly_style_refresh() TO service_role;

-- Create the cron job (runs on 1st of each month at 3 AM UTC)
-- NOTE: Run this in Supabase Dashboard > Database > Cron Jobs
/*
SELECT cron.schedule(
  'monthly-style-refresh',
  '0 3 1 * *',  -- At 03:00 on day 1 of every month
  $$SELECT trigger_monthly_style_refresh()$$
);
*/

COMMENT ON FUNCTION public.trigger_monthly_style_refresh() IS 
'Triggers monthly refresh of writing style analysis for external creators. 
Processes up to 10 profiles per run, prioritizing those never analyzed or oldest analyzed.
The continue-processing cron will regenerate the styles using latest posts.';
