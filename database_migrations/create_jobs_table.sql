-- Create jobs table for career postings management
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead')),
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  responsibilities TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  salary_range TEXT,
  is_remote BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  application_deadline DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_jobs_active ON jobs(is_active);
CREATE INDEX idx_jobs_department ON jobs(department);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active jobs (for public careers page)
CREATE POLICY "Anyone can view active jobs" ON jobs 
  FOR SELECT 
  USING (is_active = true);

-- Admins and super admins can manage jobs
CREATE POLICY "Admins can manage jobs" ON jobs 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Add comment
COMMENT ON TABLE jobs IS 'Job postings for careers page';
