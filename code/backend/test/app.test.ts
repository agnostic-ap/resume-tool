import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { createStore } from '../src/store.mjs'

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
      payload: { jobDescription: { title: '' }, workHistory: [] },
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
  delete process.env.RESUME_PLATFORM_API_KEY
  process.env.RESUME_PLATFORM_CLIENTS = JSON.stringify([
    {
      id: 'futurehire',
      key: 'futurehire-key',
      scopes: ['drafts:write', 'requests:read'],
      quotaPerDay: 1,
      rateLimitPerMinute: 10,
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
    assert.equal(openapi.json().openapi, '3.1.0')
    assert.ok(openapi.json().paths['/api/v1/resume-drafts'])
    assert.match(openapi.json()['x-curl-example'], /curl -X POST/)

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
    assert.equal(requests.json().length, 1)
    assert.equal(requests.json()[0].clientId, 'futurehire')
    assert.equal(requests.json()[0].status, 'draft')
    assert.equal(requests.json()[0].route, 'api-v1')
    assert.equal(typeof requests.json()[0].latencyMs, 'number')

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
