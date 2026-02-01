-- Migration: Auto-sync profile webhook
-- This migration sets up the trigger logic, but the actual HTTP webhook 
-- should be configured via Supabase Dashboard > Database > Webhooks

-- Simple trigger to mark profile as needing sync
-- The actual sync is handled by Supabase Database Webhook (configured in dashboard)

CREATE OR REPLACE FUNCTION public.mark_profile_for_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for external_influencer profiles with linkedin_id
  IF NEW.type = 'external_influencer' AND NEW.linkedin_id IS NOT NULL THEN
    -- Mark as pending sync
    NEW.sync_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT
DROP TRIGGER IF EXISTS on_profile_created_mark_sync ON public.profiles;
CREATE TRIGGER on_profile_created_mark_sync
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_profile_for_sync();

-- Trigger on UPDATE when linkedin_id changes
CREATE OR REPLACE FUNCTION public.mark_profile_for_sync_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if linkedin_id was just added
  IF OLD.linkedin_id IS NULL AND NEW.linkedin_id IS NOT NULL AND NEW.type = 'external_influencer' THEN
    NEW.sync_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_linkedin_updated_mark_sync ON public.profiles;
CREATE TRIGGER on_profile_linkedin_updated_mark_sync
  BEFORE UPDATE OF linkedin_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_profile_for_sync_on_update();

-- =============================================================================
-- SETUP INSTRUCTIONS: Configure Database Webhook in Supabase Dashboard
-- =============================================================================
-- 1. Go to: Supabase Dashboard > Database > Webhooks
-- 2. Click "Create a new webhook"
-- 3. Configure:
--    - Name: sync-scrape-on-create
--    - Table: profiles
--    - Events: INSERT
--    - Type: Supabase Edge Function
--    - Edge Function: sync-scrape  <-- NEW: Use sync-scrape instead of sync-profiles
--    - HTTP Headers: (leave default, it auto-adds auth)
--
-- NEW SPLIT ARCHITECTURE:
--   sync-scrape   (~30s) -> Scraping LinkedIn posts only
--   process-posts (~60s) -> Embeddings + Classifications + Style analysis
--
-- sync-scrape automatically calls process-posts when done (fire & forget)
-- =============================================================================

COMMENT ON FUNCTION public.mark_profile_for_sync IS 'Marks new profiles as pending sync';
COMMENT ON FUNCTION public.mark_profile_for_sync_on_update IS 'Marks profiles as pending sync when linkedin_id is added';
