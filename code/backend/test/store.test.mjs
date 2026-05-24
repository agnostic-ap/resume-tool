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
    const created = await store.createDocument({
      blank: true,
      title: 'Backend Resume',
      folder: 'Backend',
      targetRole: 'Platform Engineer',
      targetCompany: 'FutureHire',
      tags: ['api', 'backend', 'api'],
    })
    assert.equal(created.title, 'Backend Resume')
    assert.equal(created.folder, 'Backend')
    assert.deepEqual(created.tags, ['api', 'backend'])

    const updated = await store.updateDocument(created.id, {
      title: 'Backend Resume v2',
      data: { personal: { name: 'Alex', title: 'Platform Engineer' } },
      favorite: true,
      archived: true,
      careerUpdateChecklist: {
        projects: true,
        metrics: true,
        roleChanges: true,
        interviewFeedback: true,
        skills: true,
        notes: 'Added backend metrics.',
      },
    })
    assert.equal(updated.title, 'Backend Resume v2')
    assert.equal(updated.data.personal.name, 'Alex')
    assert.equal(updated.favorite, true)
    assert.equal(updated.archived, true)
    assert.equal(updated.careerUpdateChecklist.notes, 'Added backend metrics.')

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
    assert.equal(copy.sourceResumeId, source.id)
    assert.equal(copy.sourceResumeTitle, source.title)

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
      nextAction: 'Schedule screen',
      followUpAt: '2026-05-23',
      contactName: 'Taylor',
      contactEmail: 'taylor@example.com',
      jobPostUrl: 'https://jobs.example.com/vercel',
    })
    assert.equal(app.companyMono, 'V')
    assert.equal(app.stage, 'screen')
    assert.equal(app.match, 92)
    assert.equal(app.nextAction, 'Schedule screen')
    assert.equal(app.jobPostUrl, 'https://jobs.example.com/vercel')

    const updated = await store.updateApplication(app.id, { match: 120, stage: 'offer' })
    assert.equal(updated.match, 100)
    assert.equal(updated.stage, 'offer')

    const state = await store.readState()
    assert.equal(state.applications.length, 1)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('validates and persists career memory entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })
    const entry = await store.createGrowthEntry({
      date: '2026-05-20',
      type: 'metric',
      company: 'FutureHire',
      project: 'JD Matcher',
      title: 'Raised JD match precision',
      content: 'Shipped relevance scoring improvements for resume drafts.',
      metrics: '+18% acceptance on reviewed drafts',
      skills: ['LLM', 'TypeScript', 'LLM'],
      sourceResumeId: 'resume-main',
    })

    assert.equal(entry.type, 'metric')
    assert.equal(entry.sourceResumeTitle, 'Frontend Engineer')
    assert.deepEqual(entry.skills, ['LLM', 'TypeScript'])

    const updated = await store.updateGrowthEntry(entry.id, {
      archived: true,
      usedByResumeIds: ['resume-main', 'resume-main'],
      usedByApplicationIds: ['app-1'],
    })
    assert.equal(updated.archived, true)
    assert.deepEqual(updated.usedByResumeIds, ['resume-main'])
    assert.deepEqual(updated.usedByApplicationIds, ['app-1'])

    const state = await store.readState()
    assert.equal(state.growthEntries.length, 1)
    assert.equal(state.growthEntries[0].title, 'Raised JD match precision')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('persists JD tailoring metadata on applications', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })
    const app = await store.createApplication({
      company: 'FutureHire',
      role: 'AI Platform Engineer',
      match: 91,
      jobDescription: {
        company: 'FutureHire',
        title: 'AI Platform Engineer',
        description: 'Build JD matching and resume generation services.',
        requirements: ['LLM workflow APIs', 'TypeScript'],
      },
      tailoring: {
        requestId: 'jd-run-1',
        sourceResumeId: 'resume-main',
        draftTitle: 'AI Platform Draft',
        matchScore: 91,
        matchedKeywords: ['LLM', 'TypeScript'],
        selectedExperienceIds: ['exp-1'],
        strategy: 'rule-based-jd-tailoring-v1',
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    assert.equal(app.jobDescription.title, 'AI Platform Engineer')
    assert.deepEqual(app.jobDescription.requirements, ['LLM workflow APIs', 'TypeScript'])
    assert.equal(app.tailoring.matchScore, 91)
    assert.deepEqual(app.tailoring.matchedKeywords, ['LLM', 'TypeScript'])

    const state = await store.readState()
    assert.equal(state.applications[0].tailoring.requestId, 'jd-run-1')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('records platform requests and deduplicates persisted drafts by request id', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'resume-backend-'))
  try {
    const store = createStore({ dataDir: dir })
    const draft = {
      title: 'FutureHire Draft',
      data: {
        personal: { name: 'Lin', title: 'AI Engineer', summary: 'Builds AI hiring systems.' },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        awards: [],
        languages: [],
        certifications: [],
      },
      config: { templateId: 'modern' },
      match: { score: 88 },
      generation: { generatedAt: '2026-01-01T00:00:00.000Z' },
    }

    const request = await store.recordPlatformRequest({
      requestId: 'preview-1',
      userId: 'user-1',
      matchScore: 77,
      persisted: false,
      route: 'assistant',
    })
    assert.equal(request.matchScore, 77)

    const first = await store.persistPlatformDraft({ requestId: 'persist-1', userId: 'user-1' }, draft, { route: 'api-v1' })
    const second = await store.persistPlatformDraft({ requestId: 'persist-1', userId: 'user-1' }, draft, { route: 'api-v1' })
    assert.equal(second.documentId, first.documentId)
    assert.equal(second.idempotent, true)

    const state = await store.readState()
    assert.equal(state.documents.filter((doc) => doc.title === 'FutureHire Draft').length, 1)
    assert.ok(state.platformRequests.some((entry) => entry.requestId === 'persist-1' && entry.documentId === first.documentId))
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
