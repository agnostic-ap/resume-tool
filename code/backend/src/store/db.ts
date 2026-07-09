import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { initialState } from '../defaults.js'
import { normalizeActivity } from './activity.js'
import { normalizeApplication } from './applications.js'
import { normalizeDocument } from './documents.js'
import { normalizeGrowthEntry } from './growth.js'
import { normalizePlatformRequest } from './platform.js'
import { runSqliteMigrations, seedDefaultWorkspace, SQLITE_SCHEMA } from './schema-sync.js'
import {
  DB_FILE,
  LEGACY_JSON_FILE,
  type AnyRecord,
  type ResumeState,
  type SqliteDatabase,
  type StoreContext,
  type StoreOptions,
  normalizeStoreContext,
  parseJson,
  parseNullableJson,
  stringifyJson,
  stringifyNullableJson,
  toSqliteBoolean,
} from './shared.js'

export function openStoreDatabase(options: StoreOptions = {}): {
  db: SqliteDatabase
  dbPath: string
  legacyDataDir: string
} {
  const dataDir = options.dataDir ?? process.env.RESUME_BACKEND_DATA_DIR ?? join(process.cwd(), '.data')
  const dbPath = options.dbPath ?? join(dataDir, DB_FILE)
  mkdirSync(dirname(dbPath), { recursive: true })

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SQLITE_SCHEMA)
  runSqliteMigrations(db)
  seedDefaultWorkspace(db)
  return {
    db,
    dbPath,
    legacyDataDir: options.dataDir ?? dirname(dbPath),
  }
}

export function migrateLegacyJsonIfNeeded(db: SqliteDatabase, dataDir: string): boolean {
  const legacyPath = join(dataDir, LEGACY_JSON_FILE)
  if (!existsSync(legacyPath) || !isDatabaseEmpty(db)) return false

  const raw = readFileSync(legacyPath, 'utf8')
  const state = normalizeState(JSON.parse(raw))
  db.transaction((nextState: ResumeState) => replaceStateSync(db, nextState))(state)
  renameSync(legacyPath, `${legacyPath}.migrated`)
  return true
}

export function isDatabaseEmpty(db: SqliteDatabase): boolean {
  const row = db.prepare('SELECT COUNT(*) AS count FROM resume_documents').get() as { count?: number } | undefined
  return Number(row?.count ?? 0) === 0
}

export function readStateSync(db: SqliteDatabase, context: StoreContext = {}): ResumeState {
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

export function replaceStateSync(db: SqliteDatabase, nextState: unknown, context: StoreContext = {}): ResumeState {
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
