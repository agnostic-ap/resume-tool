import { type FastifyPluginAsync } from 'fastify'
import {
  authMode,
  storeContextForRequest,
  type AuthContextFactory,
  type Store,
} from '../lib/auth.js'
import { parseBody } from '../lib/http.js'
import { assistantSuggestionSchema } from '../schemas.js'
import { handleResumeDraftRequest } from './platform.js'

export function createAssistantRoutes(store: Store, authContext: AuthContextFactory): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/activity', async (request) => store.listActivity(await storeContextForRequest(store, request)))
    app.post('/api/assistant/suggestions', async (request, reply) => {
      const context = await storeContextForRequest(store, request)
      const suggestion = await store.createAssistantSuggestion(parseBody(assistantSuggestionSchema, request.body), context)
      return reply.status(201).send(suggestion)
    })
    app.post('/api/assistant/resume-drafts', async (request, reply) => {
      const context = await storeContextForRequest(store, request)
      const userId = context.userId
      return handleResumeDraftRequest(store, request.body, reply, {
        route: 'assistant',
        allowPersist: false,
        requirePlatformAuth: false,
        auth: authContext(request),
        context,
        consumeUsage: authMode() === 'multi-user' && userId
          ? () => store.consumeBillingUsage(userId, 'ai_draft')
          : undefined,
      })
    })
  }
}
