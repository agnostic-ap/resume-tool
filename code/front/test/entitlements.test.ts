import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canConsume,
  createBillingState,
  dayKey,
  getEntitlements,
  monthKey,
  normalizeBillingState,
  remainingQuota,
} from '../src/utils/entitlements'

test('free and pro plans expose the expected entitlements', () => {
  const free = getEntitlements('free')
  assert.equal(free.monthlyExports, 5)
  assert.equal(free.dailyAiDrafts, 3)
  assert.equal(free.watermark, true)

  const pro = getEntitlements('pro')
  assert.equal(pro.monthlyExports, Number.POSITIVE_INFINITY)
  assert.equal(pro.watermark, false)
})

test('remainingQuota and canConsume respect finite and unlimited limits', () => {
  assert.equal(remainingQuota(5, 2), 3)
  assert.equal(remainingQuota(5, 5), 0)
  assert.equal(remainingQuota(5, 9), 0)
  assert.equal(remainingQuota(Number.POSITIVE_INFINITY, 1000), Number.POSITIVE_INFINITY)

  assert.equal(canConsume(5, 4), true)
  assert.equal(canConsume(5, 5), false)
  assert.equal(canConsume(Number.POSITIVE_INFINITY, 9999), true)
})

test('normalizeBillingState resets usage when the period rolls over', () => {
  const now = new Date(2026, 6, 15)
  const stale = {
    plan: 'free' as const,
    exports: { count: 4, periodKey: '2026-05' },
    aiDrafts: { count: 2, periodKey: '2026-06-14' },
  }
  const normalized = normalizeBillingState(stale, now)
  assert.equal(normalized.exports.count, 0)
  assert.equal(normalized.exports.periodKey, monthKey(now))
  assert.equal(normalized.aiDrafts.count, 0)
  assert.equal(normalized.aiDrafts.periodKey, dayKey(now))
})

test('normalizeBillingState keeps usage within the current period', () => {
  const now = new Date(2026, 6, 15)
  const fresh = {
    plan: 'pro' as const,
    exports: { count: 12, periodKey: monthKey(now) },
    aiDrafts: { count: 7, periodKey: dayKey(now) },
  }
  const normalized = normalizeBillingState(fresh, now)
  assert.equal(normalized.plan, 'pro')
  assert.equal(normalized.exports.count, 12)
  assert.equal(normalized.aiDrafts.count, 7)
})

test('normalizeBillingState coerces malformed input to a clean free state', () => {
  const now = new Date(2026, 0, 1)
  const normalized = normalizeBillingState({ plan: 'enterprise', exports: 'nope' }, now)
  const clean = createBillingState('free', now)
  assert.equal(normalized.plan, 'free')
  assert.deepEqual(normalized.exports, clean.exports)
  assert.deepEqual(normalized.aiDrafts, clean.aiDrafts)
})
