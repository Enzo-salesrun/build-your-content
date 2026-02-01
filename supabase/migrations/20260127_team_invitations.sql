-- Team Member Invitation System
-- Adds invitation tracking to profiles and creates invitation email functionality

-- Add invitation fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS invitation_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'none' 
    CHECK (invitation_status IN ('none', 'pending', 'sent', 'accepted', 'expired')),
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at timestamptz;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_token ON profiles(invitation_token) WHERE invitation_token IS NOT NULL;

-- Function to generate unique invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to mark invitation as accepted when member connects their LinkedIn
CREATE OR REPLACE FUNCTION mark_invitation_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- When unipile account is connected (status = 'OK'), mark invitation as accepted
  IF NEW.status = 'OK' AND (OLD.status IS NULL OR OLD.status != 'OK') THEN
    UPDATE profiles
    SET 
      invitation_status = 'accepted',
      invitation_accepted_at = now()
    WHERE id = NEW.profile_id
      AND invitation_status IN ('pending', 'sent');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on unipile_accounts to auto-mark invitation accepted
DROP TRIGGER IF EXISTS on_unipile_connected_mark_invitation ON unipile_accounts;
CREATE TRIGGER on_unipile_connected_mark_invitation
  AFTER INSERT OR UPDATE OF status ON unipile_accounts
  FOR EACH ROW EXECUTE FUNCTION mark_invitation_accepted();
