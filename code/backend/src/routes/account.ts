import { type FastifyPluginAsync } from 'fastify'
import {
  currentUserSession,
  type Store,
} from '../lib/auth.js'
import { parseBody } from '../lib/http.js'
import { deleteAccountSchema } from '../schemas.js'

export function createAccountRoutes(store: Store): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/account/export', async (request, reply) => {
      const session = await currentUserSession(store, request)
      const exported = await store.exportAccountData({
        userId: session.user.id,
        workspaceId: session.workspace.id,
      })
      reply.header('content-disposition', `attachment; filename="${exportFilename(exported.exportedAt)}"`)
      reply.header('content-type', 'application/json; charset=utf-8')
      return exported
    })

    app.delete('/api/account', async (request) => {
      parseBody(deleteAccountSchema, request.body)
      const session = await currentUserSession(store, request)
      return store.deleteAccount({
        userId: session.user.id,
        workspaceId: session.workspace.id,
      })
    })
  }
}

function exportFilename(exportedAt: string): string {
  const date = exportedAt.slice(0, 10)
  return `resume-tool-export-${date}.json`
}
