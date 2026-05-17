import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { ZodError, type ZodSchema } from 'zod'
import {
  assistantSuggestionSchema,
  createApplicationSchema,
  createResumeSchema,
  platformGenerateResumeSchema,
  updateApplicationSchema,
  updateResumeSchema,
} from './schemas.js'
import { generatePlatformResume } from './platform-generator.js'
import { httpError } from './store.mjs'

type Store = ReturnType<typeof import('./store.mjs').createStore>

export async function buildApp(store: Store): Promise<FastifyInstance> {
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
    service: 'resume-tool-backend',
    stack: 'fastify',
    dbPath: store.dbPath,
  }))

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

  app.get('/api/activity', async () => store.listActivity())
  app.post('/api/assistant/suggestions', async (request, reply) => {
    const suggestion = await store.createAssistantSuggestion(parseBody(assistantSuggestionSchema, request.body))
    return reply.status(201).send(suggestion)
  })
  app.post('/api/platform/resume-drafts', async (request, reply) => {
    assertPlatformAccess(request.headers)
    const input = parseBody(platformGenerateResumeSchema, request.body)
    const draft = generatePlatformResume(input)

    if (!input.persist) {
      return reply.send(draft)
    }

    const created = await store.createDocument({ blank: true, title: draft.title })
    const documentId = getObjectId(created)
    await store.updateDocument(documentId, {
      title: draft.title,
      data: draft.data,
      config: draft.config,
    })

    return reply.status(201).send({
      ...draft,
      generation: {
        ...draft.generation,
        persisted: true,
        documentId,
      },
    })
  })

  return app
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

function getObjectId(value: unknown): string {
  if (!value || typeof value !== 'object') throw httpError(500, 'Created resume is missing an id')
  const id = (value as Record<string, unknown>).id
  if (typeof id !== 'string' || !id) throw httpError(500, 'Created resume is missing an id')
  return id
}

function assertPlatformAccess(headers: Record<string, unknown>) {
  const expected = process.env.RESUME_PLATFORM_API_KEY?.trim()
  if (!expected) return

  const apiKey = headerValue(headers['x-resume-api-key'])
  const authorization = headerValue(headers.authorization)
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

  if (apiKey === expected || bearer === expected) return
  throw httpError(401, 'Platform API key is required')
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
