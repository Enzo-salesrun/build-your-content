-- Migration: Update continue-processing cron to 1 minute
-- This ensures faster processing after scraping

-- Remove existing cron job
SELECT cron.unschedule('continue-processing-sweep') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'continue-processing-sweep');

-- Create the cron job to run every 1 minute
SELECT cron.schedule(
  'continue-processing-sweep',
  '* * * * *',  -- every 1 minute
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

COMMENT ON EXTENSION pg_cron IS 'Auto-processing every 1 minute for fast profile analysis';
