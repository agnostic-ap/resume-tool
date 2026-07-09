import { initialState } from '../defaults.js'
import { createAccountStore } from './accounts.js'
import { createActivityStore, logActivity } from './activity.js'
import { createApplicationsStore } from './applications.js'
import { createBillingStore } from './billing.js'
import {
  isDatabaseEmpty,
  migrateLegacyJsonIfNeeded,
  normalizeState,
  openStoreDatabase,
  readStateSync,
  replaceStateSync,
} from './db.js'
import {
  createDocumentsStore,
  getActiveDocument,
} from './documents.js'
import { createGrowthStore } from './growth.js'
import { createPlatformStore } from './platform.js'
import {
  type AnyRecord,
  type ResumeState,
  type StoreContext,
  type StoreModuleDeps,
  type StoreOptions,
  httpError,
  newId,
} from './shared.js'

export { normalizeActivity } from './activity.js'
export { normalizeApplication } from './applications.js'
export { effectiveBillingPlan } from './billing.js'
export { normalizeState } from './db.js'
export { normalizeConfig, normalizeDocument, normalizeResumeData } from './documents.js'
export { DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID, httpError } from './shared.js'

export function createStore(options: StoreOptions = {}) {
  const { db, dbPath, legacyDataDir } = openStoreDatabase(options)
  const migrated = migrateLegacyJsonIfNeeded(db, legacyDataDir)
  if (!migrated && isDatabaseEmpty(db)) {
    db.transaction((state: ResumeState) => replaceStateSync(db, state))(normalizeState(initialState()))
  }

  async function readState(context: StoreContext = {}): Promise<ResumeState> {
    return readStateSync(db, context)
  }

  async function writeState(state: unknown, context: StoreContext = {}): Promise<ResumeState> {
    return db.transaction((nextState: unknown) => replaceStateSync(db, nextState, context))(state)
  }

  async function mutate<T>(mutator: (state: ResumeState) => T, context: StoreContext = {}): Promise<T | ResumeState> {
    return db.transaction(() => {
      const state = readStateSync(db, context)
      const result = mutator(state)
      replaceStateSync(db, state, context)
      return result ?? state
    })()
  }

  async function replaceState(nextState: unknown, context: StoreContext = {}): Promise<ResumeState> {
    return writeState(nextState, context)
  }

  const moduleDeps: StoreModuleDeps = { readState, mutate }

  return {
    dbPath,
    readState,
    writeState,

    replaceState,

    ...createDocumentsStore(moduleDeps),
    ...createApplicationsStore(moduleDeps),
    ...createGrowthStore(moduleDeps),
    ...createPlatformStore(moduleDeps),
    ...createActivityStore(moduleDeps),

    async createAssistantSuggestion(input: AnyRecord = {}, context: StoreContext = {}) {
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
        logActivity(state, {
          type: 'ai',
          tag: 'AI',
          message: 'Generated local resume advice',
          messageZh: '生成本地简历优化建议',
          messageEn: 'Generated local resume advice',
          meta: prompt,
          resumeId: active.id,
        })
        return suggestion
      }, context)
    },

    ...createAccountStore(db),
    ...createBillingStore(db),

    close() {
      db.close()
    },
  }
}
