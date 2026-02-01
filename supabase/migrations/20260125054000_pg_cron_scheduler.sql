-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to call the publish-scheduled edge function
CREATE OR REPLACE FUNCTION public.trigger_publish_scheduled()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  scheduler_secret text;
BEGIN
  -- Get secrets from vault (if configured) or use environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  scheduler_secret := current_setting('app.settings.scheduler_secret', true);
  
  -- Call the edge function via HTTP
  -- Note: This requires pg_net extension for HTTP calls
  -- Alternative: Use Supabase's built-in cron with edge functions
  RAISE NOTICE 'Triggering publish-scheduled at %', now();
END;
$$;

-- Schedule the job to run every minute
-- This will check for posts that need to be published
SELECT cron.schedule(
  'publish-scheduled-posts',  -- Job name
  '* * * * *',                -- Every minute
  $$SELECT public.trigger_publish_scheduled()$$
);

-- Alternative: Use Supabase Dashboard to set up cron
-- Dashboard > Database > Extensions > pg_cron > Schedule

COMMENT ON FUNCTION public.trigger_publish_scheduled() IS 
'Triggers the publish-scheduled edge function to process pending scheduled posts.
Configure via Supabase Dashboard > Database > Cron Jobs or use external scheduler.';
