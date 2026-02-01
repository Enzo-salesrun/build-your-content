-- ============================================================================
-- WORKERS V2 INFRASTRUCTURE
-- Event-driven architecture with independent workers
-- ============================================================================

-- 1. Task Execution Logs for monitoring workers
CREATE TABLE IF NOT EXISTS task_execution_logs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  items_found INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_exec_v2_worker_name ON task_execution_logs_v2(worker_name);
CREATE INDEX IF NOT EXISTS idx_task_exec_v2_started_at ON task_execution_logs_v2(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_exec_v2_status ON task_execution_logs_v2(status);

-- 2. Feature flags for gradual rollout
CREATE TABLE IF NOT EXISTS feature_flags_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default flags for V2 workers
INSERT INTO feature_flags_v2 (flag_name, enabled, description) VALUES
  ('worker_extract_hooks_v2', false, 'Enable V2 hook extraction worker'),
  ('worker_generate_embeddings_v2', false, 'Enable V2 embeddings worker'),
  ('worker_classify_hooks_v2', false, 'Enable V2 hook classification worker'),
  ('worker_classify_topics_v2', false, 'Enable V2 topic classification worker'),
  ('worker_classify_audiences_v2', false, 'Enable V2 audience classification worker'),
  ('worker_complete_profiles_v2', false, 'Enable V2 profile completion worker'),
  ('disable_continue_processing', false, 'Disable legacy continue-processing function')
ON CONFLICT (flag_name) DO NOTHING;

-- 3. Helper function to check if a worker is enabled
CREATE OR REPLACE FUNCTION is_worker_enabled(p_worker_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT enabled FROM feature_flags_v2 WHERE flag_name = p_worker_name),
    false
  );
END;
$$;

-- 4. Function to log worker execution start
CREATE OR REPLACE FUNCTION log_worker_start(p_worker_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO task_execution_logs_v2 (worker_name, status)
  VALUES (p_worker_name, 'running')
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 5. Function to log worker execution end
CREATE OR REPLACE FUNCTION log_worker_end(
  p_log_id UUID,
  p_status TEXT,
  p_items_found INTEGER DEFAULT 0,
  p_items_processed INTEGER DEFAULT 0,
  p_items_failed INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE task_execution_logs_v2
  SET 
    completed_at = NOW(),
    status = p_status,
    items_found = p_items_found,
    items_processed = p_items_processed,
    items_failed = p_items_failed,
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    error_message = p_error_message,
    metadata = p_metadata
  WHERE id = p_log_id;
END;
$$;

-- 6. View for worker health dashboard
CREATE OR REPLACE VIEW worker_health_dashboard_v2 AS
SELECT 
  worker_name,
  COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 hour') AS runs_last_hour,
  COUNT(*) FILTER (WHERE status = 'completed' AND started_at > NOW() - INTERVAL '1 hour') AS successful_last_hour,
  COUNT(*) FILTER (WHERE status = 'failed' AND started_at > NOW() - INTERVAL '1 hour') AS failed_last_hour,
  AVG(duration_ms) FILTER (WHERE started_at > NOW() - INTERVAL '1 hour') AS avg_duration_ms,
  SUM(items_processed) FILTER (WHERE started_at > NOW() - INTERVAL '1 hour') AS items_processed_last_hour,
  MAX(started_at) AS last_run_at,
  (SELECT status FROM task_execution_logs_v2 t2 
   WHERE t2.worker_name = task_execution_logs_v2.worker_name 
   ORDER BY started_at DESC LIMIT 1) AS last_status
FROM task_execution_logs_v2
GROUP BY worker_name;

-- 7. RLS Policies
ALTER TABLE task_execution_logs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags_v2 ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on task_execution_logs_v2"
  ON task_execution_logs_v2
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on feature_flags_v2"
  ON feature_flags_v2
  FOR ALL
  USING (auth.role() = 'service_role');

-- 8. Cleanup old logs (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_worker_logs_v2()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM task_execution_logs_v2
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON TABLE task_execution_logs_v2 IS 'Execution logs for V2 event-driven workers';
COMMENT ON TABLE feature_flags_v2 IS 'Feature flags for gradual V2 rollout';
