-- Migration: Presets table for template configuration presets
-- Presets are reusable configurations that can be applied to templates

CREATE TABLE IF NOT EXISTS public.presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Preset type: tone, style, format, audience_type, etc.
  type TEXT NOT NULL DEFAULT 'general',
  
  -- Configuration stored as JSON
  config JSONB DEFAULT '{}',
  
  -- Visual
  color TEXT DEFAULT '#6B7280',
  icon_name TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Preset types enum for filtering
COMMENT ON COLUMN public.presets.type IS 'Type of preset: tone, style, format, audience_type, hook_style, cta_style, general';

-- Link table: templates can use multiple presets
CREATE TABLE IF NOT EXISTS public.template_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  preset_id UUID NOT NULL REFERENCES public.presets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, preset_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_presets_type ON public.presets(type);
CREATE INDEX IF NOT EXISTS idx_presets_active ON public.presets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_template_presets_template ON public.template_presets(template_id);
CREATE INDEX IF NOT EXISTS idx_template_presets_preset ON public.template_presets(preset_id);

-- RLS Policies
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view presets" ON public.presets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create presets" ON public.presets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their presets" ON public.presets FOR UPDATE USING (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "Users can delete their presets" ON public.presets FOR DELETE USING (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Anyone can view template_presets" ON public.template_presets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage template_presets" ON public.template_presets FOR ALL USING (auth.role() = 'authenticated');

-- Insert default presets
INSERT INTO public.presets (name, description, type, config, color) VALUES
  ('Ton Professionnel', 'Style formel et corporate, adapté au B2B', 'tone', '{"formality": "high", "emoji_level": "none", "vocabulary": "technical"}', '#3B82F6'),
  ('Ton Décontracté', 'Style casual et accessible, parfait pour l''engagement', 'tone', '{"formality": "low", "emoji_level": "moderate", "vocabulary": "simple"}', '#10B981'),
  ('Ton Expert', 'Style autoritaire avec données et statistiques', 'tone', '{"formality": "medium", "emoji_level": "rare", "vocabulary": "expert", "data_driven": true}', '#8B5CF6'),
  
  ('Format Court', 'Posts de moins de 300 mots, percutants', 'format', '{"max_words": 300, "paragraphs": "short", "line_breaks": "frequent"}', '#F59E0B'),
  ('Format Développé', 'Posts longs avec structure narrative', 'format', '{"max_words": 800, "paragraphs": "medium", "line_breaks": "moderate"}', '#EC4899'),
  ('Format Liste', 'Structure en points numérotés ou bullet points', 'format', '{"structure": "list", "bullet_style": "numbers", "items": 5}', '#6366F1'),
  
  ('Hook Question', 'Commence par une question provocante', 'hook_style', '{"type": "question", "style": "provocative"}', '#EF4444'),
  ('Hook Statistique', 'Commence par un chiffre choc', 'hook_style', '{"type": "statistic", "style": "surprising"}', '#14B8A6'),
  ('Hook Story', 'Commence par une anecdote personnelle', 'hook_style', '{"type": "story", "style": "personal"}', '#F97316'),
  
  ('CTA Engagement', 'Invite à commenter ou partager une opinion', 'cta_style', '{"action": "comment", "question": true}', '#22C55E'),
  ('CTA Partage', 'Invite à partager ou taguer quelqu''un', 'cta_style', '{"action": "share", "tag_prompt": true}', '#0EA5E9'),
  ('CTA Link', 'Redirige vers un lien externe', 'cta_style', '{"action": "click", "urgency": "moderate"}', '#A855F7')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.presets IS 'Reusable configuration presets for post templates';
COMMENT ON TABLE public.template_presets IS 'Many-to-many link between templates and presets';
