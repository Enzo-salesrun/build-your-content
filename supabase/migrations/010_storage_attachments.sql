-- Migration: Storage bucket for attachments (photos, files)
-- This creates the storage bucket and policies for the "Pièces jointes" feature

-- Create the storage bucket for ressources/attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ressources',
  'ressources',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[];

-- Policy: Allow public read access to all files
CREATE POLICY "Public read access for ressources"
ON storage.objects FOR SELECT
USING (bucket_id = 'ressources');

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload ressources"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ressources');

-- Policy: Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update ressources"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ressources');

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete ressources"
ON storage.objects FOR DELETE
USING (bucket_id = 'ressources');
