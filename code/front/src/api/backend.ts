import type { ActivityEvent, GrowthEntry, JobApplication, Locale, ResumeConfig, ResumeData, ResumeDocument, TemplateId } from '../types/resume'

export interface BackendState {
  activeResumeId: string
  documents: ResumeDocument[]
  applications: JobApplication[]
  growthEntries?: GrowthEntry[]
  activityLog: ActivityEvent[]
}

export interface BackendStatus {
  online: boolean
  checkedAt?: string
  error?: string
}

export interface PlatformGenerateResumeInput {
  requestId?: string
  userId?: string
  persist?: boolean
  locale?: Locale
  templateId?: TemplateId
  personal?: Partial<ResumeData['personal']>
  workHistory: Array<{
    id?: string
    company: string
    title: string
    location?: string
    startDate?: string
    endDate?: string
    current?: boolean
    description?: string
    achievements?: string[]
    skills?: string[]
  }>
  education?: Array<Partial<ResumeData['education'][number]>>
  skills?: string[]
  projects?: Array<Partial<ResumeData['projects'][number]>>
  growthEntries?: Array<Partial<GrowthEntry>>
  jobDescription: {
    company?: string
    title: string
    location?: string
    description?: string
    requirements?: string[]
    keywords?: string[]
  }
}

export interface PlatformResumeDraft {
  requestId?: string
  userId?: string
  title: string
  data: ResumeData
  config: ResumeConfig
  match: {
    score: number
    keywords: string[]
    matchedKeywords: string[]
    selectedExperienceIds: string[]
    selectedExperienceIndexes?: number[]
  }
  generation: {
    strategy: string
    generatedAt: string
    persisted: boolean
    documentId?: string
    appliedAt?: string
    idempotent?: boolean
  }
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:8787'
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
const API_BASE_URL = (viteEnv?.VITE_RESUME_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // keep HTTP status fallback
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const backendApi = {
  baseUrl: API_BASE_URL,

  health() {
    return request<{ ok: boolean }>('/health')
  },

  getState() {
    return request<BackendState>('/api/state')
  },

  createResume(input: { blank?: boolean; title?: string; sourceId?: string; folder?: string; targetRole?: string; targetCompany?: string; tags?: string[]; origin?: ResumeDocument['origin'] }) {
    return request<ResumeDocument>('/api/resumes', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateResume(id: string, input: Partial<Pick<ResumeDocument, 'title' | 'data' | 'config' | 'folder' | 'targetRole' | 'targetCompany' | 'tags' | 'origin' | 'favorite' | 'archived' | 'careerUpdateChecklist'>>) {
    return request<ResumeDocument>(`/api/resumes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  deleteResume(id: string) {
    return request<{ deletedId: string; activeResumeId: string }>(`/api/resumes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  selectResume(id: string) {
    return request<ResumeDocument>(`/api/resumes/${encodeURIComponent(id)}/select`, { method: 'POST' })
  },

  duplicateResume(id: string, input: { title?: string } = {}) {
    return request<ResumeDocument>(`/api/resumes/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  markCareerUpdated(id: string) {
    return request<ResumeDocument>(`/api/resumes/${encodeURIComponent(id)}/career-update`, { method: 'POST' })
  },

  createApplication(input: Partial<JobApplication>) {
    return request<JobApplication>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateApplication(id: string, input: Partial<JobApplication>) {
    return request<JobApplication>(`/api/applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  deleteApplication(id: string) {
    return request<{ deletedId: string }>(`/api/applications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  createGrowthEntry(input: Partial<GrowthEntry>) {
    return request<GrowthEntry>('/api/growth-entries', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateGrowthEntry(id: string, input: Partial<GrowthEntry>) {
    return request<GrowthEntry>(`/api/growth-entries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  generateResumeDraft(input: PlatformGenerateResumeInput) {
    return request<PlatformResumeDraft>('/api/v1/resume-drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  generateAssistantResumeDraft(input: PlatformGenerateResumeInput) {
    return request<PlatformResumeDraft>('/api/assistant/resume-drafts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
