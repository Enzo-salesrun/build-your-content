-- Migration: Auto Engagement System
-- Permet aux comptes LinkedIn connectés de liker/commenter automatiquement les nouveaux posts

-- Table pour tracker les engagements automatiques
CREATE TABLE IF NOT EXISTS public.engagement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Post concerné
  published_post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
  external_post_id TEXT NOT NULL, -- LinkedIn social_id (urn:li:activity:xxx)
  post_author_id UUID REFERENCES public.profiles(id),
  post_content TEXT, -- Pour référence
  
  -- Engagement effectué par
  engager_profile_id UUID REFERENCES public.profiles(id),
  engager_unipile_account_id UUID REFERENCES public.unipile_accounts(id),
  engager_name TEXT,
  
  -- Actions effectuées
  reaction_type TEXT CHECK (reaction_type IN ('like', 'celebrate', 'support', 'love', 'insightful', 'funny')),
  reaction_success BOOLEAN DEFAULT false,
  reaction_error TEXT,
  
  comment_text TEXT,
  comment_id TEXT, -- ID retourné par Unipile
  comment_success BOOLEAN DEFAULT false,
  comment_error TEXT,
  
  -- Timing (pour étaler les engagements et paraître naturel)
  delay_ms INTEGER, -- Délai appliqué avant l'engagement
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  -- Statut global
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed', 'skipped')),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configuration pour activer/désactiver l'auto-engagement par profil
CREATE TABLE IF NOT EXISTS public.engagement_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Activation
  auto_react_enabled BOOLEAN DEFAULT true,
  auto_comment_enabled BOOLEAN DEFAULT true,
  
  -- Préférences
  preferred_reaction TEXT DEFAULT 'like' CHECK (preferred_reaction IN ('like', 'celebrate', 'support', 'love', 'insightful', 'funny', 'random')),
  
  -- Limites quotidiennes
  max_reactions_per_day INTEGER DEFAULT 50,
  max_comments_per_day INTEGER DEFAULT 20,
  
  -- Compteurs quotidiens (reset par cron job)
  reactions_today INTEGER DEFAULT 0,
  comments_today INTEGER DEFAULT 0,
  last_reset_at DATE DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_engagement_logs_post ON public.engagement_logs(published_post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_external_post ON public.engagement_logs(external_post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_engager ON public.engagement_logs(engager_profile_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_status ON public.engagement_logs(status);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_created ON public.engagement_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_settings_profile ON public.engagement_settings(profile_id);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_engagement_settings_updated_at ON public.engagement_settings;
CREATE TRIGGER update_engagement_settings_updated_at
  BEFORE UPDATE ON public.engagement_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_settings ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access engagement_logs" ON public.engagement_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access engagement_settings" ON public.engagement_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Users can view their own engagements (as engager or post author)
CREATE POLICY "Users can view related engagements" ON public.engagement_logs
  FOR SELECT USING (
    engager_profile_id = auth.uid() 
    OR post_author_id = auth.uid()
  );

-- Users can manage their own settings
CREATE POLICY "Users can manage own engagement settings" ON public.engagement_settings
  FOR ALL USING (profile_id = auth.uid());

-- Function to reset daily counters (appelée par cron job)
CREATE OR REPLACE FUNCTION reset_daily_engagement_counters()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.engagement_settings
  SET 
    reactions_today = 0,
    comments_today = 0,
    last_reset_at = CURRENT_DATE
  WHERE last_reset_at < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if profile can engage (limits not exceeded)
CREATE OR REPLACE FUNCTION can_profile_engage(
  p_profile_id UUID,
  p_action_type TEXT -- 'reaction' or 'comment'
)
RETURNS BOOLEAN AS $$
DECLARE
  settings RECORD;
BEGIN
  -- Get or create settings
  SELECT * INTO settings
  FROM public.engagement_settings
  WHERE profile_id = p_profile_id;
  
  IF NOT FOUND THEN
    -- Create default settings
    INSERT INTO public.engagement_settings (profile_id)
    VALUES (p_profile_id)
    RETURNING * INTO settings;
  END IF;
  
  -- Reset counters if new day
  IF settings.last_reset_at < CURRENT_DATE THEN
    UPDATE public.engagement_settings
    SET reactions_today = 0, comments_today = 0, last_reset_at = CURRENT_DATE
    WHERE profile_id = p_profile_id;
    settings.reactions_today := 0;
    settings.comments_today := 0;
  END IF;
  
  -- Check limits
  IF p_action_type = 'reaction' THEN
    RETURN settings.auto_react_enabled AND settings.reactions_today < settings.max_reactions_per_day;
  ELSIF p_action_type = 'comment' THEN
    RETURN settings.auto_comment_enabled AND settings.comments_today < settings.max_comments_per_day;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment engagement counter
CREATE OR REPLACE FUNCTION increment_engagement_counter(
  p_profile_id UUID,
  p_action_type TEXT -- 'reaction' or 'comment'
)
RETURNS VOID AS $$
BEGIN
  IF p_action_type = 'reaction' THEN
    UPDATE public.engagement_settings
    SET reactions_today = reactions_today + 1
    WHERE profile_id = p_profile_id;
  ELSIF p_action_type = 'comment' THEN
    UPDATE public.engagement_settings
    SET comments_today = comments_today + 1
    WHERE profile_id = p_profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get eligible engagers for a post
CREATE OR REPLACE FUNCTION get_eligible_engagers(
  p_post_author_id UUID,
  p_external_post_id TEXT
)
RETURNS TABLE (
  profile_id UUID,
  profile_name TEXT,
  writing_style TEXT,
  unipile_account_id UUID,
  unipile_account_external_id TEXT,
  preferred_reaction TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.full_name as profile_name,
    p.writing_style_prompt as writing_style,
    ua.id as unipile_account_id,
    ua.unipile_account_id as unipile_account_external_id,
    COALESCE(es.preferred_reaction, 'like') as preferred_reaction
  FROM public.profiles p
  INNER JOIN public.unipile_accounts ua ON ua.profile_id = p.id
  LEFT JOIN public.engagement_settings es ON es.profile_id = p.id
  WHERE 
    -- Exclude post author
    p.id != p_post_author_id
    -- Only active LinkedIn accounts
    AND ua.provider = 'LINKEDIN'
    AND ua.status = 'OK'
    AND ua.is_active = true
    -- Not already engaged on this post
    AND NOT EXISTS (
      SELECT 1 FROM public.engagement_logs el
      WHERE el.external_post_id = p_external_post_id
      AND el.engager_profile_id = p.id
    )
    -- Auto-engagement enabled (or no settings = default enabled)
    AND (es.auto_react_enabled IS NULL OR es.auto_react_enabled = true)
  ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.engagement_logs IS 'Tracks automatic engagements (likes, comments) on published posts';
COMMENT ON TABLE public.engagement_settings IS 'Per-profile settings for auto-engagement feature';
COMMENT ON FUNCTION get_eligible_engagers IS 'Returns profiles eligible to auto-engage on a specific post';
COMMENT ON FUNCTION can_profile_engage IS 'Checks if a profile can perform an engagement action (daily limits)';
