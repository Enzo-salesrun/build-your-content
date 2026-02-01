-- Migration: Extend ressources table to support more file types
-- Adds support for: csv, notion, audio, document (Word, Excel, etc.)

-- Remove the old constraint and add a new one with more types
ALTER TABLE ressources DROP CONSTRAINT IF EXISTS ressources_file_type_check;

ALTER TABLE ressources ADD CONSTRAINT ressources_file_type_check 
  CHECK (file_type IN ('pdf', 'image', 'video', 'link', 'csv', 'notion', 'audio', 'document', 'other'));

-- Add file_size column to track file sizes
ALTER TABLE ressources ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add original_filename to keep track of the original file name
ALTER TABLE ressources ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Add mime_type for better file handling
ALTER TABLE ressources ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Update storage bucket to accept more file types
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800, -- 50MB limit
  allowed_mime_types = ARRAY[
    -- Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Data files
    'text/csv',
    'application/json',
    'text/plain',
    -- Video
    'video/mp4',
    'video/webm',
    'video/quicktime',
    -- Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ]::text[]
WHERE id = 'ressources';
