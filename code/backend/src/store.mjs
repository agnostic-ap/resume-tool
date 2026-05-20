import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { addDays, BLANK_RESUME_DATA, DEFAULT_CONFIG, initialState } from './defaults.mjs'

const DB_FILE = 'resume-state.json'

export function createStore(options = {}) {
  const dataDir = options.dataDir ?? process.env.RESUME_BACKEND_DATA_DIR ?? join(process.cwd(), '.data')
  const dbPath = options.dbPath ?? join(dataDir, DB_FILE)
  let mutationQueue = Promise.resolve()

  async function readState() {
    try {
      const raw = await readFile(dbPath, 'utf8')
      return normalizeState(JSON.parse(raw))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      const state = initialState()
      await writeState(state)
      return state
    }
  }

  async function writeState(state) {
    const normalized = normalizeState(state)
    await mkdir(dirname(dbPath), { recursive: true })
    const tmpPath = `${dbPath}.tmp`
    await writeFile(tmpPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
    await rename(tmpPath, dbPath)
    return normalized
  }

  function enqueueMutation(task) {
    const next = mutationQueue.then(task, task)
    mutationQueue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  async function mutate(mutator) {
    return enqueueMutation(async () => {
      const state = await readState()
      const result = await mutator(state)
      await writeState(state)
      return result ?? state
    })
  }

  async function replaceState(nextState) {
    return enqueueMutation(() => writeState(nextState))
  }

  function log(state, event) {
    const active = getActiveDocument(state)
    const entry = normalizeActivity({
      ...event,
      id: event.id ?? newId('activity'),
      resumeId: event.resumeId ?? active?.id,
      createdAt: event.createdAt ?? new Date().toISOString(),
    }, active)
    state.activityLog = [entry, ...state.activityLog].slice(0, 200)
    return entry
  }

  return {
    dbPath,
    readState,
    writeState,

    replaceState,

    async listDocuments() {
      const state = await readState()
      return {
        activeResumeId: state.activeResumeId,
        documents: state.documents.map(toDocumentSummary),
      }
    },

    async getDocument(id) {
      const state = await readState()
      return findDocument(state, id)
    },

    async createDocument(input = {}) {
      return mutate((state) => {
        const source = input.sourceId ? findDocument(state, input.sourceId) : getActiveDocument(state)
        const created = new Date()
        const blank = input.blank ?? !input.sourceId
        const doc = {
          id: newId('resume'),
          title: input.title?.trim() || (blank ? 'Untitled resume' : `${source.title} Copy`),
          data: blank ? structuredClone(BLANK_RESUME_DATA) : structuredClone(source.data),
          config: blank ? structuredClone(DEFAULT_CONFIG) : structuredClone(source.config),
          folder: String(input.folder ?? (blank ? 'General' : source.folder ?? 'General')),
          targetRole: String(input.targetRole ?? (blank ? '' : source.targetRole ?? '')),
          targetCompany: String(input.targetCompany ?? ''),
          tags: normalizeTags(input.tags ?? (blank ? [] : source.tags)),
          sourceResumeId: blank ? undefined : source.id,
          sourceResumeTitle: blank ? undefined : source.title,
          favorite: Boolean(input.favorite ?? false),
          archived: Boolean(input.archived ?? false),
          careerUpdateChecklist: defaultCareerUpdateChecklist(),
          createdAt: created.toISOString(),
          updatedAt: created.toISOString(),
          lastCareerUpdateAt: created.toISOString(),
          nextCareerUpdateAt: addDays(created, 14).toISOString(),
        }
        state.documents.unshift(doc)
        state.activeResumeId = doc.id
        log(state, {
          type: 'resume',
          tag: blank ? 'new' : 'copy',
          message: blank ? 'Created blank resume' : `Created resume from ${source.title}`,
          messageZh: blank ? '新建空白简历' : `从 ${source.title} 创建副本`,
          messageEn: blank ? 'Created blank resume' : `Created resume from ${source.title}`,
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      })
    },

    async updateDocument(id, patch = {}) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        if (patch.title !== undefined) doc.title = patch.title.trim() || doc.title
        if (patch.data !== undefined) doc.data = normalizeResumeData(patch.data)
        if (patch.config !== undefined) doc.config = normalizeConfig(patch.config)
        if (patch.folder !== undefined) doc.folder = String(patch.folder).trim()
        if (patch.targetRole !== undefined) doc.targetRole = String(patch.targetRole).trim()
        if (patch.targetCompany !== undefined) doc.targetCompany = String(patch.targetCompany).trim()
        if (patch.tags !== undefined) doc.tags = normalizeTags(patch.tags)
        if (patch.sourceResumeId !== undefined) doc.sourceResumeId = String(patch.sourceResumeId).trim() || undefined
        if (patch.sourceResumeTitle !== undefined) doc.sourceResumeTitle = String(patch.sourceResumeTitle).trim() || undefined
        if (patch.favorite !== undefined) doc.favorite = Boolean(patch.favorite)
        if (patch.archived !== undefined) doc.archived = Boolean(patch.archived)
        if (patch.careerUpdateChecklist !== undefined) {
          doc.careerUpdateChecklist = normalizeCareerUpdateChecklist(patch.careerUpdateChecklist, doc.careerUpdateChecklist)
        }
        doc.updatedAt = new Date().toISOString()
        syncApplicationResumeTitles(state, doc)
        log(state, {
          type: 'resume',
          tag: 'update',
          message: `Updated ${doc.title}`,
          messageZh: `更新简历：${doc.title}`,
          messageEn: `Updated ${doc.title}`,
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      })
    },

    async deleteDocument(id) {
      return mutate((state) => {
        if (state.documents.length <= 1) throw httpError(409, 'At least one resume must remain')
        const index = state.documents.findIndex((doc) => doc.id === id)
        if (index < 0) throw httpError(404, 'Resume not found')
        const [deleted] = state.documents.splice(index, 1)
        if (state.activeResumeId === id) state.activeResumeId = state.documents[0].id
        const fallback = getActiveDocument(state)
        for (const app of state.applications) {
          if (app.resumeId === id) {
            app.resumeId = fallback.id
            app.resumeTitle = fallback.title
            app.updatedAt = new Date().toISOString()
          }
        }
        log(state, {
          type: 'resume',
          tag: 'delete',
          message: `Deleted ${deleted.title}`,
          messageZh: `删除简历：${deleted.title}`,
          messageEn: `Deleted ${deleted.title}`,
          meta: 'document removed',
        })
        return { deletedId: id, activeResumeId: state.activeResumeId }
      })
    },

    async selectDocument(id) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        state.activeResumeId = id
        return doc
      })
    },

    async markCareerUpdated(id) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        const now = new Date()
        doc.lastCareerUpdateAt = now.toISOString()
        doc.nextCareerUpdateAt = addDays(now, 14).toISOString()
        doc.careerUpdateChecklist = defaultCareerUpdateChecklist(now)
        doc.updatedAt = now.toISOString()
        log(state, {
          type: 'resume',
          tag: 'career',
          message: 'Recorded biweekly career update',
          messageZh: '记录双周职业经历更新',
          messageEn: 'Recorded biweekly career update',
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      })
    },

    async listApplications() {
      const state = await readState()
      return state.applications
    },

    async createApplication(input = {}) {
      return mutate((state) => {
        const doc = input.resumeId ? findDocument(state, input.resumeId) : getActiveDocument(state)
        const app = normalizeApplication({
          ...input,
          id: newId('app'),
          resumeId: doc.id,
          resumeTitle: doc.title,
          createdAt: new Date().toISOString(),
        }, doc)
        state.applications.unshift(app)
        log(state, {
          type: 'application',
          tag: 'apply',
          message: `Added application: ${app.company}`,
          messageZh: `新增投递：${app.company}`,
          messageEn: `Added application: ${app.company}`,
          meta: `${app.role} · ${app.stage}`,
          resumeId: app.resumeId,
        })
        return app
      })
    },

    async updateApplication(id, patch = {}) {
      return mutate((state) => {
        const app = findApplication(state, id)
        const doc = patch.resumeId ? findDocument(state, patch.resumeId) : findDocument(state, app.resumeId)
        Object.assign(app, normalizeApplication({ ...app, ...patch, resumeId: doc.id, resumeTitle: doc.title }, doc), {
          id: app.id,
          createdAt: app.createdAt,
          updatedAt: new Date().toISOString(),
        })
        log(state, {
          type: 'application',
          tag: 'update',
          message: `Updated application: ${app.company}`,
          messageZh: `更新投递：${app.company}`,
          messageEn: `Updated application: ${app.company}`,
          meta: `${app.role} · ${app.stage}`,
          resumeId: app.resumeId,
        })
        return app
      })
    },

    async deleteApplication(id) {
      return mutate((state) => {
        const app = findApplication(state, id)
        state.applications = state.applications.filter((item) => item.id !== id)
        log(state, {
          type: 'application',
          tag: 'delete',
          message: `Deleted application: ${app.company}`,
          messageZh: `删除投递：${app.company}`,
          messageEn: `Deleted application: ${app.company}`,
          meta: app.role,
          resumeId: app.resumeId,
        })
        return { deletedId: id }
      })
    },

    async listPlatformRequests() {
      const state = await readState()
      return state.platformRequests
    },

    async recordPlatformRequest(input = {}) {
      return mutate((state) => {
        const entry = normalizePlatformRequest(input)
        state.platformRequests = [entry, ...state.platformRequests].slice(0, 500)
        log(state, {
          type: 'system',
          tag: 'platform',
          message: `Generated platform draft: ${entry.requestId || entry.userId || 'anonymous'}`,
          messageZh: `生成平台草稿：${entry.requestId || entry.userId || '匿名请求'}`,
          messageEn: `Generated platform draft: ${entry.requestId || entry.userId || 'anonymous'}`,
          meta: `${entry.matchScore}/100`,
          resumeId: entry.documentId,
        })
        return entry
      })
    },

    async persistPlatformDraft(input = {}, draft = {}, meta = {}) {
      return mutate((state) => {
        const requestId = String(input.requestId ?? '').trim()
        const existing = requestId
          ? state.platformRequests.find((entry) => entry.requestId === requestId && entry.persisted && entry.documentId)
          : undefined
        const existingDoc = existing?.documentId
          ? state.documents.find((doc) => doc.id === existing.documentId)
          : undefined

        if (existing && existingDoc) {
          existing.replayedAt = new Date().toISOString()
          existing.replayCount = Number(existing.replayCount ?? 0) + 1
          return { documentId: existing.documentId, idempotent: true, request: existing }
        }

        const created = new Date()
        const doc = {
          id: newId('resume'),
          title: draft.title?.trim() || 'Platform resume draft',
          data: normalizeResumeData(draft.data),
          config: normalizeConfig(draft.config),
          folder: 'Generated',
          targetRole: String(input.jobDescription?.title ?? ''),
          targetCompany: String(input.jobDescription?.company ?? ''),
          tags: normalizeTags([input.jobDescription?.title, input.jobDescription?.company, 'platform'].filter(Boolean)),
          sourceResumeId: undefined,
          sourceResumeTitle: undefined,
          favorite: false,
          archived: false,
          careerUpdateChecklist: defaultCareerUpdateChecklist(),
          createdAt: created.toISOString(),
          updatedAt: created.toISOString(),
          lastCareerUpdateAt: created.toISOString(),
          nextCareerUpdateAt: addDays(created, 14).toISOString(),
        }
        state.documents.unshift(doc)
        state.activeResumeId = doc.id

        const entry = normalizePlatformRequest({
          requestId,
          userId: input.userId,
          documentId: doc.id,
          matchScore: draft.match?.score,
          persisted: true,
          route: meta.route,
          generatedAt: draft.generation?.generatedAt,
        })
        state.platformRequests = [entry, ...state.platformRequests].slice(0, 500)
        log(state, {
          type: 'resume',
          tag: 'platform',
          message: `Persisted platform resume draft: ${doc.title}`,
          messageZh: `保存平台简历草稿：${doc.title}`,
          messageEn: `Persisted platform resume draft: ${doc.title}`,
          meta: `${entry.matchScore}/100`,
          resumeId: doc.id,
        })
        return { documentId: doc.id, idempotent: false, request: entry }
      })
    },

    async listActivity() {
      const state = await readState()
      return state.activityLog
    },

    async createAssistantSuggestion(input = {}) {
      return mutate((state) => {
        const prompt = String(input.prompt ?? '').trim()
        if (!prompt) throw httpError(400, 'Prompt is required')
        const active = getActiveDocument(state)
        const suggestion = {
          id: newId('suggestion'),
          prompt,
          resumeId: active.id,
          summaryZh: `围绕“${prompt}”重写个人简介，优先突出最近经历、核心技术和可验证成果。`,
          summaryEn: `Tailor the summary for "${prompt}", emphasizing recent work, core technologies, and verifiable outcomes.`,
          createdAt: new Date().toISOString(),
        }
        log(state, {
          type: 'ai',
          tag: 'AI',
          message: 'Generated local resume advice',
          messageZh: '生成本地简历优化建议',
          messageEn: 'Generated local resume advice',
          meta: prompt,
          resumeId: active.id,
        })
        return suggestion
      })
    },
  }
}

