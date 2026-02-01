-- Add mentions column to production_posts for LinkedIn mentions
ALTER TABLE production_posts 
ADD COLUMN IF NOT EXISTS mentions jsonb DEFAULT NULL;

COMMENT ON COLUMN production_posts.mentions IS 'Array of LinkedIn mentions: [{name: string, profile_id: string}]';
