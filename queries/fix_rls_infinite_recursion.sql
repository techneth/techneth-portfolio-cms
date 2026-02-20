-- Fix RLS infinite recursion on blogs and case_studies tables
-- Run this in Supabase SQL Editor

-- The issue: RLS policies that query the users table create infinite recursion
-- because the users table also has RLS enabled, creating a circular dependency.
-- Solution: Use a security definer function to bypass RLS when checking roles.

-- Create a security definer function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin_or_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role IN ('super_admin', 'admin') 
    AND is_active = true
  );
END;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Authors and admins can update blogs" ON blogs;
DROP POLICY IF EXISTS "Admins can delete blogs" ON blogs;
DROP POLICY IF EXISTS "Authors and admins can update case studies" ON case_studies;
DROP POLICY IF EXISTS "Admins can delete case studies" ON case_studies;
DROP POLICY IF EXISTS "Admins can update contacts" ON contact_submissions;
DROP POLICY IF EXISTS "Admins can view logs" ON activity_logs;
DROP POLICY IF EXISTS "Super admins can update settings" ON settings;
DROP POLICY IF EXISTS "Super admins can manage users" ON users;

-- Create new policies using the security definer function

-- Blogs policies
CREATE POLICY "Authors and admins can update blogs" ON blogs FOR UPDATE USING (
  created_by = auth.uid() OR is_admin_or_super_admin(auth.uid())
);

CREATE POLICY "Admins can delete blogs" ON blogs FOR DELETE USING (
  is_admin_or_super_admin(auth.uid())
);

-- Case studies policies
CREATE POLICY "Authors and admins can update case studies" ON case_studies FOR UPDATE USING (
  created_by = auth.uid() OR is_admin_or_super_admin(auth.uid())
);

CREATE POLICY "Admins can delete case studies" ON case_studies FOR DELETE USING (
  is_admin_or_super_admin(auth.uid())
);

-- Contact submissions policies
CREATE POLICY "Admins can update contacts" ON contact_submissions FOR UPDATE USING (
  is_admin_or_super_admin(auth.uid())
);

-- Activity logs policies
CREATE POLICY "Admins can view logs" ON activity_logs FOR SELECT USING (
  is_admin_or_super_admin(auth.uid())
);

-- Settings policies
CREATE POLICY "Super admins can update settings" ON settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Users policies
CREATE POLICY "Super admins can manage users" ON users FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Verify the new policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('blogs', 'case_studies', 'activity_logs', 'contact_submissions', 'settings', 'users')
ORDER BY tablename, policyname;
