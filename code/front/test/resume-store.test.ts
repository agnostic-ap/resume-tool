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
  assert.equal(blank.folder, 'General')

  store.renameResume(blank.id, 'Platform Resume')
  assert.equal(store.activeDocument.title, 'Platform Resume')

  store.updateResumeMetadata(blank.id, {
    folder: 'AI Platform',
    targetRole: 'Staff Engineer',
    targetCompany: 'FutureHire',
    tags: ['AI', 'Platform', 'AI'],
    favorite: true,
  })
  assert.equal(store.activeDocument.folder, 'AI Platform')
  assert.deepEqual(store.activeDocument.tags, ['AI', 'Platform'])
  assert.equal(store.activeDocument.favorite, true)

  const copy = store.duplicateResume(blank.id)
  assert.equal(store.activeDocument.sourceResumeId, blank.id)
  assert.equal(store.activeDocument.sourceResumeTitle, 'Platform Resume')
  assert.equal(copy?.archived, false)
  store.toggleResumeArchive(copy!.id)
  assert.equal(store.activeDocument.archived, true)

  store.deleteResume(blank.id)
  assert.equal(store.documents.length, 2)

  const before = store.documents.find((doc) => doc.id === originalId)!.nextCareerUpdateAt
  store.setCareerChecklistItem(originalId, 'projects', true)
  store.setCareerChecklistItem(originalId, 'metrics', true)
  store.setCareerChecklistItem(originalId, 'roleChanges', true)
  store.setCareerChecklistItem(originalId, 'interviewFeedback', true)
  store.setCareerChecklistItem(originalId, 'skills', true)
  store.updateCareerChecklist(originalId, { notes: 'Added platform metrics.' })
  assert.equal(store.documents.find((doc) => doc.id === originalId)?.careerUpdateChecklist.notes, 'Added platform metrics.')
  store.markCareerUpdated(originalId)
  const original = store.documents.find((doc) => doc.id === originalId)!
  assert.notEqual(original.nextCareerUpdateAt, before)
  assert.equal(original.careerUpdateChecklist.projects, false)
  assert.ok(store.daysUntilCareerUpdate(originalId) >= 13)
})

test('resume store keeps workspace and resume appearance colors separate', () => {
  setupStoreHarness()
  const store = useResumeStore()

  store.setThemeColor('#31566A')
  store.setStudioTheme('accent', 'moss')
  store.setTweak('accent', 'ink-only')
  assert.equal(store.config.themeColor, '#31566A')

  store.resetStudioTheme()
  store.resetTweaks()
  assert.equal(store.config.themeColor, '#31566A')
})

test('resume store supports saved opportunities before applying', () => {
  setupStoreHarness()
  const store = useResumeStore()

  const opportunity = store.addApplication({
    company: 'Notion',
    role: 'Product Engineer',
    stage: 'saved',
    nextAction: 'Review JD fit',
  })

  assert.equal(opportunity.stage, 'saved')
  assert.equal(opportunity.appliedAt, '')

  store.updateApplication(opportunity.id, {
    stage: 'applied',
    appliedAt: '2026-05-20',
  })

  const updated = store.applications.find((item) => item.id === opportunity.id)!
  assert.equal(updated.stage, 'applied')
  assert.equal(updated.appliedAt, '2026-05-20')
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
        nextAction: 'Send tailored draft',
        followUpAt: '2026-05-23',
        contactName: 'Jordan',
        contactEmail: 'jordan@example.com',
        jobPostUrl: 'https://jobs.example.com/futurehire-ai',
        jobDescription: {
          company: 'FutureHire',
          title: 'AI Platform Engineer',
          description: 'Build matching services.',
          requirements: ['LLM', 'TypeScript'],
          url: 'https://jobs.example.com/futurehire-ai',
          archivedAt: '2026-05-19T00:00:00.000Z',
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
  assert.equal(store.applications[0].nextAction, 'Send tailored draft')
  assert.equal(store.applications[0].contactEmail, 'jordan@example.com')
  assert.equal(store.applications[0].jobPostUrl, 'https://jobs.example.com/futurehire-ai')
  assert.equal(store.applications[0].jobDescription?.title, 'AI Platform Engineer')
  assert.equal(store.applications[0].jobDescription?.archivedAt, '2026-05-19T00:00:00.000Z')
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
        folder: 'Backend',
        targetRole: 'Compiler Engineer',
        targetCompany: 'Navy',
        tags: ['systems'],
        favorite: true,
        archived: false,
        careerUpdateChecklist: {
          projects: true,
          metrics: false,
          roleChanges: false,
          interviewFeedback: false,
          skills: false,
          notes: 'Remote note',
          updatedAt: '2026-01-02T00:00:00.000Z',
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
    assert.equal(store.activeDocument.folder, 'Backend')
    assert.equal(store.activeDocument.favorite, true)
    assert.equal(store.activeDocument.careerUpdateChecklist.notes, 'Remote note')
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
