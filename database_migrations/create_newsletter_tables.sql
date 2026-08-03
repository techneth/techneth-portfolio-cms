-- Newsletter system: subscribers + campaigns
-- Run this in the Supabase SQL editor.

-- ============================================================
-- Subscribers
-- ============================================================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source TEXT DEFAULT 'website',
  unsubscribe_token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  ip_address TEXT,
  user_agent TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX idx_newsletter_subscribers_created_at ON newsletter_subscribers(created_at DESC);
CREATE INDEX idx_newsletter_subscribers_token ON newsletter_subscribers(unsubscribe_token);

-- ============================================================
-- Campaigns
-- ============================================================
CREATE TABLE newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  preheader TEXT,
  content_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_newsletter_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX idx_newsletter_campaigns_created_at ON newsletter_campaigns(created_at DESC);

-- ============================================================
-- Row Level Security
-- Public subscribe/unsubscribe goes through the backend API with the
-- service role key, which bypasses RLS. These policies cover the admin
-- panel, which uses the authenticated user's session.
-- ============================================================
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletter subscribers" ON newsletter_subscribers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can manage newsletter campaigns" ON newsletter_campaigns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

COMMENT ON TABLE newsletter_subscribers IS 'Email addresses subscribed to the Techneth newsletter';
COMMENT ON TABLE newsletter_campaigns IS 'Newsletter campaigns composed and sent from the admin panel';
