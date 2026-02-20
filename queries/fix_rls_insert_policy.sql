-- Fix RLS INSERT policies for blogs and case_studies
-- This fixes the "new row violates row-level security policy" error
-- Run this in Supabase SQL Editor

-- Drop existing INSERT policies if any
DROP POLICY IF EXISTS "Authenticated users can create blogs" ON blogs;
DROP POLICY IF EXISTS "Authenticated users can create case_studies" ON case_studies;

-- Blogs INSERT policy
-- Allows authenticated admins, editors, and super_admins to create blogs
CREATE POLICY "Authenticated users can create blogs" ON blogs FOR INSERT 
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'editor') 
    AND is_active = true
  )
);

-- Case Studies INSERT policy  
-- Allows authenticated admins, editors, and super_admins to create case studies
CREATE POLICY "Authenticated users can create case_studies" ON case_studies FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'editor') 
    AND is_active = true
  )
);

-- Verify the new INSERT policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as command,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies 
WHERE tablename IN ('blogs', 'case_studies') AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- You should see both INSERT policies listed above
