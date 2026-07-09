import { addDays, BLANK_RESUME_DATA, DEFAULT_CONFIG } from '../defaults.js'
import { logActivity } from './activity.js'
import {
  type AnyRecord,
  type ResumeState,
  type StoreContext,
  type StoreModuleDeps,
  httpError,
  newId,
} from './shared.js'

export function createDocumentsStore({ readState, mutate }: StoreModuleDeps) {
  return {
    async listDocuments(context: StoreContext = {}) {
      const state = await readState(context)
      return {
        activeResumeId: state.activeResumeId,
        documents: state.documents.map(toDocumentSummary),
      }
    },

    async getDocument(id: string, context: StoreContext = {}) {
      const state = await readState(context)
      return findDocument(state, id)
    },

    async createDocument(input: AnyRecord = {}, context: StoreContext = {}) {
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
          origin: normalizeResumeOrigin(input.origin ?? (blank ? 'blank' : 'copy')),
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
        logActivity(state, {
          type: 'resume',
          tag: blank ? 'new' : 'copy',
          message: blank ? 'Created blank resume' : `Created resume from ${source.title}`,
          messageZh: blank ? '新建空白简历' : `从 ${source.title} 创建副本`,
          messageEn: blank ? 'Created blank resume' : `Created resume from ${source.title}`,
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      }, context)
    },

    async updateDocument(id: string, patch: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        if (patch.title !== undefined) doc.title = patch.title.trim() || doc.title
        if (patch.data !== undefined) doc.data = normalizeResumeData(patch.data)
        if (patch.config !== undefined) doc.config = normalizeConfig(patch.config)
        if (patch.folder !== undefined) doc.folder = String(patch.folder).trim()
        if (patch.targetRole !== undefined) doc.targetRole = String(patch.targetRole).trim()
        if (patch.targetCompany !== undefined) doc.targetCompany = String(patch.targetCompany).trim()
        if (patch.tags !== undefined) doc.tags = normalizeTags(patch.tags)
        if (patch.origin !== undefined) doc.origin = normalizeResumeOrigin(patch.origin)
        if (patch.sourceResumeId !== undefined) doc.sourceResumeId = String(patch.sourceResumeId).trim() || undefined
        if (patch.sourceResumeTitle !== undefined) doc.sourceResumeTitle = String(patch.sourceResumeTitle).trim() || undefined
        if (patch.favorite !== undefined) doc.favorite = Boolean(patch.favorite)
        if (patch.archived !== undefined) doc.archived = Boolean(patch.archived)
        if (patch.careerUpdateChecklist !== undefined) {
          doc.careerUpdateChecklist = normalizeCareerUpdateChecklist(patch.careerUpdateChecklist, doc.careerUpdateChecklist)
        }
        doc.updatedAt = new Date().toISOString()
        syncApplicationResumeTitles(state, doc)
        logActivity(state, {
          type: 'resume',
          tag: 'update',
          message: `Updated ${doc.title}`,
          messageZh: `更新简历：${doc.title}`,
          messageEn: `Updated ${doc.title}`,
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      }, context)
    },

    async deleteDocument(id: string, context: StoreContext = {}) {
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
        logActivity(state, {
          type: 'resume',
          tag: 'delete',
          message: `Deleted ${deleted.title}`,
          messageZh: `删除简历：${deleted.title}`,
          messageEn: `Deleted ${deleted.title}`,
          meta: 'document removed',
        })
        return { deletedId: id, activeResumeId: state.activeResumeId }
      }, context)
    },

    async selectDocument(id: string, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        state.activeResumeId = id
        return doc
      }, context)
    },

    async markCareerUpdated(id: string, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = findDocument(state, id)
        const now = new Date()
        doc.lastCareerUpdateAt = now.toISOString()
        doc.nextCareerUpdateAt = addDays(now, 14).toISOString()
        doc.careerUpdateChecklist = defaultCareerUpdateChecklist(now)
        doc.updatedAt = now.toISOString()
        logActivity(state, {
          type: 'resume',
          tag: 'career',
          message: 'Recorded biweekly career update',
          messageZh: '记录双周职业经历更新',
          messageEn: 'Recorded biweekly career update',
          meta: doc.title,
          resumeId: doc.id,
        })
        return doc
      }, context)
    },
  }
}

