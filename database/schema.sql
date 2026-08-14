PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'professional', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'deleted')),
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (length(id) BETWEEN 16 AND 64),
  CHECK (instr(email, '@') > 1),
  CHECK (length(password_hash) BETWEEN 32 AND 255)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(id) BETWEEN 32 AND 128),
  CHECK (ip_hash IS NULL OR length(ip_hash) BETWEEN 32 AND 128),
  CHECK (user_agent IS NULL OR length(user_agent) <= 512)
);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  phone TEXT,
  avatar_r2_key TEXT,
  website_url TEXT,
  social_links_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(display_name) BETWEEN 2 AND 120),
  CHECK (bio IS NULL OR length(bio) <= 2000),
  CHECK (phone IS NULL OR length(phone) <= 32),
  CHECK (avatar_r2_key IS NULL OR (length(avatar_r2_key) BETWEEN 1 AND 512 AND avatar_r2_key NOT LIKE '/%')),
  CHECK (website_url IS NULL OR length(website_url) <= 2048),
  CHECK (json_valid(social_links_json))
);

CREATE TABLE real_estate_professionals (
  user_id TEXT PRIMARY KEY NOT NULL,
  registration_number TEXT NOT NULL,
  registration_region TEXT NOT NULL,
  company_name TEXT,
  company_document TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended')),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (registration_region, registration_number),
  CHECK (length(registration_number) BETWEEN 2 AND 40),
  CHECK (length(registration_region) BETWEEN 2 AND 20),
  CHECK (company_name IS NULL OR length(company_name) <= 160),
  CHECK (company_document IS NULL OR length(company_document) <= 32)
);

CREATE TABLE plans (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (length(currency) = 3 AND currency = upper(currency)),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  listing_limit INTEGER NOT NULL CHECK (listing_limit >= 0),
  media_limit INTEGER NOT NULL CHECK (media_limit >= 0),
  features_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(features_json)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (length(code) BETWEEN 2 AND 64),
  CHECK (length(name) BETWEEN 2 AND 120)
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'expired')),
  starts_at TEXT NOT NULL,
  current_period_ends_at TEXT NOT NULL,
  canceled_at TEXT,
  external_reference TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE UNIQUE INDEX idx_subscriptions_one_active_user ON subscriptions(user_id) WHERE status = 'active';

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CHECK (parent_id IS NULL OR parent_id <> id),
  CHECK (length(slug) BETWEEN 2 AND 120),
  CHECK (length(name) BETWEEN 2 AND 120)
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

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

CREATE TABLE listings (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'rent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'archived', 'deleted')),
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (length(currency) = 3 AND currency = upper(currency)),
  country_code TEXT NOT NULL DEFAULT 'BR' CHECK (length(country_code) = 2 AND country_code = upper(country_code)),
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  address_line TEXT,
  postal_code TEXT,
  latitude REAL CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude REAL CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  attributes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(attributes_json)),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  city_id TEXT,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT,
  CHECK (length(title) BETWEEN 5 AND 160),
  CHECK (length(description) BETWEEN 20 AND 10000),
  CHECK (length(region) BETWEEN 2 AND 120),
  CHECK (length(city) BETWEEN 2 AND 120),
  CHECK ((status = 'published' AND published_at IS NOT NULL) OR status <> 'published')
);
CREATE INDEX idx_listings_owner_status ON listings(owner_id, status);
CREATE INDEX idx_listings_category_status ON listings(category_id, status);
CREATE INDEX idx_listings_location_status ON listings(region, city, status);
CREATE INDEX idx_listings_price ON listings(price_minor);
CREATE INDEX idx_listings_city_status ON listings(city_id, status);

CREATE TABLE media (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  listing_id TEXT,
  r2_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256) = 64),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  CHECK (length(r2_key) BETWEEN 1 AND 512 AND r2_key NOT LIKE '/%'),
  CHECK (length(mime_type) BETWEEN 3 AND 127),
  CHECK (alt_text IS NULL OR length(alt_text) <= 300)
);
CREATE INDEX idx_media_listing_order ON media(listing_id, sort_order);
CREATE INDEX idx_media_owner ON media(owner_id);

CREATE TABLE favorites (
  user_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, listing_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);
CREATE INDEX idx_favorites_listing ON favorites(listing_id);

CREATE TABLE comparisons (
  user_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, listing_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);
CREATE INDEX idx_comparisons_listing ON comparisons(listing_id);

CREATE TABLE contacts (
  id TEXT PRIMARY KEY NOT NULL,
  listing_id TEXT,
  recipient_user_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL COLLATE NOCASE,
  sender_phone TEXT,
  message TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (length(sender_name) BETWEEN 2 AND 120),
  CHECK (instr(sender_email, '@') > 1),
  CHECK (length(message) BETWEEN 10 AND 5000)
);
CREATE INDEX idx_contacts_recipient_status ON contacts(recipient_user_id, status, created_at);

