import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import cors from '@fastify/cors'
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify'
import { ZodError, type ZodSchema } from 'zod'
import {
  assistantSuggestionSchema,
  createApplicationSchema,
  createResumeSchema,
  growthEntrySchema,
  loginAccountSchema,
  platformGenerateResumeSchema,
  registerAccountSchema,
  updateApplicationSchema,
  updateGrowthEntrySchema,
  updateResumeSchema,
} from './schemas.js'
import { generateResumeDraft } from './llm.js'
import { summarizePlatformBilling } from './platform-billing.js'
import { httpError } from './store.js'

type Store = ReturnType<typeof import('./store.js').createStore>
type PlatformClient = {
  id: string
  key?: string
  keyHash?: string
  scopes: string[]
  quotaPerDay?: number
  rateLimitPerMinute?: number
  pricePerDraft?: number
  currency?: string
}
type AuthenticatedPlatformClient = Partial<PlatformClient> & {
  id?: string
  scopes?: string[]
}
type PlatformRequestLog = {
  clientId?: string
  createdAt?: string
  generatedAt?: string
  status?: string
}
type AdminRole = 'super_admin' | 'ops_admin' | 'viewer'
type AdminUser = {
  email: string
  token?: string
  tokenHash?: string
  role: AdminRole
  status: 'enabled' | 'locked'
}
type AdminSession = Omit<AdminUser, 'token' | 'tokenHash'> & {
  scopes: string[]
}
type AuthContext = {
  headers: Record<string, unknown>
  ip: string
  failures: Map<string, number[]>
}
type StoreContext = {
  userId?: string
  workspaceId?: string
}
type UserSession = {
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
type IssuedSession = UserSession & {
  token: string
  expiresAt: string
}

export async function buildApp(store: Store): Promise<FastifyInstance> {
  const platformRateBuckets = new Map<string, number[]>()
  const authFailureBuckets = new Map<string, number[]>()
  const authContext = (request: { headers: Record<string, unknown>; ip?: string }): AuthContext => ({
    headers: request.headers,
    ip: request.ip || 'unknown',
    failures: authFailureBuckets,
  })
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  })

  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    app.log.warn('CORS_ORIGIN is not set; cross-origin browser requests are disabled in production')
  }

  await app.register(cors, {
    origin: allowedOrigins(),
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation failed',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const handledError = error as Error & { status?: number; statusCode?: number }
    const status = Number(handledError.status ?? handledError.statusCode ?? 500)
    return reply.status(status).send({
      error: status >= 500 ? 'Internal server error' : handledError.message,
    })
  })

  app.addHook('preHandler', async (request) => {
    if (!authSessionRequired(request.method, request.url)) return
    await requireUserSession(store, request)
  })

  app.get('/health', async () => ({
    ok: true,
    service: 'resume-tool-backend-api',
    stack: 'fastify',
    dbPath: store.dbPath,
  }))

  app.get('/api/v1/openapi.json', async () => platformOpenApiDocument())

  app.post('/api/auth/register', async (request, reply) => {
    if (!registrationAllowed()) throw httpError(403, 'Registration is disabled')
    const input = parseBody(registerAccountSchema, request.body)
    assertAuthAttemptAllowed(authContext(request))
    const account = await store.createUserWorkspace({
      email: input.email,
      displayName: input.displayName,
      passwordHash: hashPassword(input.password),
    }) as UserSession
    const issued = await issueUserSession(store, account.user.id)
    setSessionCookie(reply, issued.token, issued.expiresAt)
    return reply.status(201).send(authResponse(issued))
  })

  app.post('/api/auth/login', async (request, reply) => {
    const input = parseBody(loginAccountSchema, request.body)
    const context = authContext(request)
    assertAuthAttemptAllowed(context)
    const user = await store.findUserByEmail(input.email) as ({ id: string; passwordHash?: string; status?: string } | undefined)
    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      recordAuthFailure(context)
      throw httpError(401, 'Invalid email or password')
    }
    if (user.status !== 'enabled') throw httpError(403, 'Account is locked')
    const issued = await issueUserSession(store, user.id)
    setSessionCookie(reply, issued.token, issued.expiresAt)
    return authResponse(issued)
  })

  app.get('/api/auth/session', async (request) => requireUserSession(store, request))

  app.get('/api/auth/me', async (request) => currentUserSession(store, request))

  app.post('/api/auth/logout', async (request, reply) => {
    const token = sessionToken(request.headers)
    if (token) await store.revokeSession(sessionTokenHash(token))
    clearSessionCookie(reply)
    return { ok: true }
  })

  app.get('/api/state', async (request) => store.readState(await storeContextForRequest(store, request)))
  app.get('/api/admin/session', async (request) => assertAdminAccess(authContext(request), 'viewer'))
  app.get('/api/admin/state', async (request) => {
    assertAdminAccess(authContext(request), 'viewer')
    return store.readState()
  })
  app.get('/api/admin/users', async (request) => {
    assertAdminAccess(authContext(request), 'viewer')
    return store.listAdminUsers()
  })
  app.post('/api/admin/users/:id/lock', async (request) => {
    const admin = assertAdminAccess(authContext(request), 'super_admin')
    return store.lockUser(adminUserOperationInput(admin, request, getParam(request.params, 'id')))
  })
  app.post('/api/admin/users/:id/unlock', async (request) => {
    const admin = assertAdminAccess(authContext(request), 'super_admin')
    return store.unlockUser(adminUserOperationInput(admin, request, getParam(request.params, 'id')))
  })
  app.delete('/api/admin/users/:id/sessions', async (request) => {
    const admin = assertAdminAccess(authContext(request), 'super_admin')
    return store.revokeUserSessions(adminUserOperationInput(admin, request, getParam(request.params, 'id')))
  })

  app.get('/api/resumes', async (request) => store.listDocuments(await storeContextForRequest(store, request)))
  app.post('/api/resumes', async (request, reply) => {
    const context = await storeContextForRequest(store, request)
    const doc = await store.createDocument(parseBody(createResumeSchema, request.body), context)
    return reply.status(201).send(doc)
  })
  app.get('/api/resumes/:id', async (request) =>
    store.getDocument(getParam(request.params, 'id'), await storeContextForRequest(store, request)),
  )
  app.patch('/api/resumes/:id', async (request) => {
    const context = await storeContextForRequest(store, request)
    return store.updateDocument(getParam(request.params, 'id'), parseBody(updateResumeSchema, request.body), context)
  })
  app.put('/api/resumes/:id', async (request) => {
    const context = await storeContextForRequest(store, request)
    return store.updateDocument(getParam(request.params, 'id'), parseBody(updateResumeSchema, request.body), context)
  })
  app.delete('/api/resumes/:id', async (request) =>
    store.deleteDocument(getParam(request.params, 'id'), await storeContextForRequest(store, request)),
  )
  app.post('/api/resumes/:id/select', async (request) =>
    store.selectDocument(getParam(request.params, 'id'), await storeContextForRequest(store, request)),
  )
  app.post('/api/resumes/:id/duplicate', async (request, reply) => {
    const context = await storeContextForRequest(store, request)
    const doc = await store.createDocument({
      ...parseBody(createResumeSchema, request.body),
      sourceId: getParam(request.params, 'id'),
      blank: false,
    }, context)
    return reply.status(201).send(doc)
  })
  app.post('/api/resumes/:id/career-update', async (request) =>
    store.markCareerUpdated(getParam(request.params, 'id'), await storeContextForRequest(store, request)),
  )

  app.get('/api/applications', async (request) => store.listApplications(await storeContextForRequest(store, request)))
  app.post('/api/applications', async (request, reply) => {
    const context = await storeContextForRequest(store, request)
    const appRecord = await store.createApplication(parseBody(createApplicationSchema, request.body), context)
    return reply.status(201).send(appRecord)
  })
  app.patch('/api/applications/:id', async (request) => {
    const context = await storeContextForRequest(store, request)
    return store.updateApplication(getParam(request.params, 'id'), parseBody(updateApplicationSchema, request.body), context)
  })
  app.put('/api/applications/:id', async (request) => {
    const context = await storeContextForRequest(store, request)
    return store.updateApplication(getParam(request.params, 'id'), parseBody(updateApplicationSchema, request.body), context)
  })
  app.delete('/api/applications/:id', async (request) =>
    store.deleteApplication(getParam(request.params, 'id'), await storeContextForRequest(store, request)),
  )

  app.get('/api/growth-entries', async (request) => store.listGrowthEntries(await storeContextForRequest(store, request)))
  app.post('/api/growth-entries', async (request, reply) => {
    const context = await storeContextForRequest(store, request)
    const entry = await store.createGrowthEntry(parseBody(growthEntrySchema, request.body), context)
    return reply.status(201).send(entry)
  })
  app.patch('/api/growth-entries/:id', async (request) => {
    const context = await storeContextForRequest(store, request)
    return store.updateGrowthEntry(getParam(request.params, 'id'), parseBody(updateGrowthEntrySchema, request.body), context)
  })
  app.put('/api/growth-entries/:id', async (request) => {
    const context = await storeContextForRequest(store, request)
    return store.updateGrowthEntry(getParam(request.params, 'id'), parseBody(updateGrowthEntrySchema, request.body), context)
  })

  app.get('/api/activity', async (request) => store.listActivity(await storeContextForRequest(store, request)))
  app.post('/api/assistant/suggestions', async (request, reply) => {
    const context = await storeContextForRequest(store, request)
    const suggestion = await store.createAssistantSuggestion(parseBody(assistantSuggestionSchema, request.body), context)
    return reply.status(201).send(suggestion)
  })
  app.post('/api/assistant/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'assistant',
      allowPersist: false,
      requirePlatformAuth: false,
      auth: authContext(request),
      context: await storeContextForRequest(store, request),
    }),
  )
  app.get('/api/v1/platform/requests', async (request) => {
    const client = assertPlatformAccess(authContext(request), 'requests:read')
    const requests = await store.listPlatformRequests() as PlatformRequestLog[]
    if (!client.id || client.scopes?.includes('requests:all')) return requests
    return requests.filter((entry: { clientId?: string }) => entry.clientId === client.id)
  })
  app.get('/api/admin/platform-clients', async (request) => {
    assertAdminAccess(authContext(request), 'super_admin')
    const requests = await store.listPlatformRequests() as PlatformRequestLog[]
    return platformClientSummaries(requests)
  })
  app.get('/api/admin/platform-usage', async (request) => {
    assertAdminAccess(authContext(request), 'super_admin')
    const requests = await store.listPlatformRequests() as PlatformRequestLog[]
    return buildPlatformBilling(requests, { includeAll: true })
  })
  app.get('/api/v1/platform/usage', async (request) => {
    const client = assertPlatformAccess(authContext(request), 'requests:read')
    const requests = await store.listPlatformRequests() as PlatformRequestLog[]
    return buildPlatformBilling(requests, {
      clientId: client.id,
      includeAll: Boolean(client.scopes?.includes('requests:all')),
    })
  })
  app.post('/api/v1/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'api-v1',
      allowPersist: true,
      requirePlatformAuth: true,
      auth: authContext(request),
      rateBuckets: platformRateBuckets,
    }),
  )
  app.post('/api/v1/platform/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'api-v1-platform',
      allowPersist: true,
      requirePlatformAuth: true,
      auth: authContext(request),
      rateBuckets: platformRateBuckets,
    }),
  )
  app.post('/api/platform/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'legacy-platform',
      allowPersist: true,
      requirePlatformAuth: true,
      auth: authContext(request),
      rateBuckets: platformRateBuckets,
    }),
  )

  return app
}