export function normalizeDocument(doc: AnyRecord = {}): AnyRecord {
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
    origin: normalizeResumeOrigin(doc.origin ?? (doc.sourceResumeId ? 'copy' : 'sample')),
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

export function normalizeTags(tags: unknown = []): string[] {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12)
}

export function normalizeResumeOrigin(origin: unknown = 'sample'): string {
  const value = String(origin)
  return ['sample', 'blank', 'import', 'copy', 'jd-draft', 'platform'].includes(value) ? value : 'sample'
}

export function defaultCareerUpdateChecklist(date: Date = new Date()): AnyRecord {
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

export function normalizeCareerUpdateChecklist(checklist: AnyRecord = {}, fallback: AnyRecord = {}): AnyRecord {
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

export function normalizeResumeData(data: AnyRecord = {}): AnyRecord {
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

export function normalizeConfig(config: AnyRecord = {}): AnyRecord {
  const studioTheme = { ...DEFAULT_CONFIG.studioTheme, ...(config.studioTheme ?? {}) }
  const tweaks = { ...DEFAULT_CONFIG.tweaks, ...(config.tweaks ?? {}) }
  const isLegacyStudioTheme = Boolean(config.studioTheme)
    && studioTheme.density === 'cozy'
    && studioTheme.ruleLines === false
    && (
      (studioTheme.accent === 'vermillion' && studioTheme.paper === 'cream' && studioTheme.font === 'serif')
      || (studioTheme.accent === 'coral' && studioTheme.paper === 'stone' && studioTheme.font === 'sans')
    )
  const isLegacyTweaks = Boolean(config.tweaks)
    && tweaks.density === 'cozy'
    && tweaks.ruleLines === false
    && (
      (tweaks.accent === 'vermillion' && tweaks.paper === 'cream' && tweaks.font === 'serif')
      || (tweaks.accent === 'coral' && tweaks.paper === 'stone' && tweaks.font === 'sans')
    )
  return {
    ...structuredClone(DEFAULT_CONFIG),
    ...config,
    sectionOrder: Array.isArray(config.sectionOrder) && config.sectionOrder.length
      ? config.sectionOrder
      : [...DEFAULT_CONFIG.sectionOrder],
    sectionVisible: { ...DEFAULT_CONFIG.sectionVisible, ...(config.sectionVisible ?? {}) },
    studioTheme: isLegacyStudioTheme ? { ...DEFAULT_CONFIG.studioTheme } : studioTheme,
    tweaks: isLegacyTweaks
      ? {
        ...tweaks,
        accent: DEFAULT_CONFIG.tweaks.accent,
        paper: DEFAULT_CONFIG.tweaks.paper,
        font: DEFAULT_CONFIG.tweaks.font,
        ruleLines: DEFAULT_CONFIG.tweaks.ruleLines,
      }
      : tweaks,
  }
}

export function findDocument(state: ResumeState, id: string): AnyRecord {
  const doc = state.documents.find((item) => item.id === id)
  if (!doc) throw httpError(404, 'Resume not found')
  return doc
}

export function getActiveDocument(state: ResumeState): AnyRecord {
  return state.documents.find((item) => item.id === state.activeResumeId) ?? state.documents[0]
}

export function syncApplicationResumeTitles(state: ResumeState, doc: AnyRecord): void {
  for (const app of state.applications) {
    if (app.resumeId === doc.id) app.resumeTitle = doc.title
  }
  for (const entry of state.growthEntries) {
    if (entry.sourceResumeId === doc.id) entry.sourceResumeTitle = doc.title
  }
}

export function toDocumentSummary(doc: AnyRecord): AnyRecord {
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
    origin: doc.origin,
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
