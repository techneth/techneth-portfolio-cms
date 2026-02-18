-- Migration: Add status column to users table for signup approval flow
-- Run this in Supabase SQL Editor

-- 1. Add status column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Set all existing users to 'approved' (they were created by super admin)
UPDATE users SET status = 'approved' WHERE status IS NULL;

-- 3. Drop old RLS policies on users table and recreate with status support
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Super admins can manage users" ON users;

-- Allow authenticated users to view all users (needed for admin panel)
CREATE POLICY "Authenticated users can view users" ON users 
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow new signups to insert their own row (auth.uid() matches the new user's id)
CREATE POLICY "Users can insert their own profile" ON users 
FOR INSERT WITH CHECK (auth.uid() = id);

-- Super admins can update/delete any user
CREATE POLICY "Super admins can update users" ON users 
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin' AND status = 'approved' AND is_active = true)
);

CREATE POLICY "Super admins can delete users" ON users 
FOR DELETE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin' AND status = 'approved' AND is_active = true)
);

-- Users can update their own profile (for avatar, name etc.)
CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid() = id);
