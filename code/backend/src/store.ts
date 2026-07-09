import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { addDays, BLANK_RESUME_DATA, DEFAULT_CONFIG, initialState } from './defaults.js'

type AnyRecord = Record<string, any>
type ResumeState = {
  activeResumeId: string
  documents: AnyRecord[]
  applications: AnyRecord[]
  growthEntries: AnyRecord[]
  platformRequests: AnyRecord[]
  activityLog: AnyRecord[]
}
type StoreOptions = {
  dataDir?: string
  dbPath?: string
}
type StoreContext = {
  workspaceId?: string
  userId?: string
}
type PublicUser = {
  id: string
  email: string
  displayName: string
  role: string
  status: string
  lastSeenAt?: string
  createdAt: string
  updatedAt: string
}
type PublicWorkspace = {
  id: string
  name: string
  plan: string
  role: string
  ownerUserId: string
  activeResumeId?: string
  createdAt: string
  updatedAt: string
}
type AuthWorkspaceContext = {
  user: PublicUser
  workspace: PublicWorkspace
}
type UserWithPassword = PublicUser & {
  passwordHash?: string
}
type AdminListedUser = PublicUser & {
  workspace?: PublicWorkspace
  resumeCount: number
  applicationCount: number
}
type AdminUserOperationInput = {
  userId: string
  actorEmail: string
  actorRole: string
  ipAddress?: string
  userAgent?: string
}
type AuditLogInput = {
  workspaceId?: string
  actorUserId?: string
  actorEmail: string
  actorRole: string
  action: string
  objectType?: string
  objectId?: string
  result?: 'success' | 'failed' | 'blocked'
  ipAddress?: string
  userAgent?: string
  metadata?: AnyRecord
}
type PublicAuditLog = {
  id: string
  workspaceId?: string
  actorUserId?: string
  actorEmail?: string
  actorRole: string
  action: string
  objectType: string
  objectId: string
  result: string
  ipAddress?: string
  userAgent?: string
  targetUserId?: string
  targetEmail?: string
  metadata: AnyRecord
  createdAt: string
}
type SqliteDatabase = Database.Database

const DB_FILE = 'resume.db'
const LEGACY_JSON_FILE = 'resume-state.json'
export const DEFAULT_USER_ID = 'local-owner'
export const DEFAULT_WORKSPACE_ID = 'default'
const SESSION_LAST_SEEN_UPDATE_INTERVAL_MS = 60 * 60 * 1000

const AUTH_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
`

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
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
`

