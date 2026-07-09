import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import {
  authSessionRequired,
  requireUserSession,
  type AuthContextFactory,
  type Store,
} from './lib/auth.js'
import { createAccountRoutes } from './routes/account.js'
import { createAdminRoutes } from './routes/admin.js'
import { createApplicationRoutes } from './routes/applications.js'
import { createAssistantRoutes } from './routes/assistant.js'
import { createAuthRoutes } from './routes/auth.js'
import { createBillingRoutes } from './routes/billing.js'
import { createGrowthRoutes } from './routes/growth.js'
import { createHealthRoutes } from './routes/health.js'
import { createPlatformRoutes } from './routes/platform.js'
import { createResumeRoutes } from './routes/resumes.js'
import { createShareRoutes } from './routes/shares.js'

export async function buildApp(store: Store): Promise<FastifyInstance> {
  const platformRateBuckets = new Map<string, number[]>()
  const publicShareRateBuckets = new Map<string, number[]>()
  const authFailureBuckets = new Map<string, number[]>()
  const authContext: AuthContextFactory = (request) => ({
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

  await app.register(createHealthRoutes(store))
  await app.register(createAuthRoutes(store, authContext))
  await app.register(createAccountRoutes(store))
  await app.register(createBillingRoutes(store))
  await app.register(createResumeRoutes(store))
  await app.register(createShareRoutes(store, publicShareRateBuckets))
  await app.register(createApplicationRoutes(store))
  await app.register(createGrowthRoutes(store))
  await app.register(createAssistantRoutes(store, authContext))
  await app.register(createPlatformRoutes(store, authContext, platformRateBuckets))
  await app.register(createAdminRoutes(store, authContext))

  return app
}

function allowedOrigins() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  }
  // In production, cross-origin access must be opted into explicitly via CORS_ORIGIN.
  if (process.env.NODE_ENV === 'production') return []
  return [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
}
