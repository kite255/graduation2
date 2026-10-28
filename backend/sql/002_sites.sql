CREATE TABLE IF NOT EXISTS graduation_sites (
  id UUID PRIMARY KEY,
  slug VARCHAR(63) NOT NULL UNIQUE,
  graduate_name VARCHAR(160) NOT NULL,
  event_date DATE,
  event_time VARCHAR(100),
  venue VARCHAR(240),
  message TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','suspended')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid')),
  price_tzs INTEGER NOT NULL DEFAULT 0 CHECK (price_tzs >= 0),
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES graduation_sites(id);
CREATE INDEX IF NOT EXISTS gallery_images_site_created_idx ON gallery_images(site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_sessions (session_hash VARCHAR(64) PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

ALTER TABLE graduation_sites ADD COLUMN IF NOT EXISTS hero_image VARCHAR(255);

CREATE TABLE IF NOT EXISTS graduation_rsvps (id UUID PRIMARY KEY, site_id UUID NOT NULL REFERENCES graduation_sites(id) ON DELETE CASCADE, guest_name VARCHAR(120) NOT NULL, attending BOOLEAN NOT NULL, message VARCHAR(1200) NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS graduation_rsvps_site_idx ON graduation_rsvps(site_id, created_at DESC);

ALTER TABLE graduation_rsvps ADD COLUMN IF NOT EXISTS wish_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Wishes-only submissions do not represent an attendance response.
ALTER TABLE graduation_rsvps ALTER COLUMN attending DROP NOT NULL;
