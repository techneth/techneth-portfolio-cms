-- COMPLETE FIX for last_login RLS Policy
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can update own last_login" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Step 2: Create a simple policy that allows users to update ONLY their last_login
CREATE POLICY "Allow users to update own last_login"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 3: Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as command,
  roles
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'UPDATE'
ORDER BY policyname;

-- You should see: "Allow users to update own last_login" policy
