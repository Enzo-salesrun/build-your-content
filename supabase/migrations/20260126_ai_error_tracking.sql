-- Migration: AI Error Tracking System
-- Purpose: Track AI errors for admin visibility and user support

-- ============================================
-- TABLE: ai_errors
-- Stores all AI-related errors for monitoring
-- ============================================
CREATE TABLE IF NOT EXISTS ai_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Error details
  error_code TEXT NOT NULL,           -- e.g., 'CLAUDE_TIMEOUT', 'OPENAI_RATE_LIMIT', 'JSON_PARSE_ERROR'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Request context
  function_name TEXT NOT NULL,        -- e.g., 'generate-hooks', 'generate-body'
  request_id TEXT,                    -- Unique request ID for tracing
  
  -- AI context
  primary_model TEXT,                 -- Model that failed first (e.g., 'claude-opus-4-5')
  fallback_model TEXT,                -- Fallback model used (e.g., 'gpt-5.2')
  fallback_used BOOLEAN DEFAULT FALSE,
  fallback_success BOOLEAN,
  
  -- Request metadata
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  
  -- User-facing
  user_error_ref TEXT,                -- Short reference code for user to report (e.g., 'ERR-ABC123')
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Additional context (JSON)
  metadata JSONB DEFAULT '{}'::JSONB
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_ai_errors_created_at ON ai_errors(created_at DESC);
CREATE INDEX idx_ai_errors_user_id ON ai_errors(user_id);
CREATE INDEX idx_ai_errors_error_code ON ai_errors(error_code);
CREATE INDEX idx_ai_errors_function_name ON ai_errors(function_name);
CREATE INDEX idx_ai_errors_user_error_ref ON ai_errors(user_error_ref);
CREATE INDEX idx_ai_errors_is_resolved ON ai_errors(is_resolved);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE ai_errors ENABLE ROW LEVEL SECURITY;

-- Admins can see all errors
CREATE POLICY "Admins can view all AI errors"
  ON ai_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Users can see their own errors
CREATE POLICY "Users can view their own AI errors"
  ON ai_errors FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert errors (from edge functions)
CREATE POLICY "Service role can insert AI errors"
  ON ai_errors FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can update errors (resolve them)
CREATE POLICY "Admins can update AI errors"
  ON ai_errors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- FUNCTION: Generate user-friendly error reference
-- ============================================
CREATE OR REPLACE FUNCTION generate_error_ref()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'ERR-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-generate user_error_ref
-- ============================================
CREATE OR REPLACE FUNCTION set_error_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_error_ref IS NULL THEN
    NEW.user_error_ref := generate_error_ref();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_error_ref
  BEFORE INSERT ON ai_errors
  FOR EACH ROW
  EXECUTE FUNCTION set_error_ref();

-- ============================================
-- VIEW: Error statistics for admin dashboard
-- ============================================
CREATE OR REPLACE VIEW ai_error_stats AS
SELECT 
  date_trunc('hour', created_at) AS hour,
  function_name,
  error_code,
  COUNT(*) AS error_count,
  COUNT(*) FILTER (WHERE fallback_used) AS fallback_count,
  COUNT(*) FILTER (WHERE fallback_success) AS fallback_success_count,
  AVG(latency_ms) AS avg_latency_ms
FROM ai_errors
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

COMMENT ON TABLE ai_errors IS 'Tracks all AI-related errors for monitoring, debugging, and user support';
COMMENT ON COLUMN ai_errors.user_error_ref IS 'Short code that users can share with support (e.g., ERR-ABC123)';
COMMENT ON COLUMN ai_errors.fallback_used IS 'Whether a fallback model was attempted';
COMMENT ON COLUMN ai_errors.fallback_success IS 'Whether the fallback model succeeded';
