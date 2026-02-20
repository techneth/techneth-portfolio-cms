-- Fix RLS infinite recursion on activity_logs table
-- Run this in Supabase SQL Editor

-- Drop all existing policies on activity_logs
DROP POLICY IF EXISTS "Users can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON activity_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON activity_logs;

-- Create simple, non-recursive policies
CREATE POLICY "Allow authenticated users to read activity logs"
ON activity_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert activity logs"
ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'activity_logs'
ORDER BY policyname;