export function createStore(options: StoreOptions = {}) {
  const dataDir = options.dataDir ?? process.env.RESUME_BACKEND_DATA_DIR ?? join(process.cwd(), '.data')
  const dbPath = options.dbPath ?? join(dataDir, DB_FILE)
  mkdirSync(dirname(dbPath), { recursive: true })

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SQLITE_SCHEMA)
  runSqliteMigrations(db)
  seedDefaultWorkspace(db)
  const migrated = migrateLegacyJsonIfNeeded(db, options.dataDir ?? dirname(dbPath))
  if (!migrated && isDatabaseEmpty(db)) {
    db.transaction((state: ResumeState) => replaceStateSync(db, state))(normalizeState(initialState()))
  }

  async function readState(context: StoreContext = {}): Promise<ResumeState> {
    return readStateSync(db, context)
  }

  async function writeState(state: unknown, context: StoreContext = {}): Promise<ResumeState> {
    return db.transaction((nextState: unknown) => replaceStateSync(db, nextState, context))(state)
  }

  async function mutate<T>(mutator: (state: ResumeState) => T, context: StoreContext = {}): Promise<T | ResumeState> {
    return db.transaction(() => {
      const state = readStateSync(db, context)
      const result = mutator(state)
      replaceStateSync(db, state, context)
      return result ?? state
    })()
  }

  async function replaceState(nextState: unknown, context: StoreContext = {}): Promise<ResumeState> {
    return writeState(nextState, context)
  }

  function log(state: ResumeState, event: AnyRecord): AnyRecord {
    const active = getActiveDocument(state)
    const entry = normalizeActivity({
      ...event,
      id: event.id ?? newId('activity'),
      resumeId: event.resumeId ?? active?.id,
      createdAt: event.createdAt ?? new Date().toISOString(),
    }, active)
    state.activityLog = [entry, ...state.activityLog].slice(0, 200)
    return entry
  }

  return {
    dbPath,
    readState,
    writeState,

    replaceState,

    async listDocuments(context: StoreContext = {}) {
      const state = await readState(context)
      return {
        activeResumeId: state.activeResumeId,
        documents: state.documents.map(toDocumentSummary),
      }
    },

    async getDocument(id: string, context: StoreContext = {}) {
      const state = await readState(context)
      return findDocument(state, id)
    },

    async createDocument(input: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const source = input.sourceId ? findDocument(state, input.sourceId) : getActiveDocument(state)
        const created = new Date()
        const blank = input.blank ?? !input.sourceId
        const doc = {
          id: newId('resume'),
          title: input.title?.trim() || (blank ? 'Untitled resume' : `${source.title} Copy`),
          data: blank ? structuredClone(BLANK_RESUME_DATA) : structuredClone(source.data),
          config: blank ? structuredClone(DEFAULT_CONFIG) : structuredClone(source.config),
          folder: String(input.folder ?? (blank ? 'General' : source.folder ?? 'General')),
          targetRole: String(input.targetRole ?? (blank ? '' : source.targetRole ?? '')),
          targetCompany: String(input.targetCompany ?? ''),
          tags: normalizeTags(input.tags ?? (blank ? [] : source.tags)),
          origin: normalizeResumeOrigin(input.origin ?? (blank ? 'blank' : 'copy')),
          sourceResumeId: blank ? undefined : source.id,
          sourceResumeTitle: blank ? undefined : source.title,
          favorite: Boolean(input.favorite ?? false),
          archived: Boolean(input.archived ?? false),
          careerUpdateChecklist: defaultCareerUpdateChecklist(),
          createdAt: created.toISOString(),
          updatedAt: created.toISOString(),
          lastCareerUpdateAt: created.toISOString(),
          nextCareerUpdateAt: addDays(created, 14).toISOString(),
        }
        state.documents.unshift(doc)
        state.activeResumeId = doc.id
        log(state, {
          type: 'resume',
          tag: blank ? 'new' : 'copy',
          message: blank ? 'Created blank resume' : `Created resume from ${source.title}`,
          messageZh: blank ? '新建空白简历' : `从 ${source.title} 创建副本`,
          messageEn: blank ? 'Created blank resume' : `Created resume from ${source.title}`,
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      }, context)
    },

    async updateDocument(id: string, patch: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        if (patch.title !== undefined) doc.title = patch.title.trim() || doc.title
        if (patch.data !== undefined) doc.data = normalizeResumeData(patch.data)
        if (patch.config !== undefined) doc.config = normalizeConfig(patch.config)
        if (patch.folder !== undefined) doc.folder = String(patch.folder).trim()
        if (patch.targetRole !== undefined) doc.targetRole = String(patch.targetRole).trim()
        if (patch.targetCompany !== undefined) doc.targetCompany = String(patch.targetCompany).trim()
        if (patch.tags !== undefined) doc.tags = normalizeTags(patch.tags)
        if (patch.origin !== undefined) doc.origin = normalizeResumeOrigin(patch.origin)
        if (patch.sourceResumeId !== undefined) doc.sourceResumeId = String(patch.sourceResumeId).trim() || undefined
        if (patch.sourceResumeTitle !== undefined) doc.sourceResumeTitle = String(patch.sourceResumeTitle).trim() || undefined
        if (patch.favorite !== undefined) doc.favorite = Boolean(patch.favorite)
        if (patch.archived !== undefined) doc.archived = Boolean(patch.archived)
        if (patch.careerUpdateChecklist !== undefined) {
          doc.careerUpdateChecklist = normalizeCareerUpdateChecklist(patch.careerUpdateChecklist, doc.careerUpdateChecklist)
        }
        doc.updatedAt = new Date().toISOString()
        syncApplicationResumeTitles(state, doc)
        log(state, {
          type: 'resume',
          tag: 'update',
          message: `Updated ${doc.title}`,
          messageZh: `更新简历：${doc.title}`,
          messageEn: `Updated ${doc.title}`,
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      }, context)
    },

    async deleteDocument(id: string, context: StoreContext = {}) {
      return mutate((state) => {
        if (state.documents.length <= 1) throw httpError(409, 'At least one resume must remain')
        const index = state.documents.findIndex((doc) => doc.id === id)
        if (index < 0) throw httpError(404, 'Resume not found')
        const [deleted] = state.documents.splice(index, 1)
        if (state.activeResumeId === id) state.activeResumeId = state.documents[0].id
        const fallback = getActiveDocument(state)
        for (const app of state.applications) {
          if (app.resumeId === id) {
            app.resumeId = fallback.id
            app.resumeTitle = fallback.title
            app.updatedAt = new Date().toISOString()
          }
        }
        log(state, {
          type: 'resume',
          tag: 'delete',
          message: `Deleted ${deleted.title}`,
          messageZh: `删除简历：${deleted.title}`,
          messageEn: `Deleted ${deleted.title}`,
          meta: 'document removed',
        })
        return { deletedId: id, activeResumeId: state.activeResumeId }
      }, context)
    },

    async selectDocument(id: string, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        state.activeResumeId = id
        return doc
      }, context)
    },

    async markCareerUpdated(id: string, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        const now = new Date()
        doc.lastCareerUpdateAt = now.toISOString()
        doc.nextCareerUpdateAt = addDays(now, 14).toISOString()
        doc.careerUpdateChecklist = defaultCareerUpdateChecklist(now)
        doc.updatedAt = now.toISOString()
        log(state, {
          type: 'resume',
          tag: 'career',
          message: 'Recorded biweekly career update',
          messageZh: '记录双周职业经历更新',
          messageEn: 'Recorded biweekly career update',
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      }, context)
    },

    async listApplications(context: StoreContext = {}) {
      const state = await readState(context)
      return state.applications
    },

    async createApplication(input: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = input.resumeId ? findDocument(state, input.resumeId) : getActiveDocument(state)
        const app = normalizeApplication({
          ...input,
          id: newId('app'),
          resumeId: doc.id,
          resumeTitle: doc.title,
          createdAt: new Date().toISOString(),
        }, doc)
        state.applications.unshift(app)
        log(state, {
          type: 'application',
          tag: 'apply',
          message: `Added application: ${app.company}`,
          messageZh: `新增投递：${app.company}`,
          messageEn: `Added application: ${app.company}`,
          meta: `${app.role} · ${app.stage}`,
          resumeId: app.resumeId,
        })
        return app
      }, context)
    },

    async updateApplication(id: string, patch: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const app = findApplication(state, id)
        const doc = patch.resumeId ? findDocument(state, patch.resumeId) : findDocument(state, app.resumeId)
        Object.assign(app, normalizeApplication({ ...app, ...patch, resumeId: doc.id, resumeTitle: doc.title }, doc), {
          id: app.id,
          createdAt: app.createdAt,
          updatedAt: new Date().toISOString(),
        })
        log(state, {
          type: 'application',
          tag: 'update',
          message: `Updated application: ${app.company}`,
          messageZh: `更新投递：${app.company}`,
          messageEn: `Updated application: ${app.company}`,
          meta: `${app.role} · ${app.stage}`,
          resumeId: app.resumeId,
        })
        return app
      }, context)
    },

    async deleteApplication(id: string, context: StoreContext = {}) {
      return mutate((state) => {
        const app = findApplication(state, id)
        state.applications = state.applications.filter((item) => item.id !== id)
        log(state, {
          type: 'application',
          tag: 'delete',
          message: `Deleted application: ${app.company}`,
          messageZh: `删除投递：${app.company}`,
          messageEn: `Deleted application: ${app.company}`,
          meta: app.role,
          resumeId: app.resumeId,
        })
        return { deletedId: id }
      }, context)
    },

    async listGrowthEntries(context: StoreContext = {}) {
      const state = await readState(context)
      return state.growthEntries
    },

    async createGrowthEntry(input: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = input.sourceResumeId ? findDocument(state, input.sourceResumeId) : getActiveDocument(state)
        const entry = normalizeGrowthEntry({
          ...input,
          id: newId('growth'),
          sourceResumeId: doc.id,
          sourceResumeTitle: doc.title,
          createdAt: new Date().toISOString(),
        }, doc)
        state.growthEntries.unshift(entry)
        log(state, {
          type: 'resume',
          tag: 'growth',
          message: `Added growth entry: ${entry.title}`,
          messageZh: `新增成长记录：${entry.title}`,
          messageEn: `Added growth entry: ${entry.title}`,
          meta: entry.type,
          resumeId: entry.sourceResumeId,
        })
        return entry
      }, context)
    },

    async updateGrowthEntry(id: string, patch: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const entry = findGrowthEntry(state, id)
        const doc = patch.sourceResumeId ? findDocument(state, patch.sourceResumeId) : findDocument(state, entry.sourceResumeId)
        Object.assign(entry, normalizeGrowthEntry({ ...entry, ...patch, id: entry.id, createdAt: entry.createdAt }, doc), {
          updatedAt: new Date().toISOString(),
        })
        log(state, {
          type: 'resume',
          tag: 'growth',
          message: `Updated growth entry: ${entry.title}`,
          messageZh: `更新成长记录：${entry.title}`,
          messageEn: `Updated growth entry: ${entry.title}`,
          meta: entry.archived ? 'archived' : entry.type,
          resumeId: entry.sourceResumeId,
        })
        return entry
      }, context)
    },

    async listPlatformRequests(context: StoreContext = {}) {
      const state = await readState(context)
      return state.platformRequests
    },

    async recordPlatformRequest(input: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const entry = normalizePlatformRequest(input)
        const failed = entry.status === 'failed'
        state.platformRequests = [entry, ...state.platformRequests].slice(0, 500)
        log(state, {
          type: 'system',
          tag: 'platform',
          message: failed
            ? `Platform draft failed: ${entry.requestId || entry.userId || 'anonymous'}`
            : `Generated platform draft: ${entry.requestId || entry.userId || 'anonymous'}`,
          messageZh: failed
            ? `平台草稿失败：${entry.requestId || entry.userId || '匿名请求'}`
            : `生成平台草稿：${entry.requestId || entry.userId || '匿名请求'}`,
          messageEn: failed
            ? `Platform draft failed: ${entry.requestId || entry.userId || 'anonymous'}`
            : `Generated platform draft: ${entry.requestId || entry.userId || 'anonymous'}`,
          meta: failed ? entry.error || 'failed' : `${entry.matchScore}/100`,
          resumeId: entry.documentId,
        })
        return entry
      }, context)
    },

    async persistPlatformDraft(input: AnyRecord = {}, draft: AnyRecord = {}, meta: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const requestId = String(input.requestId ?? '').trim()
        const existing = requestId
          ? state.platformRequests.find((entry) => entry.requestId === requestId && entry.persisted && entry.documentId)
          : undefined
        const existingDoc = existing?.documentId
          ? state.documents.find((doc) => doc.id === existing.documentId)
          : undefined

        if (existing && existingDoc) {
          existing.replayedAt = new Date().toISOString()
          existing.replayCount = Number(existing.replayCount ?? 0) + 1
          return { documentId: existing.documentId, idempotent: true, request: existing }
        }

        const created = new Date()
        const doc = {
          id: newId('resume'),
          title: draft.title?.trim() || 'Platform resume draft',
          data: normalizeResumeData(draft.data),
          config: normalizeConfig(draft.config),
          folder: 'Generated',
          targetRole: String(input.jobDescription?.title ?? ''),
          targetCompany: String(input.jobDescription?.company ?? ''),
          tags: normalizeTags([input.jobDescription?.title, input.jobDescription?.company, 'platform'].filter(Boolean)),
          origin: 'jd-draft',
          sourceResumeId: undefined,
          sourceResumeTitle: undefined,
          favorite: false,
          archived: false,
          careerUpdateChecklist: defaultCareerUpdateChecklist(),
          createdAt: created.toISOString(),
          updatedAt: created.toISOString(),
          lastCareerUpdateAt: created.toISOString(),
          nextCareerUpdateAt: addDays(created, 14).toISOString(),
        }
        state.documents.unshift(doc)
        state.activeResumeId = doc.id

        const entry = normalizePlatformRequest({
          requestId,
          userId: input.userId,
          clientId: meta.clientId,
          documentId: doc.id,
          matchScore: draft.match?.score,
          persisted: true,
          status: 'persisted',
          route: meta.route,
          generatedAt: draft.generation?.generatedAt,
          latencyMs: meta.latencyMs,
        })
        state.platformRequests = [entry, ...state.platformRequests].slice(0, 500)
        log(state, {
          type: 'resume',
          tag: 'platform',
          message: `Persisted platform resume draft: ${doc.title}`,
          messageZh: `保存平台简历草稿：${doc.title}`,
          messageEn: `Persisted platform resume draft: ${doc.title}`,
          meta: `${entry.matchScore}/100`,
          resumeId: doc.id,
        })
        return { documentId: doc.id, idempotent: false, request: entry }
      }, context)
    },

    async listActivity(context: StoreContext = {}) {
      const state = await readState(context)
      return state.activityLog
    },

    async createAssistantSuggestion(input: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const prompt = String(input.prompt ?? '').trim()
        if (!prompt) throw httpError(400, 'Prompt is required')
        const active = getActiveDocument(state)
        const suggestion = {
          id: newId('suggestion'),
          prompt,
          resumeId: active.id,
          summaryZh: `围绕“${prompt}”重写个人简介，优先突出最近经历、核心技术和可验证成果。`,
          summaryEn: `Tailor the summary for "${prompt}", emphasizing recent work, core technologies, and verifiable outcomes.`,
          createdAt: new Date().toISOString(),
        }
        log(state, {
          type: 'ai',
          tag: 'AI',
          message: 'Generated local resume advice',
          messageZh: '生成本地简历优化建议',
          messageEn: 'Generated local resume advice',
          meta: prompt,
          resumeId: active.id,
        })
        return suggestion
      }, context)
    },

    async getLocalAuthContext() {
      return readAuthWorkspaceContext(db, DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID)
    },

    async findUserByEmail(email: string) {
      return findUserByEmailSync(db, email)
    },

    async createUserWorkspace(input: { email: string; displayName?: string; passwordHash: string }) {
      return db.transaction(() => createUserWorkspaceSync(db, input))()
    },

    async createSession(input: { userId: string; tokenHash: string; expiresAt: string }) {
      return db.transaction(() => createSessionSync(db, input))()
    },

    async getSessionByTokenHash(tokenHash: string) {
      return db.transaction(() => readSessionByTokenHashSync(db, tokenHash))()
    },

    async revokeSession(tokenHash: string) {
      return db.transaction(() => revokeSessionSync(db, tokenHash))()
    },

    async listAdminUsers() {
      return listAdminUsersSync(db)
    },

    async lockUser(input: AdminUserOperationInput) {
      return db.transaction(() => lockUserSync(db, input))()
    },

    async unlockUser(input: AdminUserOperationInput) {
      return db.transaction(() => unlockUserSync(db, input))()
    },

    async revokeUserSessions(input: AdminUserOperationInput) {
      return db.transaction(() => revokeUserSessionsSync(db, input))()
    },

    async listAuditLogs() {
      return listAuditLogsSync(db)
    },

    close() {
      db.close()
    },
  }
}