export function normalizeState(value) {
  const fallback = initialState()
  const documents = Array.isArray(value?.documents) && value.documents.length
    ? value.documents.map(normalizeDocument)
    : fallback.documents
  const activeResumeId = documents.some((doc) => doc.id === value?.activeResumeId)
    ? value.activeResumeId
    : documents[0].id
  const active = documents.find((doc) => doc.id === activeResumeId) ?? documents[0]
  return {
    activeResumeId,
    documents,
    applications: Array.isArray(value?.applications)
      ? value.applications.map((app) => normalizeApplication(app, documents.find((doc) => doc.id === app.resumeId) ?? active))
      : [],
    platformRequests: Array.isArray(value?.platformRequests)
      ? value.platformRequests.map(normalizePlatformRequest)
      : fallback.platformRequests,
    activityLog: Array.isArray(value?.activityLog)
      ? value.activityLog.map((event) => normalizeActivity(event, documents.find((doc) => doc.id === event.resumeId) ?? active))
      : fallback.activityLog,
  }
}

export function normalizeDocument(doc = {}) {
  const now = new Date().toISOString()
  const data = normalizeResumeData(doc.data)
  return {
    id: doc.id || newId('resume'),
    title: doc.title?.trim() || data.personal.title || data.personal.name || 'Untitled resume',
    data,
    config: normalizeConfig(doc.config),
    folder: String(doc.folder ?? 'General'),
    targetRole: String(doc.targetRole ?? ''),
    targetCompany: String(doc.targetCompany ?? ''),
    tags: normalizeTags(doc.tags),
    sourceResumeId: doc.sourceResumeId ? String(doc.sourceResumeId) : undefined,
    sourceResumeTitle: doc.sourceResumeTitle ? String(doc.sourceResumeTitle) : undefined,
    favorite: Boolean(doc.favorite),
    archived: Boolean(doc.archived),
    careerUpdateChecklist: normalizeCareerUpdateChecklist(doc.careerUpdateChecklist),
    createdAt: doc.createdAt || now,
    updatedAt: doc.updatedAt || now,
    lastCareerUpdateAt: doc.lastCareerUpdateAt || doc.updatedAt || now,
    nextCareerUpdateAt: doc.nextCareerUpdateAt || addDays(new Date(doc.updatedAt || now), 14).toISOString(),
  }
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12)
}

