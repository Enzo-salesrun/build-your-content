-- Migration: Auto-processing cron job
-- This sets up pg_cron to automatically call continue-processing every 5 minutes
-- Ensures no abandoned tasks - fully autonomous processing

-- Enable pg_cron extension (should already be enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- CRON JOB: Auto-continue processing every 5 minutes
-- =============================================================================

-- First, remove any existing cron job with the same name
SELECT cron.unschedule('continue-processing-sweep') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'continue-processing-sweep');

-- Create the cron job to run every 5 minutes
-- This will automatically process any incomplete embeddings/classifications
SELECT cron.schedule(
  'continue-processing-sweep',  -- job name
  '*/5 * * * *',                -- every 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/continue-processing',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =============================================================================
-- ALTERNATIVE: If pg_cron doesn't work, use Supabase Dashboard
-- =============================================================================
-- 1. Go to: Supabase Dashboard > Database > Extensions
-- 2. Enable pg_cron if not already enabled
-- 3. Go to: Supabase Dashboard > Database > Cron Jobs
-- 4. Create new job:
--    - Name: continue-processing-sweep
--    - Schedule: */5 * * * * (every 5 minutes)
--    - Command: SELECT net.http_post(...)
--
-- OR use Supabase Edge Function Scheduler:
-- 1. Go to: Supabase Dashboard > Edge Functions
-- 2. Select continue-processing
-- 3. Enable "Schedule" 
-- 4. Set to run every 5 minutes
-- =============================================================================

COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs for auto-processing incomplete tasks';
