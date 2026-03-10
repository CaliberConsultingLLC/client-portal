-- Collaboration Campaign table: stores per-client collaboration survey results
-- Each row represents one complete collaboration campaign with processed dashboard data

CREATE TABLE collab_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'ready', 'error')),
  config JSONB DEFAULT '{}'::jsonb,
  respondent_count INTEGER DEFAULT 0,
  department_count INTEGER DEFAULT 0,
  processed_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collab_campaigns_org ON collab_campaigns(org_id);
CREATE INDEX idx_collab_campaigns_slug ON collab_campaigns(slug);
CREATE INDEX idx_collab_campaigns_status ON collab_campaigns(status);

-- RLS: admins see all, portal users see only their org's campaigns with status=ready
ALTER TABLE collab_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on collab_campaigns"
  ON collab_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('nsp_admin', 'admin', 'analyst')
    )
  );

CREATE POLICY "Portal users can view their org ready campaigns"
  ON collab_campaigns FOR SELECT
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.org_id = collab_campaigns.org_id
    )
  );