function defaultCareerUpdateChecklist(date = new Date()) {
  return {
    projects: false,
    metrics: false,
    roleChanges: false,
    interviewFeedback: false,
    skills: false,
    notes: '',
    updatedAt: date.toISOString(),
  }
}

function normalizeCareerUpdateChecklist(checklist = {}, fallback = {}) {
  return {
    ...defaultCareerUpdateChecklist(),
    ...fallback,
    projects: Boolean(checklist.projects ?? fallback.projects),
    metrics: Boolean(checklist.metrics ?? fallback.metrics),
    roleChanges: Boolean(checklist.roleChanges ?? fallback.roleChanges),
    interviewFeedback: Boolean(checklist.interviewFeedback ?? fallback.interviewFeedback),
    skills: Boolean(checklist.skills ?? fallback.skills),
    notes: String(checklist.notes ?? fallback.notes ?? ''),
    updatedAt: String(checklist.updatedAt ?? fallback.updatedAt ?? new Date().toISOString()),
  }
}

export function normalizeResumeData(data = {}) {
  return {
    personal: {
      name: data.personal?.name ?? '',
      title: data.personal?.title ?? '',
      phone: data.personal?.phone ?? '',
      email: data.personal?.email ?? '',
      location: data.personal?.location ?? '',
      website: data.personal?.website ?? '',
      summary: data.personal?.summary ?? '',
    },
    experience: Array.isArray(data.experience) ? data.experience : [],
    education: Array.isArray(data.education) ? data.education : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    awards: Array.isArray(data.awards) ? data.awards : [],
    languages: Array.isArray(data.languages) ? data.languages : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
  }
}

