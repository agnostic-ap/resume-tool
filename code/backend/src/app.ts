import cors from '@fastify/cors'
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify'
import { ZodError, type ZodSchema } from 'zod'
import {
  assistantSuggestionSchema,
  createApplicationSchema,
  createResumeSchema,
  growthEntrySchema,
  platformGenerateResumeSchema,
  updateApplicationSchema,
  updateGrowthEntrySchema,
  updateResumeSchema,
} from './schemas.js'
import { generatePlatformResume } from './platform-generator.js'
import { httpError } from './store.mjs'

type Store = ReturnType<typeof import('./store.mjs').createStore>
type PlatformClient = {
  id: string
  key: string
  scopes: string[]
  quotaPerDay?: number
  rateLimitPerMinute?: number
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

export async function buildApp(store: Store): Promise<FastifyInstance> {
  const platformRateBuckets = new Map<string, number[]>()
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  })

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

  app.get('/health', async () => ({
    ok: true,
    service: 'resume-tool-backend-api',
    stack: 'fastify',
    dbPath: store.dbPath,
  }))

  app.get('/api/v1/openapi.json', async () => platformOpenApiDocument())

  app.get('/api/state', async () => store.readState())

  app.get('/api/resumes', async () => store.listDocuments())
  app.post('/api/resumes', async (request, reply) => {
    const doc = await store.createDocument(parseBody(createResumeSchema, request.body))
    return reply.status(201).send(doc)
  })
  app.get('/api/resumes/:id', async (request) => store.getDocument(getParam(request.params, 'id')))
  app.patch('/api/resumes/:id', async (request) =>
    store.updateDocument(getParam(request.params, 'id'), parseBody(updateResumeSchema, request.body)),
  )
  app.put('/api/resumes/:id', async (request) =>
    store.updateDocument(getParam(request.params, 'id'), parseBody(updateResumeSchema, request.body)),
  )
  app.delete('/api/resumes/:id', async (request) => store.deleteDocument(getParam(request.params, 'id')))
  app.post('/api/resumes/:id/select', async (request) => store.selectDocument(getParam(request.params, 'id')))
  app.post('/api/resumes/:id/duplicate', async (request, reply) => {
    const doc = await store.createDocument({
      ...parseBody(createResumeSchema, request.body),
      sourceId: getParam(request.params, 'id'),
      blank: false,
    })
    return reply.status(201).send(doc)
  })
  app.post('/api/resumes/:id/career-update', async (request) => store.markCareerUpdated(getParam(request.params, 'id')))

  app.get('/api/applications', async () => store.listApplications())
  app.post('/api/applications', async (request, reply) => {
    const appRecord = await store.createApplication(parseBody(createApplicationSchema, request.body))
    return reply.status(201).send(appRecord)
  })
  app.patch('/api/applications/:id', async (request) =>
    store.updateApplication(getParam(request.params, 'id'), parseBody(updateApplicationSchema, request.body)),
  )
  app.put('/api/applications/:id', async (request) =>
    store.updateApplication(getParam(request.params, 'id'), parseBody(updateApplicationSchema, request.body)),
  )
  app.delete('/api/applications/:id', async (request) => store.deleteApplication(getParam(request.params, 'id')))

  app.get('/api/growth-entries', async () => store.listGrowthEntries())
  app.post('/api/growth-entries', async (request, reply) => {
    const entry = await store.createGrowthEntry(parseBody(growthEntrySchema, request.body))
    return reply.status(201).send(entry)
  })
  app.patch('/api/growth-entries/:id', async (request) =>
    store.updateGrowthEntry(getParam(request.params, 'id'), parseBody(updateGrowthEntrySchema, request.body)),
  )
  app.put('/api/growth-entries/:id', async (request) =>
    store.updateGrowthEntry(getParam(request.params, 'id'), parseBody(updateGrowthEntrySchema, request.body)),
  )

  app.get('/api/activity', async () => store.listActivity())
  app.post('/api/assistant/suggestions', async (request, reply) => {
    const suggestion = await store.createAssistantSuggestion(parseBody(assistantSuggestionSchema, request.body))
    return reply.status(201).send(suggestion)
  })
  app.post('/api/assistant/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'assistant',
      allowPersist: false,
      requirePlatformAuth: false,
      headers: request.headers,
    }),
  )
  app.get('/api/v1/platform/requests', async (request) => {
    const client = assertPlatformAccess(request.headers, 'requests:read')
    const requests = await store.listPlatformRequests() as PlatformRequestLog[]
    if (!client.id || client.scopes?.includes('requests:all')) return requests
    return requests.filter((entry: { clientId?: string }) => entry.clientId === client.id)
  })
  app.get('/api/admin/platform-clients', async () => {
    const requests = await store.listPlatformRequests() as PlatformRequestLog[]
    return platformClientSummaries(requests)
  })
  app.post('/api/v1/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'api-v1',
      allowPersist: true,
      requirePlatformAuth: true,
      headers: request.headers,
      rateBuckets: platformRateBuckets,
    }),
  )
  app.post('/api/v1/platform/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'api-v1-platform',
      allowPersist: true,
      requirePlatformAuth: true,
      headers: request.headers,
      rateBuckets: platformRateBuckets,
    }),
  )
  app.post('/api/platform/resume-drafts', async (request, reply) =>
    handleResumeDraftRequest(store, request.body, reply, {
      route: 'legacy-platform',
      allowPersist: true,
      requirePlatformAuth: true,
      headers: request.headers,
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
    headers: Record<string, unknown>
    rateBuckets?: Map<string, number[]>
  },
) {
  const startedAt = Date.now()
  const client = options.requirePlatformAuth
    ? assertPlatformAccess(options.headers, 'drafts:write')
    : {}
  if (options.requirePlatformAuth) await assertPlatformUsage(store, client, options.rateBuckets)
  const input = parseBody(platformGenerateResumeSchema, body)
  const draft = generatePlatformResume(input)
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
    })
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
  })
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

