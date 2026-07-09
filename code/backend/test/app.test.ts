import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { buildApp } from '../src/app.js'
import { createStore } from '../src/store.js'

test('fastify app exposes health and validates applications', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const health = await app.inject({ method: 'GET', url: '/health' })
    assert.equal(health.statusCode, 200)
    assert.equal(health.json().stack, 'fastify')

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/applications',
      payload: { company: '', role: '' },
    })
    assert.equal(invalid.statusCode, 400)
    assert.equal(invalid.json().error, 'Validation failed')

    const created = await app.inject({
      method: 'POST',
      url: '/api/applications',
      payload: {
        company: 'Linear',
        role: 'Product Engineer',
        match: 94,
        nextAction: 'Send portfolio',
        followUpAt: '2026-05-22',
        contactName: 'Alex Recruiter',
        contactEmail: 'alex@example.com',
        jobPostUrl: 'https://jobs.example.com/linear-product-engineer',
        jobDescription: {
          company: 'Linear',
          title: 'Product Engineer',
          description: 'Build product engineering workflows.',
          url: 'https://jobs.example.com/linear-product-engineer',
        },
        tailoring: {
          requestId: 'jd-run-api',
          draftTitle: 'Linear Draft',
          matchScore: 94,
          matchedKeywords: ['workflow'],
          selectedExperienceIds: ['exp-1'],
          strategy: 'rule-based-jd-tailoring-v1',
        },
      },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().companyMono, 'L')
    assert.equal(created.json().nextAction, 'Send portfolio')
    assert.equal(created.json().contactEmail, 'alex@example.com')
    assert.equal(created.json().jobDescription.title, 'Product Engineer')
    assert.equal(created.json().jobDescription.url, 'https://jobs.example.com/linear-product-engineer')
    assert.equal(created.json().tailoring.requestId, 'jd-run-api')

    const stateOverwrite = await app.inject({
      method: 'PUT',
      url: '/api/state',
      payload: { documents: [] },
    })
    assert.equal(stateOverwrite.statusCode, 404)
  } finally {
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('account auth registers, logs in, scopes data, and logs out', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const alice = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'Alice@Example.com',
        password: 'correct-horse-battery',
        displayName: 'Alice',
      },
    })
    assert.equal(alice.statusCode, 201)
    const aliceBody = alice.json()
    assert.equal(aliceBody.user.email, 'alice@example.com')
    assert.equal(aliceBody.user.passwordHash, undefined)
    assert.equal(aliceBody.workspace.role, 'owner')
    assert.equal(typeof aliceBody.token, 'string')
    assert.match(String(alice.headers['set-cookie']), /resume_session=/)

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'alice@example.com',
        password: 'correct-horse-battery',
      },
    })
    assert.equal(duplicate.statusCode, 409)

    const badLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@example.com', password: 'wrong-password' },
    })
    assert.equal(badLogin.statusCode, 401)

    const aliceLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@example.com', password: 'correct-horse-battery' },
    })
    assert.equal(aliceLogin.statusCode, 200)
    const aliceToken = aliceLogin.json().token

    const aliceSession = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    assert.equal(aliceSession.statusCode, 200)
    assert.equal(aliceSession.json().user.email, 'alice@example.com')

    const aliceResume = await app.inject({
      method: 'POST',
      url: '/api/resumes',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { blank: true, title: 'Alice Resume' },
    })
    assert.equal(aliceResume.statusCode, 201)

    const bob = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'bob@example.com',
        password: 'correct-horse-battery',
        displayName: 'Bob',
      },
    })
    assert.equal(bob.statusCode, 201)
    const bobToken = bob.json().token

    const bobResume = await app.inject({
      method: 'POST',
      url: '/api/resumes',
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { blank: true, title: 'Bob Resume' },
    })
    assert.equal(bobResume.statusCode, 201)

    const aliceResumes = await app.inject({
      method: 'GET',
      url: '/api/resumes',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    assert.equal(aliceResumes.statusCode, 200)
    assert.ok(aliceResumes.json().documents.some((doc: { title: string }) => doc.title === 'Alice Resume'))
    assert.ok(!aliceResumes.json().documents.some((doc: { title: string }) => doc.title === 'Bob Resume'))

    const bobCannotReadAlice = await app.inject({
      method: 'GET',
      url: `/api/resumes/${aliceResume.json().id}`,
      headers: { authorization: `Bearer ${bobToken}` },
    })
    assert.equal(bobCannotReadAlice.statusCode, 404)

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    assert.equal(logout.statusCode, 200)
    assert.equal(logout.json().ok, true)
    assert.match(String(logout.headers['set-cookie']), /Max-Age=0/)

    const expired = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { authorization: `Bearer ${aliceToken}` },
    })
    assert.equal(expired.statusCode, 401)
  } finally {
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('multi-user auth mode requires sessions for app data routes', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  const previousApiKey = process.env.RESUME_PLATFORM_API_KEY
  process.env.RESUME_AUTH_MODE = 'multi-user'
  process.env.RESUME_PLATFORM_API_KEY = 'multi-user-platform-key'
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const health = await app.inject({ method: 'GET', url: '/health' })
    assert.equal(health.statusCode, 200)

    const openapi = await app.inject({ method: 'GET', url: '/api/v1/openapi.json' })
    assert.equal(openapi.statusCode, 200)

    const platformMissingKey = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      payload: platformPayload(),
    })
    assert.equal(platformMissingKey.statusCode, 401)
    assert.equal(platformMissingKey.json().error, 'Platform API key is required')

    const anonymous = await app.inject({ method: 'GET', url: '/api/resumes' })
    assert.equal(anonymous.statusCode, 401)
    assert.equal(anonymous.json().error, 'Account session is required')

    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'mode@example.com',
        password: 'correct-horse-battery',
        displayName: 'Mode User',
      },
    })
    assert.equal(registered.statusCode, 201)
    const token = registered.json().token

    const resumes = await app.inject({
      method: 'GET',
      url: '/api/resumes',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(resumes.statusCode, 200)

    const created = await app.inject({
      method: 'POST',
      url: '/api/resumes',
      headers: { authorization: `Bearer ${token}` },
      payload: { blank: true, title: 'Multi-user Resume' },
    })
    assert.equal(created.statusCode, 201)
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    if (previousApiKey === undefined) delete process.env.RESUME_PLATFORM_API_KEY
    else process.env.RESUME_PLATFORM_API_KEY = previousApiKey
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('registration can be disabled by environment flag', async () => {
  const previousAllowRegistration = process.env.RESUME_AUTH_ALLOW_REGISTRATION
  process.env.RESUME_AUTH_ALLOW_REGISTRATION = 'false'
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'disabled@example.com',
        password: 'correct-horse-battery',
      },
    })
    assert.equal(response.statusCode, 403)
    assert.equal(response.json().error, 'Registration is disabled')
  } finally {
    if (previousAllowRegistration === undefined) delete process.env.RESUME_AUTH_ALLOW_REGISTRATION
    else process.env.RESUME_AUTH_ALLOW_REGISTRATION = previousAllowRegistration
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('expired account sessions are rejected', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const store = createStore({ dataDir: dir })
  const app = await buildApp(store)
  const token = 'expired-session-token'

  try {
    const account = await store.createUserWorkspace({
      email: 'expired@example.com',
      displayName: 'Expired User',
      passwordHash: 'hash-expired',
    })
    await store.createSession({
      userId: account.user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(response.statusCode, 401)
    assert.equal(response.json().error, 'Invalid or expired account session')
  } finally {
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('admin API enforces token auth and super admin permissions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))
  const previousAdminUsers = process.env.RESUME_ADMIN_USERS
  process.env.RESUME_ADMIN_USERS = JSON.stringify([
    { email: 'owner@example.com', token: 'owner-token', role: 'super_admin' },
    { email: 'viewer@example.com', token: 'viewer-token', role: 'viewer' },
    { email: 'locked@example.com', token: 'locked-token', role: 'super_admin', status: 'locked' },
  ])

  try {
    const unauthenticated = await app.inject({ method: 'GET', url: '/api/admin/state' })
    assert.equal(unauthenticated.statusCode, 401)

    const viewerSession = await app.inject({
      method: 'GET',
      url: '/api/admin/session',
      headers: { 'x-admin-token': 'viewer-token' },
    })
    assert.equal(viewerSession.statusCode, 200)
    assert.equal(viewerSession.json().email, 'viewer@example.com')
    assert.equal(viewerSession.json().role, 'viewer')
    assert.equal(viewerSession.json().token, undefined)

    const viewerState = await app.inject({
      method: 'GET',
      url: '/api/admin/state',
      headers: { authorization: 'Bearer viewer-token' },
    })
    assert.equal(viewerState.statusCode, 200)

    const viewerClients = await app.inject({
      method: 'GET',
      url: '/api/admin/platform-clients',
      headers: { 'x-admin-token': 'viewer-token' },
    })
    assert.equal(viewerClients.statusCode, 403)

    const locked = await app.inject({
      method: 'GET',
      url: '/api/admin/session',
      headers: { 'x-admin-token': 'locked-token' },
    })
    assert.equal(locked.statusCode, 403)

    const superClients = await app.inject({
      method: 'GET',
      url: '/api/admin/platform-clients',
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(superClients.statusCode, 200)
    assert.equal(superClients.json()[0].id, 'development-open-access')
  } finally {
    if (previousAdminUsers === undefined) {
      delete process.env.RESUME_ADMIN_USERS
    } else {
      process.env.RESUME_ADMIN_USERS = previousAdminUsers
    }
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('admin users API lists users and manages locks, sessions, and audit logs', async () => {
  const previousAdminUsers = process.env.RESUME_ADMIN_USERS
  process.env.RESUME_ADMIN_USERS = JSON.stringify([
    { email: 'owner@example.com', token: 'owner-token', role: 'super_admin' },
    { email: 'viewer@example.com', token: 'viewer-token', role: 'viewer' },
  ])
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const store = createStore({ dataDir: dir })
  const app = await buildApp(store)

  try {
    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'managed@example.com',
        password: 'correct-horse-battery',
        displayName: 'Managed User',
      },
    })
    assert.equal(registered.statusCode, 201)
    const userId = registered.json().user.id
    const token = registered.json().token

    const resume = await app.inject({
      method: 'POST',
      url: '/api/resumes',
      headers: { authorization: `Bearer ${token}` },
      payload: { blank: true, title: 'Managed Resume' },
    })
    assert.equal(resume.statusCode, 201)

    const application = await app.inject({
      method: 'POST',
      url: '/api/applications',
      headers: { authorization: `Bearer ${token}` },
      payload: { company: 'Managed Co', role: 'Operations Engineer' },
    })
    assert.equal(application.statusCode, 201)

    const listed = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { 'x-admin-token': 'viewer-token' },
    })
    assert.equal(listed.statusCode, 200)
    const managed = listed.json().find((user: { id: string }) => user.id === userId)
    assert.ok(managed)
    assert.equal(JSON.stringify(managed).includes('passwordHash'), false)
    assert.equal(managed.email, 'managed@example.com')
    assert.equal(managed.workspace.role, 'owner')
    assert.ok(managed.resumeCount >= 1)
    assert.ok(managed.applicationCount >= 1)

    const viewerLock = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userId}/lock`,
      headers: { 'x-admin-token': 'viewer-token' },
    })
    assert.equal(viewerLock.statusCode, 403)

    const locked = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userId}/lock`,
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(locked.statusCode, 200)
    assert.equal(locked.json().user.status, 'locked')
    assert.ok(locked.json().revokedSessions >= 1)

    const invalidated = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(invalidated.statusCode, 401)

    const lockedLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'managed@example.com', password: 'correct-horse-battery' },
    })
    assert.equal(lockedLogin.statusCode, 403)
    assert.equal(lockedLogin.json().error, 'Account is locked')

    const unlocked = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userId}/unlock`,
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(unlocked.statusCode, 200)
    assert.equal(unlocked.json().user.status, 'enabled')

    const restoredLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'managed@example.com', password: 'correct-horse-battery' },
    })
    assert.equal(restoredLogin.statusCode, 200)
    const restoredToken = restoredLogin.json().token

    const forcedOffline = await app.inject({
      method: 'DELETE',
      url: `/api/admin/users/${userId}/sessions`,
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(forcedOffline.statusCode, 200)
    assert.ok(forcedOffline.json().revokedSessions >= 1)

    const forcedSession = await app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { authorization: `Bearer ${restoredToken}` },
    })
    assert.equal(forcedSession.statusCode, 401)

    const localOwnerLock = await app.inject({
      method: 'POST',
      url: '/api/admin/users/local-owner/lock',
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(localOwnerLock.statusCode, 400)

    const auditLogs = await store.listAuditLogs()
    const lockLog = auditLogs.find((log: { action: string; objectId: string }) =>
      log.action === 'admin.user.lock' && log.objectId === userId)
    const unlockLog = auditLogs.find((log: { action: string; objectId: string }) =>
      log.action === 'admin.user.unlock' && log.objectId === userId)
    const revokeLog = auditLogs.find((log: { action: string; objectId: string }) =>
      log.action === 'admin.user.sessions.revoke' && log.objectId === userId)
    assert.ok(lockLog)
    assert.ok(unlockLog)
    assert.ok(revokeLog)
    assert.equal(lockLog.actorEmail, 'owner@example.com')
    assert.equal(lockLog.targetEmail, 'managed@example.com')
  } finally {
    if (previousAdminUsers === undefined) delete process.env.RESUME_ADMIN_USERS
    else process.env.RESUME_ADMIN_USERS = previousAdminUsers
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('platform API generates JD-tailored resume drafts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/assistant/resume-drafts',
      payload: platformPayload(),
    })

    assert.equal(response.statusCode, 200)
    const draft = response.json()
    assert.equal(draft.requestId, 'req-platform-1')
    assert.equal(draft.userId, 'user-42')
    assert.equal(draft.data.personal.name, 'Lin Chen')
    assert.equal(draft.data.personal.title, 'Senior Product Engineer')
    assert.ok(draft.data.personal.summary.includes('Senior Product Engineer'))
    assert.equal(draft.data.experience[0].company, 'Acme AI')
    assert.equal(draft.data.experience[0].sourceId, 'work-ai')
    assert.ok(draft.data.experience[0].description.includes('LLM'))
    assert.ok(draft.match.score >= 50)
    assert.ok(draft.match.matchedKeywords.includes('LLM'))
    assert.equal(draft.match.selectedExperienceIds[0], 'work-ai')
    assert.equal(draft.match.selectedExperienceIndexes[0], 0)
    assert.equal(draft.generation.persisted, false)
  } finally {
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('platform API supports API key auth and optional persistence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))
  const previousApiKey = process.env.RESUME_PLATFORM_API_KEY
  process.env.RESUME_PLATFORM_API_KEY = 'secret-platform-key'

  try {
    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      payload: platformPayload(),
    })
    assert.equal(unauthorized.statusCode, 401)

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      headers: { 'x-resume-api-key': 'secret-platform-key' },
      payload: platformPayload({ persist: true }),
    })
    assert.equal(created.statusCode, 201)
    const draft = created.json()
    assert.equal(draft.generation.persisted, true)
    assert.match(draft.generation.documentId, /^resume-/)

    const document = await app.inject({
      method: 'GET',
      url: `/api/resumes/${draft.generation.documentId}`,
    })
    assert.equal(document.statusCode, 200)
    assert.equal(document.json().data.personal.title, 'Senior Product Engineer')

    const replayed = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      headers: { 'x-resume-api-key': 'secret-platform-key' },
      payload: platformPayload({ persist: true }),
    })
    assert.equal(replayed.statusCode, 200)
    assert.equal(replayed.json().generation.idempotent, true)
    assert.equal(replayed.json().generation.documentId, draft.generation.documentId)

    const requests = await app.inject({
      method: 'GET',
      url: '/api/v1/platform/requests',
      headers: { authorization: 'Bearer secret-platform-key' },
    })
    assert.equal(requests.statusCode, 200)
    assert.equal(requests.json()[0].requestId, 'req-platform-1')
    assert.equal(requests.json()[0].documentId, draft.generation.documentId)
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.RESUME_PLATFORM_API_KEY
    } else {
      process.env.RESUME_PLATFORM_API_KEY = previousApiKey
    }
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('platform API accepts bearer auth and rejects invalid payloads', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))
  const previousApiKey = process.env.RESUME_PLATFORM_API_KEY
  process.env.RESUME_PLATFORM_API_KEY = 'bearer-secret'

  try {
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/platform/resume-drafts',
      headers: { authorization: 'Bearer bearer-secret' },
      payload: { requestId: 'invalid-payload', userId: 'user-invalid', jobDescription: { title: '' }, workHistory: [] },
    })
    assert.equal(invalid.statusCode, 400)
    assert.equal(invalid.json().error, 'Validation failed')

    const generated = await app.inject({
      method: 'POST',
      url: '/api/platform/resume-drafts',
      headers: { authorization: 'Bearer bearer-secret' },
      payload: platformPayload({ persist: false }),
    })
    assert.equal(generated.statusCode, 200)
    assert.equal(generated.json().generation.persisted, false)

    const assistant = await app.inject({
      method: 'POST',
      url: '/api/assistant/resume-drafts',
      payload: platformPayload({ persist: true }),
    })
    assert.equal(assistant.statusCode, 200)
    assert.equal(assistant.json().generation.persisted, false)

    const requests = await app.inject({
      method: 'GET',
      url: '/api/v1/platform/requests',
      headers: { authorization: 'Bearer bearer-secret' },
    })
    assert.equal(requests.statusCode, 200)
    const failed = requests.json().find((request: { requestId?: string }) => request.requestId === 'invalid-payload')
    assert.equal(failed.status, 'failed')
    assert.equal(failed.route, 'api-v1-platform')
    assert.equal(failed.error, 'Validation failed')
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.RESUME_PLATFORM_API_KEY
    } else {
      process.env.RESUME_PLATFORM_API_KEY = previousApiKey
    }
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('platform API exposes OpenAPI and enforces client scopes, quota, and rate limits', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))
  const previousApiKey = process.env.RESUME_PLATFORM_API_KEY
  const previousClients = process.env.RESUME_PLATFORM_CLIENTS
  const previousAdminUsers = process.env.RESUME_ADMIN_USERS
  delete process.env.RESUME_PLATFORM_API_KEY
  process.env.RESUME_ADMIN_USERS = JSON.stringify([
    { email: 'owner@example.com', token: 'owner-token', role: 'super_admin' },
  ])
  process.env.RESUME_PLATFORM_CLIENTS = JSON.stringify([
    {
      id: 'futurehire',
      key: 'futurehire-key',
      scopes: ['drafts:write', 'requests:read'],
      quotaPerDay: 1,
      rateLimitPerMinute: 10,
      pricePerDraft: 0.5,
      currency: 'USD',
    },
    {
      id: 'readonly',
      key: 'readonly-key',
      scopes: ['requests:read'],
    },
    {
      id: 'burst',
      key: 'burst-key',
      scopes: ['drafts:write'],
      quotaPerDay: 10,
      rateLimitPerMinute: 1,
    },
  ])

  try {
    const openapi = await app.inject({ method: 'GET', url: '/api/v1/openapi.json' })
    assert.equal(openapi.statusCode, 200)
    const openapiBody = openapi.json()
    assert.equal(openapiBody.openapi, '3.1.0')
    assert.ok(openapiBody.paths['/api/v1/resume-drafts'])
    assert.equal(
      openapiBody.paths['/api/v1/resume-drafts'].post.requestBody.content['application/json'].schema.$ref,
      '#/components/schemas/ResumeDraftRequest',
    )
    assert.equal(
      openapiBody.paths['/api/v1/resume-drafts'].post.responses[201].content['application/json'].schema.$ref,
      '#/components/schemas/ResumeDraftResponse',
    )
    assert.equal(
      openapiBody.paths['/api/v1/resume-drafts'].post.responses[400].content['application/json'].schema.$ref,
      '#/components/schemas/PlatformError',
    )
    assert.equal(
      openapiBody.paths['/api/v1/platform/requests'].get.responses[200].content['application/json'].schema.items.$ref,
      '#/components/schemas/PlatformRequestLog',
    )
    assert.deepEqual(openapiBody.components.schemas.ResumeDraftRequest.required, ['workHistory', 'jobDescription'])
    assert.match(openapiBody.components.schemas.ResumeDraftRequest.properties.requestId.description, /idempotent/)
    assert.ok(openapiBody.components.schemas.ResumeDraftResponse.properties.generation.properties.idempotent)
    assert.ok(openapiBody.components.schemas.PlatformRequestLog.properties.error)
    assert.deepEqual(openapiBody.components.schemas.PlatformError.required, ['error'])
    assert.match(openapiBody['x-curl-example'], /curl -X POST/)
    assert.match(openapiBody['x-idempotency'], /persist=true/)
    assert.match(openapiBody['x-authentication'], /x-resume-api-key/)

    const missingScope = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      headers: { 'x-resume-api-key': 'readonly-key' },
      payload: platformPayload({ requestId: 'scope-denied', persist: false }),
    })
    assert.equal(missingScope.statusCode, 403)
    assert.match(missingScope.json().error, /drafts:write/)

    const generated = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      headers: { 'x-resume-api-key': 'futurehire-key' },
      payload: platformPayload({ requestId: 'futurehire-1', persist: false }),
    })
    assert.equal(generated.statusCode, 200)

    const overQuota = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      headers: { 'x-resume-api-key': 'futurehire-key' },
      payload: platformPayload({ requestId: 'futurehire-2', persist: false }),
    })
    assert.equal(overQuota.statusCode, 429)
    assert.match(overQuota.json().error, /quota/)

    const requests = await app.inject({
      method: 'GET',
      url: '/api/v1/platform/requests',
      headers: { 'x-resume-api-key': 'futurehire-key' },
    })
    assert.equal(requests.statusCode, 200)
    assert.equal(requests.json().length, 2)
    const quotaFailure = requests.json().find((request: { requestId?: string }) => request.requestId === 'futurehire-2')
    assert.equal(quotaFailure.clientId, 'futurehire')
    assert.equal(quotaFailure.status, 'failed')
    assert.equal(quotaFailure.route, 'api-v1')
    assert.match(quotaFailure.error, /quota/)
    const successfulRequest = requests.json().find((request: { requestId?: string }) => request.requestId === 'futurehire-1')
    assert.equal(successfulRequest.status, 'draft')
    assert.equal(typeof successfulRequest.latencyMs, 'number')

    const clients = await app.inject({
      method: 'GET',
      url: '/api/admin/platform-clients',
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(clients.statusCode, 200)
    assert.equal(clients.json().length, 3)
    assert.equal(clients.json()[0].id, 'futurehire')
    assert.equal(clients.json()[0].hasKey, true)
    assert.equal(clients.json()[0].requestCount, 2)
    assert.equal(clients.json()[0].failedRequestCount, 1)
    assert.equal(clients.json()[0].quotaPerDay, 1)
    assert.equal(clients.json()[0].key, undefined)
    assert.deepEqual(clients.json()[1].scopes, ['requests:read'])

    const adminUsage = await app.inject({
      method: 'GET',
      url: '/api/admin/platform-usage',
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(adminUsage.statusCode, 200)
    const usageBody = adminUsage.json()
    assert.equal(usageBody.totals.clients, 3)
    const futurehireUsage = usageBody.clients.find((client: { clientId: string }) => client.clientId === 'futurehire')
    assert.equal(futurehireUsage.totalRequests, 2)
    assert.equal(futurehireUsage.failedRequests, 1)
    assert.equal(futurehireUsage.billableRequests, 1)
    assert.equal(futurehireUsage.estimatedCost, 0.5)
    assert.equal(futurehireUsage.currency, 'USD')

    const clientUsage = await app.inject({
      method: 'GET',
      url: '/api/v1/platform/usage',
      headers: { 'x-resume-api-key': 'futurehire-key' },
    })
    assert.equal(clientUsage.statusCode, 200)
    assert.equal(clientUsage.json().clients.length, 1)
    assert.equal(clientUsage.json().clients[0].clientId, 'futurehire')

    const adminState = await app.inject({
      method: 'GET',
      url: '/api/admin/state',
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(adminState.statusCode, 200)
    const adminFailure = adminState.json().platformRequests.find((request: { requestId?: string }) => request.requestId === 'futurehire-2')
    assert.equal(adminFailure.status, 'failed')
    assert.match(adminFailure.error, /quota/)

    const firstBurst = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      headers: { 'x-resume-api-key': 'burst-key' },
      payload: platformPayload({ requestId: 'burst-1', persist: false }),
    })
    assert.equal(firstBurst.statusCode, 200)

    const rateLimited = await app.inject({
      method: 'POST',
      url: '/api/v1/resume-drafts',
      headers: { 'x-resume-api-key': 'burst-key' },
      payload: platformPayload({ requestId: 'burst-2', persist: false }),
    })
    assert.equal(rateLimited.statusCode, 429)
    assert.match(rateLimited.json().error, /rate limit/)
  } finally {
    if (previousApiKey === undefined) {
      delete process.env.RESUME_PLATFORM_API_KEY
    } else {
      process.env.RESUME_PLATFORM_API_KEY = previousApiKey
    }
    if (previousClients === undefined) {
      delete process.env.RESUME_PLATFORM_CLIENTS
    } else {
      process.env.RESUME_PLATFORM_CLIENTS = previousClients
    }
    if (previousAdminUsers === undefined) {
      delete process.env.RESUME_ADMIN_USERS
    } else {
      process.env.RESUME_ADMIN_USERS = previousAdminUsers
    }
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('resume drafts return a structured diff and fall back to rule-based without an LLM key', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))
  const previousKey = process.env.RESUME_LLM_API_KEY
  delete process.env.RESUME_LLM_API_KEY

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/assistant/resume-drafts',
      payload: platformPayload({ persist: false }),
    })

    assert.equal(response.statusCode, 200)
    const draft = response.json()
    assert.equal(draft.generation.strategy, 'rule-based-jd-tailoring-v1')
    assert.ok(Array.isArray(draft.diff))
    assert.ok(draft.diff.length > 0)

    const summaryOp = draft.diff.find((op: { section: string }) => op.section === 'summary')
    assert.ok(summaryOp)
    assert.equal(summaryOp.source, 'rule-based')
    assert.equal(summaryOp.field, 'personal.summary')
    assert.ok(summaryOp.after.length > 0)
    assert.ok(typeof summaryOp.confidence === 'number')
    assert.notEqual(summaryOp.before, summaryOp.after)
  } finally {
    if (previousKey === undefined) delete process.env.RESUME_LLM_API_KEY
    else process.env.RESUME_LLM_API_KEY = previousKey
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('auth accepts sha256-hashed secrets and rate limits failed attempts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))
  const previousAdminUsers = process.env.RESUME_ADMIN_USERS
  const previousClients = process.env.RESUME_PLATFORM_CLIENTS
  const previousApiKey = process.env.RESUME_PLATFORM_API_KEY
  delete process.env.RESUME_PLATFORM_API_KEY
  process.env.RESUME_ADMIN_USERS = JSON.stringify([
    {
      email: 'hashed@example.com',
      tokenHash: createHash('sha256').update('hashed-admin-token').digest('hex'),
      role: 'super_admin',
    },
  ])
  process.env.RESUME_PLATFORM_CLIENTS = JSON.stringify([
    {
      id: 'hashed-client',
      keyHash: createHash('sha256').update('hashed-platform-key').digest('hex'),
      scopes: ['requests:read'],
    },
  ])

  try {
    const session = await app.inject({
      method: 'GET',
      url: '/api/admin/session',
      headers: { 'x-admin-token': 'hashed-admin-token' },
    })
    assert.equal(session.statusCode, 200)
    assert.equal(session.json().email, 'hashed@example.com')

    const requests = await app.inject({
      method: 'GET',
      url: '/api/v1/platform/requests',
      headers: { 'x-resume-api-key': 'hashed-platform-key' },
    })
    assert.equal(requests.statusCode, 200)

    const wrongKey = await app.inject({
      method: 'GET',
      url: '/api/v1/platform/requests',
      headers: { 'x-resume-api-key': 'wrong-key' },
    })
    assert.equal(wrongKey.statusCode, 401)

    let lastStatus = 0
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const failed = await app.inject({
        method: 'GET',
        url: '/api/admin/session',
        headers: { 'x-admin-token': 'wrong-token' },
      })
      lastStatus = failed.statusCode
    }
    assert.equal(lastStatus, 429)

    const lockedOut = await app.inject({
      method: 'GET',
      url: '/api/admin/session',
      headers: { 'x-admin-token': 'hashed-admin-token' },
    })
    assert.equal(lockedOut.statusCode, 429)
  } finally {
    if (previousAdminUsers === undefined) delete process.env.RESUME_ADMIN_USERS
    else process.env.RESUME_ADMIN_USERS = previousAdminUsers
    if (previousClients === undefined) delete process.env.RESUME_PLATFORM_CLIENTS
    else process.env.RESUME_PLATFORM_CLIENTS = previousClients
    if (previousApiKey === undefined) delete process.env.RESUME_PLATFORM_API_KEY
    else process.env.RESUME_PLATFORM_API_KEY = previousApiKey
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('billing API reports free quotas, consumes exports, and resets on a new period key', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  process.env.RESUME_AUTH_MODE = 'multi-user'
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const store = createStore({ dataDir: dir })
  const app = await buildApp(store)

  try {
    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'quota@example.com',
        password: 'correct-horse-battery',
        displayName: 'Quota User',
      },
    })
    assert.equal(registered.statusCode, 201)
    const token = registered.json().token
    const userId = registered.json().user.id

    const billing = await app.inject({
      method: 'GET',
      url: '/api/billing/me',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(billing.statusCode, 200)
    assert.equal(billing.json().plan, 'free')
    assert.equal(billing.json().status, 'active')
    assert.equal(billing.json().currentPeriodEnd, null)
    assert.equal(billing.json().quotas.aiDraft.limit, 3)
    assert.equal(billing.json().quotas.aiDraft.used, 0)
    assert.equal(billing.json().quotas.aiDraft.remaining, 3)
    assert.equal(typeof billing.json().quotas.aiDraft.resetAt, 'string')
    assert.equal(billing.json().quotas.export.limit, 5)
    assert.equal(billing.json().quotas.export.used, 0)
    assert.equal(billing.json().quotas.export.remaining, 5)

    for (let index = 1; index <= 5; index += 1) {
      const consumed = await app.inject({
        method: 'POST',
        url: '/api/billing/usage/export',
        headers: { authorization: `Bearer ${token}` },
      })
      assert.equal(consumed.statusCode, 200)
      assert.equal(consumed.json().quotas.export.used, index)
      assert.equal(consumed.json().quotas.export.remaining, 5 - index)
    }

    const overLimit = await app.inject({
      method: 'POST',
      url: '/api/billing/usage/export',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(overLimit.statusCode, 402)
    assert.match(overLimit.json().error, /Export quota exceeded/)

    const db = new Database(store.dbPath)
    db.prepare(`
      UPDATE usage_counters
      SET period_key = ?, updated_at = ?
      WHERE user_id = ? AND kind = ?
    `).run('2000-01', new Date().toISOString(), userId, 'export')
    db.close()

    const reset = await app.inject({
      method: 'POST',
      url: '/api/billing/usage/export',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(reset.statusCode, 200)
    assert.equal(reset.json().quotas.export.used, 1)
    assert.equal(reset.json().quotas.export.remaining, 4)
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('admin plan changes grant unlimited Pro, write audit, and expired Pro falls back to free', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  const previousAdminUsers = process.env.RESUME_ADMIN_USERS
  process.env.RESUME_AUTH_MODE = 'multi-user'
  process.env.RESUME_ADMIN_USERS = JSON.stringify([
    { email: 'owner@example.com', token: 'owner-token', role: 'super_admin' },
  ])
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const store = createStore({ dataDir: dir })
  const app = await buildApp(store)

  try {
    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'pro-user@example.com',
        password: 'correct-horse-battery',
        displayName: 'Pro User',
      },
    })
    assert.equal(registered.statusCode, 201)
    const token = registered.json().token
    const userId = registered.json().user.id
    const periodEnd = new Date(Date.now() + 86_400_000).toISOString()

    const changed = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userId}/plan`,
      headers: { 'x-admin-token': 'owner-token' },
      payload: { plan: 'pro', periodEnd },
    })
    assert.equal(changed.statusCode, 200)
    assert.equal(changed.json().billing.plan, 'pro')
    assert.equal(changed.json().billing.status, 'active')
    assert.equal(changed.json().billing.currentPeriodEnd, periodEnd)
    assert.equal(changed.json().billing.quotas.export.limit, null)
    assert.equal(changed.json().billing.quotas.export.remaining, null)

    const listed = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(listed.statusCode, 200)
    assert.equal(listed.json().find((user: { id: string }) => user.id === userId).plan, 'pro')

    for (let index = 0; index < 7; index += 1) {
      const consumed = await app.inject({
        method: 'POST',
        url: '/api/billing/usage/export',
        headers: { authorization: `Bearer ${token}` },
      })
      assert.equal(consumed.statusCode, 200)
      assert.equal(consumed.json().quotas.export.limit, null)
      assert.equal(consumed.json().quotas.export.remaining, null)
    }

    const auditLogs = await store.listAuditLogs()
    const planLog = auditLogs.find((log: { action: string; objectId: string }) =>
      log.action === 'admin.user.plan.update' && log.objectId === userId)
    assert.ok(planLog)
    assert.equal(planLog.actorEmail, 'owner@example.com')
    assert.equal(planLog.metadata.targetPlan, 'pro')
    assert.equal(planLog.metadata.targetEmail, 'pro-user@example.com')

    const expiredEnd = new Date(Date.now() - 86_400_000).toISOString()
    const db = new Database(store.dbPath)
    db.prepare(`
      UPDATE subscriptions
      SET plan = ?, status = ?, current_period_end = ?, updated_at = ?
      WHERE user_id = ?
    `).run('pro', 'active', expiredEnd, new Date().toISOString(), userId)
    db.close()

    const expired = await app.inject({
      method: 'GET',
      url: '/api/billing/me',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(expired.statusCode, 200)
    assert.equal(expired.json().plan, 'free')
    assert.equal(expired.json().status, 'expired')
    assert.equal(expired.json().currentPeriodEnd, expiredEnd)
    assert.equal(expired.json().quotas.export.limit, 5)

    const listedAfterExpiry = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { 'x-admin-token': 'owner-token' },
    })
    assert.equal(listedAfterExpiry.statusCode, 200)
    assert.equal(listedAfterExpiry.json().find((user: { id: string }) => user.id === userId).plan, 'free')
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    if (previousAdminUsers === undefined) delete process.env.RESUME_ADMIN_USERS
    else process.env.RESUME_ADMIN_USERS = previousAdminUsers
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('multi-user assistant resume drafts consume AI quota and return 402 over limit', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  const previousKey = process.env.RESUME_LLM_API_KEY
  process.env.RESUME_AUTH_MODE = 'multi-user'
  delete process.env.RESUME_LLM_API_KEY
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'ai-quota@example.com',
        password: 'correct-horse-battery',
        displayName: 'AI Quota User',
      },
    })
    assert.equal(registered.statusCode, 201)
    const token = registered.json().token

    for (let index = 1; index <= 3; index += 1) {
      const generated = await app.inject({
        method: 'POST',
        url: '/api/assistant/resume-drafts',
        headers: { authorization: `Bearer ${token}` },
        payload: platformPayload({ requestId: `ai-quota-${index}` }),
      })
      assert.equal(generated.statusCode, 200)
      assert.equal(generated.json().generation.persisted, false)
    }

    const overLimit = await app.inject({
      method: 'POST',
      url: '/api/assistant/resume-drafts',
      headers: { authorization: `Bearer ${token}` },
      payload: platformPayload({ requestId: 'ai-quota-4' }),
    })
    assert.equal(overLimit.statusCode, 402)
    assert.match(overLimit.json().error, /AI resume draft quota exceeded/)

    const billing = await app.inject({
      method: 'GET',
      url: '/api/billing/me',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(billing.statusCode, 200)
    assert.equal(billing.json().quotas.aiDraft.used, 3)
    assert.equal(billing.json().quotas.aiDraft.remaining, 0)
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    if (previousKey === undefined) delete process.env.RESUME_LLM_API_KEY
    else process.env.RESUME_LLM_API_KEY = previousKey
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('local mode assistant resume drafts do not enforce server AI quota', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  const previousKey = process.env.RESUME_LLM_API_KEY
  delete process.env.RESUME_AUTH_MODE
  delete process.env.RESUME_LLM_API_KEY
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    for (let index = 1; index <= 4; index += 1) {
      const generated = await app.inject({
        method: 'POST',
        url: '/api/assistant/resume-drafts',
        payload: platformPayload({ requestId: `local-ai-${index}` }),
      })
      assert.equal(generated.statusCode, 200)
    }

    const billing = await app.inject({
      method: 'GET',
      url: '/api/billing/me',
    })
    assert.equal(billing.statusCode, 200)
    assert.equal(billing.json().quotas.aiDraft.used, 0)
    assert.equal(billing.json().quotas.aiDraft.remaining, 3)
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    if (previousKey === undefined) delete process.env.RESUME_LLM_API_KEY
    else process.env.RESUME_LLM_API_KEY = previousKey
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('resume shares create public snapshots, count views, and revoke with uniform 404s', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  delete process.env.RESUME_AUTH_MODE
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/shares',
      payload: { resumeId: 'resume-main', expiresInDays: 7 },
    })
    assert.equal(created.statusCode, 201)
    const share = created.json()
    assert.match(share.id, /^[0-9A-Za-z]{8,10}$/)
    assert.equal(share.path, `/api/public/shares/${share.id}`)
    assert.equal(share.url, share.path)
    assert.equal(typeof share.expiresAt, 'string')

    const firstView = await app.inject({ method: 'GET', url: share.path })
    assert.equal(firstView.statusCode, 200)
    assert.equal(firstView.json().id, share.id)
    assert.equal(firstView.json().snapshot.title, 'Frontend Engineer')
    assert.equal(firstView.json().snapshot.data.personal.name, 'Zhang Ming')
    assert.equal(firstView.json().workspaceId, undefined)
    assert.equal(firstView.json().userId, undefined)
    assert.equal(JSON.stringify(firstView.json()).includes('local-owner@example.local'), false)

    const listedAfterFirstView = await app.inject({ method: 'GET', url: '/api/shares' })
    assert.equal(listedAfterFirstView.statusCode, 200)
    assert.equal(listedAfterFirstView.json()[0].id, share.id)
    assert.equal(listedAfterFirstView.json()[0].viewCount, 1)
    assert.equal(listedAfterFirstView.json()[0].status, 'active')
    assert.equal(listedAfterFirstView.json()[0].resumeTitle, 'Frontend Engineer')

    const secondView = await app.inject({ method: 'GET', url: share.path })
    assert.equal(secondView.statusCode, 200)
    const listedAfterSecondView = await app.inject({ method: 'GET', url: '/api/shares' })
    assert.equal(listedAfterSecondView.json()[0].viewCount, 2)

    const revoked = await app.inject({ method: 'DELETE', url: `/api/shares/${share.id}` })
    assert.equal(revoked.statusCode, 200)
    assert.equal(revoked.json().ok, true)

    const revokedPublic = await app.inject({ method: 'GET', url: share.path })
    assert.equal(revokedPublic.statusCode, 404)
    const missingPublic = await app.inject({ method: 'GET', url: '/api/public/shares/notfound1' })
    assert.equal(missingPublic.statusCode, 404)
    assert.deepEqual(missingPublic.json(), revokedPublic.json())
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('multi-user shares enforce owner access, expiry, and free versus Pro limits', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  process.env.RESUME_AUTH_MODE = 'multi-user'
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const store = createStore({ dataDir: dir })
  const app = await buildApp(store)

  try {
    const alice = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'share-owner@example.com',
        password: 'correct-horse-battery',
        displayName: 'Share Owner',
      },
    })
    assert.equal(alice.statusCode, 201)
    const aliceToken = alice.json().token
    const aliceUserId = alice.json().user.id

    const aliceResume = await app.inject({
      method: 'POST',
      url: '/api/resumes',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { blank: true, title: 'Alice Public Resume' },
    })
    assert.equal(aliceResume.statusCode, 201)

    const bob = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'share-bob@example.com',
        password: 'correct-horse-battery',
        displayName: 'Share Bob',
      },
    })
    assert.equal(bob.statusCode, 201)
    const bobToken = bob.json().token

    const shares: Array<{ id: string; path: string }> = []
    for (let index = 0; index < 3; index += 1) {
      const created = await app.inject({
        method: 'POST',
        url: '/api/shares',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { resumeId: aliceResume.json().id },
      })
      assert.equal(created.statusCode, 201)
      shares.push(created.json())
    }

    const publicRead = await app.inject({ method: 'GET', url: shares[0].path })
    assert.equal(publicRead.statusCode, 200)
    assert.equal(publicRead.json().workspaceId, undefined)
    assert.equal(publicRead.json().userId, undefined)
    assert.equal(JSON.stringify(publicRead.json()).includes('share-owner@example.com'), false)

    const overLimit = await app.inject({
      method: 'POST',
      url: '/api/shares',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { resumeId: aliceResume.json().id },
    })
    assert.equal(overLimit.statusCode, 402)
    assert.match(overLimit.json().error, /Share quota exceeded/)

    const bobRevoke = await app.inject({
      method: 'DELETE',
      url: `/api/shares/${shares[0].id}`,
      headers: { authorization: `Bearer ${bobToken}` },
    })
    assert.equal(bobRevoke.statusCode, 404)
    assert.deepEqual(bobRevoke.json(), { error: 'Share not found' })

    await store.setUserPlan({
      userId: aliceUserId,
      actorEmail: 'owner@example.com',
      actorRole: 'super_admin',
      plan: 'pro',
    })

    const proShare = await app.inject({
      method: 'POST',
      url: '/api/shares',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { resumeId: aliceResume.json().id },
    })
    assert.equal(proShare.statusCode, 201)

    const anotherProShare = await app.inject({
      method: 'POST',
      url: '/api/shares',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { resumeId: aliceResume.json().id },
    })
    assert.equal(anotherProShare.statusCode, 201)

    const db = new Database(store.dbPath)
    db.prepare('UPDATE resume_shares SET expires_at = ? WHERE id = ?')
      .run(new Date(Date.now() - 60_000).toISOString(), proShare.json().id)
    db.close()

    const expiredPublic = await app.inject({ method: 'GET', url: proShare.json().path })
    assert.equal(expiredPublic.statusCode, 404)
    const missingPublic = await app.inject({ method: 'GET', url: '/api/public/shares/notfound2' })
    assert.equal(missingPublic.statusCode, 404)
    assert.deepEqual(expiredPublic.json(), missingPublic.json())
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('public resume share endpoint rate limits bursts by IP', async () => {
  const previousAuthMode = process.env.RESUME_AUTH_MODE
  delete process.env.RESUME_AUTH_MODE
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  const app = await buildApp(createStore({ dataDir: dir }))

  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/shares',
      payload: { resumeId: 'resume-main' },
    })
    assert.equal(created.statusCode, 201)
    const path = created.json().path

    for (let index = 0; index < 60; index += 1) {
      const response = await app.inject({ method: 'GET', url: path })
      assert.equal(response.statusCode, 200)
    }

    const rateLimited = await app.inject({ method: 'GET', url: path })
    assert.equal(rateLimited.statusCode, 429)
    assert.match(rateLimited.json().error, /rate limit/)
  } finally {
    if (previousAuthMode === undefined) delete process.env.RESUME_AUTH_MODE
    else process.env.RESUME_AUTH_MODE = previousAuthMode
    await app.close()
    await rm(dir, { recursive: true, force: true })
  }
})