async function handleResumeDraftRequest(
  store: Store,
  body: unknown,
  reply: FastifyReply,
  options: {
    route: string
    allowPersist: boolean
    requirePlatformAuth: boolean
    auth: AuthContext
    context?: StoreContext
    rateBuckets?: Map<string, number[]>
  },
) {
  const startedAt = Date.now()
  const client = options.requirePlatformAuth
    ? assertPlatformAccess(options.auth, 'drafts:write')
    : {}
  const requestMeta = platformRequestMeta(body)

  try {
    if (options.requirePlatformAuth) await assertPlatformUsage(store, client, options.rateBuckets)
    const input = parseBody(platformGenerateResumeSchema, body)
    const draft = await generateResumeDraft(input)
    const latencyMs = Date.now() - startedAt

    if (!options.allowPersist || !input.persist) {
      await store.recordPlatformRequest({
        requestId: input.requestId,
        userId: input.userId,
        clientId: client.id,
        matchScore: draft.match.score,
        persisted: false,
        status: 'draft',
        route: options.route,
        generatedAt: draft.generation.generatedAt,
        latencyMs,
      }, options.context)
      return reply.send({
        ...draft,
        generation: {
          ...draft.generation,
          persisted: false,
        },
      })
    }

    const persisted = await store.persistPlatformDraft(input, draft, {
      route: options.route,
      clientId: client.id,
      latencyMs: Date.now() - startedAt,
    }, options.context)
    const persistedMeta = asPersistedDraft(persisted)
    return reply.status(persistedMeta.idempotent ? 200 : 201).send({
      ...draft,
      generation: {
        ...draft.generation,
        persisted: true,
        documentId: persistedMeta.documentId,
        idempotent: persistedMeta.idempotent,
      },
    })
  } catch (error) {
    await recordPlatformFailure(store, {
      clientId: client.id,
      error,
      requestId: requestMeta.requestId,
      route: options.route,
      startedAt,
      userId: requestMeta.userId,
      context: options.context,
    })
    throw error
  }
}

