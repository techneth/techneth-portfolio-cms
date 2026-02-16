-- COMPLETE RLS FIX - Reset Everything to Eliminate Infinite Recursion
-- This drops ALL policies and recreates them properly
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create helper function (if not exists)
-- ============================================

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

-- ============================================
-- STEP 2: Drop ALL existing RLS policies
-- ============================================

-- Drop all users table policies
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can update own last_login" ON users;
DROP POLICY IF EXISTS "Allow users to update own last_login" ON users;
DROP POLICY IF EXISTS "Super admins can manage users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Drop all blogs policies
DROP POLICY IF EXISTS "Everyone can view published blogs" ON blogs;
DROP POLICY IF EXISTS "Authenticated users can create blogs" ON blogs;
DROP POLICY IF EXISTS "Authors can view own blogs" ON blogs;
DROP POLICY IF EXISTS "Admins can view all blogs" ON blogs;
DROP POLICY IF EXISTS "Authors and admins can update blogs" ON blogs;
DROP POLICY IF EXISTS "Admins can delete blogs" ON blogs;

-- Drop all case_studies policies
DROP POLICY IF EXISTS "Everyone can view published case studies" ON case_studies;
DROP POLICY IF EXISTS "Authenticated users can create case_studies" ON case_studies;
DROP POLICY IF EXISTS "Authors can view own case studies" ON case_studies;
DROP POLICY IF EXISTS "Admins can view all case studies" ON case_studies;
DROP POLICY IF EXISTS "Authors and admins can update case studies" ON case_studies;
DROP POLICY IF EXISTS "Admins can delete case studies" ON case_studies;

-- ============================================
-- STEP 3: Create NEW clean policies
-- ============================================

-- USERS TABLE POLICIES (NO circular dependencies)
CREATE POLICY "Users can view own record" ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own last_login" ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- BLOGS TABLE POLICIES
CREATE POLICY "Everyone can view published blogs" ON blogs FOR SELECT
TO public
USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can create blogs" ON blogs FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "Admins can view all blogs" ON blogs FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR 
  is_admin_or_super_admin(auth.uid())
);

CREATE POLICY "Authors and admins can update blogs" ON blogs FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR 
  is_admin_or_super_admin(auth.uid())
);

CREATE POLICY "Admins can delete blogs" ON blogs FOR DELETE
TO authenticated
USING (is_admin_or_super_admin(auth.uid()));

-- CASE STUDIES TABLE POLICIES
CREATE POLICY "Everyone can view published case studies" ON case_studies FOR SELECT
TO public
USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can create case_studies" ON case_studies FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "Admins can view all case studies" ON case_studies FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR 
  is_admin_or_super_admin(auth.uid())
);

CREATE POLICY "Authors and admins can update case studies" ON case_studies FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR 
  is_admin_or_super_admin(auth.uid())
);

CREATE POLICY "Admins can delete case studies" ON case_studies FOR DELETE
TO authenticated
USING (is_admin_or_super_admin(auth.uid()));

-- ============================================
-- STEP 4: Verify policies
-- ============================================

SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('users', 'blogs', 'case_studies')
ORDER BY tablename, policyname;

-- You should see clean policies with no circular dependencies
