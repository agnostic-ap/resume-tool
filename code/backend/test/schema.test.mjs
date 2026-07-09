import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const schemaPath = join(import.meta.dirname, '..', 'sql', '001_initial_schema.sql')
const authSchemaPath = join(import.meta.dirname, '..', 'sql', '002_auth.sql')
const billingSchemaPath = join(import.meta.dirname, '..', 'sql', '003_billing.sql')
const sqliteSchemaPath = join(import.meta.dirname, '..', 'sql', 'sqlite', '001_initial_schema.sql')
const sqliteAuthSchemaPath = join(import.meta.dirname, '..', 'sql', 'sqlite', '002_auth.sql')
const sqliteBillingSchemaPath = join(import.meta.dirname, '..', 'sql', 'sqlite', '003_billing.sql')
const sqliteSharesSchemaPath = join(import.meta.dirname, '..', 'sql', 'sqlite', '004_shares.sql')

test('database schema covers roadmap persistence requirements', async () => {
  const sql = await readFile(schemaPath, 'utf8')

  for (const table of [
    'users',
    'workspaces',
    'workspace_memberships',
    'resume_documents',
    'job_applications',
    'application_progress_events',
    'growth_entries',
    'platform_clients',
    'platform_api_keys',
    'platform_requests',
    'activity_events',
    'audit_logs',
    'import_jobs',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }

  for (const column of [
    'workspace_id',
    'owner_user_id',
    'password_hash TEXT',
    'revision INTEGER NOT NULL DEFAULT 1',
    'origin TEXT NOT NULL DEFAULT',
    'career_update_checklist JSONB',
    'used_by_resume_ids TEXT[]',
    'used_by_application_ids TEXT[]',
    'quota_per_day INTEGER',
    'rate_limit_per_minute INTEGER',
    'key_hash TEXT NOT NULL',
    'latency_ms INTEGER NOT NULL DEFAULT 0',
    'schema_version TEXT NOT NULL',
    'preview_report JSONB',
    'migration_log JSONB',
  ]) {
    assert.match(sql, new RegExp(column.replaceAll('[', '\\[').replaceAll(']', '\\]')))
  }

  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS platform_requests_request_id_idx/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx/)
})

test('auth schema adds account sessions', async () => {
  const sql = await readFile(authSchemaPath, 'utf8')

  assert.match(sql, /ADD COLUMN IF NOT EXISTS password_hash TEXT/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS sessions/)
  assert.match(sql, /user_id TEXT NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/)
  assert.match(sql, /token_hash TEXT NOT NULL UNIQUE/)
  assert.match(sql, /expires_at TIMESTAMPTZ NOT NULL/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS sessions_token_hash_idx/)
})

test('sqlite schema maps production types to local storage types', async () => {
  const sql = await readFile(sqliteSchemaPath, 'utf8')

  for (const table of [
    'users',
    'workspaces',
    'workspace_memberships',
    'resume_documents',
    'job_applications',
    'application_progress_events',
    'growth_entries',
    'platform_clients',
    'platform_api_keys',
    'platform_requests',
    'activity_events',
    'audit_logs',
    'import_jobs',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }

  for (const column of [
    'data TEXT NOT NULL',
    'config TEXT NOT NULL',
    'favorite INTEGER NOT NULL DEFAULT 0',
    'archived INTEGER NOT NULL DEFAULT 0',
    'created_at TEXT NOT NULL',
    "tags TEXT NOT NULL DEFAULT '\\[\\]'",
    "used_by_resume_ids TEXT NOT NULL DEFAULT '\\[\\]'",
    'owner_user_id TEXT NOT NULL',
    'workspace_id TEXT NOT NULL',
    'password_hash TEXT',
  ]) {
    assert.match(sql, new RegExp(column))
  }

  assert.doesNotMatch(sql, /JSONB/)
  assert.doesNotMatch(sql, /BOOLEAN/)
  assert.doesNotMatch(sql, /TIMESTAMPTZ/)
  assert.doesNotMatch(sql, /TEXT\[\]/)
})

test('sqlite auth schema maps sessions to local storage types', async () => {
  const sql = await readFile(sqliteAuthSchemaPath, 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS sessions/)
  assert.match(sql, /user_id TEXT NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/)
  assert.match(sql, /token_hash TEXT NOT NULL UNIQUE/)
  assert.match(sql, /expires_at TEXT NOT NULL/)
  assert.match(sql, /revoked_at TEXT/)
  assert.match(sql, /last_seen_at TEXT/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS sessions_user_idx/)
  assert.doesNotMatch(sql, /TIMESTAMPTZ/)
})

test('billing schema stores subscriptions and usage counters', async () => {
  const sql = await readFile(billingSchemaPath, 'utf8')

  for (const table of ['subscriptions', 'usage_counters']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }

  for (const column of [
    'user_id TEXT PRIMARY KEY REFERENCES users\\(id\\) ON DELETE CASCADE',
    "plan TEXT NOT NULL DEFAULT 'free'",
    "status TEXT NOT NULL DEFAULT 'active'",
    "source TEXT NOT NULL DEFAULT 'manual'",
    'current_period_end TIMESTAMPTZ',
    "kind IN \\('ai_draft', 'export'\\)",
    'PRIMARY KEY \\(user_id, kind, period_key\\)',
  ]) {
    assert.match(sql, new RegExp(column))
  }

  assert.match(sql, /CREATE INDEX IF NOT EXISTS subscriptions_plan_status_idx/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS usage_counters_user_kind_idx/)
})

test('sqlite billing schema maps subscription storage to local types', async () => {
  const sql = await readFile(sqliteBillingSchemaPath, 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS subscriptions/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS usage_counters/)
  assert.match(sql, /current_period_end TEXT/)
  assert.match(sql, /count INTEGER NOT NULL DEFAULT 0/)
  assert.match(sql, /CONSTRAINT subscriptions_source_check CHECK \(source IN \('manual', 'stripe'\)\)/)
  assert.doesNotMatch(sql, /TIMESTAMPTZ/)
})

test('sqlite shares schema stores revocable resume snapshots and view stats', async () => {
  const sql = await readFile(sqliteSharesSchemaPath, 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS resume_shares/)
  for (const column of [
    'id TEXT PRIMARY KEY',
    'workspace_id TEXT NOT NULL REFERENCES workspaces\\(id\\) ON DELETE CASCADE',
    'user_id TEXT NOT NULL REFERENCES users\\(id\\) ON DELETE CASCADE',
    'resume_id TEXT NOT NULL',
    'snapshot TEXT NOT NULL',
    "status TEXT NOT NULL DEFAULT 'active'",
    'expires_at TEXT',
    'view_count INTEGER NOT NULL DEFAULT 0',
    'last_viewed_at TEXT',
    'revoked_at TEXT',
  ]) {
    assert.match(sql, new RegExp(column))
  }
  assert.match(sql, /status IN \('active', 'revoked'\)/)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS resume_shares_public_idx/)
  assert.doesNotMatch(sql, /TIMESTAMPTZ/)
})
