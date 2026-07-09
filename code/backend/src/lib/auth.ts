import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { type FastifyReply } from 'fastify'
import { httpError } from '../store.js'
import { headerValue } from './http.js'
import {
  adminUsers,
  platformClients,
  type AdminRole,
  type AdminUser,
  type AuthenticatedPlatformClient,
  type PlatformRequestLog,
} from './platform-clients.js'

export type Store = ReturnType<typeof import('../store.js').createStore>

export type AuthContext = {
  headers: Record<string, unknown>
  ip: string
  failures: Map<string, number[]>
}

export type AuthRequest = {
  headers: Record<string, unknown>
  ip?: string
}

export type AuthContextFactory = (request: AuthRequest) => AuthContext

export type StoreContext = {
  userId?: string
  workspaceId?: string
}

export type UserSession = {
  user: {
    id: string
    email: string
    displayName: string
    role: string
    status: string
    lastSeenAt?: string
    createdAt: string
    updatedAt: string
  }
  workspace: {
    id: string
    name: string
    plan: string
    role: string
    ownerUserId: string
    activeResumeId?: string
    createdAt: string
    updatedAt: string
  }
}

export type IssuedSession = UserSession & {
  token: string
  expiresAt: string
}

export type AdminSession = Omit<AdminUser, 'token' | 'tokenHash'> & {
  scopes: string[]
}

const AUTH_FAILURE_LIMIT = 10
const AUTH_FAILURE_WINDOW_MS = 60_000
const SESSION_COOKIE = 'resume_session'
const DEFAULT_SESSION_TTL_DAYS = 30
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1

export function authMode(): 'local' | 'multi-user' {
  return process.env.RESUME_AUTH_MODE === 'multi-user' ? 'multi-user' : 'local'
}

export function registrationAllowed(): boolean {
  return process.env.RESUME_AUTH_ALLOW_REGISTRATION?.trim().toLowerCase() !== 'false'
}

export function authSessionRequired(method: string, url: string): boolean {
  if (authMode() !== 'multi-user') return false
  if (method.toUpperCase() === 'OPTIONS') return false

  const path = url.split('?')[0] || '/'
  if (!path.startsWith('/api/')) return false
  if (path.startsWith('/api/auth/')) return false
  if (path.startsWith('/api/public/shares/')) return false
  if (path.startsWith('/api/admin/')) return false
  if (path === '/api/v1/openapi.json' || path.startsWith('/api/v1/')) return false
  return true
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const hash = scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('base64url')
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`
}

export function verifyPassword(password: string, encodedHash: string): boolean {
  const parts = encodedHash.split('$')
  const [algorithm] = parts
  if (algorithm !== 'scrypt') return false

  const legacyHash = parts.length === 3
  const salt = legacyHash ? parts[1] : parts[4]
  const expectedHash = legacyHash ? parts[2] : parts[5]
  const options = legacyHash
    ? undefined
    : {
      N: Number(parts[1]),
      r: Number(parts[2]),
      p: Number(parts[3]),
    }
  if (!salt || !expectedHash) return false
  if (options && (!Number.isFinite(options.N) || !Number.isFinite(options.r) || !Number.isFinite(options.p))) return false

  const actual = options ? scryptSync(password, salt, 64, options) : scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHash, 'base64url')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function issueUserSession(store: Store, userId: string): Promise<IssuedSession> {
  const token = newSessionToken()
  const expiresAt = new Date(Date.now() + sessionTtlMs()).toISOString()
  await store.createSession({
    userId,
    tokenHash: sessionTokenHash(token),
    expiresAt,
  })
  const session = await store.getSessionByTokenHash(sessionTokenHash(token)) as UserSession | undefined
  if (!session) throw httpError(500, 'Session could not be created')
  return { ...session, token, expiresAt }
}

export function authResponse(session: IssuedSession) {
  return {
    user: session.user,
    workspace: session.workspace,
    token: session.token,
    expiresAt: session.expiresAt,
  }
}

export function adminUserOperationInput(
  admin: AdminSession,
  request: AuthRequest,
  userId: string,
) {
  return {
    userId,
    actorEmail: admin.email,
    actorRole: admin.role,
    ipAddress: request.ip,
    userAgent: headerValue(request.headers['user-agent']),
  }
}

export async function storeContextForRequest(
  store: Store,
  request: { headers: Record<string, unknown> },
): Promise<StoreContext> {
  const session = await optionalUserSession(store, request)
  if (session) return { userId: session.user.id, workspaceId: session.workspace.id }
  if (authMode() === 'multi-user') throw httpError(401, 'Account session is required')
  return {}
}

export async function requireUserSession(store: Store, request: { headers: Record<string, unknown> }): Promise<UserSession> {
  const session = await optionalUserSession(store, request)
  if (!session) throw httpError(401, 'Account session is required')
  return session
}

export async function currentUserSession(store: Store, request: { headers: Record<string, unknown> }): Promise<UserSession> {
  const session = await optionalUserSession(store, request)
  if (session) return session
  if (authMode() === 'multi-user') throw httpError(401, 'Account session is required')
  return store.getLocalAuthContext() as Promise<UserSession>
}

export function sessionToken(headers: Record<string, unknown>): string | undefined {
  const authorization = headerValue(headers.authorization)
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const explicit = headerValue(headers['x-resume-session'])?.trim()
  const cookieToken = parseCookieHeader(headerValue(headers.cookie))[SESSION_COOKIE]
  return bearer || explicit || cookieToken
}

export function sessionTokenHash(token: string): string {
  return sha256Hex(token)
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: string): void {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  reply.header('set-cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`)
}

