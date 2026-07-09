import { type FastifyPluginAsync } from 'fastify'
import { type Store } from '../lib/auth.js'
import { platformOpenApiDocument } from '../lib/openapi.js'

export function createHealthRoutes(store: Store): FastifyPluginAsync {
  return async (app) => {
    app.get('/health', async () => ({
      ok: true,
      service: 'resume-tool-backend-api',
      stack: 'fastify',
      dbPath: store.dbPath,
    }))

    app.get('/api/v1/openapi.json', async () => platformOpenApiDocument())
  }
}
