-- SQLite schema for local backend persistence.
-- Structured JSON values are stored as TEXT containing JSON, booleans as INTEGER,
-- timestamps as ISO-8601 TEXT, and array values as JSON array TEXT.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'enabled',
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'local',
  active_resume_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS resume_documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  config TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'General',
  target_role TEXT NOT NULL DEFAULT '',
  target_company TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  origin TEXT NOT NULL DEFAULT 'sample',
  source_resume_id TEXT,
  source_resume_title TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  career_update_checklist TEXT NOT NULL DEFAULT '{}',
  last_career_update_at TEXT,
  next_career_update_at TEXT,
  last_exported_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT resume_documents_origin_check CHECK (origin IN ('sample', 'blank', 'import', 'copy', 'jd-draft', 'platform'))
);

CREATE TABLE IF NOT EXISTS growth_entries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  source_resume_id TEXT,
  source_resume_title TEXT,
  entry_date TEXT NOT NULL DEFAULT (date('now')),
  entry_type TEXT NOT NULL DEFAULT 'achievement',
  company TEXT NOT NULL DEFAULT '',
  project TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  metrics TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '[]',
  evidence_url TEXT NOT NULL DEFAULT '',
  private INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  used_by_resume_ids TEXT NOT NULL DEFAULT '[]',
  used_by_application_ids TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT growth_entries_type_check CHECK (entry_type IN ('project', 'metric', 'role', 'feedback', 'skill', 'achievement'))
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  resume_id TEXT,
  resume_title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL,
  company_mono TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'saved',
  match_score INTEGER NOT NULL DEFAULT 0,
  applied_at TEXT,
  next_action TEXT NOT NULL DEFAULT '',
  follow_up_at TEXT,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  job_post_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  job_description TEXT,
  tailoring TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT job_applications_stage_check CHECK (stage IN ('saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'))
);

CREATE TABLE IF NOT EXISTS application_progress_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  application_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  happened_at TEXT NOT NULL DEFAULT (date('now')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT application_progress_stage_check CHECK (stage IN ('saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'))
);

CREATE TABLE IF NOT EXISTS platform_clients (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  scopes TEXT NOT NULL DEFAULT '[]',
  quota_per_day INTEGER,
  rate_limit_per_minute INTEGER,
  created_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT platform_clients_status_check CHECK (status IN ('active', 'paused', 'revoked'))
);

CREATE TABLE IF NOT EXISTS platform_api_keys (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES platform_clients(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  expires_at TEXT,
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (key_prefix)
);

CREATE TABLE IF NOT EXISTS platform_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id TEXT,
  request_id TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  route TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_document_id TEXT,
  match_score INTEGER,
  persisted INTEGER NOT NULL DEFAULT 0,
  idempotent INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  request_payload TEXT,
  response_meta TEXT,
  generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  replayed_at TEXT,
  replay_count INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT platform_requests_status_check CHECK (status IN ('draft', 'persisted', 'failed', 'replayed', 'blocked'))
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL DEFAULT 'system',
  tag TEXT NOT NULL DEFAULT 'event',
  message TEXT NOT NULL,
  message_zh TEXT,
  message_en TEXT,
  meta TEXT NOT NULL DEFAULT '',
  resume_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id),
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT 'success',
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT audit_logs_result_check CHECK (result IN ('success', 'failed', 'blocked'))
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id),
  schema_version TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'preview',
  preview_report TEXT NOT NULL DEFAULT '{}',
  migration_log TEXT NOT NULL DEFAULT '[]',
  source_size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  CONSTRAINT import_jobs_status_check CHECK (status IN ('preview', 'applied', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS platform_requests_request_id_idx
  ON platform_requests(client_id, request_id)
  WHERE request_id <> '';

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS resume_documents_workspace_idx ON resume_documents(workspace_id, archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS resume_documents_position_idx ON resume_documents(workspace_id, position);
CREATE INDEX IF NOT EXISTS resume_documents_revision_idx ON resume_documents(id, revision);
CREATE INDEX IF NOT EXISTS job_applications_workspace_idx ON job_applications(workspace_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_position_idx ON job_applications(workspace_id, position);
CREATE INDEX IF NOT EXISTS job_applications_follow_up_idx ON job_applications(workspace_id, follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS growth_entries_workspace_idx ON growth_entries(workspace_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS growth_entries_position_idx ON growth_entries(workspace_id, position);
CREATE INDEX IF NOT EXISTS platform_requests_client_idx ON platform_requests(client_id, route, status, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_requests_position_idx ON platform_requests(workspace_id, position);
CREATE INDEX IF NOT EXISTS activity_events_workspace_idx ON activity_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_position_idx ON activity_events(workspace_id, position);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx ON audit_logs(workspace_id, created_at DESC);
