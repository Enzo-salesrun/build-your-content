-- ============================================================================
-- SCRAPING TIMEOUT FIXES
-- This migration adds automatic cleanup for stuck scraping jobs/profiles
-- ============================================================================

-- Function to cleanup stuck scraping states
-- Should be called periodically (via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_stuck_scraping_states()
RETURNS TABLE(profiles_reset INT, jobs_fixed INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profiles_reset INT;
  v_jobs_fixed INT;
BEGIN
  -- Reset profiles stuck in 'scraping' for more than 10 minutes
  WITH updated AS (
    UPDATE profiles 
    SET sync_status = 'idle'
    WHERE sync_status = 'scraping' 
      AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '10 minutes')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_profiles_reset FROM updated;

  -- Mark abandoned sync_jobs as 'failed'
  WITH updated AS (
    UPDATE sync_jobs 
    SET 
      status = 'failed',
      completed_at = NOW(),
      error_message = 'Edge function timeout - job abandoned'
    WHERE status = 'running' 
      AND started_at < NOW() - INTERVAL '10 minutes'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_jobs_fixed FROM updated;

  RETURN QUERY SELECT v_profiles_reset, v_jobs_fixed;
END;
$$;

COMMENT ON FUNCTION cleanup_stuck_scraping_states IS 
'Resets profiles and jobs stuck in scraping/running state due to edge function timeouts. Call periodically or before new scraping runs.';

-- ============================================================================
-- CRON JOB: Auto-cleanup every 15 minutes
-- ============================================================================
-- Note: This requires pg_cron extension. If not available, run manually.

DO $$
BEGIN
  -- Try to schedule cleanup job (will fail silently if pg_cron not available)
  PERFORM cron.unschedule('cleanup-stuck-scraping')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stuck-scraping');
  
  PERFORM cron.schedule(
    'cleanup-stuck-scraping',
    '*/15 * * * *',  -- Every 15 minutes
    'SELECT cleanup_stuck_scraping_states()'
  );
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron not available, skipping cron job creation';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create cron job: %', SQLERRM;
END;
$$;

-- ============================================================================
-- IMPROVED: get_profiles_to_sync now cleans up stuck states first
-- ============================================================================
CREATE OR REPLACE FUNCTION get_profiles_to_sync(max_profiles INTEGER DEFAULT 5)
RETURNS TABLE(
  profile_id UUID,
  linkedin_id TEXT,
  full_name TEXT,
  last_scraped_at TIMESTAMPTZ,
  sync_priority INTEGER
) AS $$
BEGIN
  -- First, cleanup any stuck profiles from previous failed runs
  UPDATE profiles 
  SET sync_status = 'idle'
  WHERE sync_status = 'scraping' 
    AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '10 minutes');

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
    AND (p.sync_status IS NULL OR p.sync_status NOT IN ('scraping'))
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_profiles_to_sync IS 
'Gets profiles due for weekly resync. Auto-cleans stuck profiles before returning results.';
