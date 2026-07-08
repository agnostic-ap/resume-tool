// Wave 4: B2B platform productization.
//
// The platform API already has per-client keys, scopes, quota, and rate limits. This
// module turns the raw request log into a metered usage + billing view per client so
// operators (and the client itself) can answer "how much did this client use, and what
// do they owe?". Pure functions keep the metering testable.

export interface PlatformUsageRequest {
  clientId?: string
  status?: string
  persisted?: boolean
  latencyMs?: number
  createdAt?: string
  generatedAt?: string
}

export interface PlatformBillingClient {
  id: string
  scopes?: string[]
  quotaPerDay?: number
  rateLimitPerMinute?: number
  pricePerDraft?: number
  currency?: string
}

export interface PlatformClientUsage {
  clientId: string
  currency: string
  pricePerDraft: number
  totalRequests: number
  billableRequests: number
  persistedRequests: number
  failedRequests: number
  todayRequests: number
  quotaPerDay: number | null
  quotaUtilization: number | null
  avgLatencyMs: number
  p95LatencyMs: number
  estimatedCost: number
  lastRequestAt: string | null
}

export interface PlatformBillingSummary {
  generatedAt: string
  currency: string
  totals: {
    clients: number
    billableRequests: number
    failedRequests: number
    estimatedCost: number
  }
  clients: PlatformClientUsage[]
}

const DAY_MS = 86_400_000

function requestTime(request: PlatformUsageRequest): number {
  return new Date(request.createdAt ?? request.generatedAt ?? 0).getTime()
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function percentile(sortedValues: number[], p: number): number {
  if (!sortedValues.length) return 0
  const index = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1)
  return sortedValues[Math.max(0, index)]
}

export function computePlatformUsage(
  client: PlatformBillingClient,
  requests: PlatformUsageRequest[],
  now: number = Date.now(),
): PlatformClientUsage {
  const pricePerDraft = Number.isFinite(client.pricePerDraft) ? Number(client.pricePerDraft) : 0
  const currency = client.currency || 'USD'
  const clientRequests = requests.filter((request) => request.clientId === client.id)

  const failedRequests = clientRequests.filter((request) => request.status === 'failed').length
  const persistedRequests = clientRequests.filter((request) => request.persisted).length
  const billableRequests = clientRequests.length - failedRequests
  const dayStart = now - DAY_MS
  const todayRequests = clientRequests.filter((request) => requestTime(request) >= dayStart).length

  const latencies = clientRequests
    .map((request) => Number(request.latencyMs ?? 0))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b)
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
    : 0

  const lastRequestAt = clientRequests
    .map((request) => request.createdAt ?? request.generatedAt ?? '')
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  return {
    clientId: client.id,
    currency,
    pricePerDraft,
    totalRequests: clientRequests.length,
    billableRequests,
    persistedRequests,
    failedRequests,
    todayRequests,
    quotaPerDay: client.quotaPerDay ?? null,
    quotaUtilization: client.quotaPerDay ? round2(todayRequests / client.quotaPerDay) : null,
    avgLatencyMs,
    p95LatencyMs: percentile(latencies, 95),
    estimatedCost: round2(billableRequests * pricePerDraft),
    lastRequestAt,
  }
}

export function summarizePlatformBilling(
  clients: PlatformBillingClient[],
  requests: PlatformUsageRequest[],
  now: number = Date.now(),
): PlatformBillingSummary {
  const perClient = clients.map((client) => computePlatformUsage(client, requests, now))
  const currency = perClient[0]?.currency || 'USD'
  return {
    generatedAt: new Date(now).toISOString(),
    currency,
    totals: {
      clients: perClient.length,
      billableRequests: perClient.reduce((sum, client) => sum + client.billableRequests, 0),
      failedRequests: perClient.reduce((sum, client) => sum + client.failedRequests, 0),
      estimatedCost: round2(perClient.reduce((sum, client) => sum + client.estimatedCost, 0)),
    },
    clients: perClient,
  }
}
