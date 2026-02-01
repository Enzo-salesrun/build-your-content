-- Migration: Add media_url to production_posts
-- Allows attaching visual/image to posts

ALTER TABLE production_posts
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'link', 'video'));

COMMENT ON COLUMN production_posts.media_url IS 'URL of the attached media (image, link preview, etc.)';
COMMENT ON COLUMN production_posts.media_type IS 'Type of media: image, link, or video';
