import {
  type AdminUserOperationInput,
  type AnyRecord,
  type AuditLogInput,
  type PublicAuditLog,
  type PublicUser,
  type SqliteDatabase,
  httpError,
  newId,
} from './shared.js'

export type BillingPlan = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'expired'
export type SubscriptionSource = 'manual' | 'stripe'
export type UsageKind = 'ai_draft' | 'export'

export type BillingQuota = {
  limit: number | null
  used: number
  remaining: number | null
  resetAt: string
}

export type BillingSummary = {
  plan: BillingPlan
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  quotas: {
    aiDraft: BillingQuota
    export: BillingQuota
  }
}

export type AdminUserPlanInput = AdminUserOperationInput & {
  plan: BillingPlan
  periodEnd?: string | null
}

type SubscriptionRow = {
  user_id: string
  plan: string
  status: string
  source: string
  current_period_end?: string | null
  created_at: string
  updated_at: string
}

type QuotaDefinition = {
  limit: number
  periodKey: (date: Date) => string
  resetAt: (date: Date) => string
}

const FREE_QUOTAS: Record<UsageKind, QuotaDefinition> = {
  ai_draft: {
    limit: 3,
    periodKey: dayKey,
    resetAt: nextDayIso,
  },
  export: {
    limit: 5,
    periodKey: monthKey,
    resetAt: nextMonthIso,
  },
}

export function createBillingStore(db: SqliteDatabase) {
  return {
    async getBillingSummary(userId: string) {
      return db.transaction(() => billingSummarySync(db, userId, new Date()))()
    },

    async consumeBillingUsage(userId: string, kind: UsageKind) {
      return db.transaction(() => consumeBillingUsageSync(db, userId, kind, new Date()))()
    },

    async setUserPlan(input: AdminUserPlanInput) {
      return db.transaction(() => setUserPlanSync(db, input, new Date()))()
    },
  }
}

export function effectiveBillingPlan(
  plan?: unknown,
  status?: unknown,
  currentPeriodEnd?: unknown,
  now: Date = new Date(),
): BillingPlan {
  if (plan !== 'pro' || status !== 'active') return 'free'
  if (typeof currentPeriodEnd !== 'string' || !currentPeriodEnd) return 'pro'
  const endTime = new Date(currentPeriodEnd).getTime()
  return Number.isFinite(endTime) && endTime > now.getTime() ? 'pro' : 'free'
}

function billingSummarySync(db: SqliteDatabase, userId: string, now: Date): BillingSummary {
  assertUserExistsSync(db, userId)
  const subscription = resolveSubscriptionSync(db, userId, now)
  return {
    plan: subscription.plan,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    quotas: {
      aiDraft: quotaSummarySync(db, userId, 'ai_draft', subscription.plan, now),
      export: quotaSummarySync(db, userId, 'export', subscription.plan, now),
    },
  }
}

function consumeBillingUsageSync(
  db: SqliteDatabase,
  userId: string,
  kind: UsageKind,
  now: Date,
): BillingSummary {
  assertUserExistsSync(db, userId)
  const subscription = resolveSubscriptionSync(db, userId, now)
  if (subscription.plan === 'pro') return billingSummarySync(db, userId, now)

  const quota = FREE_QUOTAS[kind]
  const periodKey = quota.periodKey(now)
  const used = usageCountSync(db, userId, kind, periodKey)
  if (used >= quota.limit) throw quotaExceededError(kind, quota.limit)

  const timestamp = now.toISOString()
  db.prepare(`
    INSERT INTO usage_counters (user_id, kind, period_key, count, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id, kind, period_key)
    DO UPDATE SET count = usage_counters.count + 1, updated_at = excluded.updated_at
  `).run(userId, kind, periodKey, timestamp, timestamp)

  return billingSummarySync(db, userId, now)
}

function setUserPlanSync(
  db: SqliteDatabase,
  input: AdminUserPlanInput,
  now: Date,
): { user: PublicUser; billing: BillingSummary } {
  const user = readUserByIdSync(db, input.userId)
  if (!user) throw httpError(404, 'User not found')

  const periodEnd = normalizePeriodEnd(input.periodEnd)
  const before = resolveSubscriptionSync(db, user.id, now)
  const timestamp = now.toISOString()
  db.prepare(`
    INSERT INTO subscriptions (
      user_id,
      plan,
      status,
      source,
      current_period_end,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id)
    DO UPDATE SET
      plan = excluded.plan,
      status = excluded.status,
      source = excluded.source,
      current_period_end = excluded.current_period_end,
      updated_at = excluded.updated_at
  `).run(
    user.id,
    input.plan,
    'active',
    'manual',
    input.plan === 'pro' ? periodEnd : null,
    timestamp,
    timestamp,
  )

  const billing = billingSummarySync(db, user.id, now)
  recordBillingAuditLogSync(db, {
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    action: 'admin.user.plan.update',
    objectType: 'user',
    objectId: user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      actorEmail: input.actorEmail,
      targetUserId: user.id,
      targetEmail: user.email,
      previousPlan: before.plan,
      previousStatus: before.status,
      requestedPlan: input.plan,
      targetPlan: billing.plan,
      targetStatus: billing.status,
      currentPeriodEnd: billing.currentPeriodEnd,
    },
  })

  return { user, billing }
}

