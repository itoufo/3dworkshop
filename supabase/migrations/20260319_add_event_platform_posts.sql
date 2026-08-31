-- Event platform cross-posting tracking table
CREATE TABLE event_platform_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('street-academy','aini','kokuchpro','peatix','ikoyo')),
  platform_event_id TEXT,
  platform_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','posted','failed','review')),
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workshop_id, platform)
);

-- Index for quick lookups
CREATE INDEX idx_event_platform_posts_workshop ON event_platform_posts(workshop_id);
CREATE INDEX idx_event_platform_posts_platform_status ON event_platform_posts(platform, status);
