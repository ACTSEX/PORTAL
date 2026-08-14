-- ETAPA 10: paid boosts and commercial conditions are independent dimensions.
CREATE TABLE commercial_conditions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('normal','trial','courtesy','promotion','temporary_free')),
  status TEXT NOT NULL CHECK (status IN ('scheduled','active','expired','cancelled')),
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  reason TEXT,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_commercial_conditions_user_period ON commercial_conditions(user_id, status, starts_at, ends_at);

CREATE TABLE boosts (
  id TEXT PRIMARY KEY NOT NULL,
  listing_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  payment_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending_payment','scheduled','active','expired','cancelled')),
  duration TEXT NOT NULL CHECK (duration IN ('24h','7d','15d','30d')),
  starts_at TEXT,
  ends_at TEXT,
  price_minor INTEGER NOT NULL CHECK (price_minor > 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
);
CREATE INDEX idx_boosts_owner_created ON boosts(owner_id, created_at DESC);
CREATE INDEX idx_boosts_listing_active ON boosts(listing_id, status, starts_at, ends_at);
