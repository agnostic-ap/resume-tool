import assert from 'node:assert/strict'
import test from 'node:test'
import { backendApi } from '../src/api/backend'

test('backendApi sends JSON requests and encodes route params', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return jsonResponse({
      id: 'resume/with spaces',
      title: 'Updated',
      data: { personal: { name: 'Ada' } },
      config: {},
    })
  }) as typeof fetch

  try {
    const result = await backendApi.updateResume('resume/with spaces', { title: 'Updated' } as never)

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'http://127.0.0.1:8787/api/resumes/resume%2Fwith%20spaces')
    assert.equal(calls[0].init?.method, 'PATCH')
    assert.equal((calls[0].init?.headers as Headers).get('content-type'), 'application/json')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { title: 'Updated' })
    assert.equal(result.title, 'Updated')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('backendApi surfaces server error messages', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse({ error: 'Resume not found' }, { status: 404 })) as typeof fetch

  try {
    await assert.rejects(
      () => backendApi.deleteResume('missing'),
      /Resume not found/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('backendApi calls platform resume draft generation', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return jsonResponse({
      title: 'Ada · Platform Engineer',
      data: {
        personal: { name: 'Ada', title: 'Platform Engineer', phone: '', email: '', location: '', website: '', summary: '' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        awards: [],
        languages: [],
        certifications: [],
      },
      config: {
        locale: 'en-US',
        templateId: 'classic',
        themeColor: '#B73E1B',
        fontSize: 14,
        sectionOrder: ['summary'],
        sectionVisible: { summary: true },
        studioTheme: {},
        tweaks: {},
      },
      match: {
        score: 88,
        keywords: ['api'],
        matchedKeywords: ['api'],
        selectedExperienceIds: ['work-1'],
      },
      generation: {
        strategy: 'test',
        generatedAt: '2026-01-01T00:00:00.000Z',
        persisted: false,
      },
    })
  }) as typeof fetch

  try {
    const result = await backendApi.generateResumeDraft({
      locale: 'en-US',
      templateId: 'classic',
      workHistory: [{ id: 'work-1', company: 'Analytical Engines', title: 'Engineer' }],
      jobDescription: { title: 'Platform Engineer', description: 'API platform work' },
    })

    assert.equal(calls[0].url, 'http://127.0.0.1:8787/api/platform/resume-drafts')
    assert.equal(calls[0].init?.method, 'POST')
    assert.equal(JSON.parse(String(calls[0].init?.body)).jobDescription.title, 'Platform Engineer')
    assert.equal(result.match.score, 88)
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { 'content-type': 'application/json' },
  })
}
