-- ETAPA 11: append-only, focused audit trail for privileged operational mutations.
CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (json_valid(before_json) OR before_json IS NULL),
  CHECK (json_valid(after_json))
);
CREATE INDEX idx_admin_audit_target_created ON admin_audit(target_user_id, created_at DESC);
