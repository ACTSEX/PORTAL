CREATE TABLE blogger_integrations (
  user_id TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error', 'disabled')),
  last_synced_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(url) BETWEEN 8 AND 2048),
  CHECK (last_error_code IS NULL OR length(last_error_code) BETWEEN 2 AND 64)
);