export function normalizeConfig(config = {}) {
  return {
    ...structuredClone(DEFAULT_CONFIG),
    ...config,
    sectionOrder: Array.isArray(config.sectionOrder) && config.sectionOrder.length
      ? config.sectionOrder
      : [...DEFAULT_CONFIG.sectionOrder],
    sectionVisible: { ...DEFAULT_CONFIG.sectionVisible, ...(config.sectionVisible ?? {}) },
    studioTheme: { ...DEFAULT_CONFIG.studioTheme, ...(config.studioTheme ?? {}) },
    tweaks: { ...DEFAULT_CONFIG.tweaks, ...(config.tweaks ?? {}) },
  }
}

export function normalizeApplication(app = {}, fallbackDoc) {
  const now = new Date().toISOString()
  const company = String(app.company ?? '').trim()
  if (!company) throw httpError(400, 'Company is required')
  const role = String(app.role ?? '').trim()
  if (!role) throw httpError(400, 'Role is required')
  const stage = ['saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'].includes(app.stage) ? app.stage : 'saved'
  return {
    id: app.id || newId('app'),
    company,
    companyMono: String(app.companyMono || company.slice(0, 1) || 'A').slice(0, 2).toUpperCase(),
    location: String(app.location ?? ''),
    role,
    department: String(app.department ?? ''),
    resumeId: app.resumeId || fallbackDoc.id,
    resumeTitle: app.resumeTitle || fallbackDoc.title,
    stage,
    match: Math.max(0, Math.min(100, Number(app.match ?? 70))),
    appliedAt: app.appliedAt || (stage === 'saved' ? '' : now.slice(0, 10)),
    nextAction: String(app.nextAction ?? ''),
    followUpAt: String(app.followUpAt ?? ''),
    contactName: String(app.contactName ?? ''),
    contactEmail: String(app.contactEmail ?? ''),
    jobPostUrl: String(app.jobPostUrl ?? app.jobDescription?.url ?? ''),
    notes: String(app.notes ?? ''),
    jobDescription: app.jobDescription ? normalizeJobDescription(app.jobDescription, { company, role, location: app.location }) : undefined,
    tailoring: app.tailoring ? normalizeTailoring(app.tailoring, fallbackDoc, app.match, now) : undefined,
    createdAt: app.createdAt || now,
    updatedAt: app.updatedAt || now,
  }
}

