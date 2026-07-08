import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useResumeStore } from '../src/stores/resume'
import { backendApi, type BackendState, type PlatformResumeDraft } from '../src/api/backend'

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
  assert.equal(blank.origin, 'blank')

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
  assert.equal(store.activeDocument.origin, 'copy')
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
  assert.equal(store.growthEntries.length, 1)
  assert.equal(store.growthEntries[0].sourceResumeId, originalId)
  assert.equal(store.growthEntries[0].type, 'project')
  assert.equal(store.growthEntries[0].content, 'Added platform metrics.')
})

test('resume store marks the current document as blank after clearing sample data', () => {
  setupStoreHarness()
  const store = useResumeStore()

  store.updateResumeMetadata(store.activeResumeId, {
    folder: 'JD Versions',
    targetRole: 'Staff Engineer',
    targetCompany: 'FutureHire',
    tags: ['sample', 'targeted'],
    favorite: true,
  })
  store.clearAll()

  assert.equal(store.activeDocument.origin, 'blank')
  assert.equal(store.activeDocument.folder, 'General')
  assert.equal(store.activeDocument.targetRole, '')
  assert.equal(store.activeDocument.targetCompany, '')
  assert.deepEqual(store.activeDocument.tags, [])
  assert.equal(store.activeDocument.favorite, false)
  assert.equal(store.data.personal.name, '')
  assert.equal(store.data.experience.length, 0)
  assert.equal(store.completeness, 0)
})

test('resume store captures and tracks career memory entries', () => {
  setupStoreHarness()
  const store = useResumeStore()
  const resumeId = store.activeResumeId

  const entry = store.upsertGrowthEntry({
    date: '2026-05-20',
    type: 'metric',
    company: 'FutureHire',
    project: 'JD Matcher',
    title: 'Raised JD match precision',
    content: 'Shipped relevance scoring improvements for resume drafts.',
    metrics: '+18% acceptance on reviewed drafts',
    skills: ['LLM', 'TypeScript', 'Evaluation'],
    evidenceUrl: 'https://example.com/evidence',
    sourceResumeId: resumeId,
  })

  assert.equal(store.growthEntries.length, 1)
  assert.equal(entry.sourceResumeTitle, store.activeDocument.title)
  assert.deepEqual(entry.skills, ['LLM', 'TypeScript', 'Evaluation'])

  store.markGrowthEntryUsed([entry.id], { resumeId, applicationId: 'app-growth-1' })
  assert.deepEqual(store.growthEntries[0].usedByResumeIds, [resumeId])
  assert.deepEqual(store.growthEntries[0].usedByApplicationIds, ['app-growth-1'])

  store.applyJdDraftSections(makeDraft(store), { summary: true }, [entry.id])
  assert.deepEqual(store.growthEntries[0].usedByResumeIds, [resumeId])
  assert.equal(store.growthEntries[0].usedByResumeIds.length, 1)

  store.toggleGrowthEntryArchived(entry.id)
  assert.equal(store.growthEntries[0].archived, true)

  const exported = JSON.parse(store.exportData())
  assert.equal(exported.growthEntries[0].title, 'Raised JD match precision')
  assert.equal(exported.growthEntries[0].archived, true)
})

test('resume store records roadmap product events in activity history', () => {
  setupStoreHarness()
  const store = useResumeStore()

  const event = store.trackProductEvent('jd_draft_requested', {
    resume_id: store.activeResumeId,
    has_company: true,
    jd_length: 640,
  })

  assert.equal(event.tag, 'event:jd_draft_requested')
  assert.equal(event.message, 'jd_draft_requested')
  assert.deepEqual(JSON.parse(event.meta), {
    resume_id: store.activeResumeId,
    has_company: true,
    jd_length: 640,
  })
  assert.equal(store.activityLog[0].tag, 'event:jd_draft_requested')
})

