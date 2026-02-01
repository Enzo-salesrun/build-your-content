-- ============================================================================
-- HYBRID EVENT-DRIVEN ARCHITECTURE
-- Triggers for real-time processing + Cron jobs for catch-up
-- ============================================================================

-- Get the project URL for Edge Function calls
CREATE OR REPLACE FUNCTION get_supabase_url() RETURNS TEXT AS $$
BEGIN
  RETURN 'https://qzorivymybqavkxexrbf.supabase.co';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGER: On new post insertion, queue all processing
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_process_new_post()
RETURNS TRIGGER AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  base_url := get_supabase_url();
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Only trigger on INSERT with content
  IF TG_OP = 'INSERT' AND NEW.content IS NOT NULL THEN
    -- Call extract-hooks worker (async, non-blocking)
    PERFORM net.http_post(
      url := base_url || '/functions/v1/worker-extract-hooks-v2',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('post_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: On hook extracted, queue classification + embedding
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_process_hook_extracted()
RETURNS TRIGGER AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  base_url := get_supabase_url();
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Trigger when hook is newly set
  IF OLD.hook IS NULL AND NEW.hook IS NOT NULL THEN
    -- Queue embedding generation
    PERFORM net.http_post(
      url := base_url || '/functions/v1/worker-generate-embeddings-v2',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('post_id', NEW.id)
    );
    
    -- Queue hook classification
    PERFORM net.http_post(
      url := base_url || '/functions/v1/worker-classify-hooks-v2',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('post_id', NEW.id)
    );
    
    -- Queue topic classification
    PERFORM net.http_post(
      url := base_url || '/functions/v1/worker-classify-topics-v2',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('post_id', NEW.id)
    );
    
    -- Queue audience classification
    PERFORM net.http_post(
      url := base_url || '/functions/v1/worker-classify-audiences-v2',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('post_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGERS (drop existing first)
-- ============================================================================
DROP TRIGGER IF EXISTS on_viral_post_insert ON viral_posts_bank;
DROP TRIGGER IF EXISTS on_viral_post_hook_extracted ON viral_posts_bank;

CREATE TRIGGER on_viral_post_insert
  AFTER INSERT ON viral_posts_bank
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_new_post();

CREATE TRIGGER on_viral_post_hook_extracted
  AFTER UPDATE OF hook ON viral_posts_bank
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_hook_extracted();

-- ============================================================================
-- CRON JOBS: Catch-up for failed/missed items (every 15 min)
-- ============================================================================

-- Function to call a worker via pg_net
CREATE OR REPLACE FUNCTION call_worker_v2(worker_name TEXT)
RETURNS void AS $$
DECLARE
  base_url TEXT;
BEGIN
  base_url := get_supabase_url();
  
  PERFORM net.http_post(
    url := base_url || '/functions/v1/' || worker_name,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule catch-up cron jobs (every 15 minutes, staggered)
SELECT cron.schedule(
  'catchup-extract-hooks-v2',
  '*/15 * * * *',
  $$SELECT call_worker_v2('worker-extract-hooks-v2')$$
);

SELECT cron.schedule(
  'catchup-generate-embeddings-v2',
  '3,18,33,48 * * * *',
  $$SELECT call_worker_v2('worker-generate-embeddings-v2')$$
);

SELECT cron.schedule(
  'catchup-classify-hooks-v2',
  '6,21,36,51 * * * *',
  $$SELECT call_worker_v2('worker-classify-hooks-v2')$$
);

SELECT cron.schedule(
  'catchup-classify-topics-v2',
  '9,24,39,54 * * * *',
  $$SELECT call_worker_v2('worker-classify-topics-v2')$$
);

SELECT cron.schedule(
  'catchup-classify-audiences-v2',
  '12,27,42,57 * * * *',
  $$SELECT call_worker_v2('worker-classify-audiences-v2')$$
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION trigger_process_new_post() IS 
  'Trigger: calls worker-extract-hooks-v2 on new post insertion';

COMMENT ON FUNCTION trigger_process_hook_extracted() IS 
  'Trigger: calls embedding + classification workers when hook is extracted';

COMMENT ON FUNCTION call_worker_v2(TEXT) IS 
  'Helper: calls a V2 worker Edge Function via pg_net';