function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body ?? {})
}

function getParam(params: unknown, key: string): string {
  if (!params || typeof params !== 'object') throw new Error(`Missing route param: ${key}`)
  const value = (params as Record<string, unknown>)[key]
  if (typeof value !== 'string' || !value) throw new Error(`Missing route param: ${key}`)
  return value
}

const AUTH_FAILURE_LIMIT = 10
const AUTH_FAILURE_WINDOW_MS = 60_000
const SESSION_COOKIE = 'resume_session'
const DEFAULT_SESSION_TTL_DAYS = 30
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1

function authMode(): 'local' | 'multi-user' {
  return process.env.RESUME_AUTH_MODE === 'multi-user' ? 'multi-user' : 'local'
}

function registrationAllowed(): boolean {
  return process.env.RESUME_AUTH_ALLOW_REGISTRATION?.trim().toLowerCase() !== 'false'
}

function authSessionRequired(method: string, url: string): boolean {
  if (authMode() !== 'multi-user') return false
  if (method.toUpperCase() === 'OPTIONS') return false

  const path = url.split('?')[0] || '/'
  if (!path.startsWith('/api/')) return false
  if (path.startsWith('/api/auth/')) return false
  if (path.startsWith('/api/admin/')) return false
  if (path === '/api/v1/openapi.json' || path.startsWith('/api/v1/')) return false
  return true
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

function sessionTokenHash(token: string): string {
  return sha256Hex(token)
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const hash = scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('base64url')
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`
}

function verifyPassword(password: string, encodedHash: string): boolean {
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

function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

async function issueUserSession(store: Store, userId: string): Promise<IssuedSession> {
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

function authResponse(session: IssuedSession) {
  return {
    user: session.user,
    workspace: session.workspace,
    token: session.token,
    expiresAt: session.expiresAt,
  }
}

function adminUserOperationInput(
  admin: AdminSession,
  request: { headers: Record<string, unknown>; ip?: string },
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

async function storeContextForRequest(
  store: Store,
  request: { headers: Record<string, unknown> },
): Promise<StoreContext> {
  const session = await optionalUserSession(store, request)
  if (session) return { userId: session.user.id, workspaceId: session.workspace.id }
  if (authMode() === 'multi-user') throw httpError(401, 'Account session is required')
  return {}
}

async function requireUserSession(store: Store, request: { headers: Record<string, unknown> }): Promise<UserSession> {
  const session = await optionalUserSession(store, request)
  if (!session) throw httpError(401, 'Account session is required')
  return session
}

async function currentUserSession(store: Store, request: { headers: Record<string, unknown> }): Promise<UserSession> {
  const session = await optionalUserSession(store, request)
  if (session) return session
  if (authMode() === 'multi-user') throw httpError(401, 'Account session is required')
  return store.getLocalAuthContext() as Promise<UserSession>
}

async function optionalUserSession(store: Store, request: { headers: Record<string, unknown> }): Promise<UserSession | undefined> {
  const token = sessionToken(request.headers)
  if (!token) return undefined
  const session = await store.getSessionByTokenHash(sessionTokenHash(token)) as UserSession | undefined
  if (!session) throw httpError(401, 'Invalid or expired account session')
  return session
}

function sessionToken(headers: Record<string, unknown>): string | undefined {
  const authorization = headerValue(headers.authorization)
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const explicit = headerValue(headers['x-resume-session'])?.trim()
  const cookieToken = parseCookieHeader(headerValue(headers.cookie))[SESSION_COOKIE]
  return bearer || explicit || cookieToken
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(cookieHeader.split(';').map((part) => {
    const [rawKey, ...rawValue] = part.trim().split('=')
    return [rawKey, decodeURIComponent(rawValue.join('='))]
  }).filter(([key]) => Boolean(key)))
}

function setSessionCookie(reply: FastifyReply, token: string, expiresAt: string): void {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  reply.header('set-cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`)
}

