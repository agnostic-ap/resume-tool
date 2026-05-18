import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useResumeStore } from '../src/stores/resume'
import type { BackendState } from '../src/api/backend'

test('resume store manages multiple resumes and biweekly update dates', () => {
  setupStoreHarness()
  const store = useResumeStore()
  const originalId = store.activeResumeId

  const blank = store.createResume(true)
  assert.equal(store.documents.length, 2)
  assert.equal(store.activeResumeId, blank.id)
  assert.equal(store.data.personal.name, '')
  assert.equal(store.data.experience.length, 0)

  store.renameResume(blank.id, 'Platform Resume')
  assert.equal(store.activeDocument.title, 'Platform Resume')

  store.deleteResume(blank.id)
  assert.equal(store.documents.length, 1)
  assert.equal(store.activeResumeId, originalId)

  const before = store.activeDocument.nextCareerUpdateAt
  store.markCareerUpdated(originalId)
  assert.notEqual(store.activeDocument.nextCareerUpdateAt, before)
  assert.ok(store.daysUntilCareerUpdate(originalId) >= 13)
})

test('resume store imports and exports normalized workspace data', () => {
  setupStoreHarness()
  const store = useResumeStore()

  store.importData(JSON.stringify({
    activeResumeId: 'imported-resume',
    documents: [
      {
        id: 'imported-resume',
        title: 'Imported Resume',
        data: {
          personal: { name: 'Ada Lovelace', title: 'Platform Engineer' },
          experience: [],
          education: [],
          skills: [],
          projects: [],
          awards: [],
        },
        config: {
          locale: 'en-US',
          sectionVisible: { languages: true },
          tweaks: { showAI: false },
        },
      },
    ],
    applications: [
      {
        id: 'app-1',
        company: 'FutureHire',
        role: 'AI Platform Engineer',
        resumeId: 'imported-resume',
        match: 150,
        jobDescription: {
          company: 'FutureHire',
          title: 'AI Platform Engineer',
          description: 'Build matching services.',
          requirements: ['LLM', 'TypeScript'],
        },
        tailoring: {
          requestId: 'jd-run-1',
          draftTitle: 'Imported Draft',
          matchScore: 150,
          matchedKeywords: ['LLM'],
          selectedExperienceIds: ['exp-1'],
          strategy: 'rule-based-jd-tailoring-v1',
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ],
    activityLog: [
      {
        id: 'activity-1',
        type: 'system',
        tag: 'import',
        message: 'Imported by test',
        resumeId: 'imported-resume',
      },
    ],
  }))

  assert.equal(store.activeResumeId, 'imported-resume')
  assert.equal(store.data.personal.name, 'Ada Lovelace')
  assert.equal(store.config.locale, 'en-US')
  assert.equal(store.config.sectionVisible.languages, true)
  assert.equal(store.config.tweaks.showAI, false)
  assert.deepEqual(store.data.languages, [])
  assert.deepEqual(store.data.certifications, [])
  assert.equal(store.applications[0].match, 100)
  assert.equal(store.applications[0].jobDescription?.title, 'AI Platform Engineer')
  assert.equal(store.applications[0].tailoring?.matchScore, 100)
  assert.deepEqual(store.applications[0].tailoring?.matchedKeywords, ['LLM'])

  const exported = JSON.parse(store.exportData())
  assert.equal(exported.activeResumeId, 'imported-resume')
  assert.equal(exported.documents[0].title, 'Imported Resume')
  assert.equal(exported.applications[0].companyMono, 'F')
  assert.equal(exported.applications[0].tailoring.requestId, 'jd-run-1')
})

test('resume store connects to backend and applies remote state', async () => {
  setupStoreHarness()
  const state: BackendState = {
    activeResumeId: 'remote-resume',
    documents: [
      {
        id: 'remote-resume',
        title: 'Remote Resume',
        data: {
          personal: {
            name: 'Grace Hopper',
            title: 'Compiler Engineer',
            phone: '',
            email: 'grace@example.com',
            location: '',
            website: '',
            summary: 'Built reliable systems.',
          },
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
          templateId: 'modern',
          themeColor: '#1F4068',
          fontSize: 14,
          sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages', 'certifications'],
          sectionVisible: {
            summary: true,
            experience: true,
            education: false,
            skills: false,
            projects: false,
            awards: false,
            languages: false,
            certifications: false,
          },
          studioTheme: {
            accent: 'prussian',
            paper: 'white',
            density: 'compact',
            font: 'sans',
            ruleLines: true,
          },
          tweaks: {
            accent: 'prussian',
            paper: 'white',
            density: 'compact',
            font: 'sans',
            fontScale: 100,
            showAI: true,
            showTree: true,
            ruleLines: true,
            marginaliaMode: 'notes',
            aiTone: 'editor',
          },
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        lastCareerUpdateAt: '2026-01-02T00:00:00.000Z',
        nextCareerUpdateAt: '2026-01-16T00:00:00.000Z',
      },
    ],
    applications: [],
    activityLog: [],
  }
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify(state), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch

  try {
    const store = useResumeStore()
    const connected = await store.connectBackend()
    await nextTick()

    assert.equal(connected, true)
    assert.equal(store.backendStatus.online, true)
    assert.equal(store.activeResumeId, 'remote-resume')
    assert.equal(store.data.personal.name, 'Grace Hopper')
    assert.equal(store.config.templateId, 'modern')
  } finally {
    globalThis.fetch = originalFetch
  }
})

function setupStoreHarness() {
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout: globalThis.setTimeout.bind(globalThis),
    },
  })
  setActivePinia(createPinia())
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}
