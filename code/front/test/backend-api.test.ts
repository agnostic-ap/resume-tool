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

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: { 'content-type': 'application/json' },
  })
}
