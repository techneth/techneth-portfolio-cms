-- Conflicting Trigger Cleanup Script
-- Run this in your Supabase SQL Editor to fix the "relation public.profiles does not exist" error

-- 1. Drop the trigger on auth.users causing the issue
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the function associated with the trigger
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Explanation:
-- This error happens when a database trigger tries to automatically create a record 
-- in a 'profiles' table whenever a new user signs up. Since your app uses a 'users' 
-- table instead of 'profiles', this trigger fails because 'profiles' doesn't exist.
-- Removing this trigger solves the user creation error.
