import {
  type AnyRecord,
  type ResumeState,
  type StoreContext,
  type StoreModuleDeps,
  newId,
} from './shared.js'

export function createActivityStore({ readState }: Pick<StoreModuleDeps, 'readState'>) {
  return {
    async listActivity(context: StoreContext = {}) {
      const state = await readState(context)
      return state.activityLog
    },
  }
}

export function logActivity(state: ResumeState, event: AnyRecord, fallbackDoc?: AnyRecord): AnyRecord {
  const active = fallbackDoc ?? state.documents.find((item) => item.id === state.activeResumeId) ?? state.documents[0]
  const entry = normalizeActivity({
    ...event,
    id: event.id ?? newId('activity'),
    resumeId: event.resumeId ?? active?.id,
    createdAt: event.createdAt ?? new Date().toISOString(),
  }, active)
  state.activityLog = [entry, ...state.activityLog].slice(0, 200)
  return entry
}

export function normalizeActivity(event: AnyRecord = {}, fallbackDoc?: AnyRecord): AnyRecord {
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