function normalizeJobDescription(jobDescription = {}, fallback = {}) {
  return {
    company: String(jobDescription.company ?? fallback.company ?? ''),
    title: String(jobDescription.title ?? fallback.role ?? ''),
    location: String(jobDescription.location ?? fallback.location ?? ''),
    description: String(jobDescription.description ?? ''),
    requirements: Array.isArray(jobDescription.requirements) ? jobDescription.requirements.map(String) : [],
    url: String(jobDescription.url ?? ''),
    archivedAt: jobDescription.archivedAt ? String(jobDescription.archivedAt) : undefined,
  }
}

function normalizeTailoring(tailoring = {}, fallbackDoc, fallbackMatch, now) {
  return {
    requestId: String(tailoring.requestId ?? ''),
    sourceResumeId: String(tailoring.sourceResumeId ?? fallbackDoc.id),
    draftTitle: String(tailoring.draftTitle ?? fallbackDoc.title),
    matchScore: Math.max(0, Math.min(100, Number(tailoring.matchScore ?? fallbackMatch ?? 70))),
    matchedKeywords: Array.isArray(tailoring.matchedKeywords) ? tailoring.matchedKeywords.map(String) : [],
    selectedExperienceIds: Array.isArray(tailoring.selectedExperienceIds) ? tailoring.selectedExperienceIds.map(String) : [],
    strategy: String(tailoring.strategy ?? ''),
    generatedAt: String(tailoring.generatedAt ?? now),
    appliedAt: tailoring.appliedAt ? String(tailoring.appliedAt) : undefined,
  }
}

