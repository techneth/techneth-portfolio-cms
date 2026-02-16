-- Fix Supabase Storage Bucket RLS Policies
-- This fixes the "StorageApiError: new row violates row-level security policy" error
-- Run this in Supabase SQL Editor

-- IMPORTANT: Replace 'blogs' and 'case_studies' with your actual bucket names if different

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload to blogs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view blogs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blogs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from blogs bucket" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to case_studies bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view case_studies bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update case_studies bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from case_studies bucket" ON storage.objects;

-- ============================================
-- BLOGS BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload images to blogs bucket
CREATE POLICY "Authenticated users can upload to blogs bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blogs' AND
  auth.role() = 'authenticated'
);

-- Allow public to view images in blogs bucket (needed for website display)
CREATE POLICY "Public can view blogs bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'blogs');

-- Allow authenticated users to update images in blogs bucket
CREATE POLICY "Authenticated users can update blogs bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blogs' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'blogs' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete images from blogs bucket
CREATE POLICY "Authenticated users can delete from blogs bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blogs' AND auth.role() = 'authenticated');

-- ============================================
-- CASE STUDIES BUCKET POLICIES
-- ============================================

-- Allow authenticated users to upload images to case_studies bucket
CREATE POLICY "Authenticated users can upload to case_studies bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case_studies' AND
  auth.role() = 'authenticated'
);

-- Allow public to view images in case_studies bucket
CREATE POLICY "Public can view case_studies bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'case_studies');

-- Allow authenticated users to update images in case_studies bucket
CREATE POLICY "Authenticated users can update case_studies bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'case_studies' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'case_studies' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete images from case_studies bucket
CREATE POLICY "Authenticated users can delete from case_studies bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'case_studies' AND auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify all storage policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- You should see 8 policies (4 for blogs, 4 for case_studies)
