-- Migration: Unipile Social Accounts Integration
-- This table stores connected social media accounts via Unipile API

-- Enum for supported providers
CREATE TYPE public.unipile_provider AS ENUM (
  'LINKEDIN',
  'INSTAGRAM', 
  'TWITTER',
  'WHATSAPP',
  'MESSENGER',
  'TELEGRAM'
);

-- Enum for account connection status
CREATE TYPE public.unipile_account_status AS ENUM (
  'OK',
  'CREDENTIALS',
  'DISCONNECTED',
  'ERROR',
  'PENDING'
);

-- Main table for connected social accounts
CREATE TABLE IF NOT EXISTS public.unipile_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to internal user (profile)
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Unipile identifiers
  unipile_account_id TEXT NOT NULL UNIQUE,
  provider unipile_provider NOT NULL,
  
  -- Account details from Unipile
  account_name TEXT,
  username TEXT,
  provider_user_id TEXT,
  
  -- For LinkedIn organizations
  organizations JSONB DEFAULT '[]'::jsonb,
  
  -- Connection status
  status unipile_account_status DEFAULT 'OK',
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_unipile_accounts_profile ON public.unipile_accounts(profile_id);
CREATE INDEX idx_unipile_accounts_provider ON public.unipile_accounts(provider);
CREATE INDEX idx_unipile_accounts_status ON public.unipile_accounts(status);

-- Scheduled posts table for multi-account publishing
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to production post (optional, if created from content factory)
  production_post_id UUID REFERENCES public.production_posts(id) ON DELETE SET NULL,
  
  -- Post content
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),
  published_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Creator
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction table for multi-account posting
CREATE TABLE IF NOT EXISTS public.scheduled_post_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  unipile_account_id UUID NOT NULL REFERENCES public.unipile_accounts(id) ON DELETE CASCADE,
  
  -- Per-account status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed')),
  external_post_id TEXT, -- ID returned by Unipile after publishing
  published_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Platform-specific overrides
  content_override TEXT, -- If different content per platform
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(scheduled_post_id, unipile_account_id)
);

-- Indexes for scheduled posts
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_post_accounts_post ON public.scheduled_post_accounts(scheduled_post_id);
CREATE INDEX idx_scheduled_post_accounts_account ON public.scheduled_post_accounts(unipile_account_id);

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_unipile_accounts_updated_at ON public.unipile_accounts;
CREATE TRIGGER update_unipile_accounts_updated_at
  BEFORE UPDATE ON public.unipile_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON public.scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.unipile_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_post_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own connected accounts
CREATE POLICY "Users can view own accounts" ON public.unipile_accounts
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own accounts" ON public.unipile_accounts
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own accounts" ON public.unipile_accounts
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own accounts" ON public.unipile_accounts
  FOR DELETE USING (profile_id = auth.uid());

-- Scheduled posts policies
CREATE POLICY "Users can view own scheduled posts" ON public.scheduled_posts
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert scheduled posts" ON public.scheduled_posts
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own scheduled posts" ON public.scheduled_posts
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own scheduled posts" ON public.scheduled_posts
  FOR DELETE USING (created_by = auth.uid());

-- Scheduled post accounts (through scheduled_posts ownership)
CREATE POLICY "Users can view scheduled post accounts" ON public.scheduled_post_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      WHERE sp.id = scheduled_post_id AND sp.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert scheduled post accounts" ON public.scheduled_post_accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      WHERE sp.id = scheduled_post_id AND sp.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update scheduled post accounts" ON public.scheduled_post_accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      WHERE sp.id = scheduled_post_id AND sp.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete scheduled post accounts" ON public.scheduled_post_accounts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      WHERE sp.id = scheduled_post_id AND sp.created_by = auth.uid()
    )
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role full access unipile_accounts" ON public.unipile_accounts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access scheduled_posts" ON public.scheduled_posts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access scheduled_post_accounts" ON public.scheduled_post_accounts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.unipile_accounts IS 'Connected social media accounts via Unipile API';
COMMENT ON TABLE public.scheduled_posts IS 'Scheduled posts for multi-platform publishing';
COMMENT ON TABLE public.scheduled_post_accounts IS 'Junction table linking scheduled posts to target accounts';
