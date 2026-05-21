-- Resume Studio backend schema draft.
-- The current MVP still uses JSON file storage; this schema is the production
-- target for database-backed persistence and ownership isolation.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  source_resume_id TEXT REFERENCES resume_documents(id),
  favorite BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS growth_entries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  resume_id TEXT REFERENCES resume_documents(id),
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills TEXT[] NOT NULL DEFAULT '{}',
  happened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  resume_id TEXT REFERENCES resume_documents(id),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'saved',
  match_score INTEGER NOT NULL DEFAULT 0,
  job_description JSONB,
  tailoring JSONB,
  next_action TEXT NOT NULL DEFAULT '',
  follow_up_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_progress_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  happened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  request_id TEXT NOT NULL,
  user_id TEXT,
  route TEXT NOT NULL,
  generated_document_id TEXT REFERENCES resume_documents(id),
  match_score INTEGER,
  persisted BOOLEAN NOT NULL DEFAULT false,
  idempotent BOOLEAN NOT NULL DEFAULT false,
  request_payload JSONB,
  response_meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_requests_request_id_idx
  ON platform_requests(request_id)
  WHERE request_id <> '';

CREATE INDEX IF NOT EXISTS resume_documents_workspace_idx ON resume_documents(workspace_id, archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_workspace_idx ON job_applications(workspace_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS growth_entries_workspace_idx ON growth_entries(workspace_id, happened_at DESC);
