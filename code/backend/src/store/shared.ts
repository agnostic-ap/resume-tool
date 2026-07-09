import Database from 'better-sqlite3'

export type AnyRecord = Record<string, any>

export type ResumeState = {
  activeResumeId: string
  documents: AnyRecord[]
  applications: AnyRecord[]
  growthEntries: AnyRecord[]
  platformRequests: AnyRecord[]
  activityLog: AnyRecord[]
}

export type StoreOptions = {
  dataDir?: string
  dbPath?: string
}

export type StoreContext = {
  workspaceId?: string
  userId?: string
}

export type PublicUser = {
  id: string
  email: string
  displayName: string
  role: string
  status: string
  lastSeenAt?: string
  createdAt: string
  updatedAt: string
}

export type PublicWorkspace = {
  id: string
  name: string
  plan: string
  role: string
  ownerUserId: string
  activeResumeId?: string
  createdAt: string
  updatedAt: string
}

export type AuthWorkspaceContext = {
  user: PublicUser
  workspace: PublicWorkspace
}

export type UserWithPassword = PublicUser & {
  passwordHash?: string
}

export type AdminListedUser = PublicUser & {
  workspace?: PublicWorkspace
  resumeCount: number
  applicationCount: number
}

export type AdminUserOperationInput = {
  userId: string
  actorEmail: string
  actorRole: string
  ipAddress?: string
  userAgent?: string
}

export type AuditLogInput = {
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

export type PublicAuditLog = {
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

export type SqliteDatabase = Database.Database

export type StoreModuleDeps = {
  readState: (context?: StoreContext) => Promise<ResumeState>
  mutate: <T>(mutator: (state: ResumeState) => T, context?: StoreContext) => Promise<T | ResumeState>
}

export const DB_FILE = 'resume.db'
export const LEGACY_JSON_FILE = 'resume-state.json'
export const DEFAULT_USER_ID = 'local-owner'
export const DEFAULT_WORKSPACE_ID = 'default'
export const SESSION_LAST_SEEN_UPDATE_INTERVAL_MS = 60 * 60 * 1000

export function normalizeStoreContext(context: StoreContext = {}): Required<StoreContext> {
  return {
    workspaceId: context.workspaceId || DEFAULT_WORKSPACE_ID,
    userId: context.userId || DEFAULT_USER_ID,
  }
}

export function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

export function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE')
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

export function stringifyNullableJson(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value)
}

export function parseJson(value: unknown, fallback: unknown): any {
  if (typeof value !== 'string' || !value) return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function parseNullableJson(value: unknown): any {
  if (typeof value !== 'string' || !value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

export function toSqliteBoolean(value: unknown): number {
  return value ? 1 : 0
}

export function httpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
