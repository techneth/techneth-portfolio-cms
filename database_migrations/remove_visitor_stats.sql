-- Migration: Remove visitor stats from dashboard_stats view
-- Run this in Supabase SQL Editor

-- Drop the old view and recreate without visitor stats
DROP VIEW IF EXISTS dashboard_stats;

CREATE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM blogs WHERE status = 'published') as published_blogs,
  (SELECT COUNT(*) FROM blogs WHERE status = 'draft') as draft_blogs,
  (SELECT COUNT(*) FROM case_studies WHERE status = 'published') as published_case_studies,
  (SELECT COUNT(*) FROM contact_submissions WHERE status = 'unread') as unread_contacts,
  (SELECT COUNT(*) FROM contact_submissions WHERE status = 'read') as read_contacts,
  (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM careers WHERE status = 'active') as active_jobs,
  (SELECT COUNT(*) FROM careers) as total_jobs;

-- Optional: Drop the visitor tracking table if it exists
-- DROP TABLE IF EXISTS visitor_logs;

-- Optional: Drop the get_monthly_visitors function if it exists
-- DROP FUNCTION IF EXISTS get_monthly_visitors(integer);
