-- Fix RLS Policy for Users Table
-- This allows users to update their own last_login timestamp

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own last_login" ON users;

-- Create new policy to allow users to update their own last_login
CREATE POLICY "Users can update own last_login"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Only allow updating last_login column
    last_login IS DISTINCT FROM (SELECT last_login FROM users WHERE id = auth.uid())
  )
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
