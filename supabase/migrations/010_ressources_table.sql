-- Migration: Create ressources table for attachments (Pièces jointes)

CREATE TABLE IF NOT EXISTS ressources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'image', 'video', 'link')),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ressources ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (adjust based on auth requirements)
CREATE POLICY "Allow all operations on ressources"
ON ressources FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster search
CREATE INDEX IF NOT EXISTS idx_ressources_file_type ON ressources(file_type);
CREATE INDEX IF NOT EXISTS idx_ressources_created_at ON ressources(created_at DESC);
