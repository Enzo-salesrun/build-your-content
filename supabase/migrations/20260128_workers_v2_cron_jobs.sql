-- ============================================================================
-- WORKERS V2 CRON JOBS CONFIGURATION
-- This migration sets up pg_cron jobs for the V2 event-driven workers
-- 
-- NOTE: These jobs are CREATED but DISABLED by default (unscheduled)
-- Use orchestrator-v2?action=enable-all to activate them
-- ============================================================================

-- Get project URL for HTTP calls
DO $$
DECLARE
  project_url TEXT;
  scheduler_secret TEXT;
BEGIN
  -- These will need to be set manually or via Supabase secrets
  project_url := 'https://qzorivymybqavkxexrbf.supabase.co';
  scheduler_secret := current_setting('app.scheduler_secret', true);
  
  -- Store in a config table for reference
  INSERT INTO feature_flags_v2 (flag_name, enabled, description)
  VALUES ('project_url', true, project_url)
  ON CONFLICT (flag_name) DO UPDATE SET description = EXCLUDED.description;
  
END;
$$;

-- ============================================================================
-- CRON JOB SCHEDULE REFERENCE (to be configured in Supabase Dashboard)
-- ============================================================================
-- 
-- Worker                          | Cron Expression | Frequency
-- --------------------------------|-----------------|----------
-- worker-extract-hooks-v2         | */5 * * * *     | Every 5 min
-- worker-generate-embeddings-v2   | */3 * * * *     | Every 3 min
-- worker-classify-hooks-v2        | */5 * * * *     | Every 5 min
-- worker-classify-topics-v2       | */5 * * * *     | Every 5 min
-- worker-classify-audiences-v2    | */5 * * * *     | Every 5 min
-- worker-complete-profiles-v2     | */15 * * * *    | Every 15 min
--
-- ============================================================================

-- Helper function to call a worker via HTTP
CREATE OR REPLACE FUNCTION call_worker_v2(p_worker_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_response JSONB;
  v_scheduler_secret TEXT;
BEGIN
  -- Check if worker is enabled
  IF NOT is_worker_enabled(p_worker_name) THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'Worker disabled via feature flag'
    );
  END IF;

  -- Get project URL
  v_url := 'https://qzorivymybqavkxexrbf.supabase.co/functions/v1/' || 
           REPLACE(p_worker_name, '_', '-');
  
  -- Get scheduler secret (set via Supabase secrets)
  v_scheduler_secret := current_setting('app.scheduler_secret', true);
  
  -- Make HTTP call using pg_net (if available)
  -- Note: This requires the pg_net extension
  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-secret', COALESCE(v_scheduler_secret, '')
    ),
    body := '{}'::jsonb
  ) INTO v_response;
  
  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- DOCUMENTATION: How to set up cron jobs in Supabase Dashboard
-- ============================================================================
-- 
-- 1. Go to Database > Extensions > Enable pg_cron and pg_net
-- 
-- 2. Go to Database > Cron Jobs
-- 
-- 3. Create each job with:
--    - Name: worker-extract-hooks-v2
--    - Schedule: */5 * * * *
--    - Command: SELECT call_worker_v2('worker_extract_hooks_v2');
--
-- 4. Repeat for each worker
--
-- ALTERNATIVE: Use Supabase CLI or SQL directly:
-- 
-- SELECT cron.schedule(
--   'worker-extract-hooks-v2',
--   '*/5 * * * *',
--   $$SELECT call_worker_v2('worker_extract_hooks_v2')$$
-- );
--
-- ============================================================================

COMMENT ON FUNCTION call_worker_v2 IS 'Helper function to call V2 workers via HTTP with feature flag check';
