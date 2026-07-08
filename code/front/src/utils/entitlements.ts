// Wave 2: freemium monetization.
//
// Pure, testable plan/entitlement logic. The store layers persistence and Vue
// reactivity on top of this; keeping the rules here means usage windows, limits,
// and upgrade math can be unit-tested without a browser.

export type PlanId = 'free' | 'pro'

export interface PlanEntitlements {
  /** Number(Infinity) means unlimited. */
  monthlyExports: number
  dailyAiDrafts: number
  maxActiveResumes: number
  watermark: boolean
}

export interface UsageCounter {
  count: number
  periodKey: string
}

export interface BillingState {
  plan: PlanId
  renewsAt?: string
  exports: UsageCounter
  aiDrafts: UsageCounter
}

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  free: { monthlyExports: 5, dailyAiDrafts: 3, maxActiveResumes: 3, watermark: true },
  pro: {
    monthlyExports: Number.POSITIVE_INFINITY,
    dailyAiDrafts: Number.POSITIVE_INFINITY,
    maxActiveResumes: Number.POSITIVE_INFINITY,
    watermark: false,
  },
}

export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function dayKey(date: Date = new Date()): string {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

export function createBillingState(plan: PlanId = 'free', now: Date = new Date()): BillingState {
  return {
    plan,
    exports: { count: 0, periodKey: monthKey(now) },
    aiDrafts: { count: 0, periodKey: dayKey(now) },
  }
}

/**
 * Reset usage counters when their billing window has rolled over, and coerce any
 * malformed persisted shape back into a valid billing state.
 */
export function normalizeBillingState(value: unknown, now: Date = new Date()): BillingState {
  const base = createBillingState('free', now)
  if (!value || typeof value !== 'object') return base
  const raw = value as Partial<BillingState>
  const plan: PlanId = raw.plan === 'pro' ? 'pro' : 'free'

  const exports = normalizeCounter(raw.exports, monthKey(now))
  const aiDrafts = normalizeCounter(raw.aiDrafts, dayKey(now))

  return {
    plan,
    renewsAt: typeof raw.renewsAt === 'string' ? raw.renewsAt : undefined,
    exports,
    aiDrafts,
  }
}

function normalizeCounter(value: unknown, currentPeriodKey: string): UsageCounter {
  if (!value || typeof value !== 'object') return { count: 0, periodKey: currentPeriodKey }
  const raw = value as Partial<UsageCounter>
  if (raw.periodKey !== currentPeriodKey) return { count: 0, periodKey: currentPeriodKey }
  const count = Number.isFinite(raw.count) && Number(raw.count) > 0 ? Math.floor(Number(raw.count)) : 0
  return { count, periodKey: currentPeriodKey }
}

export function getEntitlements(plan: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.free
}

/** Remaining quota, clamped at 0. Returns Infinity for unlimited plans. */
export function remainingQuota(limit: number, used: number): number {
  if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY
  return Math.max(0, limit - used)
}

export function canConsume(limit: number, used: number): boolean {
  return remainingQuota(limit, used) > 0
}
