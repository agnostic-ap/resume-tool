import { addDays } from '../defaults.js'
import { logActivity } from './activity.js'
import {
  defaultCareerUpdateChecklist,
  normalizeConfig,
  normalizeResumeData,
  normalizeTags,
} from './documents.js'
import {
  type AnyRecord,
  type StoreContext,
  type StoreModuleDeps,
  newId,
} from './shared.js'

export function createPlatformStore({ readState, mutate }: StoreModuleDeps) {
  return {
    async listPlatformRequests(context: StoreContext = {}) {
      const state = await readState(context)
      return state.platformRequests
    },

    async recordPlatformRequest(input: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const entry = normalizePlatformRequest(input)
        const failed = entry.status === 'failed'
        state.platformRequests = [entry, ...state.platformRequests].slice(0, 500)
        logActivity(state, {
          type: 'system',
          tag: 'platform',
          message: failed
            ? `Platform draft failed: ${entry.requestId || entry.userId || 'anonymous'}`
            : `Generated platform draft: ${entry.requestId || entry.userId || 'anonymous'}`,
          messageZh: failed
            ? `平台草稿失败：${entry.requestId || entry.userId || '匿名请求'}`
            : `生成平台草稿：${entry.requestId || entry.userId || '匿名请求'}`,
          messageEn: failed
            ? `Platform draft failed: ${entry.requestId || entry.userId || 'anonymous'}`
            : `Generated platform draft: ${entry.requestId || entry.userId || 'anonymous'}`,
          meta: failed ? entry.error || 'failed' : `${entry.matchScore}/100`,
          resumeId: entry.documentId,
        })
        return entry
      }, context)
    },

    async persistPlatformDraft(input: AnyRecord = {}, draft: AnyRecord = {}, meta: AnyRecord = {}, context: StoreContext = {}) {
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
          origin: 'jd-draft',
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
          clientId: meta.clientId,
          documentId: doc.id,
          matchScore: draft.match?.score,
          persisted: true,
          status: 'persisted',
          route: meta.route,
          generatedAt: draft.generation?.generatedAt,
          latencyMs: meta.latencyMs,
        })
        state.platformRequests = [entry, ...state.platformRequests].slice(0, 500)
        logActivity(state, {
          type: 'resume',
          tag: 'platform',
          message: `Persisted platform resume draft: ${doc.title}`,
          messageZh: `保存平台简历草稿：${doc.title}`,
          messageEn: `Persisted platform resume draft: ${doc.title}`,
          meta: `${entry.matchScore}/100`,
          resumeId: doc.id,
        })
        return { documentId: doc.id, idempotent: false, request: entry }
      }, context)
    },
  }
}

export function normalizePlatformRequest(entry: AnyRecord = {}): AnyRecord {
  const now = new Date().toISOString()
  return {
    id: entry.id || newId('platform'),
    requestId: String(entry.requestId ?? ''),
    userId: String(entry.userId ?? ''),
    clientId: entry.clientId ? String(entry.clientId) : undefined,
    documentId: entry.documentId ? String(entry.documentId) : undefined,
    matchScore: Math.max(0, Math.min(100, Number(entry.matchScore ?? 0))),
    persisted: Boolean(entry.persisted),
    status: String(entry.status ?? (entry.persisted ? 'persisted' : 'draft')),
    route: String(entry.route ?? 'platform'),
    latencyMs: Number(entry.latencyMs ?? 0),
    error: entry.error ? String(entry.error) : undefined,
    generatedAt: String(entry.generatedAt ?? now),
    createdAt: String(entry.createdAt ?? now),
    replayedAt: entry.replayedAt ? String(entry.replayedAt) : undefined,
    replayCount: Number(entry.replayCount ?? 0),
  }
}