test('resume store logs resume info updates with user-facing copy', () => {
  setupStoreHarness()
  const store = useResumeStore()

  store.updateResumeMetadata(store.activeResumeId, {
    folder: 'Target roles',
    targetRole: 'Frontend Engineer',
    tags: ['frontend', 'jd'],
  })

  const event = store.activityLog[0]
  assert.equal(event.tag, 'meta')
  assert.equal(event.message.includes('metadata'), false)
  assert.equal(event.messageEn.includes('metadata'), false)
  assert.equal(event.messageZh.includes('简历信息'), true)
  assert.equal(event.messageEn.includes('resume details'), true)
})

test('resume store restores deleted resume snapshots for bulk undo', () => {
  setupStoreHarness()
  const store = useResumeStore()
  const source = store.createResume(true)
  store.renameResume(source.id, 'Undo Resume')
  const app = store.addApplication({
    company: 'FutureHire',
    role: 'Platform Engineer',
    resumeId: source.id,
  })
  const snapshot = {
    documents: [JSON.parse(JSON.stringify(source))],
    applications: JSON.parse(JSON.stringify(store.applications)),
    activeResumeId: store.activeResumeId,
  }

  store.deleteResume(source.id)
  assert.equal(store.documents.some((doc) => doc.id === source.id), false)
  assert.notEqual(store.applications.find((item) => item.id === app.id)?.resumeId, source.id)

  const restored = store.restoreDeletedResumes(snapshot)
  assert.equal(restored.length, 1)
  assert.equal(store.documents.some((doc) => doc.id === source.id), true)
  assert.equal(store.applications.find((item) => item.id === app.id)?.resumeId, source.id)
})

