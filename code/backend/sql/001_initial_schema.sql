-- Resume Studio backend schema draft.
-- The current MVP still uses JSON file storage; this schema is the production
-- target for database-backed persistence, workspace isolation, API operations,
-- and auditability.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'enabled',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS resume_documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  data JSONB NOT NULL,
  config JSONB NOT NULL,
  folder TEXT NOT NULL DEFAULT 'General',
  target_role TEXT NOT NULL DEFAULT '',
  target_company TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  origin TEXT NOT NULL DEFAULT 'sample',
  source_resume_id TEXT REFERENCES resume_documents(id),
  source_resume_title TEXT,
  favorite BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  career_update_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_career_update_at TIMESTAMPTZ,
  next_career_update_at TIMESTAMPTZ,
  last_exported_at TIMESTAMPTZ,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resume_documents_origin_check CHECK (origin IN ('sample', 'blank', 'import', 'copy', 'jd-draft', 'platform'))
);

CREATE TABLE IF NOT EXISTS growth_entries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  source_resume_id TEXT REFERENCES resume_documents(id),
  source_resume_title TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL DEFAULT 'achievement',
  company TEXT NOT NULL DEFAULT '',
  project TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  metrics TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  evidence_url TEXT NOT NULL DEFAULT '',
  private BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  used_by_resume_ids TEXT[] NOT NULL DEFAULT '{}',
  used_by_application_ids TEXT[] NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT growth_entries_type_check CHECK (entry_type IN ('project', 'metric', 'role', 'feedback', 'skill', 'achievement'))
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  resume_id TEXT REFERENCES resume_documents(id),
  resume_title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL,
  company_mono TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'saved',
  match_score INTEGER NOT NULL DEFAULT 0,
  applied_at DATE,
  next_action TEXT NOT NULL DEFAULT '',
  follow_up_at DATE,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  job_post_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  job_description JSONB,
  tailoring JSONB,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_applications_stage_check CHECK (stage IN ('saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'))
);

CREATE TABLE IF NOT EXISTS application_progress_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  happened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT application_progress_stage_check CHECK (stage IN ('saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'))
);

CREATE TABLE IF NOT EXISTS platform_clients (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  scopes TEXT[] NOT NULL DEFAULT '{}',
  quota_per_day INTEGER,
  rate_limit_per_minute INTEGER,
  created_by_user_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_clients_status_check CHECK (status IN ('active', 'paused', 'revoked'))
);

CREATE TABLE IF NOT EXISTS platform_api_keys (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES platform_clients(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key_prefix)
);

CREATE TABLE IF NOT EXISTS platform_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  client_id TEXT REFERENCES platform_clients(id),
  request_id TEXT NOT NULL DEFAULT '',
  user_id TEXT,
  route TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_document_id TEXT REFERENCES resume_documents(id),
  match_score INTEGER,
  persisted BOOLEAN NOT NULL DEFAULT false,
  idempotent BOOLEAN NOT NULL DEFAULT false,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  request_payload JSONB,
  response_meta JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at TIMESTAMPTZ,
  replay_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_requests_status_check CHECK (status IN ('draft', 'persisted', 'failed', 'replayed', 'blocked'))
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  actor_user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL DEFAULT 'system',
  tag TEXT NOT NULL DEFAULT 'event',
  message TEXT NOT NULL,
  message_zh TEXT,
  message_en TEXT,
  meta TEXT NOT NULL DEFAULT '',
  resume_id TEXT REFERENCES resume_documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  actor_user_id TEXT REFERENCES users(id),
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT 'success',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_result_check CHECK (result IN ('success', 'failed', 'blocked'))
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  actor_user_id TEXT REFERENCES users(id),
  schema_version TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'preview',
  preview_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  migration_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT import_jobs_status_check CHECK (status IN ('preview', 'applied', 'failed', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_requests_request_id_idx
  ON platform_requests(client_id, request_id)
  WHERE request_id <> '';

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS resume_documents_workspace_idx ON resume_documents(workspace_id, archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS resume_documents_revision_idx ON resume_documents(id, revision);
CREATE INDEX IF NOT EXISTS job_applications_workspace_idx ON job_applications(workspace_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_follow_up_idx ON job_applications(workspace_id, follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS growth_entries_workspace_idx ON growth_entries(workspace_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS growth_entries_usage_idx ON growth_entries USING GIN (used_by_resume_ids, used_by_application_ids);
CREATE INDEX IF NOT EXISTS platform_requests_client_idx ON platform_requests(client_id, route, status, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_workspace_idx ON activity_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx ON audit_logs(workspace_id, created_at DESC);
