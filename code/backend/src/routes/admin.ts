import { type FastifyPluginAsync } from 'fastify'
import {
  adminUserOperationInput,
  assertAdminAccess,
  type AuthContextFactory,
  type Store,
} from '../lib/auth.js'
import { getParam, parseBody } from '../lib/http.js'
import {
  buildPlatformBilling,
  platformClientSummaries,
  type PlatformRequestLog,
} from '../lib/platform-clients.js'
import { adminUserPlanSchema } from '../schemas.js'

export function createAdminRoutes(store: Store, authContext: AuthContextFactory): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/admin/session', async (request) => assertAdminAccess(authContext(request), 'viewer'))
    app.get('/api/admin/state', async (request) => {
      assertAdminAccess(authContext(request), 'viewer')
      return store.readState()
    })
    app.get('/api/admin/users', async (request) => {
      assertAdminAccess(authContext(request), 'viewer')
      return store.listAdminUsers()
    })
    app.post('/api/admin/users/:id/lock', async (request) => {
      const admin = assertAdminAccess(authContext(request), 'super_admin')
      return store.lockUser(adminUserOperationInput(admin, request, getParam(request.params, 'id')))
    })
    app.post('/api/admin/users/:id/unlock', async (request) => {
      const admin = assertAdminAccess(authContext(request), 'super_admin')
      return store.unlockUser(adminUserOperationInput(admin, request, getParam(request.params, 'id')))
    })
    app.delete('/api/admin/users/:id/sessions', async (request) => {
      const admin = assertAdminAccess(authContext(request), 'super_admin')
      return store.revokeUserSessions(adminUserOperationInput(admin, request, getParam(request.params, 'id')))
    })
    app.delete('/api/admin/users/:id', async (request) => {
      const admin = assertAdminAccess(authContext(request), 'super_admin')
      return store.deleteUser(adminUserOperationInput(admin, request, getParam(request.params, 'id')))
    })
    app.post('/api/admin/users/:id/plan', async (request) => {
      const admin = assertAdminAccess(authContext(request), 'super_admin')
      const input = parseBody(adminUserPlanSchema, request.body)
      return store.setUserPlan({
        ...adminUserOperationInput(admin, request, getParam(request.params, 'id')),
        plan: input.plan,
        periodEnd: input.periodEnd,
      })
    })

    app.get('/api/admin/platform-clients', async (request) => {
      assertAdminAccess(authContext(request), 'super_admin')
      const requests = await store.listPlatformRequests() as PlatformRequestLog[]
      return platformClientSummaries(requests)
    })
    app.get('/api/admin/platform-usage', async (request) => {
      assertAdminAccess(authContext(request), 'super_admin')
      const requests = await store.listPlatformRequests() as PlatformRequestLog[]
      return buildPlatformBilling(requests, { includeAll: true })
    })
  }
}
