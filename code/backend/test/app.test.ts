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