test('resume store does not select archived resumes unless explicitly allowed', () => {
  setupStoreHarness()
  const store = useResumeStore()
  const originalId = store.activeResumeId
  const working = store.createResume(true)

  store.updateResumeMetadata(originalId, { archived: true })
  const blocked = store.selectResume(originalId)

  assert.equal(blocked, false)
  assert.equal(store.activeResumeId, working.id)

  const allowed = store.selectResume(originalId, { allowArchived: true })
  assert.equal(allowed, true)
  assert.equal(store.activeResumeId, originalId)
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

test('resume store migrates previous default app palettes to the refreshed style', () => {
  setupStoreHarness()
  const store = useResumeStore()

  store.importData(JSON.stringify({
    activeResumeId: 'legacy-theme-resume',
    documents: [
      {
        id: 'legacy-theme-resume',
        title: 'Legacy Theme Resume',
        origin: 'import',
        data: {
          personal: { name: 'Lin', title: 'Designer' },
          experience: [],
          education: [],
          skills: [],
          projects: [],
          awards: [],
        },
        config: {
          studioTheme: {
            accent: 'coral',
            paper: 'stone',
            density: 'cozy',
            font: 'sans',
            ruleLines: false,
          },
          tweaks: {
            accent: 'coral',
            paper: 'stone',
            density: 'cozy',
            font: 'sans',
            fontScale: 100,
            showAI: false,
            showTree: true,
            ruleLines: false,
            marginaliaMode: 'notes',
            aiTone: 'editor',
          },
        },
      },
    ],
  }))

  assert.equal(store.config.studioTheme.accent, 'ocean')
  assert.equal(store.config.studioTheme.paper, 'mist')
  assert.equal(store.config.tweaks.accent, 'ocean')
  assert.equal(store.config.tweaks.paper, 'mist')
  assert.equal(store.config.tweaks.showAI, false)
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
  assert.equal(opportunity.progressLog.length, 1)
  assert.equal(opportunity.progressLog[0].stage, 'saved')

  store.updateApplication(opportunity.id, {
    stage: 'applied',
    appliedAt: '2026-05-20',
  })

  const updated = store.applications.find((item) => item.id === opportunity.id)!
  assert.equal(updated.stage, 'applied')
  assert.equal(updated.appliedAt, '2026-05-20')
  assert.equal(updated.progressLog.length, 2)
  assert.equal(updated.progressLog[1].stage, 'applied')

  store.updateApplication(opportunity.id, {
    progressLog: [
      ...updated.progressLog,
      {
        id: 'progress-manual',
        stage: 'applied',
        title: 'Manual note',
        note: 'Recruiter replied.',
        happenedAt: '2026-05-21',
        createdAt: '2026-05-21T00:00:00.000Z',
      },
    ],
  })

  const withNote = store.applications.find((item) => item.id === opportunity.id)!
  assert.equal(withNote.progressLog.at(-1)?.note, 'Recruiter replied.')

  store.updateApplication(opportunity.id, {
    progressLog: withNote.progressLog.map((event) => event.id === 'progress-manual'
      ? { ...event, title: 'Recruiter reply', note: 'Recruiter asked for portfolio.', happenedAt: '2026-05-22' }
      : event),
  })

  const withEditedNote = store.applications.find((item) => item.id === opportunity.id)!
  assert.equal(withEditedNote.progressLog.at(-1)?.title, 'Recruiter reply')
  assert.equal(withEditedNote.progressLog.at(-1)?.note, 'Recruiter asked for portfolio.')
  assert.equal(withEditedNote.progressLog.at(-1)?.happenedAt, '2026-05-22')

  store.updateApplication(opportunity.id, {
    progressLog: withEditedNote.progressLog.filter((event) => event.id !== 'progress-manual'),
  })

  const afterDelete = store.applications.find((item) => item.id === opportunity.id)!
  assert.equal(afterDelete.progressLog.some((event) => event.id === 'progress-manual'), false)

  store.updateApplication(opportunity.id, { progressLog: [] })
  assert.equal(store.applications.find((item) => item.id === opportunity.id)?.progressLog.length, 0)
})

test('resume store covers the P0 blank-to-JD-to-application path', async () => {
  setupStoreHarness()
  const store = useResumeStore()
  store.trackProductEvent('onboarding_choice_selected', { choice: 'blank' })
  const blank = store.createResume(true)

  store.data.personal.name = 'Ada Lovelace'
  store.data.personal.email = 'ada@example.com'
  store.data.personal.title = 'AI Platform Engineer'
  store.data.personal.summary = 'Platform engineer focused on reliable AI workflow systems.'
  store.addExperience()
  store.data.experience[0] = {
    id: 'work-p0',
    company: 'Analytical Engines',
    position: 'Platform Engineer',
    location: 'London',
    startDate: '2024-01',
    endDate: '',
    current: true,
    description: 'Built JD matching workflows and improved recruiter review speed by 38%.',
  }
  store.addSkill()
  store.data.skills[0] = { id: 'skill-p0', category: 'Platform', items: 'TypeScript, Node.js, LLM workflows' }

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    requestId: 'p0-jd-1',
    title: 'Ada Lovelace · FutureHire',
    data: {
      ...store.data,
      personal: {
        ...store.data.personal,
        summary: 'AI platform engineer aligned to FutureHire JD matching workflows.',
      },
      skills: [
        { id: 'skill-p0-draft', category: 'Target role keywords', items: 'TypeScript, Node.js, LLM, JD matching' },
      ],
    },
    config: store.config,
    match: {
      score: 91,
      keywords: ['TypeScript', 'LLM', 'JD matching'],
      matchedKeywords: ['TypeScript', 'LLM'],
      selectedExperienceIds: ['work-p0'],
    },
    generation: {
      strategy: 'rule-based-jd-tailoring-v1',
      generatedAt: '2026-05-26T00:00:00.000Z',
      persisted: false,
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch

  try {
    store.trackProductEvent('jd_draft_requested', {
      resume_id: blank.id,
      has_company: true,
      jd_length: 128,
    })
    const draft = await backendApi.generateAssistantResumeDraft({
      requestId: 'p0-jd-1',
      persist: false,
      locale: store.config.locale,
      templateId: store.config.templateId,
      personal: store.data.personal,
      workHistory: store.data.experience.map((item) => ({
        id: item.id,
        company: item.company,
        title: item.position,
        description: item.description,
        skills: ['TypeScript', 'LLM'],
      })),
      skills: ['TypeScript', 'Node.js', 'LLM workflows'],
      jobDescription: {
        company: 'FutureHire',
        title: 'AI Platform Engineer',
        description: 'Build TypeScript and LLM workflows for JD matching.',
      },
    })
    store.trackProductEvent('jd_draft_generated', {
      request_id: draft.requestId,
      score: draft.match.score,
      matched_keyword_count: draft.match.matchedKeywords.length,
    })

    const applied = store.applyJdDraftSections(draft, { summary: true, skills: true })
    assert.deepEqual(applied, ['summary', 'skills'])
    assert.match(store.data.personal.summary, /FutureHire/)
    assert.equal(store.data.experience[0].id, 'work-p0')
    assert.equal(store.data.skills[0].id, 'skill-p0-draft')

    const application = store.createApplicationFromJdDraft(draft, {
      company: 'FutureHire',
      role: 'AI Platform Engineer',
      jobDescription: {
        company: 'FutureHire',
        title: 'AI Platform Engineer',
        location: '',
        description: 'Build TypeScript and LLM workflows for JD matching.',
        requirements: ['TypeScript', 'LLM'],
        url: '',
      },
    })
    store.trackProductEvent('export_precheck_completed', { issue_count: 0, blocking_count: 0 })

    assert.equal(application.company, 'FutureHire')
    assert.equal(application.resumeId, blank.id)
    assert.equal(application.tailoring?.requestId, 'p0-jd-1')
    assert.equal(application.jobDescription?.description, 'Build TypeScript and LLM workflows for JD matching.')
    assert.equal(store.activityLog.some((event) => event.tag === 'event:jd_section_applied' && event.meta.includes('summary')), true)
    assert.equal(store.activityLog.some((event) => event.tag === 'event:application_created_from_jd'), true)
    assert.equal(store.activityLog.some((event) => event.tag === 'event:export_precheck_completed'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
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
        origin: 'import',
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
    growthEntries: [
      {
        id: 'growth-1',
        date: '2026-05-20',
        type: 'achievement',
        company: 'FutureHire',
        project: 'Matching',
        title: 'Imported growth memory',
        content: 'Captured a reusable hiring platform proof point.',
        metrics: '95% p95 under 400ms',
        skills: ['Node.js'],
        sourceResumeId: 'imported-resume',
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
  assert.equal(store.activeDocument.origin, 'import')
  assert.equal(store.applications[0].match, 100)
  assert.equal(store.applications[0].nextAction, 'Send tailored draft')
  assert.equal(store.applications[0].contactEmail, 'jordan@example.com')
  assert.equal(store.applications[0].jobPostUrl, 'https://jobs.example.com/futurehire-ai')
  assert.equal(store.applications[0].jobDescription?.title, 'AI Platform Engineer')
  assert.equal(store.applications[0].jobDescription?.archivedAt, '2026-05-19T00:00:00.000Z')
  assert.equal(store.applications[0].tailoring?.matchScore, 100)
  assert.deepEqual(store.applications[0].tailoring?.matchedKeywords, ['LLM'])
  assert.equal(store.growthEntries[0].title, 'Imported growth memory')
  assert.equal(store.growthEntries[0].sourceResumeTitle, 'Imported Resume')

  const exported = JSON.parse(store.exportData())
  assert.equal(exported.activeResumeId, 'imported-resume')
  assert.equal(exported.documents[0].title, 'Imported Resume')
  assert.equal(exported.applications[0].companyMono, 'F')
  assert.equal(exported.applications[0].tailoring.requestId, 'jd-run-1')
  assert.equal(exported.growthEntries[0].title, 'Imported growth memory')
})

test('resume store previews backup imports before applying them', () => {
  setupStoreHarness()
  const store = useResumeStore()

  const preview = store.previewImportData(JSON.stringify({
    activeResumeId: 'preview-resume',
    documents: [{ id: 'preview-resume', title: 'Preview Resume' }],
    applications: [{ id: 'app-preview' }, { id: 'app-preview-2' }],
    growthEntries: [{ id: 'growth-preview' }],
    activityLog: [{ id: 'activity-preview' }],
    config: { locale: 'en-US' },
  }))

  assert.equal(preview.documents, 1)
  assert.equal(preview.applications, 2)
  assert.equal(preview.growthEntries, 1)
  assert.equal(preview.activityEvents, 1)
  assert.equal(preview.hasConfig, true)
  assert.equal(preview.hasLegacyResume, false)

  const legacyPreview = store.previewImportData(JSON.stringify({
    data: { personal: { name: 'Legacy User' } },
  }))
  assert.equal(legacyPreview.documents, 1)
  assert.equal(legacyPreview.hasLegacyResume, true)

  assert.throws(() => store.previewImportData('{}'), /unrecognized/)
  assert.throws(() => store.previewImportData('not-json'), /Unexpected token|JSON/)
})

test('resume store connects to backend and applies remote state', async () => {
  setupStoreHarness()
  const state: BackendState = {
    activeResumeId: 'remote-resume',
    documents: [
      {
        id: 'remote-resume',
        title: 'Remote Resume',
        origin: 'platform',
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
    growthEntries: [
      {
        id: 'remote-growth',
        date: '2026-01-04',
        type: 'skill',
        company: 'Navy',
        project: 'Compiler',
        title: 'Remote career memory',
        content: 'Added compiler optimization notes.',
        metrics: '',
        skills: ['compiler'],
        evidenceUrl: '',
        private: false,
        archived: false,
        sourceResumeId: 'remote-resume',
        sourceResumeTitle: 'Remote Resume',
        usedByResumeIds: [],
        usedByApplicationIds: [],
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z',
      },
    ],
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
    assert.equal(store.activeDocument.origin, 'platform')
    assert.equal(store.activeDocument.favorite, true)
    assert.equal(store.activeDocument.careerUpdateChecklist.notes, 'Remote note')
    assert.equal(store.growthEntries[0].title, 'Remote career memory')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('resume store queues active resume edits while backend is offline', async () => {
  setupStoreHarness()
  const store = useResumeStore()

  store.data.personal.summary = 'Offline edit that must sync later.'
  await nextTick()
  await wait(760)

  const operation = store.syncOperations.find((item) =>
    item.entityType === 'resume'
    && item.operation === 'update'
    && item.entityId === store.activeResumeId,
  )

  assert.equal(operation?.status, 'local-only')
  assert.equal(operation?.error?.includes('云端服务不可用'), true)
  assert.equal(operation?.error?.includes('后端'), false)
})

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function makeDraft(store: ReturnType<typeof useResumeStore>): PlatformResumeDraft {
  return {
    requestId: 'draft-growth-memory',
    title: 'Draft using career memory',
    data: {
      ...store.data,
      personal: {
        ...store.data.personal,
        summary: 'Draft summary that uses a selected career memory.',
      },
    },
    config: store.config,
    match: {
      score: 88,
      keywords: ['career memory'],
      matchedKeywords: ['career memory'],
      selectedExperienceIds: [],
    },
    generation: {
      strategy: 'test',
      generatedAt: '2026-06-17T00:00:00.000Z',
      persisted: false,
    },
  }
}

test('resume store enforces freemium entitlements and upgrades to pro', () => {
  setupStoreHarness()
  const store = useResumeStore()

  assert.equal(store.isPro, false)
  assert.equal(store.entitlements.watermark, true)
  assert.equal(store.canExport, true)
  assert.equal(store.exportsRemaining, 5)

  for (let i = 0; i < 5; i += 1) store.recordExportUsage()
  assert.equal(store.exportsRemaining, 0)
  assert.equal(store.canExport, false)

  for (let i = 0; i < 3; i += 1) store.recordAiDraftUsage()
  assert.equal(store.aiDraftsRemaining, 0)
  assert.equal(store.canGenerateAiDraft, false)

  store.setPlan('pro', { reason: 'export' })
  assert.equal(store.isPro, true)
  assert.equal(store.canExport, true)
  assert.equal(store.canGenerateAiDraft, true)
  assert.equal(store.entitlements.watermark, false)

  const planEvent = store.activityLog.find((event) => event.tag === 'event:plan_changed')
  assert.ok(planEvent)
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
