import { logActivity } from './activity.js'
import { findDocument, getActiveDocument } from './documents.js'
import {
  type AnyRecord,
  type ResumeState,
  type StoreContext,
  type StoreModuleDeps,
  httpError,
  newId,
} from './shared.js'

export function createGrowthStore({ readState, mutate }: StoreModuleDeps) {
  return {
    async listGrowthEntries(context: StoreContext = {}) {
      const state = await readState(context)
      return state.growthEntries
    },

    async createGrowthEntry(input: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const doc = input.sourceResumeId ? findDocument(state, input.sourceResumeId) : getActiveDocument(state)
        const entry = normalizeGrowthEntry({
          ...input,
          id: newId('growth'),
          sourceResumeId: doc.id,
          sourceResumeTitle: doc.title,
          createdAt: new Date().toISOString(),
        }, doc)
        state.growthEntries.unshift(entry)
        logActivity(state, {
          type: 'resume',
          tag: 'growth',
          message: `Added growth entry: ${entry.title}`,
          messageZh: `新增成长记录：${entry.title}`,
          messageEn: `Added growth entry: ${entry.title}`,
          meta: entry.type,
          resumeId: entry.sourceResumeId,
        })
        return entry
      }, context)
    },

    async updateGrowthEntry(id: string, patch: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const entry = findGrowthEntry(state, id)
        const doc = patch.sourceResumeId ? findDocument(state, patch.sourceResumeId) : findDocument(state, entry.sourceResumeId)
        Object.assign(entry, normalizeGrowthEntry({ ...entry, ...patch, id: entry.id, createdAt: entry.createdAt }, doc), {
          updatedAt: new Date().toISOString(),
        })
        logActivity(state, {
          type: 'resume',
          tag: 'growth',
          message: `Updated growth entry: ${entry.title}`,
          messageZh: `更新成长记录：${entry.title}`,
          messageEn: `Updated growth entry: ${entry.title}`,
          meta: entry.archived ? 'archived' : entry.type,
          resumeId: entry.sourceResumeId,
        })
        return entry
      }, context)
    },
  }
}

export function normalizeGrowthEntry(entry: AnyRecord = {}, fallbackDoc: AnyRecord): AnyRecord {
  const now = new Date().toISOString()
  const type = ['project', 'metric', 'role', 'feedback', 'skill', 'achievement'].includes(entry.type) ? entry.type : 'achievement'
  return {
    id: entry.id || newId('growth'),
    date: String(entry.date ?? now.slice(0, 10)),
    type,
    company: String(entry.company ?? fallbackDoc?.targetCompany ?? ''),
    project: String(entry.project ?? ''),
    title: String(entry.title ?? '').trim() || 'Untitled growth entry',
    content: String(entry.content ?? ''),
    metrics: String(entry.metrics ?? ''),
    skills: Array.isArray(entry.skills) ? [...new Set(entry.skills.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 20) : [],
    evidenceUrl: String(entry.evidenceUrl ?? ''),
    private: Boolean(entry.private),
    archived: Boolean(entry.archived),
    sourceResumeId: String(entry.sourceResumeId ?? fallbackDoc?.id ?? ''),
    sourceResumeTitle: String(entry.sourceResumeTitle ?? fallbackDoc?.title ?? ''),
    usedByResumeIds: Array.isArray(entry.usedByResumeIds) ? [...new Set(entry.usedByResumeIds.map(String).filter(Boolean))] : [],
    usedByApplicationIds: Array.isArray(entry.usedByApplicationIds) ? [...new Set(entry.usedByApplicationIds.map(String).filter(Boolean))] : [],
    createdAt: String(entry.createdAt ?? now),
    updatedAt: String(entry.updatedAt ?? now),
  }
}

export function findGrowthEntry(state: ResumeState, id: string): AnyRecord {
  const entry = state.growthEntries.find((item) => item.id === id)
  if (!entry) throw httpError(404, 'Growth entry not found')
  return entry
}
