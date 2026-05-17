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
      payload: { company: 'Linear', role: 'Product Engineer', match: 94 },
    })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().companyMono, 'L')

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
      url: '/api/platform/resume-drafts',
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
      url: '/api/platform/resume-drafts',
      payload: platformPayload(),
    })
    assert.equal(unauthorized.statusCode, 401)

    const created = await app.inject({
      method: 'POST',
      url: '/api/platform/resume-drafts',
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
