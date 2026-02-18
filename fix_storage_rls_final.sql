-- Final Fix for Storage RLS Policies
-- Run this in Supabase SQL Editor

-- 1. Create buckets if they don't exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('blogs', 'blogs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('case_studies', 'case_studies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop extensive existing policies to ensure clean slate
DROP POLICY IF EXISTS "Authenticated users can upload to blogs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view blogs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blogs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from blogs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01k_3" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to case_studies bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view case_studies bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update case_studies bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from case_studies bucket" ON storage.objects;

-- 3. Create simplified, robust policies for BLOGS
CREATE POLICY "Public Access Blogs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'blogs');

CREATE POLICY "Auth Upload Blogs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blogs');

CREATE POLICY "Auth Update Blogs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blogs');

CREATE POLICY "Auth Delete Blogs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blogs');

-- 4. Create simplified, robust policies for CASE_STUDIES
CREATE POLICY "Public Access Case Studies"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'case_studies');

CREATE POLICY "Auth Upload Case Studies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case_studies');

CREATE POLICY "Auth Update Case Studies"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'case_studies');

CREATE POLICY "Auth Delete Case Studies"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'case_studies');

-- 5. Verification
SELECT * FROM pg_policies WHERE schemaname = 'storage';
