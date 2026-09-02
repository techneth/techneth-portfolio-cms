-- Inbound blog webhook (POST /api/neth-blog)
-- Lets an external publisher push posts into this CMS. Run in the Supabase SQL editor.

-- ============================================================
-- blogs: remember where an imported post came from
-- external_id is the sender's `id` — upserts key on it, so a re-delivery or a
-- blog.updated event edits the same row instead of creating a duplicate.
-- ============================================================
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS external_source TEXT;

-- Partial unique index: only imported rows are constrained, hand-written posts
-- keep external_id NULL and are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS blogs_external_id_key
  ON blogs (external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON COLUMN blogs.external_id IS 'Sender-side post id for webhook-imported posts (NULL for posts written in the admin panel)';
COMMENT ON COLUMN blogs.external_source IS 'Which integration delivered the post, e.g. "neth"';

-- ============================================================
-- Delivery log — audit trail + replay/dedupe guard
-- The sender retries on any non-2xx or timeout, so the same X-Neth-Delivery
-- can arrive more than once. Storing it lets the route answer 200 immediately
-- instead of re-processing the payload.
-- ============================================================
CREATE TABLE IF NOT EXISTS neth_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id TEXT NOT NULL UNIQUE,
  event TEXT,
  external_id TEXT,
  blog_id UUID REFERENCES blogs(id) ON DELETE SET NULL,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'skipped', 'failed')),
  error TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neth_deliveries_created_at ON neth_webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_neth_deliveries_external_id ON neth_webhook_deliveries(external_id);

-- ============================================================
-- Row Level Security
-- The webhook route writes with the service role key (bypasses RLS).
-- This policy only covers reads from the admin panel's user session.
-- ============================================================
ALTER TABLE neth_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read webhook deliveries" ON neth_webhook_deliveries;
CREATE POLICY "Admins can read webhook deliveries" ON neth_webhook_deliveries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

COMMENT ON TABLE neth_webhook_deliveries IS 'Every inbound delivery to /api/neth-blog — dedupe key and audit trail';
