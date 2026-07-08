import type { JobApplication, ResumeDocument, ResumeOrigin } from '../types/resume'

export type DocumentLibraryFilter = 'active' | 'favorites' | 'archived' | 'all'
export type DocumentLibrarySort = 'updated-desc' | 'created-desc' | 'title-asc' | 'applications-desc'
export type DocumentOriginFilter = 'all' | ResumeOrigin
export type DocumentLibraryNavigationTarget = 'documents' | 'editor'

const originSearchTerms: Record<ResumeOrigin, string[]> = {
  sample: ['sample', 'demo', '示例'],
  blank: ['blank', 'empty', '空白', '空白创建'],
  import: ['import', 'imported', '导入'],
  copy: ['copy', 'duplicate', '复制'],
  'jd-draft': ['jd', 'jd draft', 'tailored', '草稿', '定制', 'jd 草稿生成'],
  platform: ['platform', 'api', '平台', '平台生成'],
}

function normalizeSearch(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function searchTokens(query: string) {
  return normalizeSearch(query).split(/\s+/).filter(Boolean)
}

export function getDocumentApplications(docId: string, applications: JobApplication[]) {
  return applications.filter((app) => app.resumeId === docId || app.tailoring?.sourceResumeId === docId)
}

export function getDocumentLibraryNavigationTarget(isNarrowViewport: boolean): DocumentLibraryNavigationTarget {
  return isNarrowViewport ? 'documents' : 'editor'
}

export function getApplicationResumeOptions(documents: ResumeDocument[], selectedResumeId = '') {
  return documents.filter((doc) => !doc.archived || doc.id === selectedResumeId)
}

export function documentMatchesSearch(doc: ResumeDocument, query: string, applications: JobApplication[] = []) {
  const tokens = searchTokens(query)
  if (!tokens.length) return true
  const haystack = normalizeSearch([
    doc.title,
    doc.folder,
    doc.targetCompany,
    doc.targetRole,
    doc.data.personal.name,
    doc.data.personal.title,
    doc.data.personal.summary,
    doc.sourceResumeTitle ?? '',
    doc.tags.join(' '),
    doc.origin,
    originSearchTerms[doc.origin].join(' '),
    applications.map((app) => [
      app.company,
      app.role,
      app.department,
      app.location,
      app.resumeTitle,
      app.nextAction,
      app.notes,
      app.jobDescription?.title,
      app.jobDescription?.description,
      app.jobDescription?.requirements.join(' '),
      app.tailoring?.draftTitle,
      app.tailoring?.matchedKeywords.join(' '),
    ].join(' ')).join(' '),
  ].join(' '))
  return tokens.every((token) => haystack.includes(token))
}

export function documentMatchesFilter(doc: ResumeDocument, filter: DocumentLibraryFilter) {
  if (filter === 'favorites') return doc.favorite && !doc.archived
  if (filter === 'archived') return doc.archived
  if (filter === 'all') return true
  return !doc.archived
}

export function filterDocumentsForLibrary(options: {
  documents: ResumeDocument[]
  applications?: JobApplication[]
  filter?: DocumentLibraryFilter
  origin?: DocumentOriginFilter
  query?: string
  sort?: DocumentLibrarySort
}) {
  const {
    documents,
    applications = [],
    filter = 'active',
    origin = 'all',
    query = '',
    sort = 'updated-desc',
  } = options

  return documents
    .filter((doc) => documentMatchesFilter(doc, filter))
    .filter((doc) => origin === 'all' || doc.origin === origin)
    .filter((doc) => documentMatchesSearch(doc, query, getDocumentApplications(doc.id, applications)))
    .slice()
    .sort((a, b) => {
      if (sort === 'title-asc') return a.title.localeCompare(b.title)
      if (sort === 'created-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'applications-desc') return getDocumentApplications(b.id, applications).length - getDocumentApplications(a.id, applications).length
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
}
