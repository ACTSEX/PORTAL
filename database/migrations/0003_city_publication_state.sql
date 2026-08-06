CREATE TABLE cities (
  id TEXT PRIMARY KEY NOT NULL,
  country_code TEXT NOT NULL,
  region_key TEXT NOT NULL,
  city_key TEXT NOT NULL,
  canonical_key TEXT NOT NULL UNIQUE,
  public_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  canonicalization_version TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (country_code, region_key, city_key),
  CHECK (length(id) BETWEEN 16 AND 128),
  CHECK (length(country_code) = 2 AND country_code = upper(country_code)),
  CHECK (length(region_key) BETWEEN 1 AND 80 AND region_key NOT GLOB '*[^a-z0-9 ]*'),
  CHECK (length(city_key) BETWEEN 1 AND 80 AND city_key NOT GLOB '*[^a-z0-9 ]*'),
  CHECK (length(canonical_key) BETWEEN 5 AND 170),
  CHECK (length(public_name) BETWEEN 1 AND 120),
  CHECK (length(slug) BETWEEN 1 AND 100 AND slug NOT GLOB '*[^a-z0-9-]*'),
  CHECK (canonicalization_version = 'unicode-17.0.0-v1')
);

ALTER TABLE listings
  ADD COLUMN city_id TEXT REFERENCES cities(id) ON DELETE RESTRICT;

CREATE INDEX idx_listings_city_status ON listings(city_id, status);

CREATE TABLE city_publication_state (
  city_id TEXT PRIMARY KEY NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  next_version INTEGER NOT NULL DEFAULT 1 CHECK (next_version >= 0 AND next_version > current_version),
  active_artifact_path TEXT,
  active_digest TEXT,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'queued', 'compiling', 'published', 'recoverable_failure', 'definitive_failure')),
  lease_token TEXT,
  lease_expires_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  last_published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  CHECK ((active_artifact_path IS NULL AND active_digest IS NULL) OR
         (active_artifact_path IS NOT NULL AND active_digest IS NOT NULL)),
  CHECK (active_artifact_path IS NULL OR length(active_artifact_path) BETWEEN 1 AND 512),
  CHECK (active_digest IS NULL OR length(active_digest) = 64),
  CHECK ((lease_token IS NULL AND lease_expires_at IS NULL) OR
         (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK (lease_token IS NULL OR length(lease_token) BETWEEN 16 AND 128),
  CHECK (last_error_code IS NULL OR length(last_error_code) BETWEEN 2 AND 64)
);

CREATE INDEX idx_city_publication_state_status
  ON city_publication_state(status, updated_at);
