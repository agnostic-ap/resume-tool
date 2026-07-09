import { type FastifyPluginAsync } from 'fastify'
import {
  assertAuthAttemptAllowed,
  authResponse,
  clearSessionCookie,
  currentUserSession,
  hashPassword,
  issueUserSession,
  recordAuthFailure,
  registrationAllowed,
  requireUserSession,
  sessionToken,
  sessionTokenHash,
  setSessionCookie,
  verifyPassword,
  type AuthContextFactory,
  type Store,
  type UserSession,
} from '../lib/auth.js'
import { parseBody } from '../lib/http.js'
import { loginAccountSchema, registerAccountSchema } from '../schemas.js'
import { httpError } from '../store.js'

export function createAuthRoutes(store: Store, authContext: AuthContextFactory): FastifyPluginAsync {
  return async (app) => {
    app.post('/api/auth/register', async (request, reply) => {
      if (!registrationAllowed()) throw httpError(403, 'Registration is disabled')
      const input = parseBody(registerAccountSchema, request.body)
      assertAuthAttemptAllowed(authContext(request))
      const account = await store.createUserWorkspace({
        email: input.email,
        displayName: input.displayName,
        passwordHash: hashPassword(input.password),
      }) as UserSession
      const issued = await issueUserSession(store, account.user.id)
      setSessionCookie(reply, issued.token, issued.expiresAt)
      return reply.status(201).send(authResponse(issued))
    })

    app.post('/api/auth/login', async (request, reply) => {
      const input = parseBody(loginAccountSchema, request.body)
      const context = authContext(request)
      assertAuthAttemptAllowed(context)
      const user = await store.findUserByEmail(input.email) as ({ id: string; passwordHash?: string; status?: string } | undefined)
      if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        recordAuthFailure(context)
        throw httpError(401, 'Invalid email or password')
      }
      if (user.status !== 'enabled') throw httpError(403, 'Account is locked')
      const issued = await issueUserSession(store, user.id)
      setSessionCookie(reply, issued.token, issued.expiresAt)
      return authResponse(issued)
    })

    app.get('/api/auth/session', async (request) => requireUserSession(store, request))

    app.get('/api/auth/me', async (request) => currentUserSession(store, request))

    app.post('/api/auth/logout', async (request, reply) => {
      const token = sessionToken(request.headers)
      if (token) await store.revokeSession(sessionTokenHash(token))
      clearSessionCookie(reply)
      return { ok: true }
    })
  }
}
