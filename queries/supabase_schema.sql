-- Techneth Admin Panel Database Schema
-- This SQL file creates all necessary tables and views for the admin panel

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'editor' CHECK (role IN ('super_admin', 'admin', 'editor')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Blogs table
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Case Studies table
CREATE TABLE case_studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  client_name TEXT,
  industry TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  gallery JSONB,
  technologies TEXT[],
  results JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured BOOLEAN DEFAULT false,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Contact Submissions table
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  reply_sent_by UUID REFERENCES auth.users(id),
  reply_sent_by_name TEXT,
  reply_sent_at TIMESTAMP,
  internal_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_title TEXT,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_blogs_status ON blogs(status);
CREATE INDEX idx_blogs_created_at ON blogs(created_at DESC);
CREATE INDEX idx_blogs_author ON blogs(author_id);

CREATE INDEX idx_case_studies_status ON case_studies(status);
CREATE INDEX idx_case_studies_featured ON case_studies(is_featured);
CREATE INDEX idx_case_studies_created_at ON case_studies(created_at DESC);

CREATE INDEX idx_contacts_status ON contact_submissions(status);
CREATE INDEX idx_contacts_created_at ON contact_submissions(created_at DESC);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Dashboard Stats View
CREATE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM blogs WHERE status = 'published') as published_blogs,
  (SELECT COUNT(*) FROM blogs WHERE status = 'draft') as draft_blogs,
  (SELECT COUNT(*) FROM case_studies WHERE status = 'published') as published_case_studies,
  (SELECT COUNT(*) FROM contact_submissions WHERE status = 'unread') as unread_contacts,
  (SELECT COUNT(*) FROM contact_submissions WHERE status = 'read') as read_contacts,
  (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users;

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "Site under maintenance"}', 'Site maintenance mode'),
  ('site_name', '{"value": "Techneth"}', 'Site name'),
  ('contact_email', '{"value": "info@techneth.com"}', 'Contact email');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your Supabase auth setup)
-- Note: You'll need to customize these based on how you want to handle authentication

-- Users table policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Super admins can manage users" ON users FOR ALL USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin' AND is_active = true)
);

-- Blogs table policies
CREATE POLICY "Anyone can view published blogs" ON blogs FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create blogs" ON blogs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors and admins can update blogs" ON blogs FOR UPDATE USING (
  created_by = auth.uid() OR 
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
);
CREATE POLICY "Admins can delete blogs" ON blogs FOR DELETE USING (
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
);

-- Case studies table policies (similar to blogs)
CREATE POLICY "Anyone can view published case studies" ON case_studies FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create case studies" ON case_studies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors and admins can update case studies" ON case_studies FOR UPDATE USING (
  created_by = auth.uid() OR 
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
);
CREATE POLICY "Admins can delete case studies" ON case_studies FOR DELETE USING (
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
);

-- Contact submissions policies
CREATE POLICY "Anyone can insert contact submissions" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can view contacts" ON contact_submissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update contacts" ON contact_submissions FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
);

-- Activity logs policies
CREATE POLICY "Anyone authenticated can insert logs" ON activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view logs" ON activity_logs FOR SELECT USING (
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'admin') AND is_active = true)
);

-- Settings policies
CREATE POLICY "Authenticated users can view settings" ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins can update settings" ON settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin' AND is_active = true)
);
