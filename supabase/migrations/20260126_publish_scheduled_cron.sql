-- Migration: Configure pg_cron to publish scheduled posts every 5 minutes
-- This calls the publish-scheduled edge function automatically

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to call the edge function
-- This uses pg_net to make HTTP requests
CREATE OR REPLACE FUNCTION call_publish_scheduled()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text := 'https://qzorivymybqavkxexrbf.supabase.co';
  v_scheduler_secret text := '72f9331d8b2c65147c61902b22c9893d346cbdda3d040717cbc7df44cb0d4351';
BEGIN
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/publish-scheduled',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Scheduler-Secret', v_scheduler_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule the cron job to run every 5 minutes
SELECT cron.schedule(
  'publish-scheduled-posts',
  '*/5 * * * *',
  'SELECT call_publish_scheduled();'
);