function platformPayload(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'req-platform-1',
    userId: 'user-42',
    locale: 'en-US',
    templateId: 'modern',
    personal: {
      name: 'Lin Chen',
      email: 'lin@example.com',
      location: 'Shanghai',
      summary: 'Product engineer focused on AI workflow platforms and measurable delivery.',
    },
    workHistory: [
      {
        id: 'work-ai',
        company: 'Acme AI',
        title: 'Product Engineer',
        startDate: '2022-01',
        current: true,
        description: 'Built LLM workflow tooling with TypeScript, Node.js, and evaluation pipelines.',
        achievements: [
          'Delivered an LLM resume matching service that improved recruiter review speed by 38%',
          'Designed TypeScript APIs for real-time JD parsing and candidate profile analysis',
        ],
        skills: ['TypeScript', 'Node.js', 'LLM', 'API design'],
      },
      {
        id: 'work-frontend',
        company: 'Blue Systems',
        title: 'Frontend Engineer',
        startDate: '2019-06',
        endDate: '2021-12',
        description: 'Created analytics dashboards and reusable Vue components.',
        achievements: ['Reduced dashboard load time by 42%'],
        skills: ['Vue', 'Performance'],
      },
    ],
    education: [{ school: 'Fudan University', degree: 'Bachelor', major: 'Computer Science' }],
    skills: ['TypeScript', 'Node.js', 'Vue', 'LLM evaluation'],
    projects: [{ name: 'AI Resume Studio', role: 'Lead Engineer', tech: 'Fastify, TypeScript, Vue' }],
    jobDescription: {
      company: 'FutureHire',
      title: 'Senior Product Engineer',
      description: 'Build AI recruiting products, LLM workflow APIs, JD matching, and resume generation services.',
      requirements: ['TypeScript and Node.js API design', 'LLM product experience', 'Real-time hiring workflow integrations'],
      keywords: ['LLM', 'TypeScript', 'Node.js', 'API design', 'resume generation'],
    },
    ...overrides,
  }
}
