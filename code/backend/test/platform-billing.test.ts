import test from 'node:test'
import assert from 'node:assert/strict'
import { computePlatformUsage, summarizePlatformBilling } from '../src/platform-billing.js'

const now = new Date('2026-06-29T12:00:00.000Z').getTime()

function req(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'futurehire',
    status: 'draft',
    persisted: false,
    latencyMs: 100,
    createdAt: new Date(now).toISOString(),
    ...overrides,
  }
}

test('computePlatformUsage meters billable requests, failures, and cost', () => {
  const client = { id: 'futurehire', quotaPerDay: 10, pricePerDraft: 0.5, currency: 'USD' }
  const requests = [
    req({ status: 'persisted', persisted: true, latencyMs: 120 }),
    req({ status: 'draft', latencyMs: 80 }),
    req({ status: 'failed', latencyMs: 40 }),
    req({ clientId: 'other', status: 'draft' }),
  ]

  const usage = computePlatformUsage(client, requests, now)
  assert.equal(usage.totalRequests, 3)
  assert.equal(usage.failedRequests, 1)
  assert.equal(usage.persistedRequests, 1)
  assert.equal(usage.billableRequests, 2)
  assert.equal(usage.estimatedCost, 1) // 2 billable * 0.5
  assert.equal(usage.quotaPerDay, 10)
  assert.equal(usage.quotaUtilization, 0.3) // 3 today / 10
  assert.ok(usage.avgLatencyMs > 0)
  assert.equal(usage.currency, 'USD')
})

test('quota utilization only counts requests within the last 24h', () => {
  const client = { id: 'futurehire', quotaPerDay: 4 }
  const requests = [
    req({ createdAt: new Date(now).toISOString() }),
    req({ createdAt: new Date(now - 2 * 86_400_000).toISOString() }),
  ]
  const usage = computePlatformUsage(client, requests, now)
  assert.equal(usage.totalRequests, 2)
  assert.equal(usage.todayRequests, 1)
  assert.equal(usage.quotaUtilization, 0.25)
})

test('summarizePlatformBilling aggregates totals across clients', () => {
  const clients = [
    { id: 'futurehire', pricePerDraft: 1, currency: 'USD' },
    { id: 'ops', pricePerDraft: 2, currency: 'USD' },
  ]
  const requests = [
    req({ clientId: 'futurehire' }),
    req({ clientId: 'futurehire', status: 'failed' }),
    req({ clientId: 'ops' }),
  ]
  const summary = summarizePlatformBilling(clients, requests, now)
  assert.equal(summary.totals.clients, 2)
  assert.equal(summary.totals.billableRequests, 2)
  assert.equal(summary.totals.failedRequests, 1)
  assert.equal(summary.totals.estimatedCost, 3) // futurehire 1*1 + ops 1*2
})
