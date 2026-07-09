import { initialState } from '../defaults.js'
import { normalizeState, readStateSync, replaceStateSync } from './db.js'
import { effectiveBillingPlan } from './billing.js'
import {
  DEFAULT_USER_ID,
  DEFAULT_WORKSPACE_ID,
  SESSION_LAST_SEEN_UPDATE_INTERVAL_MS,
  type AdminListedUser,
  type AdminUserOperationInput,
  type AnyRecord,
  type AuditLogInput,
  type AuthWorkspaceContext,
  type PublicAuditLog,
  type PublicUser,
  type PublicWorkspace,
  type ResumeState,
  type SqliteDatabase,
  type UserWithPassword,
  httpError,
  isUniqueConstraintError,
  newId,
  normalizeEmail,
  parseJson,
} from './shared.js'

export function createAccountStore(db: SqliteDatabase) {
  return {
    async getLocalAuthContext() {
      return readAuthWorkspaceContext(db, DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID)
    },

    async exportAccountData(input: { userId: string; workspaceId: string }) {
      return db.transaction(() => exportAccountDataSync(db, input))()
    },

    async deleteAccount(input: { userId: string; workspaceId: string }) {
      return db.transaction(() => deleteAccountSync(db, input))()
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

    async deleteUser(input: AdminUserOperationInput) {
      return db.transaction(() => deleteUserSync(db, input))()
    },

    async listAuditLogs() {
      return listAuditLogsSync(db)
    },
  }
}

const ACCOUNT_EXPORT_SCHEMA_VERSION = 1

function exportAccountDataSync(
  db: SqliteDatabase,
  input: { userId: string; workspaceId: string },
) {
  const context = readAuthWorkspaceContext(db, input.userId, input.workspaceId)
  const state = readStateSync(db, { userId: context.user.id, workspaceId: context.workspace.id })
  const exportedAt = new Date().toISOString()
  return {
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    exportedAt,
    profile: context.user,
    workspace: context.workspace,
    resumes: state.documents,
    applications: state.applications,
    growthEntries: state.growthEntries,
    activityLog: state.activityLog,
    platformRequests: state.platformRequests,
    subscription: readSubscriptionExportSync(db, context.user.id),
    usageCounters: listUsageCounterExportsSync(db, context.user.id),
    shares: listShareExportsSync(db, context.user.id, context.workspace.id),
  }
}

function readSubscriptionExportSync(db: SqliteDatabase, userId: string) {
  const row = db.prepare(`
    SELECT plan, status, source, current_period_end, created_at, updated_at
    FROM subscriptions
    WHERE user_id = ?
  `).get(userId) as AnyRecord | undefined
  if (!row) return null
  return {
    plan: row.plan,
    status: row.status,
    source: row.source,
    currentPeriodEnd: row.current_period_end ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function listUsageCounterExportsSync(db: SqliteDatabase, userId: string) {
  const rows = db.prepare(`
    SELECT kind, period_key, count, created_at, updated_at
    FROM usage_counters
    WHERE user_id = ?
    ORDER BY kind ASC, period_key ASC
  `).all(userId) as AnyRecord[]
  return rows.map((row) => ({
    kind: row.kind,
    periodKey: row.period_key,
    count: Number(row.count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

function listShareExportsSync(db: SqliteDatabase, userId: string, workspaceId: string) {
  const rows = db.prepare(`
    SELECT id, resume_id, snapshot, status, expires_at, view_count, last_viewed_at, created_at, revoked_at
    FROM resume_shares
    WHERE user_id = ? AND workspace_id = ?
    ORDER BY created_at DESC, id DESC
  `).all(userId, workspaceId) as AnyRecord[]
  return rows.map((row) => ({
    id: row.id,
    resumeId: row.resume_id,
    snapshot: parseJson(row.snapshot, {}),
    status: row.status,
    expiresAt: row.expires_at ?? null,
    viewCount: Number(row.view_count ?? 0),
    lastViewedAt: row.last_viewed_at ?? null,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? null,
  }))
}

function deleteAccountSync(
  db: SqliteDatabase,
  input: { userId: string; workspaceId: string },
): { deleted: true } {
  const user = readDeletableUserSync(db, input.userId)
  const workspaceIds = ownedWorkspaceIdsForUserSync(db, user.id, input.workspaceId)
  if (!workspaceIds.length) throw httpError(404, 'Workspace not found')
  deleteUserDataSync(db, user.id, workspaceIds)
  return { deleted: true }
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
      subscriptions.plan AS billing_plan,
      subscriptions.status AS billing_status,
      subscriptions.current_period_end AS billing_current_period_end,
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
    LEFT JOIN subscriptions ON subscriptions.user_id = users.id
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
      plan: effectiveBillingPlan(row.billing_plan, row.billing_status, row.billing_current_period_end),
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

function deleteUserSync(db: SqliteDatabase, input: AdminUserOperationInput): {
  deleted: true
  user: PublicUser
  workspaceIds: string[]
} {
  const user = readDeletableUserSync(db, input.userId)
  const workspaceIds = ownedWorkspaceIdsForUserSync(db, user.id)
  const deletedCounts = deleteUserDataSync(db, user.id, workspaceIds)
  const auditInput = adminAuditInput(input, user, deletedCounts.sessions)
  recordAuditLogSync(db, {
    ...auditInput,
    action: 'admin.user.delete',
    metadata: {
      ...auditInput.metadata,
      deletedWorkspaceIds: workspaceIds,
      deletedSessions: deletedCounts.sessions,
    },
  })
  return { deleted: true, user, workspaceIds }
}

function readDeletableUserSync(db: SqliteDatabase, userId: string): PublicUser {
  const user = readUserByIdSync(db, userId)
  if (!user) throw httpError(404, 'User not found')
  if (user.id === DEFAULT_USER_ID) throw httpError(400, 'The default local account cannot be deleted.')
  return user
}

function ownedWorkspaceIdsForUserSync(
  db: SqliteDatabase,
  userId: string,
  requiredWorkspaceId?: string,
): string[] {
  const rows = db.prepare(`
    SELECT id
    FROM workspaces
    WHERE owner_user_id = ?
      AND (? IS NULL OR id = ?)
    ORDER BY created_at ASC, id ASC
  `).all(userId, requiredWorkspaceId ?? null, requiredWorkspaceId ?? null) as AnyRecord[]
  return rows.map((row) => String(row.id))
}

function deleteUserDataSync(
  db: SqliteDatabase,
  userId: string,
  workspaceIds: string[],
): { sessions: number } {
  const sessions = Number(db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes ?? 0)
  db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM usage_counters WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM resume_shares WHERE user_id = ?').run(userId)

  for (const workspaceId of workspaceIds) {
    deleteWorkspaceDataSync(db, workspaceId)
  }

  db.prepare('DELETE FROM activity_events WHERE actor_user_id = ?').run(userId)
  db.prepare('DELETE FROM application_progress_events WHERE owner_user_id = ?').run(userId)
  db.prepare('DELETE FROM job_applications WHERE owner_user_id = ?').run(userId)
  db.prepare('DELETE FROM growth_entries WHERE owner_user_id = ?').run(userId)
  db.prepare('DELETE FROM platform_requests WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM resume_documents WHERE owner_user_id = ?').run(userId)
  db.prepare('DELETE FROM import_jobs WHERE actor_user_id = ?').run(userId)
  db.prepare(`
    DELETE FROM platform_api_keys
    WHERE client_id IN (
      SELECT id
      FROM platform_clients
      WHERE created_by_user_id = ?
    )
  `).run(userId)
  db.prepare('DELETE FROM platform_clients WHERE created_by_user_id = ?').run(userId)
  db.prepare('DELETE FROM workspace_memberships WHERE user_id = ?').run(userId)
  db.prepare('UPDATE audit_logs SET actor_user_id = NULL WHERE actor_user_id = ?').run(userId)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  return { sessions }
}

function deleteWorkspaceDataSync(db: SqliteDatabase, workspaceId: string): void {
  db.prepare('DELETE FROM resume_shares WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM activity_events WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM application_progress_events WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM job_applications WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM growth_entries WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM platform_requests WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM import_jobs WHERE workspace_id = ?').run(workspaceId)
  db.prepare(`
    DELETE FROM platform_api_keys
    WHERE client_id IN (
      SELECT id
      FROM platform_clients
      WHERE workspace_id = ?
    )
  `).run(workspaceId)
  db.prepare('DELETE FROM platform_clients WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM audit_logs WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM resume_documents WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM workspace_memberships WHERE workspace_id = ?').run(workspaceId)
  db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId)
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
): AuthWorkspaceContext & { workspace: PublicWorkspace } {
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
