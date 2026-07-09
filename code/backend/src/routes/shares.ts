import { type FastifyPluginAsync } from 'fastify'
import {
  authMode,
  currentUserSession,
  type Store,
  type UserSession,
} from '../lib/auth.js'
import { getParam, parseBody } from '../lib/http.js'
import { createShareSchema } from '../schemas.js'
import { httpError } from '../store.js'

const PUBLIC_SHARE_RATE_LIMIT = 60
const PUBLIC_SHARE_RATE_WINDOW_MS = 60_000

export function createShareRoutes(
  store: Store,
  publicShareRateBuckets: Map<string, number[]>,
): FastifyPluginAsync {
  return async (app) => {
    app.post('/api/shares', async (request, reply) => {
      const session = await shareOwnerSession(store, request)
      const share = await store.createResumeShare(
        parseBody(createShareSchema, request.body),
        { userId: session.user.id, workspaceId: session.workspace.id },
        { enforceQuota: authMode() === 'multi-user' },
      )
      return reply.status(201).send(share)
    })

    app.get('/api/shares', async (request) => {
      const session = await shareOwnerSession(store, request)
      return store.listResumeShares({ userId: session.user.id, workspaceId: session.workspace.id })
    })

    app.delete('/api/shares/:id', async (request) => {
      const session = await shareOwnerSession(store, request)
      return store.revokeResumeShare(getParam(request.params, 'id'), {
        userId: session.user.id,
        workspaceId: session.workspace.id,
      })
    })

    app.get('/api/public/shares/:id', async (request) => {
      assertPublicShareRateAllowed(request.ip || 'unknown', publicShareRateBuckets)
      return store.getPublicResumeShare(getParam(request.params, 'id'))
    })
  }
}

async function shareOwnerSession(
  store: Store,
  request: { headers: Record<string, unknown> },
): Promise<UserSession> {
  if (authMode() === 'multi-user') return currentUserSession(store, request)
  return store.getLocalAuthContext() as Promise<UserSession>
}

function assertPublicShareRateAllowed(ip: string, buckets: Map<string, number[]>): void {
  const now = Date.now()
  const windowStart = now - PUBLIC_SHARE_RATE_WINDOW_MS
  const bucket = (buckets.get(ip) ?? []).filter((time) => time >= windowStart)
  if (bucket.length >= PUBLIC_SHARE_RATE_LIMIT) {
    buckets.set(ip, bucket)
    throw httpError(429, 'Public share rate limit exceeded')
  }
  bucket.push(now)
  buckets.set(ip, bucket)
}
