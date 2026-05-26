import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { ResumeData, ResumeConfig, TemplateId, SectionId, ResumeTweaks, Locale, StudioTheme, ResumeDocument, JobApplication, JobDescriptionSnapshot, ApplicationStage, ActivityEvent, CareerUpdateChecklist, CareerUpdateKey, ApplicationProgressEvent, ProductEventName, SyncOperation, SyncOperationStatus, GrowthEntry, GrowthEntryType, ResumeOrigin } from '../types/resume'
import { showToast } from '../composables/toast'
import { backendApi } from '../api/backend'
import type { BackendState, PlatformResumeDraft } from '../api/backend'

const DEFAULT_ORDER: SectionId[] = [
  'summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages', 'certifications',
]

const DEFAULT_VISIBLE: Record<SectionId, boolean> = {
  summary: true,
  experience: true,
  education: true,
  skills: true,
  projects: true,
  awards: true,
  languages: false,
  certifications: false,
}

type JdDraftSection = 'summary' | 'experience' | 'skills' | 'projects'

export const DEFAULT_TWEAKS: ResumeTweaks = {
  accent: 'ocean',
  paper: 'mist',
  density: 'cozy',
  font: 'sans',
  fontScale: 100,
  showAI: true,
  showTree: true,
  ruleLines: false,
  marginaliaMode: 'notes',
  aiTone: 'editor',
}

export const DEFAULT_STUDIO_THEME: StudioTheme = {
  accent: 'ocean',
  paper: 'mist',
  density: 'cozy',
  font: 'sans',
  ruleLines: false,
}

const defaultResume: ResumeData = {
  personal: {
    name: '张明',
    title: '前端开发工程师',
    phone: '138-0000-0000',
    email: 'zhangming@example.com',
    location: '北京市',
    website: 'github.com/zhangming',
    summary: '3年前端开发经验，熟悉Vue3、React技术栈，擅长性能优化和组件化开发，具备良好的团队协作能力。',
  },
  experience: [
    {
      id: '1',
      company: '某科技有限公司',
      position: '高级前端工程师',
      location: '北京',
      startDate: '2022-07',
      endDate: '',
      current: true,
      description:
        '• 负责公司核心产品前端架构设计与开发，使用Vue3 + TypeScript技术栈\n• 优化首页加载速度，从4s降至1.2s，提升用户留存率20%\n• 主导前端组件库建设，沉淀30+可复用组件，提升团队开发效率30%',
    },
  ],
  education: [
    {
      id: '1',
      school: '北京大学',
      major: '计算机科学与技术',
      degree: '本科',
      startDate: '2018-09',
      endDate: '2022-06',
      gpa: '3.8/4.0',
      description: '',
    },
  ],
  skills: [
    { id: '1', category: '前端框架', items: 'Vue3, React, TypeScript, Vite, Webpack' },
    { id: '2', category: '工具与其他', items: 'Git, Docker, Node.js, MySQL, Linux' },
  ],
  projects: [
    {
      id: '1',
      name: '在线简历生成平台',
      role: '前端负责人',
      startDate: '2023-03',
      endDate: '2023-08',
      url: 'github.com/example/resume',
      tech: 'Vue3, TypeScript, Tailwind CSS, jsPDF',
      description:
        '• 开发多模板简历生成平台，支持实时预览和PDF导出\n• 实现拖拽排序、主题定制等特色功能\n• 上线后获得1000+用户使用，GitHub获得200+ Star',
    },
  ],
  awards: [
    {
      id: '1',
      title: '全国大学生计算机设计大赛 一等奖',
      issuer: '教育部高等教育司',
      date: '2021-08',
      description: '',
    },
  ],
  languages: [],
  certifications: [],
}

const defaultConfig: ResumeConfig = {
  locale: 'zh-CN',
  templateId: 'classic',
  themeColor: '#3E7891',
  fontSize: 14,
  sectionOrder: [...DEFAULT_ORDER],
  sectionVisible: { ...DEFAULT_VISIBLE },
  studioTheme: { ...DEFAULT_STUDIO_THEME },
  tweaks: { ...DEFAULT_TWEAKS },
}

const LEGACY_STUDIO_THEME: StudioTheme = {
  accent: 'vermillion',
  paper: 'cream',
  density: 'cozy',
  font: 'serif',
  ruleLines: false,
}

const SOFTENED_STUDIO_THEME: StudioTheme = {
  accent: 'coral',
  paper: 'stone',
  density: 'cozy',
  font: 'sans',
  ruleLines: false,
}

function isSameStudioTheme(theme: StudioTheme, target: StudioTheme) {
  return theme.accent === target.accent
    && theme.paper === target.paper
    && theme.density === target.density
    && theme.font === target.font
    && theme.ruleLines === target.ruleLines
}

function isLegacyVisualTweaks(tweaks: ResumeTweaks) {
  const matchesLegacy = tweaks.accent === LEGACY_STUDIO_THEME.accent
    && tweaks.paper === LEGACY_STUDIO_THEME.paper
    && tweaks.density === LEGACY_STUDIO_THEME.density
    && tweaks.font === LEGACY_STUDIO_THEME.font
    && tweaks.ruleLines === LEGACY_STUDIO_THEME.ruleLines
  const matchesSoftened = tweaks.accent === SOFTENED_STUDIO_THEME.accent
    && tweaks.paper === SOFTENED_STUDIO_THEME.paper
    && tweaks.density === SOFTENED_STUDIO_THEME.density
    && tweaks.font === SOFTENED_STUDIO_THEME.font
    && tweaks.ruleLines === SOFTENED_STUDIO_THEME.ruleLines
  return matchesLegacy || matchesSoftened
}

function isoDateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function defaultApplications(resumeId: string, resumeTitle: string): JobApplication[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'app-vercel',
      company: 'Vercel',
      companyMono: 'V',
      location: 'Remote · NA',
      role: 'Senior Frontend',
      department: 'Web Platform',
      resumeId,
      resumeTitle,
      stage: 'onsite',
      match: 92,
      appliedAt: isoDateDaysAgo(2),
      notes: 'Focus on frontend architecture, performance, and design systems.',
      nextAction: 'Prepare architecture walkthrough',
      followUpAt: isoDateDaysAgo(-2),
      contactName: 'Recruiting team',
      contactEmail: '',
      jobPostUrl: '',
      progressLog: normalizeProgressLog(undefined, 'onsite', 'Prepare architecture walkthrough', isoDateDaysAgo(2), now),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'app-stripe',
      company: 'Stripe',
      companyMono: 'S',
      location: 'Dublin · Hybrid',
      role: 'Full-Stack Engineer',
      department: 'Payments API',
      resumeId,
      resumeTitle: 'Full-Stack · Stripe',
      stage: 'screen',
      match: 84,
      appliedAt: isoDateDaysAgo(4),
      notes: 'Emphasize API work and backend collaboration.',
      nextAction: 'Send backend project examples',
      followUpAt: isoDateDaysAgo(1),
      contactName: '',
      contactEmail: '',
      jobPostUrl: '',
      progressLog: normalizeProgressLog(undefined, 'screen', 'Send backend project examples', isoDateDaysAgo(4), now),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'app-linear',
      company: 'Linear',
      companyMono: 'L',
      location: 'Remote · Global',
      role: 'Staff Engineer',
      department: 'Sync Engine',
      resumeId,
      resumeTitle: 'Staff · Linear',
      stage: 'offer',
      match: 96,
      appliedAt: isoDateDaysAgo(10),
      notes: 'Strong match: product engineering and systems ownership.',
      nextAction: 'Review offer details',
      followUpAt: '',
      contactName: '',
      contactEmail: '',
      jobPostUrl: '',
      progressLog: normalizeProgressLog(undefined, 'offer', 'Review offer details', isoDateDaysAgo(10), now),
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function defaultActivityLog(resumeId: string, resumeTitle: string): ActivityEvent[] {
  const now = new Date()
  return [
    {
      id: 'activity-created',
      type: 'resume',
      tag: 'init',
      message: `Workspace ready for ${resumeTitle}`,
      messageZh: `${resumeTitle} 工作台已就绪`,
      messageEn: `Workspace ready for ${resumeTitle}`,
      meta: 'resume studio · local first',
      resumeId,
      createdAt: now.toISOString(),
    },
  ]
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function newId(prefix = 'resume') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12)
}

function normalizeResumeOrigin(origin: unknown, fallback: ResumeOrigin = 'sample'): ResumeOrigin {
  return ['sample', 'blank', 'import', 'copy', 'jd-draft', 'platform'].includes(String(origin))
    ? String(origin) as ResumeOrigin
    : fallback
}

