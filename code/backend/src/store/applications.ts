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

export function createApplicationsStore({ readState, mutate }: StoreModuleDeps) {
  return {
    async listApplications(context: StoreContext = {}) {
      const state = await readState(context)
      return state.applications
    },

    async createApplication(input: AnyRecord = {}, context: StoreContext = {}) {
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
        logActivity(state, {
          type: 'application',
          tag: 'apply',
          message: `Added application: ${app.company}`,
          messageZh: `新增投递：${app.company}`,
          messageEn: `Added application: ${app.company}`,
          meta: `${app.role} · ${app.stage}`,
          resumeId: app.resumeId,
        })
        return app
      }, context)
    },

    async updateApplication(id: string, patch: AnyRecord = {}, context: StoreContext = {}) {
      return mutate((state) => {
        const app = findApplication(state, id)
        const doc = patch.resumeId ? findDocument(state, patch.resumeId) : findDocument(state, app.resumeId)
        Object.assign(app, normalizeApplication({ ...app, ...patch, resumeId: doc.id, resumeTitle: doc.title }, doc), {
          id: app.id,
          createdAt: app.createdAt,
          updatedAt: new Date().toISOString(),
        })
        logActivity(state, {
          type: 'application',
          tag: 'update',
          message: `Updated application: ${app.company}`,
          messageZh: `更新投递：${app.company}`,
          messageEn: `Updated application: ${app.company}`,
          meta: `${app.role} · ${app.stage}`,
          resumeId: app.resumeId,
        })
        return app
      }, context)
    },

    async deleteApplication(id: string, context: StoreContext = {}) {
      return mutate((state) => {
        const app = findApplication(state, id)
        state.applications = state.applications.filter((item) => item.id !== id)
        logActivity(state, {
          type: 'application',
          tag: 'delete',
          message: `Deleted application: ${app.company}`,
          messageZh: `删除投递：${app.company}`,
          messageEn: `Deleted application: ${app.company}`,
          meta: app.role,
          resumeId: app.resumeId,
        })
        return { deletedId: id }
      }, context)
    },
  }
}

export function normalizeApplication(app: AnyRecord = {}, fallbackDoc: AnyRecord): AnyRecord {
  const now = new Date().toISOString()
  const company = String(app.company ?? '').trim()
  if (!company) throw httpError(400, 'Company is required')
  const role = String(app.role ?? '').trim()
  if (!role) throw httpError(400, 'Role is required')
  const stage = ['saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'].includes(app.stage) ? app.stage : 'saved'
  const appliedAt = app.appliedAt || (stage === 'saved' ? '' : now.slice(0, 10))
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
    appliedAt,
    nextAction: String(app.nextAction ?? ''),
    followUpAt: String(app.followUpAt ?? ''),
    contactName: String(app.contactName ?? ''),
    contactEmail: String(app.contactEmail ?? ''),
    jobPostUrl: String(app.jobPostUrl ?? app.jobDescription?.url ?? ''),
    notes: String(app.notes ?? ''),
    jobDescription: app.jobDescription ? normalizeJobDescription(app.jobDescription, { company, role, location: app.location }) : undefined,
    tailoring: app.tailoring ? normalizeTailoring(app.tailoring, fallbackDoc, app.match, now) : undefined,
    progressLog: normalizeProgressLog(app.progressLog, stage, app.nextAction, appliedAt || now.slice(0, 10), app.createdAt || now),
    createdAt: app.createdAt || now,
    updatedAt: app.updatedAt || now,
  }
}

function stageProgressTitle(stage: string): string {
  return {
    saved: 'Saved role for review',
    applied: 'Application submitted',
    screen: 'Screening started',
    onsite: 'Interview stage',
    offer: 'Offer received',
    rejected: 'Closed',
  }[stage] || 'Progress updated'
}

function normalizeProgressLog(
  events: unknown = [],
  stage: string,
  note: unknown = '',
  happenedAt: string,
  createdAt: string,
): AnyRecord[] {
  if (Array.isArray(events) && events.length) {
    return events.map((event) => {
      const eventStage = ['saved', 'applied', 'screen', 'onsite', 'offer', 'rejected'].includes(event.stage) ? event.stage : stage
      return {
        id: event.id || newId('progress'),
        stage: eventStage,
        title: String(event.title ?? stageProgressTitle(eventStage)),
        note: String(event.note ?? ''),
        happenedAt: String(event.happenedAt ?? happenedAt),
        createdAt: String(event.createdAt ?? createdAt),
      }
    })
  }
  return [{
    id: newId('progress'),
    stage,
    title: stageProgressTitle(stage),
    note: String(note ?? ''),
    happenedAt,
    createdAt,
  }]
}

function normalizeJobDescription(jobDescription: AnyRecord = {}, fallback: AnyRecord = {}): AnyRecord {
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

function normalizeTailoring(
  tailoring: AnyRecord = {},
  fallbackDoc: AnyRecord,
  fallbackMatch: unknown,
  now: string,
): AnyRecord {
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

export function findApplication(state: ResumeState, id: string): AnyRecord {
  const app = state.applications.find((item) => item.id === id)
  if (!app) throw httpError(404, 'Application not found')
  return app
}
