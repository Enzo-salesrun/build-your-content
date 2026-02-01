-- Extend profiles table with first_name, last_name, email, role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;

-- Update full_name to be generated from first_name + last_name if both exist
-- (keep full_name for backwards compatibility)

-- Add index on email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
