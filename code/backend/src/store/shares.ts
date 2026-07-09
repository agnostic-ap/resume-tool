import { randomBytes } from 'node:crypto'
import { effectiveBillingPlan } from './billing.js'
import {
  type AnyRecord,
  type SqliteDatabase,
  type StoreContext,
  httpError,
  normalizeStoreContext,
  parseJson,
  stringifyJson,
} from './shared.js'

export type CreateResumeShareInput = {
  resumeId: string
  expiresInDays?: number
}

export type ResumeShareOptions = {
  enforceQuota?: boolean
}

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const SHARE_SLUG_LENGTH = 10
const FREE_ACTIVE_SHARE_LIMIT = 3

export function createSharesStore(db: SqliteDatabase) {
  return {
    async createResumeShare(
      input: CreateResumeShareInput,
      context: StoreContext = {},
      options: ResumeShareOptions = {},
    ) {
      return db.transaction(() => createResumeShareSync(db, input, context, options))()
    },

    async listResumeShares(context: StoreContext = {}) {
      const scoped = normalizeStoreContext(context)
      const rows = db.prepare(`
        SELECT *
        FROM resume_shares
        WHERE workspace_id = ? AND user_id = ?
        ORDER BY created_at DESC, id DESC
      `).all(scoped.workspaceId, scoped.userId) as AnyRecord[]
      return rows.map(toPrivateResumeShare)
    },

    async revokeResumeShare(id: string, context: StoreContext = {}) {
      return db.transaction(() => revokeResumeShareSync(db, id, context))()
    },

    async getPublicResumeShare(id: string) {
      return db.transaction(() => getPublicResumeShareSync(db, id))()
    },
  }
}

function createResumeShareSync(
  db: SqliteDatabase,
  input: CreateResumeShareInput,
  context: StoreContext,
  options: ResumeShareOptions,
) {
  const scoped = normalizeStoreContext(context)
  const now = new Date()
  if (options.enforceQuota) assertShareQuotaAvailable(db, scoped.userId, now)

  const resume = db.prepare(`
    SELECT id, title, data, config
    FROM resume_documents
    WHERE id = ? AND workspace_id = ? AND owner_user_id = ?
    LIMIT 1
  `).get(input.resumeId, scoped.workspaceId, scoped.userId) as AnyRecord | undefined
  if (!resume) throw httpError(404, 'Resume not found')

  const id = newUniqueShareId(db)
  const expiresAt = shareExpiresAt(input.expiresInDays, now)
  const createdAt = now.toISOString()
  const snapshot = {
    v: 1,
    title: resume.title,
    data: parseJson(resume.data, {}),
    config: parseJson(resume.config, {}),
  }

  db.prepare(`
    INSERT INTO resume_shares (
      id,
      workspace_id,
      user_id,
      resume_id,
      snapshot,
      status,
      expires_at,
      view_count,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, 'active', ?, 0, ?)
  `).run(
    id,
    scoped.workspaceId,
    scoped.userId,
    resume.id,
    stringifyJson(snapshot),
    expiresAt,
    createdAt,
  )

  return toCreatedResumeShare({ id, expires_at: expiresAt })
}

function revokeResumeShareSync(db: SqliteDatabase, id: string, context: StoreContext) {
  const scoped = normalizeStoreContext(context)
  const row = db.prepare(`
    SELECT id
    FROM resume_shares
    WHERE id = ? AND workspace_id = ? AND user_id = ?
    LIMIT 1
  `).get(id, scoped.workspaceId, scoped.userId) as AnyRecord | undefined
  if (!row) throw shareNotFoundError()

  db.prepare(`
    UPDATE resume_shares
    SET status = 'revoked',
      revoked_at = COALESCE(revoked_at, ?)
    WHERE id = ? AND workspace_id = ? AND user_id = ?
  `).run(new Date().toISOString(), id, scoped.workspaceId, scoped.userId)

  return { ok: true }
}

function getPublicResumeShareSync(db: SqliteDatabase, id: string) {
  const now = new Date().toISOString()
  const row = db.prepare(`
    SELECT *
    FROM resume_shares
    WHERE id = ?
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
    LIMIT 1
  `).get(id, now) as AnyRecord | undefined
  if (!row) throw shareNotFoundError()

  db.prepare(`
    UPDATE resume_shares
    SET view_count = view_count + 1,
      last_viewed_at = ?
    WHERE id = ?
  `).run(now, id)

  return {
    id: row.id,
    snapshot: parseJson(row.snapshot, {}),
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
  }
}

function assertShareQuotaAvailable(db: SqliteDatabase, userId: string, now: Date): void {
  const subscription = db.prepare(`
    SELECT plan, status, current_period_end
    FROM subscriptions
    WHERE user_id = ?
  `).get(userId) as AnyRecord | undefined
  if (effectiveBillingPlan(subscription?.plan, subscription?.status, subscription?.current_period_end, now) === 'pro') {
    return
  }

  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM resume_shares
    WHERE user_id = ?
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > ?)
  `).get(userId, now.toISOString()) as { count?: number } | undefined
  if (Number(row?.count ?? 0) >= FREE_ACTIVE_SHARE_LIMIT) {
    throw httpError(402, 'Share quota exceeded. Free plan includes 3 active shares; upgrade to Pro for unlimited shares.')
  }
}

function toPrivateResumeShare(row: AnyRecord) {
  const snapshot = parseJson(row.snapshot, {})
  return {
    id: row.id,
    resumeId: row.resume_id,
    resumeTitle: typeof snapshot.title === 'string' ? snapshot.title : '',
    status: row.status,
    expiresAt: row.expires_at ?? null,
    viewCount: Number(row.view_count ?? 0),
    lastViewedAt: row.last_viewed_at ?? null,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? null,
    ...sharePath(row.id),
  }
}

function toCreatedResumeShare(row: { id: string; expires_at?: string | null }) {
  return {
    id: row.id,
    ...sharePath(row.id),
    expiresAt: row.expires_at ?? null,
  }
}

function sharePath(id: string) {
  const path = `/api/public/shares/${id}`
  return { path, url: path }
}

function shareExpiresAt(expiresInDays: number | undefined, now: Date): string | null {
  if (expiresInDays === undefined) return null
  const expiresAt = new Date(now.getTime() + expiresInDays * 86_400_000)
  return expiresAt.toISOString()
}

function newUniqueShareId(db: SqliteDatabase): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = randomBase62Slug(SHARE_SLUG_LENGTH)
    const existing = db.prepare('SELECT 1 FROM resume_shares WHERE id = ?').get(id)
    if (!existing) return id
  }
  throw httpError(500, 'Share id could not be generated')
}

function randomBase62Slug(length: number): string {
  let slug = ''
  while (slug.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= 248) continue
      slug += BASE62_ALPHABET[byte % BASE62_ALPHABET.length]
      if (slug.length === length) break
    }
  }
  return slug
}

function shareNotFoundError(): Error & { status: number } {
  return httpError(404, 'Share not found')
}
