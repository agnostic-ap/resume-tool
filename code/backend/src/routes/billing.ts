import { type FastifyPluginAsync } from 'fastify'
import {
  currentUserSession,
  type Store,
} from '../lib/auth.js'

export function createBillingRoutes(store: Store): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/billing/me', async (request) => {
      const session = await currentUserSession(store, request)
      return store.getBillingSummary(session.user.id)
    })

    app.post('/api/billing/usage/export', async (request) => {
      const session = await currentUserSession(store, request)
      return store.consumeBillingUsage(session.user.id, 'export')
    })
  }
}
