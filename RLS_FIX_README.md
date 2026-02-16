# RLS Infinite Recursion Fix

## Problem
When updating blogs or case studies, you're encountering this error:
```
infinite recursion detected in policy for relation "users"
```

## Root Cause
The RLS (Row Level Security) policies on the `blogs` and `case_studies` tables were checking user roles by querying the `users` table:

```sql
CREATE POLICY "Authors and admins can update blogs" ON blogs FOR UPDATE USING (
  created_by = auth.uid() OR 
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
);
```

Since the `users` table also has RLS enabled, this creates a circular dependency:
- Blog update policy checks `users` table
- `users` table RLS policy checks `users` table again
- Infinite recursion!

## Solution
The fix uses a **SECURITY DEFINER function** that bypasses RLS when checking user roles. This breaks the circular dependency.

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `fix_rls_infinite_recursion.sql`
4. Paste and run the SQL

### Option 2: Command Line
```bash
# If you have Supabase CLI installed
supabase db execute -f fix_rls_infinite_recursion.sql
```

## What the Fix Does

1. **Creates a helper function** `is_admin_or_super_admin()` that:
   - Runs with SECURITY DEFINER (bypasses RLS)
   - Safely checks if a user is an admin or super admin
   
2. **Updates all RLS policies** to use this function instead of direct subqueries

3. **Affected tables:**
   - `blogs` - Update and delete policies
   - `case_studies` - Update and delete policies
   - `activity_logs` - Select policy
   - `contact_submissions` - Update policy
   - `settings` - Update policy
   - `users` - Management policy

## After Applying the Fix

Once you run the SQL migration:
- ✅ Blog updates will work without errors
- ✅ Case study updates will work without errors
- ✅ Activity logs will load properly
- ✅ All admin operations will function correctly

## Verification

After running the fix, test by:
1. Editing a blog post
2. Updating a case study
3. Viewing the activity logs page

All operations should complete successfully without the infinite recursion error.
