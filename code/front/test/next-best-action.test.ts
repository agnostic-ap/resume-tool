import assert from 'node:assert/strict'
import test from 'node:test'
import { computeNextBestAction } from '../src/composables/nextBestAction'
import type { JobApplication, ResumeData, SyncOperation } from '../src/types/resume'

function resumeData(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    personal: {
      name: 'Ada Lovelace',
      title: 'AI Platform Engineer',
      phone: '',
      email: 'ada@example.com',
      location: '',
      website: '',
      summary: 'Platform engineer focused on reliable AI workflow systems.',
    },
    experience: [
      {
        id: 'exp-1',
        company: 'Analytical Engines',
        position: 'Platform Engineer',
        location: '',
        startDate: '2024-01',
        endDate: '',
        current: true,
        description: 'Built JD matching workflows and improved recruiter review speed by 38%.',
      },
    ],
    education: [],
    skills: [{ id: 'skill-1', category: 'Platform', items: 'TypeScript, Node.js, LLM workflows' }],
    projects: [],
    awards: [],
    languages: [],
    certifications: [],
    ...overrides,
  }
}

function application(overrides: Partial<JobApplication> & { id: string }): JobApplication {
  return {
    id: overrides.id,
    company: 'FutureHire',
    companyMono: 'F',
    location: '',
    role: 'AI Platform Engineer',
    department: '',
    resumeId: 'resume-main',
    resumeTitle: 'Main Resume',
    stage: 'applied',
    match: 88,
    appliedAt: '2026-06-15',
    nextAction: 'Follow recruiter',
    followUpAt: '',
    contactName: '',
    contactEmail: '',
    jobPostUrl: '',
    notes: '',
    progressLog: [],
    createdAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z',
    ...overrides,
  }
}

function syncOperation(overrides: Partial<SyncOperation>): SyncOperation {
  return {
    id: 'resume:update:resume-main',
    entityType: 'resume',
    operation: 'update',
    entityId: 'resume-main',
    status: 'failed',
    error: 'Network failed',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

test('next best action prioritizes failed sync over other user work', () => {
  const action = computeNextBestAction({
    locale: 'zh-CN',
    data: resumeData(),
    completeness: 100,
    showAI: true,
    applications: [
      application({ id: 'app-overdue', followUpAt: '2026-06-30' }),
    ],
    syncOperations: [syncOperation({})],
    today: '2026-07-02',
  })

  assert.equal(action.kind, 'sync')
  assert.equal(action.severity, 'critical')
  assert.equal(action.primaryCommand, 'sync:retry')
})

test('next best action describes queued sync with cloud wording', () => {
  const action = computeNextBestAction({
    locale: 'zh-CN',
    data: resumeData(),
    completeness: 100,
    showAI: true,
    applications: [],
    syncOperations: [syncOperation({ status: 'local-only' })],
    today: '2026-07-02',
  })

  assert.equal(action.kind, 'sync')
  assert.equal(action.severity, 'warning')
  assert.equal(action.primaryCommand, 'sync:retry')
  assert.equal(action.detail.includes('云端'), true)
  assert.equal(/后端|backend/i.test(action.detail), false)
})

test('next best action guides blank resumes to the first missing core field', () => {
  const action = computeNextBestAction({
    locale: 'zh-CN',
    data: resumeData({
      personal: {
        name: '',
        title: '',
        phone: '',
        email: '',
        location: '',
        website: '',
        summary: '',
      },
      experience: [],
      skills: [],
    }),
    completeness: 0,
    showAI: true,
    applications: [],
    syncOperations: [],
    today: '2026-07-02',
  })

  assert.equal(action.kind, 'onboarding')
  assert.equal(action.targetId, 'personal')
  assert.equal(action.primaryCommand, 'onboarding:personal')
})

test('next best action points complete resumes toward overdue follow-up before export', () => {
  const action = computeNextBestAction({
    locale: 'en-US',
    data: resumeData(),
    completeness: 100,
    showAI: true,
    applications: [
      application({ id: 'app-future', followUpAt: '2026-07-08' }),
      application({ id: 'app-overdue', followUpAt: '2026-07-01' }),
    ],
    syncOperations: [],
    today: '2026-07-02',
  })

  assert.equal(action.kind, 'follow-up')
  assert.equal(action.targetId, 'app-overdue')
  assert.equal(action.primaryCommand, 'application:app-overdue')
})

test('next best action recommends JD tailoring before export for a ready resume', () => {
  const action = computeNextBestAction({
    locale: 'zh-CN',
    data: resumeData(),
    completeness: 92,
    showAI: true,
    applications: [],
    syncOperations: [],
    today: '2026-07-02',
  })

  assert.equal(action.kind, 'jd')
  assert.equal(action.primaryCommand, 'jd')
})

test('next best action keeps JD tailoring available when legacy AI panel setting is off', () => {
  const action = computeNextBestAction({
    locale: 'zh-CN',
    data: resumeData(),
    completeness: 92,
    showAI: false,
    applications: [],
    syncOperations: [],
    today: '2026-07-02',
  })

  assert.equal(action.kind, 'jd')
  assert.equal(action.primaryCommand, 'jd')
})