function assertPlatformAccess(headers: Record<string, unknown>, scope: string): AuthenticatedPlatformClient {
  const clients = platformClients()
  if (!clients.length) return { scopes: ['drafts:write', 'requests:read', 'requests:all'] }

  const apiKey = headerValue(headers['x-resume-api-key'])
  const authorization = headerValue(headers.authorization)
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const presented = apiKey || bearer

  const client = clients.find((item) => item.key === presented)
  if (!client) throw httpError(401, 'Platform API key is required')
  if (!client.scopes.includes(scope)) throw httpError(403, `Platform API key is missing scope: ${scope}`)
  return client
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
          key: String(client.key ?? '').trim(),
          scopes: Array.isArray(client.scopes) ? client.scopes.map(String) : ['drafts:write'],
          quotaPerDay: client.quotaPerDay ? Number(client.quotaPerDay) : undefined,
          rateLimitPerMinute: client.rateLimitPerMinute ? Number(client.rateLimitPerMinute) : undefined,
        }))
        .filter((client) => client.id && client.key)
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
      hasKey: Boolean(client.key),
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

function allowedOrigins() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  }
  return [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
}

function platformOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Resume Tool Platform API',
      version: '0.1.0',
      description: 'Generate JD-tailored resume drafts, optionally persist them as resume documents, and inspect platform request logs.',
    },
    servers: [{ url: 'http://127.0.0.1:8787' }],
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      '/api/v1/resume-drafts': {
        post: {
          summary: 'Generate a JD-tailored resume draft',
          description: 'Requires `drafts:write` scope. Use `requestId` for idempotent persisted drafts.',
          operationId: 'createResumeDraft',
          requestBody: {
            required: true,
            content: {
              'application/json': {
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
            200: { description: 'Draft generated, or idempotent persisted replay' },
            201: { description: 'Draft generated and persisted as a resume document' },
            400: { description: 'Validation failed' },
            401: { description: 'Missing or invalid API key' },
            403: { description: 'API key missing required scope' },
            429: { description: 'Quota or rate limit exceeded' },
          },
        },
      },
      '/api/v1/platform/requests': {
        get: {
          summary: 'List platform request logs',
          description: 'Requires `requests:read` scope. Clients without `requests:all` only see their own logs.',
          operationId: 'listPlatformRequests',
          responses: {
            200: { description: 'Request log list with clientId, route, status, latencyMs, matchScore, and documentId when persisted' },
            401: { description: 'Missing or invalid API key' },
            403: { description: 'API key missing required scope' },
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
    },
    'x-curl-example': 'curl -X POST http://127.0.0.1:8787/api/v1/resume-drafts -H "x-resume-api-key: $RESUME_API_KEY" -H "content-type: application/json" -d @payload.json',
    'x-idempotency': 'When persist=true and requestId repeats, the API returns the original documentId with generation.idempotent=true.',
  }
}