function defaultCareerUpdateChecklist(date = new Date()): CareerUpdateChecklist {
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

function normalizeCareerUpdateChecklist(checklist: Partial<CareerUpdateChecklist> = {}, fallback: Partial<CareerUpdateChecklist> = {}): CareerUpdateChecklist {
  return {
    ...defaultCareerUpdateChecklist(),
    ...fallback,
    projects: Boolean(checklist.projects ?? fallback.projects),
    metrics: Boolean(checklist.metrics ?? fallback.metrics),
    roleChanges: Boolean(checklist.roleChanges ?? fallback.roleChanges),
    interviewFeedback: Boolean(checklist.interviewFeedback ?? fallback.interviewFeedback),
    skills: Boolean(checklist.skills ?? fallback.skills),
    notes: checklist.notes ?? fallback.notes ?? '',
    updatedAt: checklist.updatedAt ?? fallback.updatedAt ?? new Date().toISOString(),
  }
}

function normalizeGrowthEntry(entry: Partial<GrowthEntry>, fallbackResume: ResumeDocument): GrowthEntry {
  const now = new Date().toISOString()
  const sourceResumeId = entry.sourceResumeId || fallbackResume.id
  const sourceResumeTitle = entry.sourceResumeTitle || fallbackResume.title
  return {
    id: entry.id || newId('growth'),
    date: entry.date || now.slice(0, 10),
    type: (['project', 'metric', 'role', 'feedback', 'skill', 'achievement'].includes(entry.type || '') ? entry.type : 'achievement') as GrowthEntryType,
    company: entry.company || fallbackResume.targetCompany || '',
    project: entry.project || '',
    title: entry.title?.trim() || 'Untitled growth entry',
    content: entry.content || '',
    metrics: entry.metrics || '',
    skills: Array.isArray(entry.skills) ? [...new Set(entry.skills.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 20) : [],
    evidenceUrl: entry.evidenceUrl || '',
    private: Boolean(entry.private),
    archived: Boolean(entry.archived),
    sourceResumeId,
    sourceResumeTitle,
    usedByResumeIds: Array.isArray(entry.usedByResumeIds) ? [...new Set(entry.usedByResumeIds.map(String).filter(Boolean))] : [],
    usedByApplicationIds: Array.isArray(entry.usedByApplicationIds) ? [...new Set(entry.usedByApplicationIds.map(String).filter(Boolean))] : [],
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
  }
}

function normalizeApplication(app: Partial<JobApplication>, fallbackResume: ResumeDocument): JobApplication {
  const now = new Date().toISOString()
  const company = app.company?.trim() || 'Untitled company'
  const stage = (app.stage || 'saved') as ApplicationStage
  const appliedAt = app.appliedAt || (stage === 'saved' ? '' : now.slice(0, 10))
  const progressLog = normalizeProgressLog(app.progressLog, stage, app.nextAction || '', appliedAt || now.slice(0, 10), app.createdAt || now)
  return {
    id: app.id || newId('app'),
    company,
    companyMono: (app.companyMono || company.slice(0, 1) || 'A').slice(0, 2).toUpperCase(),
    location: app.location || '',
    role: app.role || '',
    department: app.department || '',
    resumeId: app.resumeId || fallbackResume.id,
    resumeTitle: app.resumeTitle || fallbackResume.title,
    stage,
    match: Math.max(0, Math.min(100, Number(app.match ?? 70))),
    appliedAt,
    nextAction: app.nextAction || '',
    followUpAt: app.followUpAt || '',
    contactName: app.contactName || '',
    contactEmail: app.contactEmail || '',
    jobPostUrl: app.jobPostUrl || app.jobDescription?.url || '',
    notes: app.notes || '',
    jobDescription: app.jobDescription
      ? {
          company: app.jobDescription.company || company,
          title: app.jobDescription.title || app.role || '',
          location: app.jobDescription.location || app.location || '',
          description: app.jobDescription.description || '',
          requirements: Array.isArray(app.jobDescription.requirements) ? app.jobDescription.requirements : [],
          url: app.jobDescription.url || '',
          archivedAt: app.jobDescription.archivedAt,
        }
      : undefined,
    tailoring: app.tailoring
      ? {
          requestId: app.tailoring.requestId || '',
          sourceResumeId: app.tailoring.sourceResumeId || fallbackResume.id,
          draftTitle: app.tailoring.draftTitle || fallbackResume.title,
          matchScore: Math.max(0, Math.min(100, Number(app.tailoring.matchScore ?? app.match ?? 70))),
          matchedKeywords: Array.isArray(app.tailoring.matchedKeywords) ? app.tailoring.matchedKeywords : [],
          selectedExperienceIds: Array.isArray(app.tailoring.selectedExperienceIds) ? app.tailoring.selectedExperienceIds : [],
          strategy: app.tailoring.strategy || '',
          generatedAt: app.tailoring.generatedAt || now,
          appliedAt: app.tailoring.appliedAt,
        }
      : undefined,
    progressLog,
    createdAt: app.createdAt || now,
    updatedAt: app.updatedAt || now,
  }
}

function stageProgressTitle(stage: ApplicationStage) {
  const titles: Record<ApplicationStage, string> = {
    saved: 'Saved role for review',
    applied: 'Application submitted',
    screen: 'Screening started',
    onsite: 'Interview stage',
    offer: 'Offer received',
    rejected: 'Closed',
  }
  return titles[stage]
}

function normalizeProgressLog(
  events: Partial<ApplicationProgressEvent>[] | undefined,
  stage: ApplicationStage,
  note: string,
  happenedAt: string,
  createdAt: string,
  allowEmpty = false,
): ApplicationProgressEvent[] {
  if (Array.isArray(events) && (events.length || allowEmpty)) {
    return events.map((event) => ({
      id: event.id || newId('progress'),
      stage: (event.stage || stage) as ApplicationStage,
      title: event.title || stageProgressTitle((event.stage || stage) as ApplicationStage),
      note: event.note || '',
      happenedAt: event.happenedAt || happenedAt,
      createdAt: event.createdAt || createdAt,
    }))
  }
  return [{
    id: newId('progress'),
    stage,
    title: stageProgressTitle(stage),
    note,
    happenedAt,
    createdAt,
  }]
}

function normalizeActivity(activity: Partial<ActivityEvent>, fallbackResume: ResumeDocument): ActivityEvent {
  const now = new Date().toISOString()
  return {
    id: activity.id || newId('activity'),
    type: activity.type || 'system',
    tag: activity.tag || 'event',
    message: activity.message || activity.messageEn || activity.messageZh || 'Workspace activity',
    messageZh: activity.messageZh,
    messageEn: activity.messageEn,
    meta: activity.meta || fallbackResume.title,
    resumeId: activity.resumeId ?? fallbackResume.id,
    createdAt: activity.createdAt || now,
  }
}

function normalizeDocument(doc: Partial<ResumeDocument>): ResumeDocument {
  const now = new Date().toISOString()
  const data = {
    ...clone(defaultResume),
    ...(doc.data ?? {}),
    languages: Array.isArray(doc.data?.languages) ? doc.data.languages : [],
    certifications: Array.isArray(doc.data?.certifications) ? doc.data.certifications : [],
  }
  return {
    id: doc.id || newId(),
    title: doc.title?.trim() || data.personal.title || data.personal.name || 'Untitled resume',
    data,
    config: mergeConfig(doc.config ?? {}),
    folder: doc.folder?.trim() || 'General',
    targetRole: doc.targetRole?.trim() || '',
    targetCompany: doc.targetCompany?.trim() || '',
    tags: normalizeTags(doc.tags),
    origin: normalizeResumeOrigin(doc.origin, doc.sourceResumeId ? 'copy' : 'sample'),
    sourceResumeId: doc.sourceResumeId,
    sourceResumeTitle: doc.sourceResumeTitle,
    favorite: Boolean(doc.favorite),
    archived: Boolean(doc.archived),
    careerUpdateChecklist: normalizeCareerUpdateChecklist(doc.careerUpdateChecklist),
    createdAt: doc.createdAt ?? now,
    updatedAt: doc.updatedAt ?? now,
    lastCareerUpdateAt: doc.lastCareerUpdateAt ?? doc.updatedAt ?? now,
    nextCareerUpdateAt: doc.nextCareerUpdateAt ?? addDays(new Date(doc.updatedAt ?? now), 14).toISOString(),
  }
}

function mergeConfig(saved: Partial<ResumeConfig>): ResumeConfig {
  const studioTheme = { ...DEFAULT_STUDIO_THEME, ...(saved.studioTheme ?? {}) }
  const tweaks = { ...DEFAULT_TWEAKS, ...(saved.tweaks ?? {}) }
  const isLegacyStudioTheme = Boolean(saved.studioTheme)
    && (
      isSameStudioTheme(studioTheme, LEGACY_STUDIO_THEME)
      || isSameStudioTheme(studioTheme, SOFTENED_STUDIO_THEME)
    )
  const isLegacyTweaks = Boolean(saved.tweaks) && isLegacyVisualTweaks(tweaks)
  return {
    ...defaultConfig,
    ...saved,
    sectionOrder: saved.sectionOrder?.length ? saved.sectionOrder : [...DEFAULT_ORDER],
    sectionVisible: { ...DEFAULT_VISIBLE, ...(saved.sectionVisible ?? {}) },
    studioTheme: isLegacyStudioTheme ? { ...DEFAULT_STUDIO_THEME } : studioTheme,
    tweaks: isLegacyTweaks
      ? {
        ...tweaks,
        accent: DEFAULT_TWEAKS.accent,
        paper: DEFAULT_TWEAKS.paper,
        font: DEFAULT_TWEAKS.font,
        ruleLines: DEFAULT_TWEAKS.ruleLines,
      }
      : tweaks,
  }
}

export const useResumeStore = defineStore('resume', () => {
  const legacyData = loadFromStorage<ResumeData>('resume-data', clone(defaultResume))
  const legacyConfig = mergeConfig(loadFromStorage('resume-config', {}))
  const now = new Date()
  const fallbackDocument: ResumeDocument = {
    id: 'resume-main',
    title: legacyData.personal.title || legacyData.personal.name || '主简历',
    data: clone(legacyData),
    config: clone(legacyConfig),
    folder: 'General',
    targetRole: legacyData.personal.title || '',
    targetCompany: '',
    tags: [],
    origin: 'sample',
    favorite: false,
    archived: false,
    careerUpdateChecklist: defaultCareerUpdateChecklist(now),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastCareerUpdateAt: now.toISOString(),
    nextCareerUpdateAt: addDays(now, 14).toISOString(),
  }
  const documents = ref<ResumeDocument[]>(
    loadFromStorage('resume-documents', [fallbackDocument]).map((doc: ResumeDocument) => normalizeDocument(doc)),
  )
  const activeResumeId = ref(loadFromStorage('active-resume-id', documents.value[0]?.id ?? fallbackDocument.id))
  const seedApplicationResume = documents.value.find((doc) => doc.id === activeResumeId.value) ?? documents.value[0] ?? fallbackDocument
  const applications = ref<JobApplication[]>(
    loadFromStorage<JobApplication[]>('resume-applications', defaultApplications(seedApplicationResume.id, seedApplicationResume.title))
      .map((app) => normalizeApplication(app, documents.value.find((doc) => doc.id === app.resumeId) ?? seedApplicationResume)),
  )
  const growthEntries = ref<GrowthEntry[]>(
    loadFromStorage<GrowthEntry[]>('resume-growth-entries', [])
      .map((entry) => normalizeGrowthEntry(entry, documents.value.find((doc) => doc.id === entry.sourceResumeId) ?? seedApplicationResume)),
  )
  const activityLog = ref<ActivityEvent[]>(
    loadFromStorage<ActivityEvent[]>('resume-activity-log', defaultActivityLog(seedApplicationResume.id, seedApplicationResume.title))
      .map((activity) => normalizeActivity(activity, documents.value.find((doc) => doc.id === activity.resumeId) ?? seedApplicationResume)),
  )
  const syncOperations = ref<SyncOperation[]>(loadFromStorage<SyncOperation[]>('resume-sync-operations', []))
  const backendStatus = ref({
    online: false,
    connecting: false,
    baseUrl: backendApi.baseUrl,
    lastSyncAt: '',
    error: '',
  })
  let suppressBackendSync = false

  if (!documents.value.some((doc) => doc.id === activeResumeId.value)) {
    activeResumeId.value = documents.value[0]?.id ?? fallbackDocument.id
  }

  const activeDocument = computed(() => {
    let doc = documents.value.find((item) => item.id === activeResumeId.value)
    if (!doc) {
      doc = documents.value[0] ?? fallbackDocument
      if (!documents.value.length) documents.value.push(doc)
      activeResumeId.value = doc.id
    }
    return doc
  })

  const data = computed<ResumeData>({
    get: () => activeDocument.value.data,
    set: (value) => {
      activeDocument.value.data = value
      touchActive()
    },
  })

  const config = computed<ResumeConfig>({
    get: () => activeDocument.value.config,
    set: (value) => {
      activeDocument.value.config = mergeConfig(value)
      touchActive()
    },
  })

  // Ensure languages/certifications arrays exist (migration for old saved data)
  if (!data.value.languages) data.value.languages = []
  if (!data.value.certifications) data.value.certifications = []

  const persistDocuments = useDebounceFn((v: ResumeDocument[]) => {
    try { localStorage.setItem('resume-documents', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)
  const persistActiveId = useDebounceFn((v: string) => {
    try { localStorage.setItem('active-resume-id', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)
  const persistApplications = useDebounceFn((v: JobApplication[]) => {
    try { localStorage.setItem('resume-applications', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)
  const persistGrowthEntries = useDebounceFn((v: GrowthEntry[]) => {
    try { localStorage.setItem('resume-growth-entries', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)
  const persistActivityLog = useDebounceFn((v: ActivityEvent[]) => {
    try { localStorage.setItem('resume-activity-log', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)
  const persistSyncOperations = useDebounceFn((v: SyncOperation[]) => {
    try { localStorage.setItem('resume-sync-operations', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)
  const syncActiveDocumentToBackend = useDebounceFn(() => {
    if (suppressBackendSync || !backendStatus.value.online) return
    const doc = activeDocument.value
    void runBackendSync(() => backendApi.updateResume(doc.id, {
      title: doc.title,
      data: doc.data,
      config: doc.config,
    }), { entityType: 'resume', operation: 'update', entityId: doc.id })
  }, 700)
  const logContentEdit = useDebounceFn(() => {
    activeDocument.value.updatedAt = new Date().toISOString()
    if (!activeDocument.value.title.trim() || activeDocument.value.title === 'Untitled resume') {
      activeDocument.value.title = data.value.personal.title || data.value.personal.name || activeDocument.value.title
    }
    logActivity({
      type: 'edit',
      tag: 'autosave',
      message: 'Saved resume content edits',
      messageZh: '保存简历内容修改',
      messageEn: 'Saved resume content edits',
      meta: activeDocument.value.title,
    })
  }, 3000)
  const markConfigChanged = useDebounceFn(() => {
    activeDocument.value.updatedAt = new Date().toISOString()
  }, 1000)

  watch(documents, persistDocuments, { deep: true })
  watch(activeResumeId, persistActiveId)
  watch(applications, persistApplications, { deep: true })
  watch(growthEntries, persistGrowthEntries, { deep: true })
  watch(activityLog, persistActivityLog, { deep: true })
  watch(syncOperations, persistSyncOperations, { deep: true })
  watch(() => activeDocument.value.data, () => {
    logContentEdit()
    syncActiveDocumentToBackend()
  }, { deep: true })
  watch(() => activeDocument.value.config, () => {
    markConfigChanged()
    syncActiveDocumentToBackend()
  }, { deep: true })

  function applyBackendState(state: BackendState) {
    const incomingDocuments = state.documents?.length ? state.documents.map((doc) => normalizeDocument(doc)) : documents.value
    const incomingActive = incomingDocuments.some((doc) => doc.id === state.activeResumeId)
      ? state.activeResumeId
      : incomingDocuments[0]?.id ?? activeResumeId.value
    const fallback = incomingDocuments.find((doc) => doc.id === incomingActive) ?? incomingDocuments[0] ?? activeDocument.value

    suppressBackendSync = true
    documents.value = incomingDocuments
    activeResumeId.value = incomingActive
    applications.value = Array.isArray(state.applications)
      ? state.applications.map((app) => normalizeApplication(app, incomingDocuments.find((doc) => doc.id === app.resumeId) ?? fallback))
      : []
    growthEntries.value = Array.isArray(state.growthEntries)
      ? state.growthEntries.map((entry) => normalizeGrowthEntry(entry, incomingDocuments.find((doc) => doc.id === entry.sourceResumeId) ?? fallback))
      : growthEntries.value
    activityLog.value = Array.isArray(state.activityLog)
      ? state.activityLog.map((activity) => normalizeActivity(activity, incomingDocuments.find((doc) => doc.id === activity.resumeId) ?? fallback))
      : []
    window.setTimeout(() => {
      suppressBackendSync = false
    }, 0)
  }

  function markBackendOnline() {
    backendStatus.value = {
      ...backendStatus.value,
      online: true,
      connecting: false,
      lastSyncAt: new Date().toISOString(),
      error: '',
    }
  }

  function markBackendOffline(error: unknown) {
    backendStatus.value = {
      ...backendStatus.value,
      online: false,
      connecting: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }

  async function connectBackend() {
    if (backendStatus.value.connecting) return backendStatus.value.online
    backendStatus.value = { ...backendStatus.value, connecting: true, error: '' }
    try {
      const state = await backendApi.getState()
      applyBackendState(state)
      markBackendOnline()
      return true
    } catch (error) {
      markBackendOffline(error)
      return false
    }
  }

  function recordSyncOperation(input: {
    entityType?: SyncOperation['entityType']
    operation?: string
    entityId?: string
    status: SyncOperationStatus
    error?: string
  }) {
    const entityType = input.entityType ?? 'system'
    const operation = input.operation ?? 'sync'
    const entityId = input.entityId ?? activeResumeId.value
    const id = `${entityType}:${operation}:${entityId}`
    const next: SyncOperation = {
      id,
      entityType,
      operation,
      entityId,
      status: input.status,
      error: input.error ?? '',
      updatedAt: new Date().toISOString(),
    }
    syncOperations.value = [
      next,
      ...syncOperations.value.filter((item) => item.id !== id),
    ].slice(0, 30)
    return next
  }

  function clearSyncedOperations() {
    syncOperations.value = syncOperations.value.filter((item) => item.status === 'failed' || item.status === 'local-only')
  }

  async function runBackendSync<T>(
    task: () => Promise<T>,
    meta: Partial<Pick<SyncOperation, 'entityType' | 'operation' | 'entityId'>> = {},
  ) {
    if (!backendStatus.value.online) {
      recordSyncOperation({
        ...meta,
        status: 'local-only',
        error: backendStatus.value.error || 'Backend offline',
      })
      return undefined
    }
    recordSyncOperation({ ...meta, status: 'pending' })
    try {
      const result = await task()
      markBackendOnline()
      recordSyncOperation({ ...meta, status: 'synced' })
      clearSyncedOperations()
      return result
    } catch (error) {
      markBackendOffline(error)
      recordSyncOperation({
        ...meta,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      logActivity({
        type: 'system',
        tag: 'sync',
        message: 'Backend sync failed',
        messageZh: '后端同步失败，已进入重试队列',
        messageEn: 'Backend sync failed and was queued for retry',
        meta: `${meta.entityType ?? 'system'} · ${meta.operation ?? 'sync'}`,
      })
      trackProductEvent('sync_operation_failed', {
        entity_type: meta.entityType ?? 'system',
        operation: meta.operation ?? 'sync',
        entity_id: meta.entityId,
        error_code: error instanceof Error ? error.message : String(error),
      })
      return undefined
    }
  }

  async function retryFailedSyncs() {
    const ok = backendStatus.value.online || await connectBackend()
    if (!ok) return false
    const doc = activeDocument.value
    await runBackendSync(() => backendApi.updateResume(doc.id, {
      title: doc.title,
      data: doc.data,
      config: doc.config,
      folder: doc.folder,
      targetRole: doc.targetRole,
      targetCompany: doc.targetCompany,
      tags: doc.tags,
      favorite: doc.favorite,
      archived: doc.archived,
      careerUpdateChecklist: doc.careerUpdateChecklist,
    }), { entityType: 'resume', operation: 'retry', entityId: doc.id })
    await Promise.all(applications.value.map((app) =>
      runBackendSync(() => backendApi.updateApplication(app.id, app), {
        entityType: 'application',
        operation: 'retry',
        entityId: app.id,
      }),
    ))
    await Promise.all(growthEntries.value.map((entry) =>
      runBackendSync(() => backendApi.updateGrowthEntry(entry.id, entry), {
        entityType: 'growth',
        operation: 'retry',
        entityId: entry.id,
      }),
    ))
    if (backendStatus.value.online && !syncOperations.value.some((item) => item.status === 'failed')) {
      syncOperations.value = []
    } else {
      syncOperations.value = syncOperations.value.filter((item) => item.status === 'failed' || item.status === 'local-only')
    }
    return !syncOperations.value.length
  }

  function replaceDocument(tempId: string, serverDoc: ResumeDocument) {
    const normalized = normalizeDocument(serverDoc)
    const idx = documents.value.findIndex((doc) => doc.id === tempId)
    if (idx >= 0) documents.value[idx] = normalized
    else documents.value.unshift(normalized)
    if (activeResumeId.value === tempId) activeResumeId.value = normalized.id
    applications.value.forEach((app) => {
      if (app.resumeId === tempId) {
        app.resumeId = normalized.id
        app.resumeTitle = normalized.title
      }
    })
    return normalized
  }

  function replaceApplication(tempId: string, serverApp: JobApplication) {
    const doc = documents.value.find((item) => item.id === serverApp.resumeId) ?? activeDocument.value
    const normalized = normalizeApplication(serverApp, doc)
    const idx = applications.value.findIndex((app) => app.id === tempId)
    if (idx >= 0) applications.value[idx] = normalized
    else applications.value.unshift(normalized)
    return normalized
  }

  function logActivity(input: Omit<Partial<ActivityEvent>, 'id' | 'createdAt'> & { message?: string; messageZh?: string; messageEn?: string }) {
    const event = normalizeActivity({
      ...input,
      message: input.message ?? input.messageEn ?? input.messageZh,
      id: newId('activity'),
      resumeId: input.resumeId ?? activeResumeId.value,
      createdAt: new Date().toISOString(),
    }, activeDocument.value)
    activityLog.value = [event, ...activityLog.value].slice(0, 100)
    return event
  }

  function trackProductEvent(event: ProductEventName, properties: Record<string, unknown> = {}) {
    const compactProperties = Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined && value !== ''),
    )
    return logActivity({
      type: 'system',
      tag: `event:${event}`,
      message: event,
      messageZh: event,
      messageEn: event,
      meta: JSON.stringify(compactProperties),
    })
  }

  function touchActive() {
    activeDocument.value.updatedAt = new Date().toISOString()
    if (!activeDocument.value.title.trim()) {
      activeDocument.value.title = data.value.personal.title || data.value.personal.name || 'Untitled resume'
    }
  }

  // Completeness score 0-100
  const completeness = computed(() => {
    let score = 0
    const p = data.value.personal
    if (p.name) score += 10
    if (p.title) score += 5
    if (p.phone && p.email) score += 10
    if (p.summary && p.summary.length > 20) score += 10
    if (data.value.experience.length > 0) score += 15
    if (data.value.experience.some((e) => e.description.length > 30)) score += 10
    if (data.value.education.length > 0) score += 15
    if (data.value.skills.length > 0) score += 10
    if (data.value.projects.length > 0) score += 15
    return Math.min(100, score)
  })

  function setTemplate(id: TemplateId) {
    config.value.templateId = id
    touchActive()
    logActivity({
      type: 'edit',
      tag: 'template',
      message: `Changed template to ${id}`,
      messageZh: `切换模板：${id}`,
      messageEn: `Changed template to ${id}`,
      meta: activeDocument.value.title,
    })
    syncActiveDocumentToBackend()
  }

  function setLocale(locale: Locale) {
    config.value.locale = locale
    touchActive()
    logActivity({
      type: 'system',
      tag: 'locale',
      message: `Switched language to ${locale}`,
      messageZh: `切换语言：${locale}`,
      messageEn: `Switched language to ${locale}`,
      meta: activeDocument.value.title,
    })
    syncActiveDocumentToBackend()
  }

  function setThemeColor(color: string) {
    config.value.themeColor = color
    touchActive()
    syncActiveDocumentToBackend()
  }

  function setStudioTheme<K extends keyof StudioTheme>(key: K, value: StudioTheme[K]) {
    config.value.studioTheme[key] = value
    touchActive()
    syncActiveDocumentToBackend()
  }

  function resetStudioTheme() {
    config.value.studioTheme = { ...DEFAULT_STUDIO_THEME }
    touchActive()
    syncActiveDocumentToBackend()
  }

  function setTweak<K extends keyof ResumeTweaks>(key: K, value: ResumeTweaks[K]) {
    config.value.tweaks[key] = value
    touchActive()
    syncActiveDocumentToBackend()
  }

  function resetTweaks() {
    config.value.tweaks = { ...DEFAULT_TWEAKS }
    touchActive()
    syncActiveDocumentToBackend()
  }

  function moveSection(id: SectionId, direction: 'up' | 'down') {
    const arr = config.value.sectionOrder
    const idx = arr.indexOf(id)
    if (direction === 'up' && idx > 0) {
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    } else if (direction === 'down' && idx < arr.length - 1) {
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    }
    logActivity({
      type: 'edit',
      tag: 'order',
      message: `Moved ${id} ${direction}`,
      messageZh: `调整章节顺序：${id}`,
      messageEn: `Moved ${id} ${direction}`,
      meta: 'section order',
    })
    syncActiveDocumentToBackend()
  }

  function toggleSectionVisible(id: SectionId) {
    config.value.sectionVisible[id] = !config.value.sectionVisible[id]
    logActivity({
      type: 'edit',
      tag: 'section',
      message: `${config.value.sectionVisible[id] ? 'Showed' : 'Hid'} ${id}`,
      messageZh: `${config.value.sectionVisible[id] ? '显示' : '隐藏'}章节：${id}`,
      messageEn: `${config.value.sectionVisible[id] ? 'Showed' : 'Hid'} ${id}`,
      meta: 'visibility changed',
    })
    syncActiveDocumentToBackend()
  }

  function addExperience() {
    data.value.experience.push({
      id: Date.now().toString(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    })
    logActivity({ type: 'edit', tag: 'add', message: 'Added work experience', messageZh: '添加工作经历', messageEn: 'Added work experience', meta: activeDocument.value.title })
  }
  function removeExperience(id: string) {
    data.value.experience = data.value.experience.filter((e) => e.id !== id)
    logActivity({ type: 'edit', tag: 'delete', message: 'Removed work experience', messageZh: '删除工作经历', messageEn: 'Removed work experience', meta: activeDocument.value.title })
  }

  function addEducation() {
    data.value.education.push({
      id: Date.now().toString(),
      school: '',
      major: '',
      degree: '本科',
      startDate: '',
      endDate: '',
      gpa: '',
      description: '',
    })
    logActivity({ type: 'edit', tag: 'add', message: 'Added education', messageZh: '添加教育经历', messageEn: 'Added education', meta: activeDocument.value.title })
  }
  function removeEducation(id: string) {
    data.value.education = data.value.education.filter((e) => e.id !== id)
    logActivity({ type: 'edit', tag: 'delete', message: 'Removed education', messageZh: '删除教育经历', messageEn: 'Removed education', meta: activeDocument.value.title })
  }

  function addSkill() {
    data.value.skills.push({ id: Date.now().toString(), category: '', items: '' })
    logActivity({ type: 'edit', tag: 'add', message: 'Added skill group', messageZh: '添加技能分类', messageEn: 'Added skill group', meta: activeDocument.value.title })
  }
  function removeSkill(id: string) {
    data.value.skills = data.value.skills.filter((s) => s.id !== id)
    logActivity({ type: 'edit', tag: 'delete', message: 'Removed skill group', messageZh: '删除技能分类', messageEn: 'Removed skill group', meta: activeDocument.value.title })
  }

  function addProject() {
    data.value.projects.push({
      id: Date.now().toString(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      url: '',
      tech: '',
      description: '',
    })
    logActivity({ type: 'edit', tag: 'add', message: 'Added project', messageZh: '添加项目经历', messageEn: 'Added project', meta: activeDocument.value.title })
  }
  function removeProject(id: string) {
    data.value.projects = data.value.projects.filter((p) => p.id !== id)
    logActivity({ type: 'edit', tag: 'delete', message: 'Removed project', messageZh: '删除项目经历', messageEn: 'Removed project', meta: activeDocument.value.title })
  }

  function addAward() {
    data.value.awards.push({
      id: Date.now().toString(),
      title: '',
      issuer: '',
      date: '',
      description: '',
    })
    logActivity({ type: 'edit', tag: 'add', message: 'Added award', messageZh: '添加荣誉奖项', messageEn: 'Added award', meta: activeDocument.value.title })
  }
  function removeAward(id: string) {
    data.value.awards = data.value.awards.filter((a) => a.id !== id)
    logActivity({ type: 'edit', tag: 'delete', message: 'Removed award', messageZh: '删除荣誉奖项', messageEn: 'Removed award', meta: activeDocument.value.title })
  }

  function addLanguage() {
    data.value.languages.push({ id: Date.now().toString(), language: '', level: '' })
    logActivity({ type: 'edit', tag: 'add', message: 'Added language', messageZh: '添加语言能力', messageEn: 'Added language', meta: activeDocument.value.title })
  }
  function removeLanguage(id: string) {
    data.value.languages = data.value.languages.filter((l) => l.id !== id)
    logActivity({ type: 'edit', tag: 'delete', message: 'Removed language', messageZh: '删除语言能力', messageEn: 'Removed language', meta: activeDocument.value.title })
  }

  function addCertification() {
    data.value.certifications.push({
      id: Date.now().toString(),
      name: '',
      issuer: '',
      date: '',
    })
    logActivity({ type: 'edit', tag: 'add', message: 'Added certification', messageZh: '添加证书资质', messageEn: 'Added certification', meta: activeDocument.value.title })
  }
  function removeCertification(id: string) {
    data.value.certifications = data.value.certifications.filter((c) => c.id !== id)
    logActivity({ type: 'edit', tag: 'delete', message: 'Removed certification', messageZh: '删除证书资质', messageEn: 'Removed certification', meta: activeDocument.value.title })
  }

  function resetToDefault() {
    data.value = JSON.parse(JSON.stringify(defaultResume))
    config.value = JSON.parse(JSON.stringify(defaultConfig))
    activeDocument.value.title = data.value.personal.title || '主简历'
    markCareerUpdated(activeResumeId.value, false)
    logActivity({ type: 'system', tag: 'reset', message: 'Restored demo resume data', messageZh: '恢复示例简历数据', messageEn: 'Restored demo resume data', meta: activeDocument.value.title })
    syncActiveDocumentToBackend()
  }

  function clearAll() {
    data.value = {
      personal: { name: '', title: '', phone: '', email: '', location: '', website: '', summary: '' },
      experience: [], education: [], skills: [], projects: [], awards: [], languages: [], certifications: [],
    }
    config.value = JSON.parse(JSON.stringify(defaultConfig))
    activeDocument.value.title = 'Untitled resume'
    markCareerUpdated(activeResumeId.value, false)
    logActivity({ type: 'resume', tag: 'blank', message: 'Cleared current resume', messageZh: '清空当前简历', messageEn: 'Cleared current resume', meta: activeDocument.value.title })
    syncActiveDocumentToBackend()
  }

  function createResume(blank = false) {
    const created = new Date()
    const sourceTitle = activeDocument.value.title
    const sourceId = activeResumeId.value
    const syncingWithBackend = backendStatus.value.online
    if (syncingWithBackend) suppressBackendSync = true
    const doc: ResumeDocument = {
      id: newId(),
      title: blank ? 'Untitled resume' : `${activeDocument.value.title} Copy`,
      data: blank
        ? {
            personal: { name: '', title: '', phone: '', email: '', location: '', website: '', summary: '' },
            experience: [], education: [], skills: [], projects: [], awards: [], languages: [], certifications: [],
          }
        : clone(data.value),
      config: blank ? clone(defaultConfig) : clone(config.value),
      folder: blank ? 'General' : activeDocument.value.folder,
      targetRole: blank ? '' : activeDocument.value.targetRole,
      targetCompany: '',
      tags: blank ? [] : [...activeDocument.value.tags],
      origin: blank ? 'blank' : 'copy',
      sourceResumeId: blank ? undefined : sourceId,
      sourceResumeTitle: blank ? undefined : sourceTitle,
      favorite: false,
      archived: false,
      careerUpdateChecklist: defaultCareerUpdateChecklist(created),
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
      lastCareerUpdateAt: created.toISOString(),
      nextCareerUpdateAt: addDays(created, 14).toISOString(),
    }
    documents.value.unshift(doc)
    activeResumeId.value = doc.id
    logActivity({
      type: 'resume',
      tag: blank ? 'new' : 'copy',
      message: blank ? 'Created blank resume' : `Created resume from ${sourceTitle}`,
      messageZh: blank ? '新建空白简历' : `从 ${sourceTitle} 创建副本`,
      messageEn: blank ? 'Created blank resume' : `Created resume from ${sourceTitle}`,
      meta: doc.title,
      resumeId: doc.id,
    })
    if (syncingWithBackend) {
      void runBackendSync(() => backendApi.createResume({
        blank,
        sourceId: blank ? undefined : sourceId,
        title: doc.title,
        folder: doc.folder,
        targetRole: doc.targetRole,
        targetCompany: doc.targetCompany,
        tags: doc.tags,
        origin: doc.origin,
      }), { entityType: 'resume', operation: 'create', entityId: doc.id }).then((serverDoc) => {
        if (serverDoc) replaceDocument(doc.id, serverDoc)
      }).finally(() => {
        suppressBackendSync = false
      })
    }
    return doc
  }

  function duplicateResume(id = activeResumeId.value) {
    const source = documents.value.find((doc) => doc.id === id)
    if (!source) return
    const created = new Date()
    const syncingWithBackend = backendStatus.value.online
    if (syncingWithBackend) suppressBackendSync = true
    const doc: ResumeDocument = {
      ...clone(source),
      id: newId(),
      title: `${source.title} Copy`,
      sourceResumeId: source.id,
      sourceResumeTitle: source.title,
      origin: 'copy',
      favorite: false,
      archived: false,
      careerUpdateChecklist: defaultCareerUpdateChecklist(created),
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    }
    documents.value.unshift(doc)
    activeResumeId.value = doc.id
    logActivity({ type: 'resume', tag: 'copy', message: `Duplicated ${source.title}`, messageZh: `复制简历：${source.title}`, messageEn: `Duplicated ${source.title}`, meta: doc.title, resumeId: doc.id })
    if (syncingWithBackend) {
      void runBackendSync(() => backendApi.duplicateResume(source.id, { title: doc.title }), { entityType: 'resume', operation: 'duplicate', entityId: doc.id }).then((serverDoc) => {
        if (serverDoc) replaceDocument(doc.id, serverDoc)
      }).finally(() => {
        suppressBackendSync = false
      })
    }
    return doc
  }

  function deleteResume(id: string) {
    if (documents.value.length <= 1) {
      showToast(config.value.locale === 'zh-CN' ? '至少保留一份简历' : 'Keep at least one resume', 'error')
      return
    }
    const index = documents.value.findIndex((doc) => doc.id === id)
    if (index < 0) return
    const deletedTitle = documents.value[index].title
    documents.value.splice(index, 1)
    if (activeResumeId.value === id) activeResumeId.value = documents.value[0].id
    const fallbackDoc = documents.value.find((doc) => doc.id === activeResumeId.value) ?? documents.value[0]
    applications.value.forEach((app) => {
      if (app.resumeId === id && fallbackDoc) {
        app.resumeId = fallbackDoc.id
        app.resumeTitle = `${deletedTitle} → ${fallbackDoc.title}`
        app.updatedAt = new Date().toISOString()
      }
    })
    logActivity({ type: 'resume', tag: 'delete', message: `Deleted ${deletedTitle}`, messageZh: `删除简历：${deletedTitle}`, messageEn: `Deleted ${deletedTitle}`, meta: 'document removed', resumeId: activeResumeId.value })
    void runBackendSync(() => backendApi.deleteResume(id), { entityType: 'resume', operation: 'delete', entityId: id })
  }

  function restoreDeletedResumes(snapshot: { documents: ResumeDocument[]; applications?: JobApplication[]; activeResumeId?: string }) {
    const restored = snapshot.documents
      .map((doc) => normalizeDocument(doc))
      .filter((doc) => !documents.value.some((item) => item.id === doc.id))
    if (!restored.length) return []
    documents.value = [...restored, ...documents.value]
    if (snapshot.applications?.length) {
      applications.value = snapshot.applications.map((app) =>
        normalizeApplication(app, documents.value.find((doc) => doc.id === app.resumeId) ?? activeDocument.value),
      )
    }
    if (snapshot.activeResumeId && documents.value.some((doc) => doc.id === snapshot.activeResumeId)) {
      activeResumeId.value = snapshot.activeResumeId
    }
    logActivity({
      type: 'resume',
      tag: 'restore',
      message: `Restored ${restored.length} deleted resume${restored.length > 1 ? 's' : ''}`,
      messageZh: `恢复 ${restored.length} 份已删除简历`,
      messageEn: `Restored ${restored.length} deleted resume${restored.length > 1 ? 's' : ''}`,
      meta: restored.map((doc) => doc.title).join(', '),
      resumeId: restored[0].id,
    })
    restored.forEach((doc) => {
      void runBackendSync(async () => {
        const serverDoc = await backendApi.createResume({
          blank: true,
          title: doc.title,
          folder: doc.folder,
          targetRole: doc.targetRole,
          targetCompany: doc.targetCompany,
          tags: doc.tags,
          origin: doc.origin,
        })
        return backendApi.updateResume(serverDoc.id, {
          data: doc.data,
          config: doc.config,
          folder: doc.folder,
          targetRole: doc.targetRole,
          targetCompany: doc.targetCompany,
          tags: doc.tags,
          origin: doc.origin,
          favorite: doc.favorite,
          archived: doc.archived,
        })
      }, { entityType: 'resume', operation: 'restore', entityId: doc.id }).then((serverDoc) => {
        if (serverDoc) replaceDocument(doc.id, serverDoc)
      })
    })
    return restored
  }

  function selectResume(id: string) {
    if (documents.value.some((doc) => doc.id === id)) {
      activeResumeId.value = id
      void runBackendSync(() => backendApi.selectResume(id), { entityType: 'resume', operation: 'select', entityId: id })
    }
  }

  function renameResume(id: string, title: string) {
    const doc = documents.value.find((item) => item.id === id)
    if (!doc) return
    doc.title = title.trim() || 'Untitled resume'
    doc.updatedAt = new Date().toISOString()
    applications.value.forEach((app) => {
      if (app.resumeId === id) app.resumeTitle = doc.title
    })
    logActivity({ type: 'resume', tag: 'rename', message: `Renamed resume to ${doc.title}`, messageZh: `重命名简历：${doc.title}`, messageEn: `Renamed resume to ${doc.title}`, meta: 'document title', resumeId: id })
    void runBackendSync(() => backendApi.updateResume(id, { title: doc.title }), { entityType: 'resume', operation: 'rename', entityId: id })
  }

  function updateResumeMetadata(id: string, patch: Partial<Pick<ResumeDocument, 'folder' | 'targetRole' | 'targetCompany' | 'tags' | 'origin' | 'favorite' | 'archived'>>) {
    const doc = documents.value.find((item) => item.id === id)
    if (!doc) return
    if (patch.folder !== undefined) doc.folder = patch.folder.trim() || 'General'
    if (patch.targetRole !== undefined) doc.targetRole = patch.targetRole.trim()
    if (patch.targetCompany !== undefined) doc.targetCompany = patch.targetCompany.trim()
    if (patch.tags !== undefined) doc.tags = normalizeTags(patch.tags)
    if (patch.origin !== undefined) doc.origin = normalizeResumeOrigin(patch.origin, doc.origin)
    if (patch.favorite !== undefined) doc.favorite = patch.favorite
    if (patch.archived !== undefined) doc.archived = patch.archived
    doc.updatedAt = new Date().toISOString()
    logActivity({
      type: 'resume',
      tag: 'meta',
      message: `Updated resume metadata: ${doc.title}`,
      messageZh: `更新简历管理信息：${doc.title}`,
      messageEn: `Updated resume metadata: ${doc.title}`,
      meta: doc.folder || doc.title,
      resumeId: doc.id,
    })
    void runBackendSync(() => backendApi.updateResume(id, {
      folder: doc.folder,
      targetRole: doc.targetRole,
      targetCompany: doc.targetCompany,
      tags: doc.tags,
      origin: doc.origin,
      favorite: doc.favorite,
      archived: doc.archived,
    }), { entityType: 'resume', operation: 'metadata', entityId: id })
  }

  function toggleResumeFavorite(id: string) {
    const doc = documents.value.find((item) => item.id === id)
    if (doc) updateResumeMetadata(id, { favorite: !doc.favorite })
  }

  function toggleResumeArchive(id: string) {
    const doc = documents.value.find((item) => item.id === id)
    if (doc) updateResumeMetadata(id, { archived: !doc.archived })
  }

  function markCareerUpdated(id = activeResumeId.value, shouldLog = true) {
    const doc = documents.value.find((item) => item.id === id)
    if (!doc) return
    const updated = new Date()
    const completed = (Object.keys(doc.careerUpdateChecklist) as CareerUpdateKey[])
      .filter((key) => typeof doc.careerUpdateChecklist[key] === 'boolean' && doc.careerUpdateChecklist[key])
    if (completed.length || doc.careerUpdateChecklist.notes.trim()) {
      upsertGrowthEntry({
        date: updated.toISOString().slice(0, 10),
        type: completed.includes('projects') ? 'project' : completed.includes('skills') ? 'skill' : completed.includes('metrics') ? 'metric' : 'achievement',
        title: doc.careerUpdateChecklist.notes.trim() || 'Biweekly career update',
        content: doc.careerUpdateChecklist.notes.trim() || completed.join(', '),
        metrics: completed.includes('metrics') ? doc.careerUpdateChecklist.notes : '',
        skills: completed.includes('skills') ? normalizeTags(doc.careerUpdateChecklist.notes.split(/[,，、\n]/)) : [],
        sourceResumeId: doc.id,
        sourceResumeTitle: doc.title,
      }, false)
    }
    doc.lastCareerUpdateAt = updated.toISOString()
    doc.nextCareerUpdateAt = addDays(updated, 14).toISOString()
    doc.careerUpdateChecklist = defaultCareerUpdateChecklist(updated)
    doc.updatedAt = updated.toISOString()
    if (shouldLog) {
      logActivity({ type: 'resume', tag: 'career', message: 'Recorded biweekly career update', messageZh: '记录双周职业经历更新', messageEn: 'Recorded biweekly career update', meta: doc.title, resumeId: id })
    }
    void runBackendSync(() => backendApi.markCareerUpdated(id), { entityType: 'resume', operation: 'career-update', entityId: id }).then((serverDoc) => {
      if (serverDoc) replaceDocument(id, serverDoc)
    })
  }

  function updateCareerChecklist(id: string, patch: Partial<CareerUpdateChecklist>) {
    const doc = documents.value.find((item) => item.id === id)
    if (!doc) return
    doc.careerUpdateChecklist = normalizeCareerUpdateChecklist({
      ...doc.careerUpdateChecklist,
      ...patch,
      updatedAt: new Date().toISOString(),
    }, doc.careerUpdateChecklist)
    doc.updatedAt = new Date().toISOString()
    void runBackendSync(() => backendApi.updateResume(id, {
      careerUpdateChecklist: doc.careerUpdateChecklist,
    }), { entityType: 'resume', operation: 'career-checklist', entityId: id })
  }

  function setCareerChecklistItem(id: string, key: CareerUpdateKey, value: boolean) {
    updateCareerChecklist(id, { [key]: value } as Partial<CareerUpdateChecklist>)
  }

  function daysUntilCareerUpdate(id = activeResumeId.value) {
    const doc = documents.value.find((item) => item.id === id)
    if (!doc) return 0
    return Math.ceil((new Date(doc.nextCareerUpdateAt).getTime() - Date.now()) / 86400000)
  }

  function upsertGrowthEntry(input: Partial<GrowthEntry>, shouldLog = true) {
    const fallback = documents.value.find((doc) => doc.id === input.sourceResumeId) ?? activeDocument.value
    const existing = input.id ? growthEntries.value.find((entry) => entry.id === input.id) : undefined
    const normalized = normalizeGrowthEntry({
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    }, fallback)
    if (existing) {
      Object.assign(existing, normalized)
    } else {
      growthEntries.value.unshift(normalized)
    }
    if (shouldLog) {
      logActivity({
        type: 'resume',
        tag: 'growth',
        message: existing ? `Updated growth entry: ${normalized.title}` : `Added growth entry: ${normalized.title}`,
        messageZh: existing ? `更新成长记录：${normalized.title}` : `新增成长记录：${normalized.title}`,
        messageEn: existing ? `Updated growth entry: ${normalized.title}` : `Added growth entry: ${normalized.title}`,
        meta: normalized.type,
        resumeId: normalized.sourceResumeId,
      })
    }
    void runBackendSync(
      () => existing ? backendApi.updateGrowthEntry(normalized.id, normalized) : backendApi.createGrowthEntry(normalized),
      { entityType: 'growth', operation: existing ? 'update' : 'create', entityId: normalized.id },
    )
    return normalized
  }

  function toggleGrowthEntryArchived(id: string) {
    const entry = growthEntries.value.find((item) => item.id === id)
    if (!entry) return
    return upsertGrowthEntry({ ...entry, archived: !entry.archived })
  }

  function markGrowthEntryUsed(entryIds: string[], usage: { resumeId?: string; applicationId?: string }) {
    entryIds.forEach((id) => {
      const entry = growthEntries.value.find((item) => item.id === id)
      if (!entry) return
      upsertGrowthEntry({
        ...entry,
        usedByResumeIds: usage.resumeId ? [...new Set([...entry.usedByResumeIds, usage.resumeId])] : entry.usedByResumeIds,
        usedByApplicationIds: usage.applicationId ? [...new Set([...entry.usedByApplicationIds, usage.applicationId])] : entry.usedByApplicationIds,
      }, false)
    })
  }

  function importData(json: string) {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid')
      let imported = false
      if (Array.isArray(parsed.documents)) {
        documents.value = parsed.documents.map((doc: ResumeDocument) => ({
          ...doc,
          data: { ...clone(defaultResume), ...doc.data },
          config: mergeConfig(doc.config ?? {}),
          folder: doc.folder?.trim() || 'General',
          targetRole: doc.targetRole?.trim() || '',
          targetCompany: doc.targetCompany?.trim() || '',
          tags: normalizeTags(doc.tags),
          origin: normalizeResumeOrigin(doc.origin, 'import'),
          sourceResumeId: doc.sourceResumeId,
          sourceResumeTitle: doc.sourceResumeTitle,
          favorite: Boolean(doc.favorite),
          archived: Boolean(doc.archived),
          careerUpdateChecklist: normalizeCareerUpdateChecklist(doc.careerUpdateChecklist),
          lastCareerUpdateAt: doc.lastCareerUpdateAt ?? doc.updatedAt ?? new Date().toISOString(),
          nextCareerUpdateAt: doc.nextCareerUpdateAt ?? addDays(new Date(doc.updatedAt ?? new Date()), 14).toISOString(),
        }))
        activeResumeId.value = parsed.activeResumeId && documents.value.some((doc) => doc.id === parsed.activeResumeId)
          ? parsed.activeResumeId
          : documents.value[0]?.id
        imported = true
      }
      if (Array.isArray(parsed.applications)) {
        applications.value = parsed.applications.map((app: Partial<JobApplication>) =>
          normalizeApplication(app, documents.value.find((doc) => doc.id === app.resumeId) ?? activeDocument.value),
        )
        imported = true
      }
      if (Array.isArray(parsed.growthEntries)) {
        growthEntries.value = parsed.growthEntries.map((entry: Partial<GrowthEntry>) =>
          normalizeGrowthEntry(entry, documents.value.find((doc) => doc.id === entry.sourceResumeId) ?? activeDocument.value),
        )
        imported = true
      }
      if (Array.isArray(parsed.activityLog)) {
        activityLog.value = parsed.activityLog.map((activity: Partial<ActivityEvent>) =>
          normalizeActivity(activity, documents.value.find((doc) => doc.id === activity.resumeId) ?? activeDocument.value),
        )
        imported = true
      }
      if (parsed.data && typeof parsed.data === 'object') {
        data.value = {
          ...JSON.parse(JSON.stringify(defaultResume)),
          ...parsed.data,
          languages: Array.isArray(parsed.data.languages) ? parsed.data.languages : [],
          certifications: Array.isArray(parsed.data.certifications) ? parsed.data.certifications : [],
        }
        imported = true
      }
      if (parsed.config && typeof parsed.config === 'object') {
        config.value = mergeConfig(parsed.config)
        imported = true
      }
      if (imported) {
        logActivity({ type: 'system', tag: 'import', message: 'Imported backup data', messageZh: '导入备份数据', messageEn: 'Imported backup data', meta: 'JSON backup' })
        showToast(config.value.locale === 'zh-CN' ? '数据导入成功' : 'Data imported', 'success')
        recordSyncOperation({ entityType: 'import', operation: 'json', entityId: activeResumeId.value, status: 'local-only' })
        syncActiveDocumentToBackend()
      }
      else showToast(config.value.locale === 'zh-CN' ? '导入失败：未识别的文件格式' : 'Import failed: unrecognized file format', 'error')
    } catch {
      showToast(config.value.locale === 'zh-CN' ? '导入失败：请确认 JSON 格式正确' : 'Import failed: check that the JSON is valid', 'error')
    }
  }

  function exportData() {
    return JSON.stringify({
      activeResumeId: activeResumeId.value,
      documents: documents.value,
      applications: applications.value,
      growthEntries: growthEntries.value,
      activityLog: activityLog.value,
    }, null, 2)
  }

  function addApplication(input: Partial<JobApplication>) {
    const doc = documents.value.find((item) => item.id === input.resumeId) ?? activeDocument.value
    const app = normalizeApplication({
      ...input,
      resumeId: doc.id,
      resumeTitle: doc.title,
      companyMono: input.companyMono || input.company?.slice(0, 1),
    }, doc)
    applications.value.unshift(app)
    logActivity({ type: 'application', tag: app.stage === 'saved' ? 'saved' : 'apply', message: `Added opportunity: ${app.company}`, messageZh: `新增岗位记录：${app.company}`, messageEn: `Added opportunity: ${app.company}`, meta: `${app.role} · ${app.stage}`, resumeId: app.resumeId })
    void runBackendSync(() => backendApi.createApplication(app), { entityType: 'application', operation: 'create', entityId: app.id }).then((serverApp) => {
      if (serverApp) replaceApplication(app.id, serverApp)
    })
    return app
  }

  function selectedDraftSections(sections: Partial<Record<JdDraftSection, boolean>>) {
    return (['summary', 'experience', 'skills', 'projects'] as JdDraftSection[])
      .filter((section) => sections[section])
  }

  function applyJdDraftSections(
    draft: PlatformResumeDraft,
    sections: Partial<Record<JdDraftSection, boolean>>,
    growthEntryIds: string[] = [],
  ) {
    const selected = selectedDraftSections(sections)
    if (!selected.length) return []

    data.value = {
      ...data.value,
      personal: {
        ...data.value.personal,
        summary: selected.includes('summary') ? draft.data.personal.summary : data.value.personal.summary,
      },
      experience: selected.includes('experience') ? draft.data.experience : data.value.experience,
      skills: selected.includes('skills') ? draft.data.skills : data.value.skills,
      projects: selected.includes('projects') ? draft.data.projects : data.value.projects,
    }
    draft.generation.appliedAt = new Date().toISOString()
    markGrowthEntryUsed(growthEntryIds, { resumeId: activeResumeId.value })
    selected.forEach((section) => {
      trackProductEvent('jd_section_applied', {
        section,
        request_id: draft.requestId || 'local-request',
      })
    })
    logActivity({
      type: 'ai',
      tag: 'JD',
      message: 'Applied selected editor JD-tailored sections',
      messageZh: '采纳编辑器 JD 定制草稿的所选章节',
      messageEn: 'Applied selected editor JD-tailored sections',
      meta: `${draft.requestId || 'local-request'} · ${selected.length} sections · ${draft.match.score}/100`,
    })
    syncActiveDocumentToBackend()
    return selected
  }

  function createApplicationFromJdDraft(
    draft: PlatformResumeDraft,
    input: {
      company: string
      role: string
      jobDescription: JobDescriptionSnapshot
      growthEntryIds?: string[]
      nextAction?: string
      notes?: string
    },
  ) {
    const app = addApplication({
      company: input.company,
      role: input.role,
      stage: 'saved',
      resumeId: activeResumeId.value,
      match: draft.match.score,
      appliedAt: '',
      nextAction: input.nextAction ?? 'Review the JD-tailored draft and decide whether to apply',
      followUpAt: '',
      contactName: '',
      contactEmail: '',
      jobPostUrl: '',
      notes: input.notes ?? 'Created from the editor JD-tailored draft.',
      jobDescription: input.jobDescription,
      tailoring: {
        requestId: draft.requestId || '',
        sourceResumeId: activeResumeId.value,
        draftTitle: draft.title,
        matchScore: draft.match.score,
        matchedKeywords: draft.match.matchedKeywords,
        selectedExperienceIds: draft.match.selectedExperienceIds,
        strategy: draft.generation.strategy,
        generatedAt: draft.generation.generatedAt,
        appliedAt: draft.generation.appliedAt,
      },
    })
    markGrowthEntryUsed(input.growthEntryIds ?? [], { resumeId: activeResumeId.value, applicationId: app.id })
    trackProductEvent('application_created_from_jd', {
      application_id: app.id,
      request_id: draft.requestId || '',
    })
    logActivity({
      type: 'application',
      tag: 'JD',
      message: 'Created application from editor JD-tailored draft',
      messageZh: '从编辑器 JD 定制草稿创建投递记录',
      messageEn: 'Created application from editor JD-tailored draft',
      meta: `${app.company} · ${app.match}`,
      resumeId: app.resumeId,
    })
    return app
  }

  function updateApplication(id: string, patch: Partial<JobApplication>) {
    const app = applications.value.find((item) => item.id === id)
    if (!app) return
    const doc = documents.value.find((item) => item.id === (patch.resumeId ?? app.resumeId))
    const previousStage = app.stage
    const nextStage = patch.stage ?? app.stage
    const nextProgressLog = patch.progressLog !== undefined
      ? normalizeProgressLog(patch.progressLog, nextStage, patch.nextAction ?? app.nextAction, patch.appliedAt ?? app.appliedAt, new Date().toISOString(), true)
      : previousStage !== nextStage
        ? [
            ...app.progressLog,
            {
              id: newId('progress'),
              stage: nextStage,
              title: stageProgressTitle(nextStage),
              note: patch.nextAction ?? app.nextAction,
              happenedAt: patch.appliedAt || new Date().toISOString().slice(0, 10),
              createdAt: new Date().toISOString(),
            },
          ]
        : app.progressLog
    Object.assign(app, patch, {
      resumeId: doc?.id ?? patch.resumeId ?? app.resumeId,
      resumeTitle: doc?.title ?? patch.resumeTitle ?? app.resumeTitle,
      companyMono: (patch.companyMono || patch.company?.slice(0, 1) || app.companyMono || 'A').slice(0, 2).toUpperCase(),
      match: Math.max(0, Math.min(100, Number(patch.match ?? app.match))),
      progressLog: nextProgressLog,
      updatedAt: new Date().toISOString(),
    })
    logActivity({ type: 'application', tag: 'update', message: `Updated application: ${app.company}`, messageZh: `更新投递：${app.company}`, messageEn: `Updated application: ${app.company}`, meta: `${app.role} · ${app.stage}`, resumeId: app.resumeId })
    void runBackendSync(() => backendApi.updateApplication(id, app), { entityType: 'application', operation: 'update', entityId: id })
  }

  function deleteApplication(id: string) {
    const app = applications.value.find((item) => item.id === id)
    applications.value = applications.value.filter((app) => app.id !== id)
    if (app) logActivity({ type: 'application', tag: 'delete', message: `Deleted application: ${app.company}`, messageZh: `删除投递：${app.company}`, messageEn: `Deleted application: ${app.company}`, meta: app.role, resumeId: app.resumeId })
    void runBackendSync(() => backendApi.deleteApplication(id), { entityType: 'application', operation: 'delete', entityId: id })
  }

  return {
    documents,
    applications,
    growthEntries,
    activityLog,
    syncOperations,
    backendStatus,
    activeResumeId,
    activeDocument,
    data,
    config,
    completeness,
    connectBackend,
    retryFailedSyncs,
    createResume,
    duplicateResume,
    deleteResume,
    restoreDeletedResumes,
    selectResume,
    renameResume,
    updateResumeMetadata,
    toggleResumeFavorite,
    toggleResumeArchive,
    markCareerUpdated,
    updateCareerChecklist,
    setCareerChecklistItem,
    daysUntilCareerUpdate,
    upsertGrowthEntry,
    toggleGrowthEntryArchived,
    markGrowthEntryUsed,
    addApplication,
    applyJdDraftSections,
    createApplicationFromJdDraft,
    updateApplication,
    deleteApplication,
    logActivity,
    trackProductEvent,
    setTemplate,
    setLocale,
    setThemeColor,
    setStudioTheme,
    resetStudioTheme,
    setTweak,
    resetTweaks,
    clearAll,
    moveSection,
    toggleSectionVisible,
    addExperience, removeExperience,
    addEducation, removeEducation,
    addSkill, removeSkill,
    addProject, removeProject,
    addAward, removeAward,
    addLanguage, removeLanguage,
    addCertification, removeCertification,
    resetToDefault,
    importData,
    exportData,
  }
})
