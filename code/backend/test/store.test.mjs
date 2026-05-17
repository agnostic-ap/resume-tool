import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createStore } from '../src/store.mjs'

test('creates initial state on first read', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })
    const state = await store.readState()
    assert.equal(state.documents.length, 1)
    assert.equal(state.activeResumeId, state.documents[0].id)
    assert.equal(state.activityLog[0].type, 'system')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('creates, updates, selects, and deletes resume documents', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })
    const created = await store.createDocument({ blank: true, title: 'Backend Resume' })
    assert.equal(created.title, 'Backend Resume')

    const updated = await store.updateDocument(created.id, {
      title: 'Backend Resume v2',
      data: { personal: { name: 'Alex', title: 'Platform Engineer' } },
    })
    assert.equal(updated.title, 'Backend Resume v2')
    assert.equal(updated.data.personal.name, 'Alex')

    const selected = await store.selectDocument(created.id)
    assert.equal(selected.id, created.id)

    const deleted = await store.deleteDocument(created.id)
    assert.equal(deleted.deletedId, created.id)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('protects resume deletion edges and relinks applications', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })

    await assert.rejects(
      () => store.deleteDocument('resume-main'),
      /At least one resume must remain/,
    )

    const source = await store.createDocument({ blank: true, title: 'Source Resume' })
    const app = await store.createApplication({
      company: 'OpenAI',
      role: 'Platform Engineer',
      resumeId: source.id,
    })
    const copy = await store.createDocument({ sourceId: source.id, title: 'Source Copy' })
    assert.equal(copy.data.personal.name, source.data.personal.name)

    await assert.rejects(
      () => store.deleteDocument('missing-resume'),
      /Resume not found/,
    )

    const deleted = await store.deleteDocument(source.id)
    assert.equal(deleted.deletedId, source.id)

    const applications = await store.listApplications()
    const relinked = applications.find((item) => item.id === app.id)
    assert.equal(relinked.resumeId, copy.id)
    assert.equal(relinked.resumeTitle, copy.title)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('validates and persists applications', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })
    const app = await store.createApplication({
      company: 'Vercel',
      role: 'Frontend Engineer',
      stage: 'screen',
      match: 92,
    })
    assert.equal(app.companyMono, 'V')
    assert.equal(app.stage, 'screen')
    assert.equal(app.match, 92)

    const updated = await store.updateApplication(app.id, { match: 120, stage: 'offer' })
    assert.equal(updated.match, 100)
    assert.equal(updated.stage, 'offer')

    const state = await store.readState()
    assert.equal(state.applications.length, 1)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('lists activity, deletes applications, and creates assistant suggestions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })
    const app = await store.createApplication({
      company: 'Anthropic',
      role: 'Frontend Engineer',
    })

    const suggestion = await store.createAssistantSuggestion({ prompt: 'match a senior frontend JD' })
    assert.equal(suggestion.prompt, 'match a senior frontend JD')
    assert.match(suggestion.summaryEn, /Tailor the summary/)

    await assert.rejects(
      () => store.createAssistantSuggestion({ prompt: '   ' }),
      /Prompt is required/,
    )

    const deleted = await store.deleteApplication(app.id)
    assert.equal(deleted.deletedId, app.id)
    await assert.rejects(
      () => store.deleteApplication(app.id),
      /Application not found/,
    )

    const activity = await store.listActivity()
    assert.ok(activity.some((entry) => entry.type === 'ai'))
    assert.ok(activity.some((entry) => entry.tag === 'delete'))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