export function clearSessionCookie(reply: FastifyReply): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  reply.header('set-cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
}

export function assertAuthAttemptAllowed(context: AuthContext) {
  const windowStart = Date.now() - AUTH_FAILURE_WINDOW_MS
  const bucket = (context.failures.get(context.ip) ?? []).filter((time) => time >= windowStart)
  context.failures.set(context.ip, bucket)
  if (bucket.length >= AUTH_FAILURE_LIMIT) {
    throw httpError(429, 'Too many failed authentication attempts, retry later')
  }
}

export function recordAuthFailure(context: AuthContext) {
  const bucket = context.failures.get(context.ip) ?? []
  bucket.push(Date.now())
  context.failures.set(context.ip, bucket)
}

export function assertPlatformAccess(context: AuthContext, scope: string): AuthenticatedPlatformClient {
  const clients = platformClients()
  if (!clients.length) return { scopes: ['drafts:write', 'requests:read', 'requests:all'] }

  assertAuthAttemptAllowed(context)
  const headers = context.headers
  const apiKey = headerValue(headers['x-resume-api-key'])
  const authorization = headerValue(headers.authorization)
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const presented = apiKey || bearer

  const client = presented
    ? clients.find((item) => secretMatches(presented, item.key, item.keyHash))
    : undefined
  if (!client) {
    recordAuthFailure(context)
    throw httpError(401, 'Platform API key is required')
  }
  if (!client.scopes.includes(scope)) throw httpError(403, `Platform API key is missing scope: ${scope}`)
  return client
}

export function assertAdminAccess(context: AuthContext, minimumRole: AdminRole): AdminSession {
  const users = adminUsers()
  assertAuthAttemptAllowed(context)
  const headers = context.headers
  const authorization = headerValue(headers.authorization)
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const presented = headerValue(headers['x-admin-token']) || bearer
  const user = presented
    ? users.find((item) => secretMatches(presented, item.token, item.tokenHash))
    : undefined
  if (!user) {
    recordAuthFailure(context)
    throw httpError(401, 'Admin token is required')
  }
  if (user.status !== 'enabled') throw httpError(403, 'Admin account is locked')
  if (!adminRoleAllows(user.role, minimumRole)) throw httpError(403, `Admin role is missing permission: ${minimumRole}`)
  return {
    email: user.email,
    role: user.role,
    status: user.status,
    scopes: adminScopes(user.role),
  }
}

export async function assertPlatformUsage(
  store: Store,
  client: AuthenticatedPlatformClient,
  rateBuckets?: Map<string, number[]>,
) {
  if (!client.id) return
  const now = Date.now()
  if (client.rateLimitPerMinute && rateBuckets) {
    const windowStart = now - 60_000
    const bucket = (rateBuckets.get(client.id) ?? []).filter((time) => time >= windowStart)
    if (bucket.length >= client.rateLimitPerMinute) throw httpError(429, 'Platform API rate limit exceeded')
    bucket.push(now)
    rateBuckets.set(client.id, bucket)
  }
  if (client.quotaPerDay) {
    const dayStart = now - 86_400_000
    const requests = await store.listPlatformRequests() as PlatformRequestLog[]
    const used = requests.filter((entry) => {
      const createdAt = new Date(entry.createdAt ?? entry.generatedAt ?? 0).getTime()
      return entry.clientId === client.id && createdAt >= dayStart
    }).length
    if (used >= client.quotaPerDay) throw httpError(429, 'Platform API daily quota exceeded')
  }
}

function sessionTtlMs(): number {
  const configured = Number(process.env.RESUME_SESSION_TTL_DAYS ?? DEFAULT_SESSION_TTL_DAYS)
  const days = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_SESSION_TTL_DAYS
  return days * 24 * 60 * 60 * 1000
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

function sha256Hex(value: string): string {
  return sha256(value).toString('hex')
}

function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

async function optionalUserSession(store: Store, request: { headers: Record<string, unknown> }): Promise<UserSession | undefined> {
  const token = sessionToken(request.headers)
  if (!token) return undefined
  const session = await store.getSessionByTokenHash(sessionTokenHash(token)) as UserSession | undefined
  if (!session) throw httpError(401, 'Invalid or expired account session')
  return session
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(cookieHeader.split(';').map((part) => {
    const [rawKey, ...rawValue] = part.trim().split('=')
    return [rawKey, decodeURIComponent(rawValue.join('='))]
  }).filter(([key]) => Boolean(key)))
}

function secretMatches(presented: string, secret?: string, secretHash?: string): boolean {
  if (secretHash) {
    const expected = Buffer.from(secretHash.trim().toLowerCase(), 'hex')
    const actual = sha256(presented)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }
  if (!secret) return false
  return timingSafeEqual(sha256(presented), sha256(secret))
}

function adminRoleAllows(actual: AdminRole, minimum: AdminRole) {
  const rank: Record<AdminRole, number> = {
    viewer: 1,
    ops_admin: 2,
    super_admin: 3,
  }
  return rank[actual] >= rank[minimum]
}

function adminScopes(role: AdminRole) {
  if (role === 'super_admin') {
    return ['state:read', 'users:read', 'users:write', 'sessions:revoke', 'platform_clients:read', 'dangerous_actions:confirm']
  }
  if (role === 'ops_admin') return ['state:read', 'users:read']
  return ['state:read', 'users:read']
}
