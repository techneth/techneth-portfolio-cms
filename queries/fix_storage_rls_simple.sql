-- SIMPLIFIED Storage RLS Fix for Blogs Bucket
-- Run this in Supabase SQL Editor if the previous script didn't work

-- Step 1: Make sure the blogs bucket is PUBLIC
UPDATE storage.buckets 
SET public = true 
WHERE name = 'blogs';

-- Step 2: Drop ALL existing policies on storage.objects to start fresh
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Create SIMPLE policies that allow everything for authenticated users

-- Allow authenticated users to upload to blogs bucket
CREATE POLICY "Allow authenticated uploads to blogs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blogs');

-- Allow everyone (public) to read from blogs bucket
CREATE POLICY "Allow public reads from blogs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'blogs');

-- Allow authenticated users to update in blogs bucket
CREATE POLICY "Allow authenticated updates to blogs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blogs');

-- Allow authenticated users to delete from blogs bucket
CREATE POLICY "Allow authenticated deletes from blogs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blogs');

-- Repeat for case_studies bucket

-- Make case_studies bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'case_studies';

CREATE POLICY "Allow authenticated uploads to case_studies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case_studies');

CREATE POLICY "Allow public reads from case_studies"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'case_studies');

CREATE POLICY "Allow authenticated updates to case_studies"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'case_studies');

CREATE POLICY "Allow authenticated deletes from case_studies"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'case_studies');

-- Verification: Check all policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- You should see 8 policies total (4 for blogs, 4 for case_studies)