function clearSessionCookie(reply: FastifyReply): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  reply.header('set-cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
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

function assertAuthAttemptAllowed(context: AuthContext) {
  const windowStart = Date.now() - AUTH_FAILURE_WINDOW_MS
  const bucket = (context.failures.get(context.ip) ?? []).filter((time) => time >= windowStart)
  context.failures.set(context.ip, bucket)
  if (bucket.length >= AUTH_FAILURE_LIMIT) {
    throw httpError(429, 'Too many failed authentication attempts, retry later')
  }
}

function recordAuthFailure(context: AuthContext) {
  const bucket = context.failures.get(context.ip) ?? []
  bucket.push(Date.now())
  context.failures.set(context.ip, bucket)
}

function assertPlatformAccess(context: AuthContext, scope: string): AuthenticatedPlatformClient {
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

function assertAdminAccess(context: AuthContext, minimumRole: AdminRole): AdminSession {
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

function adminUsers(): AdminUser[] {
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

function adminRole(value: unknown): AdminRole {
  return ['super_admin', 'ops_admin', 'viewer'].includes(String(value)) ? String(value) as AdminRole : 'viewer'
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

async function assertPlatformUsage(
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

function platformClients(): PlatformClient[] {
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

function buildPlatformBilling(
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

function platformClientSummaries(requests: PlatformRequestLog[]) {
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

function latestRequestAt(requests: PlatformRequestLog[]) {
  return requests
    .map((entry) => entry.createdAt ?? entry.generatedAt ?? '')
    .filter(Boolean)
    .sort()
    .at(-1) ?? null
}

function asPersistedDraft(value: unknown): { documentId: string; idempotent: boolean } {
  if (!value || typeof value !== 'object') throw httpError(500, 'Persisted draft metadata is missing')
  const documentId = (value as Record<string, unknown>).documentId
  if (typeof documentId !== 'string' || !documentId) throw httpError(500, 'Persisted draft document id is missing')
  return {
    documentId,
    idempotent: Boolean((value as Record<string, unknown>).idempotent),
  }
}

function headerValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}

function platformRequestMeta(body: unknown) {
  if (!body || typeof body !== 'object') return {}
  const request = body as Record<string, unknown>
  return {
    requestId: typeof request.requestId === 'string' ? request.requestId : undefined,
    userId: typeof request.userId === 'string' ? request.userId : undefined,
  }
}

async function recordPlatformFailure(
  store: Store,
  input: {
    clientId?: string
    error: unknown
    requestId?: string
    route: string
    startedAt: number
    userId?: string
    context?: StoreContext
  },
) {
  try {
    await store.recordPlatformRequest({
      requestId: input.requestId,
      userId: input.userId,
      clientId: input.clientId,
      matchScore: 0,
      persisted: false,
      status: 'failed',
      route: input.route,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - input.startedAt,
      error: platformFailureMessage(input.error),
    }, input.context)
  } catch {
    // Keep the original API error. Failure telemetry should not mask it.
  }
}

function platformFailureMessage(error: unknown) {
  if (error instanceof ZodError) return 'Validation failed'
  if (error instanceof Error) return error.message
  return String(error)
}

function allowedOrigins() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  }
  // In production, cross-origin access must be opted into explicitly via CORS_ORIGIN.
  if (process.env.NODE_ENV === 'production') return []
  return [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
}

function platformOpenApiDocument() {
  const errorResponse = {
    description: 'Platform API error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/PlatformError' },
      },
    },
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Resume Tool Platform API',
      version: '0.1.0',
      description: 'Generate JD-tailored resume drafts, optionally persist them as resume documents, and inspect platform request logs.',
    },
    servers: [{ url: 'http://127.0.0.1:8787' }],
    tags: [
      { name: 'Platform Drafts', description: 'Server-to-server resume draft generation for external AI platforms.' },
      { name: 'Platform Logs', description: 'Request audit logs for platform clients and operators.' },
    ],
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      '/api/v1/resume-drafts': {
        post: {
          tags: ['Platform Drafts'],
          summary: 'Generate a JD-tailored resume draft',
          description: 'Requires `drafts:write` scope. Use `requestId` for idempotent persisted drafts.',
          operationId: 'createResumeDraft',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResumeDraftRequest' },
                examples: {
                  minimal: {
                    value: {
                      requestId: 'req-001',
                      userId: 'user-42',
                      persist: true,
                      workHistory: [
                        {
                          company: 'Acme AI',
                          title: 'Product Engineer',
                          achievements: ['Improved recruiter review speed by 38%'],
                        },
                      ],
                      jobDescription: {
                        company: 'FutureHire',
                        title: 'Senior Product Engineer',
                        description: 'Build LLM hiring workflows.',
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Draft generated, or idempotent persisted replay',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ResumeDraftResponse' },
                },
              },
            },
            201: {
              description: 'Draft generated and persisted as a resume document',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ResumeDraftResponse' },
                },
              },
            },
            400: errorResponse,
            401: errorResponse,
            403: errorResponse,
            429: errorResponse,
          },
        },
      },
      '/api/v1/platform/requests': {
        get: {
          tags: ['Platform Logs'],
          summary: 'List platform request logs',
          description: 'Requires `requests:read` scope. Clients without `requests:all` only see their own logs.',
          operationId: 'listPlatformRequests',
          responses: {
            200: {
              description: 'Request log list with clientId, route, status, latencyMs, matchScore, and documentId when persisted',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PlatformRequestLog' },
                  },
                },
              },
            },
            401: errorResponse,
            403: errorResponse,
          },
        },
      },
      '/api/v1/platform/usage': {
        get: {
          tags: ['Platform Logs'],
          summary: 'Get metered usage and billing',
          description: 'Requires `requests:read` scope. Clients without `requests:all` only see their own usage. Billing is billableRequests × pricePerDraft.',
          operationId: 'getPlatformUsage',
          responses: {
            200: {
              description: 'Per-client usage and billing summary',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlatformBillingSummary' },
                },
              },
            },
            401: errorResponse,
            403: errorResponse,
          },
        },
      },
      '/api/v1/openapi.json': {
        get: {
          summary: 'OpenAPI contract',
          security: [],
          responses: { 200: { description: 'OpenAPI 3.1 document' } },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-resume-api-key' },
        BearerAuth: { type: 'http', scheme: 'bearer' },
      },
      schemas: {
        ResumeDraftRequest: {
          type: 'object',
          required: ['workHistory', 'jobDescription'],
          additionalProperties: false,
          properties: {
            requestId: {
              type: 'string',
              description: 'Optional caller-provided idempotent key. When persist=true, repeating this id replays the existing persisted document.',
              examples: ['req-001'],
            },
            userId: {
              type: 'string',
              description: 'External user identifier used for request logs and future reconciliation.',
              examples: ['user-42'],
            },
            persist: {
              type: 'boolean',
              default: false,
              description: 'When true, save the generated draft as a resume document and return generation.documentId.',
            },
            locale: {
              type: 'string',
              enum: ['zh-CN', 'en-US'],
              default: 'zh-CN',
            },
            templateId: {
              type: 'string',
              enum: ['classic', 'modern', 'sidebar', 'compact', 'executive', 'creative', 'academic', 'technical', 'product', 'minimal'],
              default: 'classic',
            },
            personal: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                phone: { type: 'string' },
                email: { type: 'string' },
                location: { type: 'string' },
                website: { type: 'string' },
                summary: { type: 'string' },
              },
            },
            workHistory: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/WorkHistoryItem' },
            },
            education: {
              type: 'array',
              items: { $ref: '#/components/schemas/EducationItem' },
              default: [],
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
            projects: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProjectItem' },
              default: [],
            },
            growthEntries: {
              type: 'array',
              items: { $ref: '#/components/schemas/GrowthEntryItem' },
              default: [],
              description: 'Optional career memory records that can be referenced by the generated resume.',
            },
            jobDescription: { $ref: '#/components/schemas/JobDescription' },
          },
        },
        WorkHistoryItem: {
          type: 'object',
          required: ['company', 'title'],
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            company: { type: 'string' },
            title: { type: 'string' },
            location: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            current: { type: 'boolean' },
            description: { type: 'string' },
            achievements: { type: 'array', items: { type: 'string' } },
            skills: { type: 'array', items: { type: 'string' } },
          },
        },
        EducationItem: {
          type: 'object',
          additionalProperties: false,
          properties: {
            school: { type: 'string' },
            major: { type: 'string' },
            degree: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            gpa: { type: 'string' },
            description: { type: 'string' },
          },
        },
        ProjectItem: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            url: { type: 'string' },
            tech: { type: 'string' },
            description: { type: 'string' },
          },
        },
        GrowthEntryItem: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            date: { type: 'string' },
            type: { type: 'string', enum: ['project', 'metric', 'role', 'feedback', 'skill', 'achievement'] },
            company: { type: 'string' },
            project: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            metrics: { type: 'string' },
            skills: { type: 'array', items: { type: 'string' } },
            evidenceUrl: { type: 'string' },
            private: { type: 'boolean' },
          },
        },
        JobDescription: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: {
            company: { type: 'string' },
            title: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'array', items: { type: 'string' }, default: [] },
            keywords: { type: 'array', items: { type: 'string' }, default: [] },
          },
        },
        ResumeDraftResponse: {
          type: 'object',
          required: ['title', 'data', 'config', 'match', 'generation'],
          properties: {
            requestId: { type: 'string' },
            userId: { type: 'string' },
            title: { type: 'string' },
            data: {
              type: 'object',
              description: 'Resume document data ready for the Resume Tool editor.',
              additionalProperties: true,
            },
            config: {
              type: 'object',
              description: 'Resume rendering and template configuration.',
              additionalProperties: true,
            },
            match: {
              type: 'object',
              required: ['score', 'keywords', 'matchedKeywords', 'selectedExperienceIds', 'selectedExperienceIndexes'],
              properties: {
                score: { type: 'number', minimum: 0, maximum: 100 },
                keywords: { type: 'array', items: { type: 'string' } },
                matchedKeywords: { type: 'array', items: { type: 'string' } },
                selectedExperienceIds: { type: 'array', items: { type: 'string' } },
                selectedExperienceIndexes: { type: 'array', items: { type: 'number' } },
              },
            },
            diff: {
              type: 'array',
              description: 'Structured, field-level changes the generator made (before/after, rationale, confidence, source).',
              items: { $ref: '#/components/schemas/DraftDiffOperation' },
            },
            generation: {
              type: 'object',
              required: ['strategy', 'generatedAt', 'persisted'],
              properties: {
                strategy: {
                  type: 'string',
                  description: 'llm-jd-tailoring-v1 when a real model rewrote the draft, rule-based-jd-tailoring-v1 on the deterministic fallback.',
                  examples: ['llm-jd-tailoring-v1', 'rule-based-jd-tailoring-v1'],
                },
                generatedAt: { type: 'string', format: 'date-time' },
                persisted: { type: 'boolean' },
                documentId: {
                  type: 'string',
                  description: 'Present when persist=true and the draft was saved or replayed.',
                },
                idempotent: {
                  type: 'boolean',
                  description: 'True when this response replays a previously persisted requestId.',
                },
              },
            },
          },
        },
        PlatformRequestLog: {
          type: 'object',
          required: ['id', 'requestId', 'userId', 'matchScore', 'persisted', 'status', 'route', 'latencyMs', 'generatedAt', 'createdAt', 'replayCount'],
          properties: {
            id: { type: 'string' },
            requestId: { type: 'string' },
            userId: { type: 'string' },
            clientId: { type: 'string' },
            documentId: { type: 'string' },
            matchScore: { type: 'number', minimum: 0, maximum: 100 },
            persisted: { type: 'boolean' },
            status: { type: 'string', enum: ['draft', 'persisted', 'failed'] },
            route: { type: 'string' },
            latencyMs: { type: 'number' },
            error: { type: 'string' },
            generatedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            replayedAt: { type: 'string', format: 'date-time' },
            replayCount: { type: 'number' },
          },
        },
        DraftDiffOperation: {
          type: 'object',
          required: ['section', 'field', 'before', 'after', 'rationale', 'confidence', 'source'],
          properties: {
            section: { type: 'string', enum: ['summary', 'experience', 'skills', 'projects'] },
            field: { type: 'string', examples: ['personal.summary'] },
            targetId: { type: 'string' },
            before: { type: 'string' },
            after: { type: 'string' },
            rationale: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            source: { type: 'string', enum: ['llm', 'rule-based'] },
          },
        },
        PlatformClientUsage: {
          type: 'object',
          required: ['clientId', 'currency', 'billableRequests', 'failedRequests', 'estimatedCost'],
          properties: {
            clientId: { type: 'string' },
            currency: { type: 'string', examples: ['USD'] },
            pricePerDraft: { type: 'number' },
            totalRequests: { type: 'number' },
            billableRequests: { type: 'number' },
            persistedRequests: { type: 'number' },
            failedRequests: { type: 'number' },
            todayRequests: { type: 'number' },
            quotaPerDay: { type: 'number', nullable: true },
            quotaUtilization: { type: 'number', nullable: true },
            avgLatencyMs: { type: 'number' },
            p95LatencyMs: { type: 'number' },
            estimatedCost: { type: 'number' },
            lastRequestAt: { type: 'string', nullable: true },
          },
        },
        PlatformBillingSummary: {
          type: 'object',
          required: ['generatedAt', 'currency', 'totals', 'clients'],
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            currency: { type: 'string' },
            totals: {
              type: 'object',
              properties: {
                clients: { type: 'number' },
                billableRequests: { type: 'number' },
                failedRequests: { type: 'number' },
                estimatedCost: { type: 'number' },
              },
            },
            clients: {
              type: 'array',
              items: { $ref: '#/components/schemas/PlatformClientUsage' },
            },
          },
        },
        PlatformError: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
            issues: {
              type: 'array',
              description: 'Present for 400 validation failures.',
              items: {
                type: 'object',
                required: ['path', 'message'],
                properties: {
                  path: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    'x-curl-example': 'curl -X POST http://127.0.0.1:8787/api/v1/resume-drafts -H "x-resume-api-key: $RESUME_API_KEY" -H "content-type: application/json" -d @payload.json',
    'x-idempotency': 'When persist=true and requestId repeats, the API returns the original documentId with generation.idempotent=true.',
    'x-authentication': 'Send either x-resume-api-key or Authorization: Bearer <key>. The drafts endpoint requires drafts:write; request logs require requests:read.',
    'x-error-codes': {
      400: 'Validation failed',
      401: 'Platform API key is required',
      403: 'Platform API key is missing scope: <scope>',
      429: 'Platform API daily quota exceeded or Platform API rate limit exceeded',
    },
  }
}
