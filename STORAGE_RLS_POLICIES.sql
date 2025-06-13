-- Storage RLS Policies for Event Images
-- For bucket 'events' with 'public' folder structure
-- Run these in your Supabase Dashboard under Storage > Policies (not SQL Editor)

-- IMPORTANT: Apply these policies through the Supabase Dashboard UI, not SQL Editor
-- Go to: Storage > Settings > Policies

-- Bucket name: events
-- Folder structure: events/public/filename.jpg

-- 1. SELECT Policy (for viewing images)
-- Policy Name: "Allow public to view event images"
-- Allowed operation: SELECT
-- Target roles: public
-- Policy definition: bucket_id = 'events'

-- 2. INSERT Policy (for uploading images) 
-- Policy Name: "Allow authenticated users to upload images"
-- Allowed operation: INSERT
-- Target roles: authenticated
-- Policy definition: bucket_id = 'events'

-- 3. DELETE Policy (for deleting images)
-- Policy Name: "Allow authenticated users to delete images"
-- Allowed operation: DELETE  
-- Target roles: authenticated
-- Policy definition: bucket_id = 'events'

-- Alternative: If you can access SQL Editor with proper permissions, use these:

-- First, clean up any existing policies
DROP POLICY IF EXISTS "Allow public to view event images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete images" ON storage.objects;

-- Create the three required policies
CREATE POLICY "Allow public to view event images" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'events');

CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'events');

CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'events');

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
