import { type FastifyPluginAsync } from 'fastify'
import { storeContextForRequest, type Store } from '../lib/auth.js'
import { getParam, parseBody } from '../lib/http.js'
import { createApplicationSchema, updateApplicationSchema } from '../schemas.js'

export function createApplicationRoutes(store: Store): FastifyPluginAsync {
  return async (app) => {
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
  }
}
