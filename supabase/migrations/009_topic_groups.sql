-- Migration: Add topic_group column to topics table
-- Groups topics into 9 thematic categories

-- Create enum for topic groups
CREATE TYPE topic_group AS ENUM (
  'sales_prospection',
  'sales_operations', 
  'business',
  'mindset_career',
  'marketing_growth',
  'ai_tech',
  'automation_tools',
  'data_tools',
  'content_branding'
);

-- Add topic_group column to topics table
ALTER TABLE topics ADD COLUMN IF NOT EXISTS topic_group topic_group;

-- Update existing topics with their groups based on name patterns
UPDATE topics SET topic_group = 'sales_prospection' WHERE name ILIKE ANY(ARRAY['%cold_email%', '%cold_calling%', '%linkedin_outreach%', '%closing%', '%prospecting%', '%outbound%', '%lead_gen%', '%sdr%', '%bdr%', '%appointment%']);

UPDATE topics SET topic_group = 'sales_operations' WHERE name ILIKE ANY(ARRAY['%crm%', '%sales_automation%', '%sales_coaching%', '%revenue_operations%', '%revops%', '%pipeline%', '%forecasting%', '%quota%', '%commission%', '%territory%']);

UPDATE topics SET topic_group = 'business' WHERE name ILIKE ANY(ARRAY['%entrepreneurship%', '%bootstrapping%', '%scaling%', '%pricing%', '%startup%', '%founder%', '%ceo%', '%strategy%', '%business_model%', '%fundraising%', '%investment%']);

UPDATE topics SET topic_group = 'mindset_career' WHERE name ILIKE ANY(ARRAY['%mindset%', '%leadership%', '%productivity%', '%networking%', '%career%', '%motivation%', '%habits%', '%success%', '%learning%', '%personal_development%', '%coaching%']);

UPDATE topics SET topic_group = 'marketing_growth' WHERE name ILIKE ANY(ARRAY['%growth_hacking%', '%ads%', '%seo%', '%copywriting%', '%marketing%', '%conversion%', '%funnel%']);

UPDATE topics SET topic_group = 'ai_tech' WHERE name ILIKE ANY(ARRAY['%ai%', '%prompt_engineering%', '%claude%', '%vibe_coding%', '%llm%', '%gpt%', '%automation%']);

UPDATE topics SET topic_group = 'automation_tools' WHERE name ILIKE ANY(ARRAY['%n8n%', '%no_code%', '%supabase%', '%workflow%', '%zapier%', '%make%', '%integromat%']);

UPDATE topics SET topic_group = 'data_tools' WHERE name ILIKE ANY(ARRAY['%data_enrichment%', '%clay%', '%cargo%', '%visitor_tracking%', '%analytics%']);

UPDATE topics SET topic_group = 'content_branding' WHERE name ILIKE ANY(ARRAY['%linkedin_content%', '%personal_branding%', '%storytelling%', '%content%', '%brand%']);

-- Set default for topics without a group
UPDATE topics SET topic_group = 'business' WHERE topic_group IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_topics_group ON topics(topic_group);

COMMENT ON COLUMN topics.topic_group IS 'Thematic group for organizing topics in the UI';
