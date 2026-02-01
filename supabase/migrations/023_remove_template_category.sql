-- Remove category from templates (now using presets for format)

-- Drop the index first
DROP INDEX IF EXISTS idx_post_templates_category;

-- Remove the category column from post_templates
ALTER TABLE post_templates DROP COLUMN IF EXISTS category;

-- Drop the enum type
DROP TYPE IF EXISTS template_category;
