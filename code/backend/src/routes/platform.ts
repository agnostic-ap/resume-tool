import { type FastifyPluginAsync, type FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { generateResumeDraft } from '../llm.js'
import {
  assertPlatformAccess,
  assertPlatformUsage,
  type AuthContext,
  type AuthContextFactory,
  type Store,
  type StoreContext,
} from '../lib/auth.js'
import { parseBody } from '../lib/http.js'
import {
  buildPlatformBilling,
  type AuthenticatedPlatformClient,
  type PlatformRequestLog,
} from '../lib/platform-clients.js'
import { platformGenerateResumeSchema } from '../schemas.js'
import { httpError } from '../store.js'

export function createPlatformRoutes(
  store: Store,
  authContext: AuthContextFactory,
  platformRateBuckets: Map<string, number[]>,
): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/v1/platform/requests', async (request) => {
      const client = assertPlatformAccess(authContext(request), 'requests:read')
      const requests = await store.listPlatformRequests() as PlatformRequestLog[]
      if (!client.id || client.scopes?.includes('requests:all')) return requests
      return requests.filter((entry: { clientId?: string }) => entry.clientId === client.id)
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
  }
}

export async function handleResumeDraftRequest(
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
  const client: AuthenticatedPlatformClient = options.requirePlatformAuth
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

function asPersistedDraft(value: unknown): { documentId: string; idempotent: boolean } {
  if (!value || typeof value !== 'object') throw httpError(500, 'Persisted draft metadata is missing')
  const documentId = (value as Record<string, unknown>).documentId
  if (typeof documentId !== 'string' || !documentId) throw httpError(500, 'Persisted draft document id is missing')
  return {
    documentId,
    idempotent: Boolean((value as Record<string, unknown>).idempotent),
  }
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
