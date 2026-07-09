import { type FastifyPluginAsync } from 'fastify'
import { storeContextForRequest, type Store } from '../lib/auth.js'
import { getParam, parseBody } from '../lib/http.js'
import { createResumeSchema, updateResumeSchema } from '../schemas.js'

export function createResumeRoutes(store: Store): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/state', async (request) => store.readState(await storeContextForRequest(store, request)))

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
  }
}
