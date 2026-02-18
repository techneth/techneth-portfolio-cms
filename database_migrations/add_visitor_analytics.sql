-- Add visitor tracking table
CREATE TABLE page_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_path TEXT NOT NULL,
  visitor_ip TEXT,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  referrer TEXT,
  visited_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for visitor analytics
CREATE INDEX idx_page_visits_date ON page_visits(visited_at DESC);
CREATE INDEX idx_page_visits_country ON page_visits(country);
CREATE INDEX idx_page_visits_path ON page_visits(page_path);

-- Add country and IP address to contact submissions
ALTER TABLE contact_submissions 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Update the dashboard stats view to include jobs
DROP VIEW IF EXISTS dashboard_stats;
CREATE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM blogs WHERE status = 'published') as published_blogs,
  (SELECT COUNT(*) FROM blogs WHERE status = 'draft') as draft_blogs,
  (SELECT COUNT(*) FROM case_studies WHERE status = 'published') as published_case_studies,
  (SELECT COUNT(*) FROM contact_submissions WHERE status = 'unread') as unread_contacts,
  (SELECT COUNT(*) FROM contact_submissions WHERE status = 'read') as read_contacts,
  (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM jobs WHERE is_active = true) as active_jobs,
  (SELECT COUNT(*) FROM jobs) as total_jobs,
  (SELECT COUNT(DISTINCT visitor_ip) FROM page_visits WHERE visited_at >= NOW() - INTERVAL '30 days') as unique_visitors_30d,
  (SELECT COUNT(*) FROM page_visits WHERE visited_at >= NOW() - INTERVAL '30 days') as total_visits_30d;

-- Enable RLS for page_visits
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_visits
CREATE POLICY "Anyone can insert page visits" ON page_visits 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can view page visits" ON page_visits 
  FOR SELECT 
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
  );

-- Insert some sample visitor data for demonstration (optional - remove in production)
INSERT INTO page_visits (page_path, visitor_ip, country, city, user_agent, referrer, visited_at) VALUES
  ('/', '192.168.1.1', 'United States', 'New York', 'Mozilla/5.0', 'https://google.com', NOW() - INTERVAL '1 day'),
  ('/blogs', '192.168.1.2', 'United Kingdom', 'London', 'Mozilla/5.0', 'https://google.com', NOW() - INTERVAL '2 days'),
  ('/case-studies', '192.168.1.3', 'Canada', 'Toronto', 'Mozilla/5.0', NULL, NOW() - INTERVAL '3 days'),
  ('/', '192.168.1.4', 'Australia', 'Sydney', 'Mozilla/5.0', 'https://linkedin.com', NOW() - INTERVAL '5 days'),
  ('/blogs', '192.168.1.5', 'Germany', 'Berlin', 'Mozilla/5.0', 'https://twitter.com', NOW() - INTERVAL '10 days'),
  ('/', '192.168.1.1', 'United States', 'New York', 'Mozilla/5.0', 'direct', NOW() - INTERVAL '15 days'),
  ('/case-studies', '192.168.1.6', 'India', 'Mumbai', 'Mozilla/5.0', NULL, NOW() - INTERVAL '20 days'),
  ('/', '192.168.1.7', 'United States', 'San Francisco', 'Mozilla/5.0', 'https://google.com', NOW() - INTERVAL '25 days'),
  ('/blogs', '192.168.1.8', 'France', 'Paris', 'Mozilla/5.0', NULL, NOW() - INTERVAL '1 month'),
  ('/', '192.168.1.9', 'Japan', 'Tokyo', 'Mozilla/5.0', 'https://google.com', NOW() - INTERVAL '2 months');

COMMENT ON TABLE page_visits IS 'Track page visits and visitor analytics';