function normalizePlatformRequest(entry = {}) {
  const now = new Date().toISOString()
  return {
    id: entry.id || newId('platform'),
    requestId: String(entry.requestId ?? ''),
    userId: String(entry.userId ?? ''),
    documentId: entry.documentId ? String(entry.documentId) : undefined,
    matchScore: Math.max(0, Math.min(100, Number(entry.matchScore ?? 0))),
    persisted: Boolean(entry.persisted),
    route: String(entry.route ?? 'platform'),
    generatedAt: String(entry.generatedAt ?? now),
    createdAt: String(entry.createdAt ?? now),
    replayedAt: entry.replayedAt ? String(entry.replayedAt) : undefined,
    replayCount: Number(entry.replayCount ?? 0),
  }
}

export function normalizeActivity(event = {}, fallbackDoc) {
  const type = ['edit', 'ai', 'application', 'resume', 'export', 'system'].includes(event.type) ? event.type : 'system'
  return {
    id: event.id || newId('activity'),
    type,
    tag: event.tag || 'event',
    message: event.message || event.messageEn || event.messageZh || 'Workspace activity',
    messageZh: event.messageZh,
    messageEn: event.messageEn,
    meta: event.meta || fallbackDoc?.title || 'resume',
    resumeId: event.resumeId ?? fallbackDoc?.id,
    createdAt: event.createdAt || new Date().toISOString(),
  }
}

function findDocument(state, id) {
  const doc = state.documents.find((item) => item.id === id)
  if (!doc) throw httpError(404, 'Resume not found')
  return doc
}

function getActiveDocument(state) {
  return state.documents.find((item) => item.id === state.activeResumeId) ?? state.documents[0]
}

function findApplication(state, id) {
  const app = state.applications.find((item) => item.id === id)
  if (!app) throw httpError(404, 'Application not found')
  return app
}

function syncApplicationResumeTitles(state, doc) {
  for (const app of state.applications) {
    if (app.resumeId === doc.id) app.resumeTitle = doc.title
  }
}

function toDocumentSummary(doc) {
  return {
    id: doc.id,
    title: doc.title,
    templateId: doc.config.templateId,
    locale: doc.config.locale,
    personalName: doc.data.personal.name,
    personalTitle: doc.data.personal.title,
    folder: doc.folder,
    targetRole: doc.targetRole,
    targetCompany: doc.targetCompany,
    tags: doc.tags,
    sourceResumeId: doc.sourceResumeId,
    sourceResumeTitle: doc.sourceResumeTitle,
    favorite: doc.favorite,
    archived: doc.archived,
    experienceCount: doc.data.experience.length,
    projectCount: doc.data.projects.length,
    updatedAt: doc.updatedAt,
    nextCareerUpdateAt: doc.nextCareerUpdateAt,
  }
}

export function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
