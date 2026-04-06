-- Create job applications table to store incoming career applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_title_snapshot TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  experience TEXT,
  expected_salary TEXT,
  linkedin TEXT,
  portfolio TEXT,
  additional_info TEXT,
  resume_file_name TEXT,
  resume_file_path TEXT,
  resume_file_url TEXT,
  cover_letter_file_name TEXT,
  cover_letter_file_path TEXT,
  cover_letter_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  status_notes TEXT,
  last_emailed_at TIMESTAMP WITH TIME ZONE,
  communication_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Admin users can fully manage job applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_applications'
      AND policyname = 'Admins can manage job applications'
  ) THEN
    CREATE POLICY "Admins can manage job applications"
      ON job_applications
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM users
          WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM users
          WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;

-- Create bucket for applicant attachments if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-applications', 'job-applications', true)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE job_applications IS 'Applications submitted through the careers form';