CREATE TABLE leads (
  id TEXT PRIMARY KEY NOT NULL,
  contact_id TEXT UNIQUE,
  assigned_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (notes IS NULL OR length(notes) <= 5000)
);
CREATE INDEX idx_leads_assignee_status ON leads(assigned_user_id, status);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL,
  subject_user_id TEXT NOT NULL,
  listing_id TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
  UNIQUE (author_id, subject_user_id, listing_id),
  CHECK (author_id <> subject_user_id),
  CHECK (body IS NULL OR length(body) <= 3000)
);
CREATE INDEX idx_reviews_subject_status ON reviews(subject_user_id, status);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  read_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(kind) BETWEEN 2 AND 64),
  CHECK (length(title) BETWEEN 1 AND 160),
  CHECK (length(body) BETWEEN 1 AND 2000)
);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, created_at);

CREATE TABLE payments (
  id TEXT PRIMARY KEY NOT NULL,
  subscription_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (length(currency) = 3 AND currency = upper(currency)),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'canceled')),
  provider TEXT NOT NULL,
  external_reference TEXT NOT NULL,
  due_at TEXT,
  paid_at TEXT,
  external_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY (provider) REFERENCES integrations(provider) ON DELETE RESTRICT,
  UNIQUE (provider, external_reference),
  CHECK (length(provider) BETWEEN 2 AND 64),
  CHECK (length(external_reference) BETWEEN 1 AND 255)
);
CREATE INDEX idx_payments_subscription_status ON payments(subscription_id, status);

CREATE TABLE integrations (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled', 'active', 'error')),
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (length(provider) BETWEEN 2 AND 64)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (length(key) BETWEEN 2 AND 120),
  CHECK (key NOT LIKE '%secret%' AND key NOT LIKE '%token%' AND key NOT LIKE '%password%' AND key NOT LIKE '%credential%'),
  CHECK (description IS NULL OR length(description) <= 500)
);
CREATE INDEX idx_settings_visibility ON settings(visibility);

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

CREATE TABLE publication_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  target TEXT NOT NULL CHECK (target IN ('kv', 'r2', 'cache')),
  artifact_key TEXT NOT NULL,
  content_hash TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (resource_type, resource_id, target, artifact_key),
  CHECK (length(resource_type) BETWEEN 2 AND 64),
  CHECK (length(artifact_key) BETWEEN 1 AND 512),
  CHECK (content_hash IS NULL OR length(content_hash) = 64)
);
CREATE INDEX idx_publication_jobs_status ON publication_jobs(status, created_at);

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
CREATE INDEX idx_city_publication_state_status ON city_publication_state(status, updated_at);

CREATE TABLE idempotency_records (
  scope TEXT NOT NULL,
  idempotency_key_hash TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  resource_type TEXT,
  resource_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, idempotency_key_hash),
  CHECK (length(scope) BETWEEN 2 AND 64),
  CHECK (length(idempotency_key_hash) = 64),
  CHECK (length(request_hash) = 64),
  CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599)
);
CREATE INDEX idx_idempotency_expires ON idempotency_records(expires_at);

CREATE TABLE commercial_conditions (
  id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('normal','trial','courtesy','promotion','temporary_free')),
  status TEXT NOT NULL CHECK (status IN ('scheduled','active','expired','cancelled')),
  starts_at TEXT NOT NULL, ends_at TEXT, reason TEXT, actor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_commercial_conditions_user_period ON commercial_conditions(user_id, status, starts_at, ends_at);

CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY NOT NULL, actor_user_id TEXT NOT NULL, target_user_id TEXT NOT NULL,
  action TEXT NOT NULL, reason TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (json_valid(before_json) OR before_json IS NULL), CHECK (json_valid(after_json))
);
CREATE INDEX idx_admin_audit_target_created ON admin_audit(target_user_id, created_at DESC);

CREATE TABLE boosts (
  id TEXT PRIMARY KEY NOT NULL, listing_id TEXT NOT NULL, owner_id TEXT NOT NULL, payment_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending_payment','scheduled','active','expired','cancelled')),
  duration TEXT NOT NULL CHECK (duration IN ('24h','7d','15d','30d')), starts_at TEXT, ends_at TEXT,
  price_minor INTEGER NOT NULL CHECK (price_minor > 0), currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
);
CREATE INDEX idx_boosts_owner_created ON boosts(owner_id, created_at DESC);
CREATE INDEX idx_boosts_listing_active ON boosts(listing_id, status, starts_at, ends_at);
