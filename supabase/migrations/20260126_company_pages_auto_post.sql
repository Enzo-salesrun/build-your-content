-- Migration: Company Pages Auto-Post Configuration
-- Enables automatic posting to LinkedIn company pages when a profile publishes

-- ============================================
-- 1. Table for Company Pages
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- LinkedIn organization info (from Unipile organizations array)
  organization_urn TEXT NOT NULL UNIQUE,  -- e.g., 'urn:li:organization:12345678'
  name TEXT NOT NULL,
  
  -- Which Unipile account has admin access to this page
  admin_unipile_account_id UUID NOT NULL REFERENCES public.unipile_accounts(id) ON DELETE CASCADE,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Table for Auto-Post Rules
-- Links profiles to company pages for automatic cross-posting
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_auto_post_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source: which profile's posts should be mirrored
  source_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Target: which company page to post to
  target_company_page_id UUID NOT NULL REFERENCES public.company_pages(id) ON DELETE CASCADE,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  post_delay_minutes INTEGER DEFAULT 0, -- Delay before posting to company page (0 = immediate)
  add_prefix TEXT DEFAULT NULL, -- Optional prefix to add to company posts
  add_suffix TEXT DEFAULT NULL, -- Optional suffix to add to company posts
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(source_profile_id, target_company_page_id)
);

-- ============================================
-- 3. Table for Company Post History
-- Tracks posts made to company pages
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_published_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to original post
  original_post_id UUID, -- Can be production_post_id or scheduled_post_id
  original_published_post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
  
  -- Company page info
  company_page_id UUID NOT NULL REFERENCES public.company_pages(id) ON DELETE CASCADE,
  
  -- Unipile info
  external_post_id TEXT, -- LinkedIn post ID returned by Unipile
  post_url TEXT,
  
  -- Content (may be modified from original)
  content TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed')),
  error_message TEXT,
  
  -- Timing
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Indexes
-- ============================================
CREATE INDEX idx_company_pages_admin ON public.company_pages(admin_unipile_account_id);
CREATE INDEX idx_company_pages_org_urn ON public.company_pages(organization_urn);
CREATE INDEX idx_auto_post_rules_source ON public.company_auto_post_rules(source_profile_id);
CREATE INDEX idx_auto_post_rules_target ON public.company_auto_post_rules(target_company_page_id);
CREATE INDEX idx_company_published_posts_page ON public.company_published_posts(company_page_id);
CREATE INDEX idx_company_published_posts_status ON public.company_published_posts(status);

-- ============================================
-- 5. Triggers for updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_company_pages_updated_at ON public.company_pages;
CREATE TRIGGER update_company_pages_updated_at
  BEFORE UPDATE ON public.company_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auto_post_rules_updated_at ON public.company_auto_post_rules;
CREATE TRIGGER update_auto_post_rules_updated_at
  BEFORE UPDATE ON public.company_auto_post_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. RLS Policies
-- ============================================
ALTER TABLE public.company_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_auto_post_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_published_posts ENABLE ROW LEVEL SECURITY;

-- Company pages: accessible to all authenticated users (team tool)
CREATE POLICY "Authenticated users can view company pages" ON public.company_pages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage company pages" ON public.company_pages
  FOR ALL USING (auth.role() = 'authenticated');

-- Auto post rules: accessible to all authenticated users
CREATE POLICY "Authenticated users can view auto post rules" ON public.company_auto_post_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage auto post rules" ON public.company_auto_post_rules
  FOR ALL USING (auth.role() = 'authenticated');

-- Company published posts: accessible to all authenticated users
CREATE POLICY "Authenticated users can view company posts" ON public.company_published_posts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage company posts" ON public.company_published_posts
  FOR ALL USING (auth.role() = 'authenticated');

-- Service role bypass
CREATE POLICY "Service role full access company_pages" ON public.company_pages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access auto_post_rules" ON public.company_auto_post_rules
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access company_published_posts" ON public.company_published_posts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 7. Helper function to sync company pages from Unipile accounts
-- ============================================
CREATE OR REPLACE FUNCTION sync_company_pages_from_unipile_account(p_unipile_account_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_org JSONB;
BEGIN
  -- Get the Unipile account with organizations
  SELECT * INTO v_account FROM public.unipile_accounts WHERE id = p_unipile_account_id;
  
  IF v_account IS NULL THEN
    RAISE EXCEPTION 'Unipile account not found: %', p_unipile_account_id;
  END IF;
  
  -- Loop through organizations and upsert company pages
  FOR v_org IN SELECT * FROM jsonb_array_elements(COALESCE(v_account.organizations, '[]'::jsonb))
  LOOP
    INSERT INTO public.company_pages (organization_urn, name, admin_unipile_account_id)
    VALUES (
      v_org->>'organization_urn',
      v_org->>'name',
      p_unipile_account_id
    )
    ON CONFLICT (organization_urn) 
    DO UPDATE SET
      name = EXCLUDED.name,
      admin_unipile_account_id = EXCLUDED.admin_unipile_account_id,
      updated_at = now();
  END LOOP;
END;
$$;

COMMENT ON TABLE public.company_pages IS 'LinkedIn company pages available for posting';
COMMENT ON TABLE public.company_auto_post_rules IS 'Rules for automatic cross-posting from profiles to company pages';
COMMENT ON TABLE public.company_published_posts IS 'History of posts published to company pages';
