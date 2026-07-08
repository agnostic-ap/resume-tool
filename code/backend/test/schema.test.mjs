import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const schemaPath = join(import.meta.dirname, '..', 'sql', '001_initial_schema.sql')
const sqliteSchemaPath = join(import.meta.dirname, '..', 'sql', 'sqlite', '001_initial_schema.sql')

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
  ]) {
    assert.match(sql, new RegExp(column))
  }

  assert.doesNotMatch(sql, /JSONB/)
  assert.doesNotMatch(sql, /BOOLEAN/)
  assert.doesNotMatch(sql, /TIMESTAMPTZ/)
  assert.doesNotMatch(sql, /TEXT\[\]/)
})
