-- Fix RLS violations for updating case studies
-- Run this in Supabase SQL Editor

-- 1. Create a secure function to check admin status
-- This function runs with SECURITY DEFINER to bypass RLS on the users table
CREATE OR REPLACE FUNCTION public.is_admin_of_app()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin') 
    AND is_active = true
  );
END;
$$;

-- 2. Update Case Studies Policies

-- Drop existing UPDATE policy (handle various potential names)
DROP POLICY IF EXISTS "Authors and admins can update case studies" ON case_studies;
DROP POLICY IF EXISTS "Authenticated users can update case_studies" ON case_studies;

-- Create new robust UPDATE policy
CREATE POLICY "Authors and admins can update case studies" 
ON case_studies 
FOR UPDATE 
TO authenticated
USING (
  created_by = auth.uid() OR is_admin_of_app()
);

-- 3. Update Blogs Policies (preventative fix)
DROP POLICY IF EXISTS "Authors and admins can update blogs" ON blogs;

CREATE POLICY "Authors and admins can update blogs" 
ON blogs 
FOR UPDATE 
TO authenticated
USING (
  created_by = auth.uid() OR is_admin_of_app()
);

-- 4. Ensure Users can view basic user info (needed for some frontend logic)
-- Dropping potential conflicting policies first
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "View all users" ON users;

CREATE POLICY "Users can view all users" 
ON users 
FOR SELECT 
TO authenticated 
USING (true);

-- 5. Verification
SELECT 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('case_studies', 'blogs', 'users') 
ORDER BY tablename, policyname;
