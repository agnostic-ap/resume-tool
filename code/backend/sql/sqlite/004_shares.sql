CREATE TABLE IF NOT EXISTS resume_shares (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT,
  CONSTRAINT resume_shares_status_check CHECK (status IN ('active', 'revoked')),
  CONSTRAINT resume_shares_view_count_check CHECK (view_count >= 0)
);

CREATE INDEX IF NOT EXISTS resume_shares_owner_idx
  ON resume_shares(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS resume_shares_workspace_idx
  ON resume_shares(workspace_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS resume_shares_public_idx
  ON resume_shares(id, status, expires_at);