function resolveSubscriptionSync(
  db: SqliteDatabase,
  userId: string,
  now: Date,
): { plan: BillingPlan; status: SubscriptionStatus; currentPeriodEnd: string | null } {
  const row = readSubscriptionRowSync(db, userId)
  if (!row) return { plan: 'free', status: 'active', currentPeriodEnd: null }

  if (row.plan === 'pro' && row.status === 'active' && subscriptionExpired(row.current_period_end, now)) {
    db.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?').run('expired', now.toISOString(), userId)
    return {
      plan: 'free',
      status: 'expired',
      currentPeriodEnd: row.current_period_end ?? null,
    }
  }

  return {
    plan: effectiveBillingPlan(row.plan, row.status, row.current_period_end, now),
    status: normalizeStatus(row.status),
    currentPeriodEnd: row.current_period_end ?? null,
  }
}

function quotaSummarySync(
  db: SqliteDatabase,
  userId: string,
  kind: UsageKind,
  plan: BillingPlan,
  now: Date,
): BillingQuota {
  const quota = FREE_QUOTAS[kind]
  const periodKey = quota.periodKey(now)
  const used = usageCountSync(db, userId, kind, periodKey)
  if (plan === 'pro') {
    return {
      limit: null,
      used,
      remaining: null,
      resetAt: quota.resetAt(now),
    }
  }
  return {
    limit: quota.limit,
    used,
    remaining: Math.max(0, quota.limit - used),
    resetAt: quota.resetAt(now),
  }
}

function usageCountSync(db: SqliteDatabase, userId: string, kind: UsageKind, periodKey: string): number {
  const row = db.prepare(`
    SELECT count
    FROM usage_counters
    WHERE user_id = ? AND kind = ? AND period_key = ?
  `).get(userId, kind, periodKey) as { count?: number } | undefined
  return Math.max(0, Math.floor(Number(row?.count ?? 0)))
}

function quotaExceededError(kind: UsageKind, limit: number): Error & { status: number } {
  if (kind === 'ai_draft') {
    return httpError(402, `AI resume draft quota exceeded. Free plan includes ${limit} AI drafts per day; upgrade to Pro for unlimited AI drafts.`)
  }
  return httpError(402, `Export quota exceeded. Free plan includes ${limit} exports per month; upgrade to Pro for unlimited exports.`)
}

function readSubscriptionRowSync(db: SqliteDatabase, userId: string): SubscriptionRow | undefined {
  return db.prepare(`
    SELECT user_id, plan, status, source, current_period_end, created_at, updated_at
    FROM subscriptions
    WHERE user_id = ?
  `).get(userId) as SubscriptionRow | undefined
}

function assertUserExistsSync(db: SqliteDatabase, userId: string): void {
  if (!readUserByIdSync(db, userId)) throw httpError(404, 'User not found')
}

function readUserByIdSync(db: SqliteDatabase, userId: string): PublicUser | undefined {
  const row = db.prepare(`
    SELECT id, email, display_name, role, status, last_seen_at, created_at, updated_at
    FROM users
    WHERE id = ?
  `).get(userId) as AnyRecord | undefined
  return row ? {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    lastSeenAt: row.last_seen_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } : undefined
}

function normalizePeriodEnd(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (!Number.isFinite(parsed.getTime())) throw httpError(400, 'periodEnd must be a valid date/time')
  return parsed.toISOString()
}

function normalizeStatus(value: string): SubscriptionStatus {
  if (value === 'canceled' || value === 'expired') return value
  return 'active'
}

function subscriptionExpired(currentPeriodEnd: string | null | undefined, now: Date): boolean {
  if (!currentPeriodEnd) return false
  const endTime = new Date(currentPeriodEnd).getTime()
  return Number.isFinite(endTime) && endTime <= now.getTime()
}

function recordBillingAuditLogSync(db: SqliteDatabase, input: AuditLogInput): PublicAuditLog {
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
  const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as AnyRecord | undefined
  if (!row) throw httpError(500, 'Audit log could not be created')
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    actorUserId: row.actor_user_id ?? undefined,
    actorEmail: input.actorEmail,
    actorRole: row.actor_role,
    action: row.action,
    objectType: row.object_type,
    objectId: row.object_id,
    result: row.result,
    ipAddress: row.ip_address ?? undefined,
    userAgent: row.user_agent ?? undefined,
    targetUserId: input.metadata?.targetUserId,
    targetEmail: input.metadata?.targetEmail,
    metadata: JSON.parse(row.metadata),
    createdAt: row.created_at,
  }
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dayKey(date: Date): string {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

function nextDayIso(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString()
}

function nextMonthIso(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
}
