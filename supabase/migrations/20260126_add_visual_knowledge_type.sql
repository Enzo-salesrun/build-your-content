-- Migration: Add 'visual' to knowledge_type enum for resource bank images
-- This allows storing visual resources (images, infographics, etc.) with URLs

-- Add 'visual' to the knowledge_type enum
ALTER TYPE knowledge_type ADD VALUE IF NOT EXISTS 'visual';

-- Add example visual entries
INSERT INTO knowledge (title, content, summary, knowledge_type, source_url, tags, is_verified) VALUES
(
  'Infographie Pipeline Sales',
  'Infographie montrant les étapes du pipeline commercial de prospection à closing',
  'Visuel pipeline sales funnel',
  'visual',
  'https://example.com/images/pipeline-sales.png',
  array['visual', 'sales', 'infographic'],
  true
),
(
  'Template Carousel LinkedIn',
  'Template pour créer des carrousels LinkedIn sur les tips de prospection',
  'Template carrousel tips',
  'visual',
  'https://example.com/images/carousel-template.png',
  array['visual', 'linkedin', 'carousel'],
  true
)
ON CONFLICT DO NOTHING;
