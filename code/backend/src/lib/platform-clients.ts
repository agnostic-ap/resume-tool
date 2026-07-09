import { summarizePlatformBilling } from '../platform-billing.js'
import { httpError } from '../store.js'

export type PlatformClient = {
  id: string
  key?: string
  keyHash?: string
  scopes: string[]
  quotaPerDay?: number
  rateLimitPerMinute?: number
  pricePerDraft?: number
  currency?: string
}

export type AuthenticatedPlatformClient = Partial<PlatformClient> & {
  id?: string
  scopes?: string[]
}

export type PlatformRequestLog = {
  clientId?: string
  createdAt?: string
  generatedAt?: string
  status?: string
}

export type AdminRole = 'super_admin' | 'ops_admin' | 'viewer'

export type AdminUser = {
  email: string
  token?: string
  tokenHash?: string
  role: AdminRole
  status: 'enabled' | 'locked'
}

export function adminUsers(): AdminUser[] {
  const rawUsers = process.env.RESUME_ADMIN_USERS?.trim()
  if (rawUsers) {
    try {
      const parsed = JSON.parse(rawUsers)
      if (!Array.isArray(parsed)) throw new Error('Expected an array')
      return parsed
        .map((user) => ({
          email: String(user.email ?? '').trim(),
          token: user.token ? String(user.token).trim() : undefined,
          tokenHash: user.tokenHash ? String(user.tokenHash).trim() : undefined,
          role: adminRole(user.role),
          status: user.status === 'locked' ? 'locked' as const : 'enabled' as const,
        }))
        .filter((user) => user.email && (user.token || user.tokenHash))
    } catch {
      throw httpError(500, 'Invalid RESUME_ADMIN_USERS configuration')
    }
  }

  const legacyToken = process.env.RESUME_ADMIN_TOKEN?.trim()
  if (!legacyToken) return []
  return [{
    email: 'owner@example.com',
    token: legacyToken,
    role: 'super_admin',
    status: 'enabled',
  }]
}

export function platformClients(): PlatformClient[] {
  const rawClients = process.env.RESUME_PLATFORM_CLIENTS?.trim()
  if (rawClients) {
    try {
      const parsed = JSON.parse(rawClients)
      if (!Array.isArray(parsed)) throw new Error('Expected an array')
      return parsed
        .map((client) => ({
          id: String(client.id ?? '').trim(),
          key: client.key ? String(client.key).trim() : undefined,
          keyHash: client.keyHash ? String(client.keyHash).trim() : undefined,
          scopes: Array.isArray(client.scopes) ? client.scopes.map(String) : ['drafts:write'],
          quotaPerDay: client.quotaPerDay ? Number(client.quotaPerDay) : undefined,
          rateLimitPerMinute: client.rateLimitPerMinute ? Number(client.rateLimitPerMinute) : undefined,
          pricePerDraft: client.pricePerDraft != null ? Number(client.pricePerDraft) : undefined,
          currency: client.currency ? String(client.currency) : undefined,
        }))
        .filter((client) => client.id && (client.key || client.keyHash))
    } catch {
      throw httpError(500, 'Invalid RESUME_PLATFORM_CLIENTS configuration')
    }
  }

  const legacyKey = process.env.RESUME_PLATFORM_API_KEY?.trim()
  if (!legacyKey) return []
  return [{
    id: 'default',
    key: legacyKey,
    scopes: ['drafts:write', 'requests:read', 'requests:all'],
  }]
}

export function buildPlatformBilling(
  requests: PlatformRequestLog[],
  options: { clientId?: string; includeAll?: boolean },
) {
  const clients = platformBillingClients()
  if (!clients.length) {
    const devRequests = requests.map((entry) => ({ ...entry, clientId: entry.clientId ?? 'development-open-access' }))
    return summarizePlatformBilling([{ id: 'development-open-access', pricePerDraft: 0, currency: 'USD' }], devRequests)
  }
  const scoped = options.clientId && !options.includeAll
    ? clients.filter((client) => client.id === options.clientId)
    : clients
  return summarizePlatformBilling(scoped, requests)
}

export function platformClientSummaries(requests: PlatformRequestLog[]) {
  const clients = platformClients()
  if (!clients.length) {
    return [{
      id: 'development-open-access',
      scopes: ['drafts:write', 'requests:read', 'requests:all'],
      quotaPerDay: null,
      rateLimitPerMinute: null,
      hasKey: false,
      requestCount: requests.length,
      failedRequestCount: requests.filter((entry) => entry.status === 'failed').length,
      lastRequestAt: latestRequestAt(requests),
    }]
  }
  return clients.map((client) => {
    const clientRequests = requests.filter((entry) => entry.clientId === client.id)
    return {
      id: client.id,
      scopes: client.scopes,
      quotaPerDay: client.quotaPerDay ?? null,
      rateLimitPerMinute: client.rateLimitPerMinute ?? null,
      hasKey: Boolean(client.key || client.keyHash),
      requestCount: clientRequests.length,
      failedRequestCount: clientRequests.filter((entry) => entry.status === 'failed').length,
      lastRequestAt: latestRequestAt(clientRequests),
    }
  })
}

function adminRole(value: unknown): AdminRole {
  return ['super_admin', 'ops_admin', 'viewer'].includes(String(value)) ? String(value) as AdminRole : 'viewer'
}

function platformBillingClients() {
  return platformClients().map((client) => ({
    id: client.id,
    scopes: client.scopes,
    quotaPerDay: client.quotaPerDay,
    rateLimitPerMinute: client.rateLimitPerMinute,
    pricePerDraft: client.pricePerDraft,
    currency: client.currency,
  }))
}

function latestRequestAt(requests: PlatformRequestLog[]) {
  return requests
    .map((entry) => entry.createdAt ?? entry.generatedAt ?? '')
    .filter(Boolean)
    .sort()
    .at(-1) ?? null
}
