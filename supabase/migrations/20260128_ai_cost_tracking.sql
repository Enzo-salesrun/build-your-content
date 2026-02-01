-- ============================================
-- AI COST TRACKING & EMBEDDING DEDUPLICATION
-- Created: 2026-01-28
-- Purpose: Track all AI API costs and fix embedding duplicates
-- ============================================

-- ============================================
-- PART 1: AI USAGE TRACKING
-- ============================================

-- Table to log all AI API calls
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Context
  function_name TEXT NOT NULL,
  request_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  profile_id UUID,
  
  -- Model info
  provider TEXT NOT NULL,                -- 'openai', 'anthropic'
  model TEXT NOT NULL,                   -- 'gpt-5.2', 'gpt-5-mini', 'claude-opus-4-5'
  model_type TEXT NOT NULL,              -- 'chat', 'embedding', 'classification'
  
  -- Tokens
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  
  -- Costs (USD)
  input_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  output_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10, 6) GENERATED ALWAYS AS (input_cost_usd + output_cost_usd) STORED,
  
  -- Performance
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Fallback tracking
  fallback_used BOOLEAN DEFAULT false,
  primary_model TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_function ON ai_usage_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily ON ai_usage_logs(DATE(created_at), function_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);

-- RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert ai_usage_logs"
  ON ai_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all ai_usage_logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Users can view their own usage
CREATE POLICY "Users can view own ai_usage_logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- PART 2: MODEL PRICING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_price_per_1m NUMERIC(10, 4) NOT NULL,
  output_price_per_1m NUMERIC(10, 4) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider, model, effective_date)
);

-- Insert current pricing (January 2026)
INSERT INTO ai_model_pricing (provider, model, input_price_per_1m, output_price_per_1m) VALUES
  ('openai', 'gpt-5.2', 5.00, 15.00),
  ('openai', 'gpt-5-mini', 0.25, 2.00),
  ('openai', 'gpt-4.1-mini', 0.15, 0.60),
  ('openai', 'gpt-4o-mini', 0.15, 0.60),
  ('openai', 'text-embedding-3-small', 0.02, 0),
  ('anthropic', 'claude-opus-4-5-20251101', 15.00, 75.00)
ON CONFLICT (provider, model, effective_date) DO UPDATE SET
  input_price_per_1m = EXCLUDED.input_price_per_1m,
  output_price_per_1m = EXCLUDED.output_price_per_1m;

-- RLS for pricing table
ALTER TABLE ai_model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai_model_pricing"
  ON ai_model_pricing FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- PART 3: DASHBOARD VIEWS
-- ============================================

-- Daily cost summary
CREATE OR REPLACE VIEW public.ai_costs_dashboard AS
SELECT 
  DATE(created_at) as date,
  function_name,
  model,
  provider,
  COUNT(*) as call_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  ROUND(SUM(total_cost_usd)::numeric, 4) as total_cost_usd,
  ROUND(AVG(latency_ms)::numeric, 0) as avg_latency_ms,
  COUNT(*) FILTER (WHERE NOT success) as error_count,
  COUNT(*) FILTER (WHERE fallback_used) as fallback_count
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), function_name, model, provider
ORDER BY date DESC, total_cost_usd DESC;

-- Hourly breakdown for spike detection
CREATE OR REPLACE VIEW public.ai_costs_hourly AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  function_name,
  model,
  COUNT(*) as calls,
  ROUND(SUM(total_cost_usd)::numeric, 4) as cost_usd,
  SUM(input_tokens + output_tokens) as total_tokens
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '48 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 5 DESC;

-- Summary by model
CREATE OR REPLACE VIEW public.ai_costs_by_model AS
SELECT 
  model,
  provider,
  COUNT(*) as total_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  ROUND(SUM(total_cost_usd)::numeric, 2) as total_cost_usd,
  ROUND(AVG(total_cost_usd)::numeric, 6) as avg_cost_per_call
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model, provider
ORDER BY total_cost_usd DESC;

-- ============================================
-- PART 4: FIX EMBEDDING DUPLICATES
-- Add lock column to prevent concurrent processing
-- ============================================

ALTER TABLE viral_posts_bank 
ADD COLUMN IF NOT EXISTS embedding_locked_at TIMESTAMPTZ;

-- Index for efficient lock queries
CREATE INDEX IF NOT EXISTS idx_viral_posts_embedding_lock 
ON viral_posts_bank(embedding_locked_at) 
WHERE needs_embedding = true;

-- ============================================
-- REPLACE: get_posts_needing_embedding with atomic lock
-- Uses FOR UPDATE SKIP LOCKED to prevent duplicates
-- ============================================
CREATE OR REPLACE FUNCTION get_posts_needing_embedding(max_posts INTEGER DEFAULT 100)
RETURNS TABLE (
  post_id UUID,
  content TEXT,
  hook TEXT
) AS $$
DECLARE
  lock_timeout INTERVAL := INTERVAL '5 minutes';
BEGIN
  -- Atomically lock and return posts
  -- FOR UPDATE SKIP LOCKED prevents multiple workers from processing the same post
  RETURN QUERY
  WITH posts_to_lock AS (
    SELECT vpb.id
    FROM public.viral_posts_bank vpb
    WHERE vpb.needs_embedding = true
      AND vpb.embedding IS NULL
      AND (vpb.embedding_locked_at IS NULL 
           OR vpb.embedding_locked_at < NOW() - lock_timeout)
    ORDER BY vpb.created_at DESC
    LIMIT max_posts
    FOR UPDATE SKIP LOCKED
  ),
  locked_posts AS (
    UPDATE public.viral_posts_bank vpb
    SET embedding_locked_at = NOW()
    FROM posts_to_lock
    WHERE vpb.id = posts_to_lock.id
    RETURNING vpb.id, vpb.content, vpb.hook
  )
  SELECT locked_posts.id as post_id, locked_posts.content, locked_posts.hook
  FROM locked_posts;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper: Release lock on failure
-- ============================================
CREATE OR REPLACE FUNCTION release_embedding_lock(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.viral_posts_bank
  SET embedding_locked_at = NULL
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper: Release all stale locks (cleanup)
-- ============================================
CREATE OR REPLACE FUNCTION release_stale_embedding_locks(older_than_minutes INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE public.viral_posts_bank
  SET embedding_locked_at = NULL
  WHERE embedding_locked_at IS NOT NULL
    AND embedding_locked_at < NOW() - (older_than_minutes || ' minutes')::INTERVAL
    AND needs_embedding = true;
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI API calls with token counts and costs for monitoring and optimization';
COMMENT ON TABLE ai_model_pricing IS 'Stores pricing per model for cost calculation (updated manually when pricing changes)';
COMMENT ON VIEW ai_costs_dashboard IS 'Daily summary of AI costs by function and model';
COMMENT ON VIEW ai_costs_hourly IS 'Hourly breakdown for detecting usage spikes';
COMMENT ON VIEW ai_costs_by_model IS 'Aggregated costs per model for the last 30 days';
COMMENT ON FUNCTION get_posts_needing_embedding IS 'Returns posts needing embedding with atomic locking to prevent duplicate processing';
COMMENT ON FUNCTION release_embedding_lock IS 'Releases the embedding lock for a specific post (call on error)';
COMMENT ON FUNCTION release_stale_embedding_locks IS 'Cleanup function to release locks older than N minutes';
