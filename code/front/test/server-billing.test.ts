import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canConsumeServerQuota,
  isServerPro,
  serverQuotaRemaining,
  shouldUseServerBilling,
} from '../src/utils/serverBilling'
import type { ServerBillingSummary } from '../src/api/backend'

const freeSummary: ServerBillingSummary = {
  plan: 'free',
  quotas: {
    aiDraft: { limit: 3, used: 1, remaining: 2, resetAt: '2026-07-11T00:00:00.000Z' },
    export: { limit: 5, used: 5, remaining: 0, resetAt: '2026-08-01T00:00:00.000Z' },
  },
}

const proSummary: ServerBillingSummary = {
  plan: 'pro',
  quotas: {
    aiDraft: { limit: null, used: 12, remaining: null },
    export: { limit: null, used: 40, remaining: null },
  },
}

test('serverQuotaRemaining clamps and maps unlimited plans to Infinity', () => {
  assert.equal(serverQuotaRemaining(freeSummary.quotas.aiDraft), 2)
  assert.equal(serverQuotaRemaining(freeSummary.quotas.export), 0)
  assert.equal(serverQuotaRemaining(proSummary.quotas.export), Number.POSITIVE_INFINITY)
  assert.equal(serverQuotaRemaining({ limit: 3, used: 9, remaining: -6 }), 0)
  assert.equal(serverQuotaRemaining(undefined), 0)
})

test('canConsumeServerQuota follows remaining quota', () => {
  assert.equal(canConsumeServerQuota(freeSummary.quotas.aiDraft), true)
  assert.equal(canConsumeServerQuota(freeSummary.quotas.export), false)
  assert.equal(canConsumeServerQuota(proSummary.quotas.aiDraft), true)
  assert.equal(canConsumeServerQuota(undefined), false)
})

test('isServerPro only for pro plan summaries', () => {
  assert.equal(isServerPro(proSummary), true)
  assert.equal(isServerPro(freeSummary), false)
  assert.equal(isServerPro(null), false)
  assert.equal(isServerPro(undefined), false)
})

test('shouldUseServerBilling requires both authentication and a summary', () => {
  assert.equal(shouldUseServerBilling(true, freeSummary), true)
  assert.equal(shouldUseServerBilling(true, null), false)
  assert.equal(shouldUseServerBilling(false, freeSummary), false)
  assert.equal(shouldUseServerBilling(false, null), false)
})
