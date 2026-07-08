import assert from 'node:assert/strict'
import test from 'node:test'
import { documentMatchesSearch, filterDocumentsForLibrary, getApplicationResumeOptions, getDocumentApplications, getDocumentLibraryNavigationTarget } from '../src/utils/documentLibrary'
import { DEFAULT_STUDIO_THEME, DEFAULT_TWEAKS } from '../src/stores/resume'
import type { ApplicationStage, JobApplication, ResumeConfig, ResumeData, ResumeDocument, ResumeOrigin } from '../src/types/resume'

function data(title = 'Platform Engineer'): ResumeData {
  return {
    personal: {
      name: 'Ada Lovelace',
      title,
      phone: '',
      email: '',
      location: '',
      website: '',
      summary: 'Builds AI platform services.',
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    awards: [],
    languages: [],
    certifications: [],
  }
}

function config(): ResumeConfig {
  return {
    locale: 'zh-CN',
    templateId: 'classic',
    themeColor: '#1677FF',
    fontSize: 14,
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages', 'certifications'],
    sectionVisible: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      awards: true,
      languages: false,
      certifications: false,
    },
    studioTheme: { ...DEFAULT_STUDIO_THEME },
    tweaks: { ...DEFAULT_TWEAKS },
  }
}

function document(overrides: Partial<ResumeDocument> & { id: string; title: string; origin?: ResumeOrigin }): ResumeDocument {
  return {
    id: overrides.id,
    title: overrides.title,
    data: data(),
    config: config(),
    folder: 'General',
    targetRole: '',
    targetCompany: '',
    tags: [],
    origin: overrides.origin ?? 'blank',
    favorite: false,
    archived: false,
    careerUpdateChecklist: {
      projects: false,
      metrics: false,
      roleChanges: false,
      interviewFeedback: false,
      skills: false,
      notes: '',
    },
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    lastCareerUpdateAt: '2026-06-01',
    nextCareerUpdateAt: '2026-06-15',
    ...overrides,
  }
}

function application(overrides: Partial<JobApplication> & { id: string; resumeId: string }): JobApplication {
  return {
    id: overrides.id,
    company: 'FutureHire',
    companyMono: 'FH',
    location: '',
    role: 'AI Platform Engineer',
    department: '',
    resumeId: overrides.resumeId,
    resumeTitle: 'Resume',
    stage: 'applied' as ApplicationStage,
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

test('document library search matches title, tags, source, and linked applications', () => {
  const docs = [
    document({ id: 'doc-blank', title: 'Base Resume', tags: ['general'] }),
    document({ id: 'doc-jd', title: 'Staff Platform Draft', origin: 'jd-draft', sourceResumeTitle: 'Base Resume', tags: ['targeted'] }),
  ]
  const apps = [
    application({ id: 'app-1', resumeId: 'doc-jd', company: 'FutureHire', role: 'AI Infrastructure Lead' }),
  ]

  assert.equal(documentMatchesSearch(docs[1], 'futurehire infrastructure', getDocumentApplications('doc-jd', apps)), true)
  assert.equal(documentMatchesSearch(docs[1], 'jd targeted', getDocumentApplications('doc-jd', apps)), true)
  assert.equal(documentMatchesSearch(docs[0], 'futurehire', getDocumentApplications('doc-blank', apps)), false)
})

test('document library filters by status, origin, search, and application count sort', () => {
  const docs = [
    document({ id: 'doc-import', title: 'Imported Resume', origin: 'import', updatedAt: '2026-06-01T00:00:00.000Z' }),
    document({ id: 'doc-copy', title: 'Copied Resume', origin: 'copy', updatedAt: '2026-06-03T00:00:00.000Z' }),
    document({ id: 'doc-archived', title: 'Archived JD Draft', origin: 'jd-draft', archived: true, updatedAt: '2026-06-04T00:00:00.000Z' }),
  ]
  const apps = [
    application({ id: 'app-1', resumeId: 'doc-copy' }),
    application({
      id: 'app-2',
      resumeId: 'other',
      tailoring: {
        requestId: 'run-1',
        sourceResumeId: 'doc-copy',
        draftTitle: 'Copied Resume',
        matchScore: 90,
        matchedKeywords: ['AI'],
        selectedExperienceIds: [],
        strategy: 'test',
        generatedAt: '2026-06-03T00:00:00.000Z',
      },
    }),
  ]

  assert.deepEqual(
    filterDocumentsForLibrary({ documents: docs, applications: apps, filter: 'active', origin: 'copy', query: 'futurehire', sort: 'applications-desc' }).map((doc) => doc.id),
    ['doc-copy'],
  )
  assert.deepEqual(
    filterDocumentsForLibrary({ documents: docs, applications: apps, filter: 'archived', origin: 'jd-draft' }).map((doc) => doc.id),
    ['doc-archived'],
  )
  assert.deepEqual(
    filterDocumentsForLibrary({ documents: docs, applications: apps, filter: 'active', sort: 'applications-desc' }).map((doc) => doc.id),
    ['doc-copy', 'doc-import'],
  )
})

test('document library keeps resume actions in the library on narrow screens', () => {
  assert.equal(getDocumentLibraryNavigationTarget(true), 'documents')
  assert.equal(getDocumentLibraryNavigationTarget(false), 'editor')
})

test('application resume options exclude archived resumes unless already selected', () => {
  const docs = [
    document({ id: 'doc-active', title: 'Active Resume' }),
    document({ id: 'doc-archived', title: 'Archived Resume', archived: true }),
    document({ id: 'doc-favorite', title: 'Favorite Resume', favorite: true }),
  ]

  assert.deepEqual(
    getApplicationResumeOptions(docs).map((doc) => doc.id),
    ['doc-active', 'doc-favorite'],
  )
  assert.deepEqual(
    getApplicationResumeOptions(docs, 'doc-archived').map((doc) => doc.id),
    ['doc-active', 'doc-archived', 'doc-favorite'],
  )
})
