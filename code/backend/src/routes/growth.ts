import { type FastifyPluginAsync } from 'fastify'
import { storeContextForRequest, type Store } from '../lib/auth.js'
import { getParam, parseBody } from '../lib/http.js'
import { growthEntrySchema, updateGrowthEntrySchema } from '../schemas.js'

export function createGrowthRoutes(store: Store): FastifyPluginAsync {
  return async (app) => {
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
  }
}