function runSqliteMigrations(db: SqliteDatabase): void {
  ensureUserPasswordHashColumn(db)
  db.exec(readAuthMigrationSql())
}

function ensureUserPasswordHashColumn(db: SqliteDatabase): void {
  const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name?: string }>
  if (columns.some((column) => column.name === 'password_hash')) return
  db.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT').run()
}

function readAuthMigrationSql(): string {
  const migrationPath = join(process.cwd(), 'sql', 'sqlite', '002_auth.sql')
  return existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : AUTH_MIGRATION_SQL
}

function seedDefaultWorkspace(db: SqliteDatabase): void {
  db.transaction(() => {
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(DEFAULT_USER_ID, 'local-owner@example.local', 'Local owner', 'owner', 'enabled', now, now)
    db.prepare(`
      INSERT INTO workspaces (id, owner_user_id, name, plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(DEFAULT_WORKSPACE_ID, DEFAULT_USER_ID, 'Default workspace', 'local', now, now)
    db.prepare(`
      INSERT INTO workspace_memberships (workspace_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(workspace_id, user_id) DO NOTHING
    `).run(DEFAULT_WORKSPACE_ID, DEFAULT_USER_ID, 'owner', now)
  })()
}

function migrateLegacyJsonIfNeeded(db: SqliteDatabase, dataDir: string): boolean {
  const legacyPath = join(dataDir, LEGACY_JSON_FILE)
  if (!existsSync(legacyPath) || !isDatabaseEmpty(db)) return false

  const raw = readFileSync(legacyPath, 'utf8')
  const state = normalizeState(JSON.parse(raw))
  db.transaction((nextState: ResumeState) => replaceStateSync(db, nextState))(state)
  renameSync(legacyPath, `${legacyPath}.migrated`)
  return true
}

function isDatabaseEmpty(db: SqliteDatabase): boolean {
  const row = db.prepare('SELECT COUNT(*) AS count FROM resume_documents').get() as { count?: number } | undefined
  return Number(row?.count ?? 0) === 0
}

function readStateSync(db: SqliteDatabase, context: StoreContext = {}): ResumeState {
  const scoped = normalizeStoreContext(context)
  const workspace = db.prepare('SELECT active_resume_id FROM workspaces WHERE id = ?').get(scoped.workspaceId) as
    | { active_resume_id?: string }
    | undefined
  const documentRows = db.prepare(`
    SELECT *
    FROM resume_documents
    WHERE workspace_id = ?
    ORDER BY position ASC, created_at ASC, id ASC
  `).all(scoped.workspaceId) as AnyRecord[]
  const documents = documentRows.map((row) => normalizeDocument({
    id: row.id,
    title: row.title,
    data: parseJson(row.data, {}),
    config: parseJson(row.config, {}),
    folder: row.folder,
    targetRole: row.target_role,
    targetCompany: row.target_company,
    tags: parseJson(row.tags, []),
    origin: row.origin,
    sourceResumeId: row.source_resume_id ?? undefined,
    sourceResumeTitle: row.source_resume_title ?? undefined,
    favorite: Boolean(row.favorite),
    archived: Boolean(row.archived),
    careerUpdateChecklist: parseJson(row.career_update_checklist, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastCareerUpdateAt: row.last_career_update_at,
    nextCareerUpdateAt: row.next_career_update_at,
  }))
  const activeDocument = documents.find((doc) => doc.id === workspace?.active_resume_id) ?? documents[0]

  const progressRows = db.prepare(`
    SELECT *
    FROM application_progress_events
    WHERE workspace_id = ?
    ORDER BY application_id ASC, position ASC, created_at ASC, id ASC
  `).all(scoped.workspaceId) as AnyRecord[]
  const progressByApplication = new Map<string, AnyRecord[]>()
  for (const row of progressRows) {
    const events = progressByApplication.get(row.application_id) ?? []
    events.push({
      id: row.id,
      stage: row.stage,
      title: row.title,
      note: row.note,
      happenedAt: row.happened_at,
      createdAt: row.created_at,
    })
    progressByApplication.set(row.application_id, events)
  }

  const applicationRows = db.prepare(`
    SELECT *
    FROM job_applications
    WHERE workspace_id = ?
    ORDER BY position ASC, created_at ASC, id ASC
  `).all(scoped.workspaceId) as AnyRecord[]
  const applications = applicationRows.map((row) => {
    const fallbackDoc = documents.find((doc) => doc.id === row.resume_id) ?? activeDocument
    return normalizeApplication({
      id: row.id,
      company: row.company,
      companyMono: row.company_mono,
      location: row.location,
      role: row.role,
      department: row.department,
      resumeId: row.resume_id,
      resumeTitle: row.resume_title,
      stage: row.stage,
      match: row.match_score,
      appliedAt: row.applied_at ?? '',
      nextAction: row.next_action,
      followUpAt: row.follow_up_at ?? '',
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      jobPostUrl: row.job_post_url,
      notes: row.notes,
      jobDescription: parseNullableJson(row.job_description),
      tailoring: parseNullableJson(row.tailoring),
      progressLog: progressByApplication.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }, fallbackDoc)
  })

  const growthRows = db.prepare(`
    SELECT *
    FROM growth_entries
    WHERE workspace_id = ?
    ORDER BY position ASC, entry_date DESC, id ASC
  `).all(scoped.workspaceId) as AnyRecord[]
  const growthEntries = growthRows.map((row) => {
    const fallbackDoc = documents.find((doc) => doc.id === row.source_resume_id) ?? activeDocument
    return normalizeGrowthEntry({
      id: row.id,
      date: row.entry_date,
      type: row.entry_type,
      company: row.company,
      project: row.project,
      title: row.title,
      content: row.content,
      metrics: row.metrics,
      skills: parseJson(row.skills, []),
      evidenceUrl: row.evidence_url,
      private: Boolean(row.private),
      archived: Boolean(row.archived),
      sourceResumeId: row.source_resume_id,
      sourceResumeTitle: row.source_resume_title,
      usedByResumeIds: parseJson(row.used_by_resume_ids, []),
      usedByApplicationIds: parseJson(row.used_by_application_ids, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }, fallbackDoc)
  })

  const platformRows = db.prepare(`
    SELECT *
    FROM platform_requests
    WHERE workspace_id = ?
    ORDER BY position ASC, created_at DESC, id ASC
  `).all(scoped.workspaceId) as AnyRecord[]
  const platformRequests = platformRows.map((row) => normalizePlatformRequest({
    id: row.id,
    requestId: row.request_id,
    userId: row.user_id,
    clientId: row.client_id ?? undefined,
    documentId: row.generated_document_id ?? undefined,
    matchScore: row.match_score,
    persisted: Boolean(row.persisted),
    status: row.status,
    route: row.route,
    latencyMs: row.latency_ms,
    error: row.error ?? undefined,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    replayedAt: row.replayed_at ?? undefined,
    replayCount: row.replay_count,
  }))

  const activityRows = db.prepare(`
    SELECT *
    FROM activity_events
    WHERE workspace_id = ?
    ORDER BY position ASC, created_at DESC, id ASC
  `).all(scoped.workspaceId) as AnyRecord[]
  const activityLog = activityRows.map((row) => normalizeActivity({
    id: row.id,
    type: row.event_type,
    tag: row.tag,
    message: row.message,
    messageZh: row.message_zh ?? undefined,
    messageEn: row.message_en ?? undefined,
    meta: row.meta,
    resumeId: row.resume_id ?? undefined,
    createdAt: row.created_at,
  }, documents.find((doc) => doc.id === row.resume_id) ?? activeDocument))

  return normalizeState({
    activeResumeId: workspace?.active_resume_id,
    documents,
    applications,
    growthEntries,
    platformRequests,
    activityLog,
  })
}

function replaceStateSync(db: SqliteDatabase, nextState: unknown, context: StoreContext = {}): ResumeState {
  const scoped = normalizeStoreContext(context)
  const state = normalizeState(nextState as AnyRecord)
  clearStateRows(db, scoped.workspaceId)

  const insertDocument = db.prepare(`
    INSERT INTO resume_documents (
      id, workspace_id, owner_user_id, title, data, config, folder, target_role,
      target_company, tags, origin, source_resume_id, source_resume_title,
      favorite, archived, career_update_checklist, last_career_update_at,
      next_career_update_at, position, created_at, updated_at
    )
    VALUES (
      @id, @workspaceId, @ownerUserId, @title, @data, @config, @folder, @targetRole,
      @targetCompany, @tags, @origin, @sourceResumeId, @sourceResumeTitle,
      @favorite, @archived, @careerUpdateChecklist, @lastCareerUpdateAt,
      @nextCareerUpdateAt, @position, @createdAt, @updatedAt
    )
  `)
  const insertApplication = db.prepare(`
    INSERT INTO job_applications (
      id, workspace_id, owner_user_id, resume_id, resume_title, company, company_mono,
      location, role, department, stage, match_score, applied_at, next_action,
      follow_up_at, contact_name, contact_email, job_post_url, notes, job_description,
      tailoring, position, created_at, updated_at
    )
    VALUES (
      @id, @workspaceId, @ownerUserId, @resumeId, @resumeTitle, @company, @companyMono,
      @location, @role, @department, @stage, @matchScore, @appliedAt, @nextAction,
      @followUpAt, @contactName, @contactEmail, @jobPostUrl, @notes, @jobDescription,
      @tailoring, @position, @createdAt, @updatedAt
    )
  `)
  const insertProgressEvent = db.prepare(`
    INSERT INTO application_progress_events (
      id, workspace_id, owner_user_id, application_id, stage, title, note,
      happened_at, position, created_at, updated_at
    )
    VALUES (
      @id, @workspaceId, @ownerUserId, @applicationId, @stage, @title, @note,
      @happenedAt, @position, @createdAt, @updatedAt
    )
  `)
  const insertGrowthEntry = db.prepare(`
    INSERT INTO growth_entries (
      id, workspace_id, owner_user_id, source_resume_id, source_resume_title,
      entry_date, entry_type, company, project, title, content, metrics, skills,
      evidence_url, private, archived, used_by_resume_ids, used_by_application_ids,
      position, created_at, updated_at
    )
    VALUES (
      @id, @workspaceId, @ownerUserId, @sourceResumeId, @sourceResumeTitle,
      @date, @type, @company, @project, @title, @content, @metrics, @skills,
      @evidenceUrl, @private, @archived, @usedByResumeIds, @usedByApplicationIds,
      @position, @createdAt, @updatedAt
    )
  `)
  const insertPlatformRequest = db.prepare(`
    INSERT INTO platform_requests (
      id, workspace_id, client_id, request_id, user_id, route, status,
      generated_document_id, match_score, persisted, idempotent, latency_ms,
      error, generated_at, replayed_at, replay_count, position, created_at
    )
    VALUES (
      @id, @workspaceId, @clientId, @requestId, @userId, @route, @status,
      @documentId, @matchScore, @persisted, @idempotent, @latencyMs,
      @error, @generatedAt, @replayedAt, @replayCount, @position, @createdAt
    )
  `)
  const insertActivity = db.prepare(`
    INSERT INTO activity_events (
      id, workspace_id, actor_user_id, event_type, tag, message, message_zh,
      message_en, meta, resume_id, position, created_at
    )
    VALUES (
      @id, @workspaceId, @actorUserId, @type, @tag, @message, @messageZh,
      @messageEn, @meta, @resumeId, @position, @createdAt
    )
  `)

  state.documents.forEach((doc, position) => {
    insertDocument.run({
      id: doc.id,
      workspaceId: scoped.workspaceId,
      ownerUserId: scoped.userId,
      title: doc.title,
      data: stringifyJson(doc.data),
      config: stringifyJson(doc.config),
      folder: doc.folder,
      targetRole: doc.targetRole,
      targetCompany: doc.targetCompany,
      tags: stringifyJson(doc.tags),
      origin: doc.origin,
      sourceResumeId: doc.sourceResumeId ?? null,
      sourceResumeTitle: doc.sourceResumeTitle ?? null,
      favorite: toSqliteBoolean(doc.favorite),
      archived: toSqliteBoolean(doc.archived),
      careerUpdateChecklist: stringifyJson(doc.careerUpdateChecklist),
      lastCareerUpdateAt: doc.lastCareerUpdateAt ?? null,
      nextCareerUpdateAt: doc.nextCareerUpdateAt ?? null,
      position,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })
  })

  state.applications.forEach((app, position) => {
    insertApplication.run({
      id: app.id,
      workspaceId: scoped.workspaceId,
      ownerUserId: scoped.userId,
      resumeId: app.resumeId ?? null,
      resumeTitle: app.resumeTitle,
      company: app.company,
      companyMono: app.companyMono,
      location: app.location,
      role: app.role,
      department: app.department,
      stage: app.stage,
      matchScore: app.match,
      appliedAt: app.appliedAt ?? '',
      nextAction: app.nextAction,
      followUpAt: app.followUpAt ?? '',
      contactName: app.contactName,
      contactEmail: app.contactEmail,
      jobPostUrl: app.jobPostUrl,
      notes: app.notes,
      jobDescription: stringifyNullableJson(app.jobDescription),
      tailoring: stringifyNullableJson(app.tailoring),
      position,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    })
    app.progressLog.forEach((event: AnyRecord, eventPosition: number) => {
      insertProgressEvent.run({
        id: event.id,
        workspaceId: scoped.workspaceId,
        ownerUserId: scoped.userId,
        applicationId: app.id,
        stage: event.stage,
        title: event.title,
        note: event.note,
        happenedAt: event.happenedAt,
        position: eventPosition,
        createdAt: event.createdAt,
        updatedAt: event.createdAt,
      })
    })
  })

  state.growthEntries.forEach((entry, position) => {
    insertGrowthEntry.run({
      id: entry.id,
      workspaceId: scoped.workspaceId,
      ownerUserId: scoped.userId,
      sourceResumeId: entry.sourceResumeId || null,
      sourceResumeTitle: entry.sourceResumeTitle || null,
      date: entry.date,
      type: entry.type,
      company: entry.company,
      project: entry.project,
      title: entry.title,
      content: entry.content,
      metrics: entry.metrics,
      skills: stringifyJson(entry.skills),
      evidenceUrl: entry.evidenceUrl,
      private: toSqliteBoolean(entry.private),
      archived: toSqliteBoolean(entry.archived),
      usedByResumeIds: stringifyJson(entry.usedByResumeIds),
      usedByApplicationIds: stringifyJson(entry.usedByApplicationIds),
      position,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })
  })

  state.platformRequests.forEach((entry, position) => {
    insertPlatformRequest.run({
      id: entry.id,
      workspaceId: scoped.workspaceId,
      clientId: entry.clientId ?? null,
      requestId: entry.requestId,
      userId: entry.userId,
      route: entry.route,
      status: entry.status,
      documentId: entry.documentId ?? null,
      matchScore: entry.matchScore,
      persisted: toSqliteBoolean(entry.persisted),
      idempotent: toSqliteBoolean(entry.idempotent),
      latencyMs: entry.latencyMs,
      error: entry.error ?? null,
      generatedAt: entry.generatedAt,
      replayedAt: entry.replayedAt ?? null,
      replayCount: entry.replayCount,
      position,
      createdAt: entry.createdAt,
    })
  })

  state.activityLog.slice(0, 200).forEach((event, position) => {
    insertActivity.run({
      id: event.id,
      workspaceId: scoped.workspaceId,
      actorUserId: scoped.userId,
      type: event.type,
      tag: event.tag,
      message: event.message,
      messageZh: event.messageZh ?? null,
      messageEn: event.messageEn ?? null,
      meta: event.meta,
      resumeId: event.resumeId ?? null,
      position,
      createdAt: event.createdAt,
    })
  })

  db.prepare('UPDATE workspaces SET active_resume_id = ?, updated_at = ? WHERE id = ?')
    .run(state.activeResumeId, new Date().toISOString(), scoped.workspaceId)
  return state
}

function clearStateRows(db: SqliteDatabase, workspaceId: string): void {
  db.prepare('DELETE FROM activity_events WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM application_progress_events WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM job_applications WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM growth_entries WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM platform_requests WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM resume_documents WHERE workspace_id = ?').run(workspaceId)
}

function normalizeStoreContext(context: StoreContext = {}): Required<StoreContext> {
  return {
    workspaceId: context.workspaceId || DEFAULT_WORKSPACE_ID,
    userId: context.userId || DEFAULT_USER_ID,
  }
}

function listAdminUsersSync(db: SqliteDatabase): AdminListedUser[] {
  const rows = db.prepare(`
    SELECT
      users.id,
      users.email,
      users.display_name,
      users.role,
      users.status,
      users.last_seen_at,
      users.created_at,
      users.updated_at,
      workspaces.id AS workspace_id,
      workspaces.name AS workspace_name,
      workspaces.plan AS workspace_plan,
      workspaces.owner_user_id AS workspace_owner_user_id,
      workspaces.active_resume_id AS workspace_active_resume_id,
      workspaces.created_at AS workspace_created_at,
      workspaces.updated_at AS workspace_updated_at,
      workspace_memberships.role AS workspace_role,
      COALESCE(resume_counts.resume_count, 0) AS resume_count,
      COALESCE(application_counts.application_count, 0) AS application_count
    FROM users
    LEFT JOIN workspace_memberships ON workspace_memberships.user_id = users.id
    LEFT JOIN workspaces ON workspaces.id = workspace_memberships.workspace_id
    LEFT JOIN (
      SELECT owner_user_id, COUNT(*) AS resume_count
      FROM resume_documents
      GROUP BY owner_user_id
    ) AS resume_counts ON resume_counts.owner_user_id = users.id
    LEFT JOIN (
      SELECT owner_user_id, COUNT(*) AS application_count
      FROM job_applications
      GROUP BY owner_user_id
    ) AS application_counts ON application_counts.owner_user_id = users.id
    ORDER BY
      users.created_at ASC,
      users.email ASC,
      CASE workspace_memberships.role WHEN 'owner' THEN 0 ELSE 1 END,
      workspaces.created_at ASC
  `).all() as AnyRecord[]

  const users = new Map<string, AdminListedUser>()
  for (const row of rows) {
    if (users.has(row.id)) continue
    users.set(row.id, {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      status: row.status,
      lastSeenAt: row.last_seen_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      workspace: row.workspace_id ? {
        id: row.workspace_id,
        name: row.workspace_name,
        plan: row.workspace_plan,
        role: row.workspace_role,
        ownerUserId: row.workspace_owner_user_id,
        activeResumeId: row.workspace_active_resume_id ?? undefined,
        createdAt: row.workspace_created_at,
        updatedAt: row.workspace_updated_at,
      } : undefined,
      resumeCount: Number(row.resume_count ?? 0),
      applicationCount: Number(row.application_count ?? 0),
    })
  }
  return [...users.values()]
}

function lockUserSync(db: SqliteDatabase, input: AdminUserOperationInput): {
  user: PublicUser
  revokedSessions: number
} {
  const existing = readUserByIdSync(db, input.userId)
  if (!existing) throw httpError(404, 'User not found')
  if (existing.id === DEFAULT_USER_ID) throw httpError(400, 'local-owner cannot be locked')

  const now = new Date().toISOString()
  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run('locked', now, existing.id)
  const revokedSessions = revokeSessionsForUserIdSync(db, existing.id, now)
  const user = readUserByIdSync(db, existing.id) ?? existing
  recordAuditLogSync(db, {
    ...adminAuditInput(input, user, revokedSessions),
    action: 'admin.user.lock',
  })
  return { user, revokedSessions }
}

function unlockUserSync(db: SqliteDatabase, input: AdminUserOperationInput): {
  user: PublicUser
} {
  const existing = readUserByIdSync(db, input.userId)
  if (!existing) throw httpError(404, 'User not found')

  const now = new Date().toISOString()
  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run('enabled', now, existing.id)
  const user = readUserByIdSync(db, existing.id) ?? existing
  recordAuditLogSync(db, {
    ...adminAuditInput(input, user),
    action: 'admin.user.unlock',
  })
  return { user }
}

function revokeUserSessionsSync(db: SqliteDatabase, input: AdminUserOperationInput): {
  user: PublicUser
  revokedSessions: number
} {
  const user = readUserByIdSync(db, input.userId)
  if (!user) throw httpError(404, 'User not found')

  const revokedSessions = revokeSessionsForUserIdSync(db, user.id, new Date().toISOString())
  recordAuditLogSync(db, {
    ...adminAuditInput(input, user, revokedSessions),
    action: 'admin.user.sessions.revoke',
  })
  return { user, revokedSessions }
}

function revokeSessionsForUserIdSync(db: SqliteDatabase, userId: string, revokedAt: string): number {
  const result = db.prepare(`
    UPDATE sessions
    SET revoked_at = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(revokedAt, userId)
  return Number(result.changes ?? 0)
}

function adminAuditInput(
  input: AdminUserOperationInput,
  target: PublicUser,
  revokedSessions?: number,
): Omit<AuditLogInput, 'action'> {
  return {
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    objectType: 'user',
    objectId: target.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      actorEmail: input.actorEmail,
      targetUserId: target.id,
      targetEmail: target.email,
      targetStatus: target.status,
      revokedSessions,
    },
  }
}

function recordAuditLogSync(db: SqliteDatabase, input: AuditLogInput): PublicAuditLog {
  const now = new Date().toISOString()
  const id = newId('audit')
  const metadata = JSON.stringify({
    actorEmail: input.actorEmail,
    ...input.metadata,
  })
  db.prepare(`
    INSERT INTO audit_logs (
      id,
      workspace_id,
      actor_user_id,
      actor_role,
      action,
      object_type,
      object_id,
      result,
      ip_address,
      user_agent,
      metadata,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.workspaceId ?? null,
    input.actorUserId ?? null,
    input.actorRole,
    input.action,
    input.objectType ?? 'user',
    input.objectId ?? '',
    input.result ?? 'success',
    input.ipAddress ?? null,
    input.userAgent ?? null,
    metadata,
    now,
  )
  return listAuditLogByIdSync(db, id)
}

function listAuditLogsSync(db: SqliteDatabase): PublicAuditLog[] {
  const rows = db.prepare(`
    SELECT *
    FROM audit_logs
    ORDER BY created_at DESC, id DESC
  `).all() as AnyRecord[]
  return rows.map(toAuditLog)
}

function listAuditLogByIdSync(db: SqliteDatabase, id: string): PublicAuditLog {
  const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as AnyRecord | undefined
  if (!row) throw httpError(500, 'Audit log could not be created')
  return toAuditLog(row)
}

function toAuditLog(row: AnyRecord): PublicAuditLog {
  const metadata = parseJson(row.metadata, {})
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    actorUserId: row.actor_user_id ?? undefined,
    actorEmail: metadata.actorEmail,
    actorRole: row.actor_role,
    action: row.action,
    objectType: row.object_type,
    objectId: row.object_id,
    result: row.result,
    ipAddress: row.ip_address ?? undefined,
    userAgent: row.user_agent ?? undefined,
    targetUserId: metadata.targetUserId,
    targetEmail: metadata.targetEmail,
    metadata,
    createdAt: row.created_at,
  }
}

function readUserByIdSync(db: SqliteDatabase, userId: string): PublicUser | undefined {
  const row = db.prepare(`
    SELECT id, email, display_name, role, status, last_seen_at, created_at, updated_at
    FROM users
    WHERE id = ?
  `).get(userId) as AnyRecord | undefined
  return row ? toPublicUser(row) : undefined
}

function findUserByEmailSync(db: SqliteDatabase, email: string): UserWithPassword | undefined {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return undefined
  const row = db.prepare(`
    SELECT id, email, display_name, role, status, password_hash, last_seen_at, created_at, updated_at
    FROM users
    WHERE email = ?
  `).get(normalizedEmail) as AnyRecord | undefined
  return row ? toUserWithPassword(row) : undefined
}

function createUserWorkspaceSync(
  db: SqliteDatabase,
  input: { email: string; displayName?: string; passwordHash: string },
): AuthWorkspaceContext {
  const email = normalizeEmail(input.email)
  if (!email) throw httpError(400, 'Email is required')
  if (findUserByEmailSync(db, email)) throw httpError(409, 'Email is already registered')

  const now = new Date().toISOString()
  const userId = newId('user')
  const workspaceId = newId('workspace')
  const displayName = String(input.displayName ?? '').trim()
  const workspaceName = displayName ? `${displayName}'s workspace` : `${email}'s workspace`

  try {
    db.prepare(`
      INSERT INTO users (id, email, display_name, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, displayName, input.passwordHash, 'user', 'enabled', now, now)
  } catch (error) {
    if (isUniqueConstraintError(error)) throw httpError(409, 'Email is already registered')
    throw error
  }

  db.prepare(`
    INSERT INTO workspaces (id, owner_user_id, name, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(workspaceId, userId, workspaceName, 'personal', now, now)
  db.prepare(`
    INSERT INTO workspace_memberships (workspace_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?)
  `).run(workspaceId, userId, 'owner', now)

  replaceStateSync(db, initialStateWithFreshIds(), { workspaceId, userId })
  return readAuthWorkspaceContext(db, userId, workspaceId)
}

function createSessionSync(
  db: SqliteDatabase,
  input: { userId: string; tokenHash: string; expiresAt: string },
): { id: string; expiresAt: string } {
  const id = newId('session')
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.userId, input.tokenHash, input.expiresAt, now)
  return { id, expiresAt: input.expiresAt }
}

function readSessionByTokenHashSync(db: SqliteDatabase, tokenHash: string): AuthWorkspaceContext | undefined {
  const row = db.prepare(`
    SELECT
      sessions.id AS session_id,
      sessions.expires_at AS session_expires_at,
      sessions.last_seen_at AS session_last_seen_at,
      users.id AS user_id,
      users.email,
      users.display_name,
      users.role AS user_role,
      users.status AS user_status,
      users.last_seen_at AS user_last_seen_at,
      users.created_at AS user_created_at,
      users.updated_at AS user_updated_at,
      workspaces.id AS workspace_id,
      workspaces.name AS workspace_name,
      workspaces.plan AS workspace_plan,
      workspaces.owner_user_id AS workspace_owner_user_id,
      workspaces.active_resume_id AS workspace_active_resume_id,
      workspaces.created_at AS workspace_created_at,
      workspaces.updated_at AS workspace_updated_at,
      workspace_memberships.role AS workspace_role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    JOIN workspace_memberships ON workspace_memberships.user_id = users.id
    JOIN workspaces ON workspaces.id = workspace_memberships.workspace_id
    WHERE sessions.token_hash = ?
      AND sessions.revoked_at IS NULL
    ORDER BY CASE workspace_memberships.role WHEN 'owner' THEN 0 ELSE 1 END, workspaces.created_at ASC
    LIMIT 1
  `).get(tokenHash) as AnyRecord | undefined
  if (!row) return undefined

  if (new Date(row.session_expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id)
    return undefined
  }
  if (row.user_status !== 'enabled') return undefined

  const sessionLastSeenAt = row.session_last_seen_at ? new Date(row.session_last_seen_at).getTime() : 0
  const shouldRefreshLastSeen = !Number.isFinite(sessionLastSeenAt)
    || Date.now() - sessionLastSeenAt >= SESSION_LAST_SEEN_UPDATE_INTERVAL_MS
  if (!shouldRefreshLastSeen) return authContextFromJoinedRow(row)

  const now = new Date().toISOString()
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now, row.session_id)
  db.prepare('UPDATE users SET last_seen_at = ?, updated_at = ? WHERE id = ?').run(now, now, row.user_id)
  return authContextFromJoinedRow(row, { lastSeenAt: now, updatedAt: now })
}

function revokeSessionSync(db: SqliteDatabase, tokenHash: string): { ok: true } {
  db.prepare(`
    UPDATE sessions
    SET revoked_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL
  `).run(new Date().toISOString(), tokenHash)
  return { ok: true }
}

function readAuthWorkspaceContext(db: SqliteDatabase, userId: string, workspaceId: string): AuthWorkspaceContext {
  const row = db.prepare(`
    SELECT
      users.id AS user_id,
      users.email,
      users.display_name,
      users.role AS user_role,
      users.status AS user_status,
      users.last_seen_at AS user_last_seen_at,
      users.created_at AS user_created_at,
      users.updated_at AS user_updated_at,
      workspaces.id AS workspace_id,
      workspaces.name AS workspace_name,
      workspaces.plan AS workspace_plan,
      workspaces.owner_user_id AS workspace_owner_user_id,
      workspaces.active_resume_id AS workspace_active_resume_id,
      workspaces.created_at AS workspace_created_at,
      workspaces.updated_at AS workspace_updated_at,
      workspace_memberships.role AS workspace_role
    FROM users
    JOIN workspace_memberships ON workspace_memberships.user_id = users.id
    JOIN workspaces ON workspaces.id = workspace_memberships.workspace_id
    WHERE users.id = ? AND workspaces.id = ?
    LIMIT 1
  `).get(userId, workspaceId) as AnyRecord | undefined
  if (!row) throw httpError(404, 'Workspace not found')
  return authContextFromJoinedRow(row)
}

function authContextFromJoinedRow(
  row: AnyRecord,
  overrides: { lastSeenAt?: string; updatedAt?: string } = {},
): AuthWorkspaceContext {
  return {
    user: {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.user_role,
      status: row.user_status,
      lastSeenAt: overrides.lastSeenAt ?? row.user_last_seen_at ?? undefined,
      createdAt: row.user_created_at,
      updatedAt: overrides.updatedAt ?? row.user_updated_at,
    },
    workspace: {
      id: row.workspace_id,
      name: row.workspace_name,
      plan: row.workspace_plan,
      role: row.workspace_role,
      ownerUserId: row.workspace_owner_user_id,
      activeResumeId: row.workspace_active_resume_id ?? undefined,
      createdAt: row.workspace_created_at,
      updatedAt: row.workspace_updated_at,
    },
  }
}

function toUserWithPassword(row: AnyRecord): UserWithPassword {
  return {
    ...toPublicUser(row),
    passwordHash: row.password_hash ?? undefined,
  }
}

function toPublicUser(row: AnyRecord): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    lastSeenAt: row.last_seen_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function initialStateWithFreshIds(): ResumeState {
  const state = normalizeState(initialState())
  const documentIds = new Map<string, string>()
  state.documents = state.documents.map((doc) => {
    const id = newId('resume')
    documentIds.set(doc.id, id)
    return { ...doc, id }
  })
  state.activeResumeId = documentIds.get(state.activeResumeId) ?? state.documents[0]?.id
  state.applications = state.applications.map((app) => ({
    ...app,
    id: newId('app'),
    resumeId: documentIds.get(app.resumeId) ?? app.resumeId,
  }))
  state.growthEntries = state.growthEntries.map((entry) => ({
    ...entry,
    id: newId('growth'),
    sourceResumeId: documentIds.get(entry.sourceResumeId) ?? entry.sourceResumeId,
    usedByResumeIds: entry.usedByResumeIds.map((id: string) => documentIds.get(id) ?? id),
  }))
  state.platformRequests = state.platformRequests.map((entry) => ({ ...entry, id: newId('platform') }))
  state.activityLog = state.activityLog.map((event) => ({
    ...event,
    id: newId('activity'),
    resumeId: event.resumeId ? documentIds.get(event.resumeId) ?? event.resumeId : undefined,
  }))
  return state
}

function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE')
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

function stringifyNullableJson(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value)
}

function parseJson(value: unknown, fallback: unknown): any {
  if (typeof value !== 'string' || !value) return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function parseNullableJson(value: unknown): any {
  if (typeof value !== 'string' || !value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function toSqliteBoolean(value: unknown): number {
  return value ? 1 : 0
}

export function normalizeState(value: AnyRecord = {}): ResumeState {
  const fallback = initialState()
  const documents = Array.isArray(value?.documents) && value.documents.length
    ? value.documents.map(normalizeDocument)
    : fallback.documents
  const activeResumeId = documents.some((doc) => doc.id === value?.activeResumeId)
    ? value.activeResumeId
    : documents[0].id
  const active = documents.find((doc) => doc.id === activeResumeId) ?? documents[0]
  return {
    activeResumeId,
    documents,
    applications: Array.isArray(value?.applications)
      ? value.applications.map((app) => normalizeApplication(app, documents.find((doc) => doc.id === app.resumeId) ?? active))
      : [],
    growthEntries: Array.isArray(value?.growthEntries)
      ? value.growthEntries.map((entry) => normalizeGrowthEntry(entry, documents.find((doc) => doc.id === entry.sourceResumeId) ?? active))
      : fallback.growthEntries,
    platformRequests: Array.isArray(value?.platformRequests)
      ? value.platformRequests.map(normalizePlatformRequest)
      : fallback.platformRequests,
    activityLog: Array.isArray(value?.activityLog)
      ? value.activityLog.map((event) => normalizeActivity(event, documents.find((doc) => doc.id === event.resumeId) ?? active))
      : fallback.activityLog,
  }
}

export function normalizeDocument(doc: AnyRecord = {}): AnyRecord {
  const now = new Date().toISOString()
  const data = normalizeResumeData(doc.data)
  return {
    id: doc.id || newId('resume'),
    title: doc.title?.trim() || data.personal.title || data.personal.name || 'Untitled resume',
    data,
    config: normalizeConfig(doc.config),
    folder: String(doc.folder ?? 'General'),
    targetRole: String(doc.targetRole ?? ''),
    targetCompany: String(doc.targetCompany ?? ''),
    tags: normalizeTags(doc.tags),
    origin: normalizeResumeOrigin(doc.origin ?? (doc.sourceResumeId ? 'copy' : 'sample')),
    sourceResumeId: doc.sourceResumeId ? String(doc.sourceResumeId) : undefined,
    sourceResumeTitle: doc.sourceResumeTitle ? String(doc.sourceResumeTitle) : undefined,
    favorite: Boolean(doc.favorite),
    archived: Boolean(doc.archived),
    careerUpdateChecklist: normalizeCareerUpdateChecklist(doc.careerUpdateChecklist),
    createdAt: doc.createdAt || now,
    updatedAt: doc.updatedAt || now,
    lastCareerUpdateAt: doc.lastCareerUpdateAt || doc.updatedAt || now,
    nextCareerUpdateAt: doc.nextCareerUpdateAt || addDays(new Date(doc.updatedAt || now), 14).toISOString(),
  }
}

function normalizeTags(tags: unknown = []): string[] {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12)
}

function normalizeResumeOrigin(origin: unknown = 'sample'): string {
  const value = String(origin)
  return ['sample', 'blank', 'import', 'copy', 'jd-draft', 'platform'].includes(value) ? value : 'sample'
}

function defaultCareerUpdateChecklist(date: Date = new Date()): AnyRecord {
  return {
    projects: false,
    metrics: false,
    roleChanges: false,
    interviewFeedback: false,
    skills: false,
    notes: '',
    updatedAt: date.toISOString(),
  }
}

function normalizeCareerUpdateChecklist(checklist: AnyRecord = {}, fallback: AnyRecord = {}): AnyRecord {
  return {
    ...defaultCareerUpdateChecklist(),
    ...fallback,
    projects: Boolean(checklist.projects ?? fallback.projects),
    metrics: Boolean(checklist.metrics ?? fallback.metrics),
    roleChanges: Boolean(checklist.roleChanges ?? fallback.roleChanges),
    interviewFeedback: Boolean(checklist.interviewFeedback ?? fallback.interviewFeedback),
    skills: Boolean(checklist.skills ?? fallback.skills),
    notes: String(checklist.notes ?? fallback.notes ?? ''),
    updatedAt: String(checklist.updatedAt ?? fallback.updatedAt ?? new Date().toISOString()),
  }
}

export function normalizeResumeData(data: AnyRecord = {}): AnyRecord {
  return {
    personal: {
      name: data.personal?.name ?? '',
      title: data.personal?.title ?? '',
      phone: data.personal?.phone ?? '',
      email: data.personal?.email ?? '',
      location: data.personal?.location ?? '',
      website: data.personal?.website ?? '',
      summary: data.personal?.summary ?? '',
    },
    experience: Array.isArray(data.experience) ? data.experience : [],
    education: Array.isArray(data.education) ? data.education : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    awards: Array.isArray(data.awards) ? data.awards : [],
    languages: Array.isArray(data.languages) ? data.languages : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
  }
}

export function normalizeConfig(config: AnyRecord = {}): AnyRecord {
  const studioTheme = { ...DEFAULT_CONFIG.studioTheme, ...(config.studioTheme ?? {}) }
  const tweaks = { ...DEFAULT_CONFIG.tweaks, ...(config.tweaks ?? {}) }
  const isLegacyStudioTheme = Boolean(config.studioTheme)
    && studioTheme.density === 'cozy'
    && studioTheme.ruleLines === false
    && (
      (studioTheme.accent === 'vermillion' && studioTheme.paper === 'cream' && studioTheme.font === 'serif')
      || (studioTheme.accent === 'coral' && studioTheme.paper === 'stone' && studioTheme.font === 'sans')
    )
  const isLegacyTweaks = Boolean(config.tweaks)
    && tweaks.density === 'cozy'
    && tweaks.ruleLines === false
    && (
      (tweaks.accent === 'vermillion' && tweaks.paper === 'cream' && tweaks.font === 'serif')
      || (tweaks.accent === 'coral' && tweaks.paper === 'stone' && tweaks.font === 'sans')
    )
  return {
    ...structuredClone(DEFAULT_CONFIG),
    ...config,
    sectionOrder: Array.isArray(config.sectionOrder) && config.sectionOrder.length
      ? config.sectionOrder
      : [...DEFAULT_CONFIG.sectionOrder],
    sectionVisible: { ...DEFAULT_CONFIG.sectionVisible, ...(config.sectionVisible ?? {}) },
    studioTheme: isLegacyStudioTheme ? { ...DEFAULT_CONFIG.studioTheme } : studioTheme,
    tweaks: isLegacyTweaks
      ? {
        ...tweaks,
        accent: DEFAULT_CONFIG.tweaks.accent,
        paper: DEFAULT_CONFIG.tweaks.paper,
        font: DEFAULT_CONFIG.tweaks.font,
        ruleLines: DEFAULT_CONFIG.tweaks.ruleLines,
      }
      : tweaks,
  }
}

export function normalizeApplication(app: AnyRecord = {}, fallbackDoc: AnyRecord): AnyRecord {
  const now = new Date().toISOString()
  const company = String(app.company ?? '').trim()
  if (!company) throw httpError(400, 'Company is required')
  const role = String(app.role ?? '').trim()
  if (!role) throw httpError(400, 'Role is required')
  const stage = ['saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'].includes(app.stage) ? app.stage : 'saved'
  const appliedAt = app.appliedAt || (stage === 'saved' ? '' : now.slice(0, 10))
  return {
    id: app.id || newId('app'),
    company,
    companyMono: String(app.companyMono || company.slice(0, 1) || 'A').slice(0, 2).toUpperCase(),
    location: String(app.location ?? ''),
    role,
    department: String(app.department ?? ''),
    resumeId: app.resumeId || fallbackDoc.id,
    resumeTitle: app.resumeTitle || fallbackDoc.title,
    stage,
    match: Math.max(0, Math.min(100, Number(app.match ?? 70))),
    appliedAt,
    nextAction: String(app.nextAction ?? ''),
    followUpAt: String(app.followUpAt ?? ''),
    contactName: String(app.contactName ?? ''),
    contactEmail: String(app.contactEmail ?? ''),
    jobPostUrl: String(app.jobPostUrl ?? app.jobDescription?.url ?? ''),
    notes: String(app.notes ?? ''),
    jobDescription: app.jobDescription ? normalizeJobDescription(app.jobDescription, { company, role, location: app.location }) : undefined,
    tailoring: app.tailoring ? normalizeTailoring(app.tailoring, fallbackDoc, app.match, now) : undefined,
    progressLog: normalizeProgressLog(app.progressLog, stage, app.nextAction, appliedAt || now.slice(0, 10), app.createdAt || now),
    createdAt: app.createdAt || now,
    updatedAt: app.updatedAt || now,
  }
}

function stageProgressTitle(stage: string): string {
  return {
    saved: 'Saved role for review',
    applied: 'Application submitted',
    screen: 'Screening started',
    onsite: 'Interview stage',
    offer: 'Offer received',
    rejected: 'Closed',
  }[stage] || 'Progress updated'
}

function normalizeProgressLog(
  events: unknown = [],
  stage: string,
  note: unknown = '',
  happenedAt: string,
  createdAt: string,
): AnyRecord[] {
  if (Array.isArray(events) && events.length) {
    return events.map((event) => {
      const eventStage = ['saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'].includes(event.stage) ? event.stage : stage
      return {
        id: event.id || newId('progress'),
        stage: eventStage,
        title: String(event.title ?? stageProgressTitle(eventStage)),
        note: String(event.note ?? ''),
        happenedAt: String(event.happenedAt ?? happenedAt),
        createdAt: String(event.createdAt ?? createdAt),
      }
    })
  }
  return [{
    id: newId('progress'),
    stage,
    title: stageProgressTitle(stage),
    note: String(note ?? ''),
    happenedAt,
    createdAt,
  }]
}

function normalizeJobDescription(jobDescription: AnyRecord = {}, fallback: AnyRecord = {}): AnyRecord {
  return {
    company: String(jobDescription.company ?? fallback.company ?? ''),
    title: String(jobDescription.title ?? fallback.role ?? ''),
    location: String(jobDescription.location ?? fallback.location ?? ''),
    description: String(jobDescription.description ?? ''),
    requirements: Array.isArray(jobDescription.requirements) ? jobDescription.requirements.map(String) : [],
    url: String(jobDescription.url ?? ''),
    archivedAt: jobDescription.archivedAt ? String(jobDescription.archivedAt) : undefined,
  }
}

function normalizeTailoring(
  tailoring: AnyRecord = {},
  fallbackDoc: AnyRecord,
  fallbackMatch: unknown,
  now: string,
): AnyRecord {
  return {
    requestId: String(tailoring.requestId ?? ''),
    sourceResumeId: String(tailoring.sourceResumeId ?? fallbackDoc.id),
    draftTitle: String(tailoring.draftTitle ?? fallbackDoc.title),
    matchScore: Math.max(0, Math.min(100, Number(tailoring.matchScore ?? fallbackMatch ?? 70))),
    matchedKeywords: Array.isArray(tailoring.matchedKeywords) ? tailoring.matchedKeywords.map(String) : [],
    selectedExperienceIds: Array.isArray(tailoring.selectedExperienceIds) ? tailoring.selectedExperienceIds.map(String) : [],
    strategy: String(tailoring.strategy ?? ''),
    generatedAt: String(tailoring.generatedAt ?? now),
    appliedAt: tailoring.appliedAt ? String(tailoring.appliedAt) : undefined,
  }
}

function normalizeGrowthEntry(entry: AnyRecord = {}, fallbackDoc: AnyRecord): AnyRecord {
  const now = new Date().toISOString()
  const type = ['project', 'metric', 'role', 'feedback', 'skill', 'achievement'].includes(entry.type) ? entry.type : 'achievement'
  return {
    id: entry.id || newId('growth'),
    date: String(entry.date ?? now.slice(0, 10)),
    type,
    company: String(entry.company ?? fallbackDoc?.targetCompany ?? ''),
    project: String(entry.project ?? ''),
    title: String(entry.title ?? '').trim() || 'Untitled growth entry',
    content: String(entry.content ?? ''),
    metrics: String(entry.metrics ?? ''),
    skills: Array.isArray(entry.skills) ? [...new Set(entry.skills.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 20) : [],
    evidenceUrl: String(entry.evidenceUrl ?? ''),
    private: Boolean(entry.private),
    archived: Boolean(entry.archived),
    sourceResumeId: String(entry.sourceResumeId ?? fallbackDoc?.id ?? ''),
    sourceResumeTitle: String(entry.sourceResumeTitle ?? fallbackDoc?.title ?? ''),
    usedByResumeIds: Array.isArray(entry.usedByResumeIds) ? [...new Set(entry.usedByResumeIds.map(String).filter(Boolean))] : [],
    usedByApplicationIds: Array.isArray(entry.usedByApplicationIds) ? [...new Set(entry.usedByApplicationIds.map(String).filter(Boolean))] : [],
    createdAt: String(entry.createdAt ?? now),
    updatedAt: String(entry.updatedAt ?? now),
  }
}

function normalizePlatformRequest(entry: AnyRecord = {}): AnyRecord {
  const now = new Date().toISOString()
  return {
    id: entry.id || newId('platform'),
    requestId: String(entry.requestId ?? ''),
    userId: String(entry.userId ?? ''),
    clientId: entry.clientId ? String(entry.clientId) : undefined,
    documentId: entry.documentId ? String(entry.documentId) : undefined,
    matchScore: Math.max(0, Math.min(100, Number(entry.matchScore ?? 0))),
    persisted: Boolean(entry.persisted),
    status: String(entry.status ?? (entry.persisted ? 'persisted' : 'draft')),
    route: String(entry.route ?? 'platform'),
    latencyMs: Number(entry.latencyMs ?? 0),
    error: entry.error ? String(entry.error) : undefined,
    generatedAt: String(entry.generatedAt ?? now),
    createdAt: String(entry.createdAt ?? now),
    replayedAt: entry.replayedAt ? String(entry.replayedAt) : undefined,
    replayCount: Number(entry.replayCount ?? 0),
  }
}

export function normalizeActivity(event: AnyRecord = {}, fallbackDoc?: AnyRecord): AnyRecord {
  const type = ['edit', 'ai', 'application', 'resume', 'export', 'system'].includes(event.type) ? event.type : 'system'
  return {
    id: event.id || newId('activity'),
    type,
    tag: event.tag || 'event',
    message: event.message || event.messageEn || event.messageZh || 'Workspace activity',
    messageZh: event.messageZh,
    messageEn: event.messageEn,
    meta: event.meta || fallbackDoc?.title || 'resume',
    resumeId: event.resumeId ?? fallbackDoc?.id,
    createdAt: event.createdAt || new Date().toISOString(),
  }
}

function findDocument(state: ResumeState, id: string): AnyRecord {
  const doc = state.documents.find((item) => item.id === id)
  if (!doc) throw httpError(404, 'Resume not found')
  return doc
}

function getActiveDocument(state: ResumeState): AnyRecord {
  return state.documents.find((item) => item.id === state.activeResumeId) ?? state.documents[0]
}

function findApplication(state: ResumeState, id: string): AnyRecord {
  const app = state.applications.find((item) => item.id === id)
  if (!app) throw httpError(404, 'Application not found')
  return app
}

function findGrowthEntry(state: ResumeState, id: string): AnyRecord {
  const entry = state.growthEntries.find((item) => item.id === id)
  if (!entry) throw httpError(404, 'Growth entry not found')
  return entry
}

function syncApplicationResumeTitles(state: ResumeState, doc: AnyRecord): void {
  for (const app of state.applications) {
    if (app.resumeId === doc.id) app.resumeTitle = doc.title
  }
  for (const entry of state.growthEntries) {
    if (entry.sourceResumeId === doc.id) entry.sourceResumeTitle = doc.title
  }
}

function toDocumentSummary(doc: AnyRecord): AnyRecord {
  return {
    id: doc.id,
    title: doc.title,
    templateId: doc.config.templateId,
    locale: doc.config.locale,
    personalName: doc.data.personal.name,
    personalTitle: doc.data.personal.title,
    folder: doc.folder,
    targetRole: doc.targetRole,
    targetCompany: doc.targetCompany,
    tags: doc.tags,
    origin: doc.origin,
    sourceResumeId: doc.sourceResumeId,
    sourceResumeTitle: doc.sourceResumeTitle,
    favorite: doc.favorite,
    archived: doc.archived,
    experienceCount: doc.data.experience.length,
    projectCount: doc.data.projects.length,
    updatedAt: doc.updatedAt,
    nextCareerUpdateAt: doc.nextCareerUpdateAt,
  }
}

export function httpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
