<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { ActivityEvent, ApplicationProgressEvent, ApplicationStage, CareerUpdateKey, GrowthEntry, GrowthEntryType, JobApplication, ResumeData, ResumeDocument, StudioTheme, TemplateId, TweakAccent, TweakDensity, TweakFont, TweakPaper } from '../types/resume'
import TemplateThumbnail from './TemplateThumbnail.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { showToast } from '../composables/toast'
import { useI18n } from '../i18n'
import { backendApi, type PlatformResumeDraft } from '../api/backend'

type AppView = 'workspace' | 'editor' | 'documents' | 'templates' | 'growth' | 'pipeline' | 'history' | 'settings'
type JdReviewSection = 'summary' | 'experience' | 'skills' | 'projects'
type DocumentFilter = 'active' | 'favorites' | 'archived' | 'all'
type DocumentSort = 'updated-desc' | 'created-desc' | 'title-asc' | 'applications-desc'
type PipelineFocus = 'all' | 'today' | 'overdue' | 'high-match'
type GrowthFilter = 'active' | 'used' | 'unused' | 'archived' | 'all'

const props = withDefaults(defineProps<{ mode?: AppView }>(), { mode: 'workspace' })
const emit = defineEmits<{
  navigate: [AppView]
  command: [string]
}>()

const store = useResumeStore()
const { t, locale } = useI18n()
const pipelineFilter = ref('all')
const pipelineFocus = ref<PipelineFocus>('all')
const pipelineSearch = ref('')
const pipelineSort = ref<'applied-desc' | 'match-desc' | 'company-asc'>('applied-desc')
const assistantPrompt = ref('')
const growthSearch = ref('')
const growthFilter = ref<GrowthFilter>('active')
const growthEditId = ref('')
const jdCompany = ref('')
const jdRole = ref('')
const jdText = ref('')
const jdGenerating = ref(false)
const jdDraft = ref<PlatformResumeDraft | null>(null)
const jdError = ref('')
const jdApplySections = reactive<Record<JdReviewSection, boolean>>({
  summary: true,
  experience: true,
  skills: true,
  projects: true,
})
const renameId = ref('')
const renameDraft = ref('')
const applicationFormOpen = ref(false)
const editingApplicationId = ref('')
const applicationError = ref('')
const selectedApplicationId = ref('')
const editingProgressEventId = ref('')
const progressDrafts = reactive<Record<string, string>>({})
const progressEventDraft = reactive({
  stage: 'saved' as ApplicationStage,
  title: '',
  note: '',
  happenedAt: '',
})
const pendingDeleteResume = ref<{ id: string; title: string } | null>(null)
const applicationDraft = reactive({
  company: '',
  location: '',
  role: '',
  department: '',
  resumeId: '',
  stage: 'saved' as ApplicationStage,
  match: 70,
  appliedAt: '',
  nextAction: '',
  followUpAt: '',
  contactName: '',
  contactEmail: '',
  jobPostUrl: '',
  jdArchive: '',
  notes: '',
})
const growthDraft = reactive({
  date: '',
  type: 'achievement' as GrowthEntryType,
  company: '',
  project: '',
  title: '',
  content: '',
  metrics: '',
  skills: '',
  evidenceUrl: '',
  private: false,
  sourceResumeId: '',
})
type AssistantSuggestion = {
  id: string
  zh: string
  en: string
  summaryZh: string
  summaryEn: string
}
const assistantSuggestions = ref<AssistantSuggestion[]>([
  {
    id: 'summary-structure',
    zh: '把个人简介改成“岗位定位 + 技术栈 + 量化结果”的三段式。',
    en: 'Rewrite the summary as role focus + stack + measurable impact.',
    summaryZh: '聚焦目标岗位，突出核心技术栈，并补充可量化的业务结果。',
    summaryEn: 'Focus on the target role, highlight the core stack, and add measurable business impact.',
  },
  {
    id: 'bullet-metrics',
    zh: '工作经历每条 bullet 至少保留一个数字，弱相关职责移到项目里。',
    en: 'Keep at least one metric in each experience bullet and move weaker duties into projects.',
    summaryZh: '强化工作经历中的量化成果，压缩弱相关职责，让简历更贴近目标岗位。',
    summaryEn: 'Strengthen measurable outcomes in experience bullets and trim weaker responsibilities for the target role.',
  },
])

const documents = computed(() => store.documents)
const documentFilter = ref<DocumentFilter>('active')
const documentSearch = ref('')
const documentSort = ref<DocumentSort>('updated-desc')
const selectedDocumentIds = ref<string[]>([])
const bulkDeleteSnapshot = ref<{ documents: ResumeDocument[]; applications: JobApplication[]; activeResumeId: string } | null>(null)
const pendingBulkDelete = ref<{ ids: string[]; titles: string[] } | null>(null)
const metaEditId = ref('')
const metaDraft = reactive({
  folder: '',
  targetRole: '',
  targetCompany: '',
  tags: '',
})

const visibleDocuments = computed(() => {
  const query = documentSearch.value.trim().toLowerCase()
  return documents.value
    .filter((doc) => {
      if (documentFilter.value === 'favorites') return doc.favorite && !doc.archived
      if (documentFilter.value === 'archived') return doc.archived
      if (documentFilter.value === 'all') return true
      return !doc.archived
    })
    .filter((doc) => {
      if (!query) return true
      const appText = documentApplications(doc.id).map((app) => `${app.company} ${app.role}`).join(' ')
      return [
        doc.title,
        doc.folder,
        doc.targetCompany,
        doc.targetRole,
        doc.data.personal.name,
        doc.data.personal.title,
        doc.sourceResumeTitle ?? '',
        doc.tags.join(' '),
        appText,
      ].some((value) => value.toLowerCase().includes(query))
    })
    .slice()
    .sort((a, b) => {
      if (documentSort.value === 'title-asc') return a.title.localeCompare(b.title)
      if (documentSort.value === 'created-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (documentSort.value === 'applications-desc') return documentApplications(b.id).length - documentApplications(a.id).length
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
})

const documentFilters = computed<Array<{ id: DocumentFilter; label: string; count: number }>>(() => [
  { id: 'active', label: label('活跃', 'Active'), count: documents.value.filter((doc) => !doc.archived).length },
  { id: 'favorites', label: label('收藏', 'Favorites'), count: documents.value.filter((doc) => doc.favorite && !doc.archived).length },
  { id: 'archived', label: label('归档', 'Archived'), count: documents.value.filter((doc) => doc.archived).length },
  { id: 'all', label: label('全部', 'All'), count: documents.value.length },
])

const selectedDocuments = computed(() =>
  documents.value.filter((doc) => selectedDocumentIds.value.includes(doc.id)),
)

const selectedVisibleDocumentCount = computed(() =>
  visibleDocuments.value.filter((doc) => selectedDocumentIds.value.includes(doc.id)).length,
)

const careerChecklistItems: { key: CareerUpdateKey; zh: string; en: string }[] = [
  { key: 'projects', zh: '新增项目 / 交付物', en: 'New projects / shipped work' },
  { key: 'metrics', zh: '补充量化结果', en: 'Add measurable outcomes' },
  { key: 'roleChanges', zh: '职责或职级变化', en: 'Role or scope changes' },
  { key: 'interviewFeedback', zh: '面试反馈沉淀', en: 'Interview feedback notes' },
  { key: 'skills', zh: '新增技能关键词', en: 'New skill keywords' },
]

const careerChecklistDone = computed(() =>
  careerChecklistItems.every((item) => store.activeDocument.careerUpdateChecklist[item.key]),
)

const careerUpdateDays = computed(() => store.daysUntilCareerUpdate())
const careerUpdateLabel = computed(() => {
  const days = careerUpdateDays.value
  if (locale.value === 'zh-CN') {
    if (days < 0) return `已逾期 ${Math.abs(days)} 天`
    if (days === 0) return '今天该更新'
    return `${days} 天后更新`
  }
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  return `Due in ${days} days`
})

const growthEntries = computed(() => store.growthEntries)
const growthTypeOptions: Array<{ id: GrowthEntryType; zh: string; en: string }> = [
  { id: 'achievement', zh: '成果', en: 'Achievement' },
  { id: 'project', zh: '项目', en: 'Project' },
  { id: 'metric', zh: '指标', en: 'Metric' },
  { id: 'role', zh: '职责变化', en: 'Role change' },
  { id: 'skill', zh: '技能', en: 'Skill' },
  { id: 'feedback', zh: '反馈', en: 'Feedback' },
]
const growthFilters = computed<Array<{ id: GrowthFilter; label: string; count: number }>>(() => [
  { id: 'active', label: label('活跃', 'Active'), count: growthEntries.value.filter((entry) => !entry.archived).length },
  { id: 'used', label: label('已使用', 'Used'), count: growthEntries.value.filter((entry) => entry.usedByResumeIds.length || entry.usedByApplicationIds.length).length },
  { id: 'unused', label: label('未使用', 'Unused'), count: growthEntries.value.filter((entry) => !entry.archived && !entry.usedByResumeIds.length && !entry.usedByApplicationIds.length).length },
  { id: 'archived', label: label('归档', 'Archived'), count: growthEntries.value.filter((entry) => entry.archived).length },
  { id: 'all', label: label('全部', 'All'), count: growthEntries.value.length },
])
const filteredGrowthEntries = computed(() =>
  growthEntries.value
    .filter((entry) => {
      if (growthFilter.value === 'active') return !entry.archived
      if (growthFilter.value === 'used') return entry.usedByResumeIds.length || entry.usedByApplicationIds.length
      if (growthFilter.value === 'unused') return !entry.archived && !entry.usedByResumeIds.length && !entry.usedByApplicationIds.length
      if (growthFilter.value === 'archived') return entry.archived
      return true
    })
    .filter((entry) => {
      const query = growthSearch.value.trim().toLowerCase()
      if (!query) return true
      return [entry.title, entry.content, entry.metrics, entry.company, entry.project, entry.skills.join(' ')].some((value) =>
        value.toLowerCase().includes(query),
      )
    })
    .slice()
    .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()),
)

const applications = computed(() => store.applications)

const stageOptions: { id: ApplicationStage; zh: string; en: string }[] = [
  { id: 'saved', zh: '待投递', en: 'Saved' },
  { id: 'applied', zh: '已投递', en: 'Applied' },
  { id: 'screen', zh: '初筛', en: 'Screening' },
  { id: 'onsite', zh: '面试', en: 'On-site' },
  { id: 'offer', zh: 'Offer', en: 'Offer' },
  { id: 'rejected', zh: '已关闭', en: 'Closed' },
]

const filters = computed(() => [
  { id: 'all', label: label('全部', 'All') },
  ...stageOptions.map((stage) => ({ id: stage.id, label: label(stage.zh, stage.en) })),
])

const pipelineFocusOptions = computed<Array<{ id: PipelineFocus; label: string; count: number }>>(() => [
  { id: 'all', label: label('全部视图', 'All views'), count: applications.value.length },
  { id: 'today', label: label('今日待跟进', 'Due today'), count: applications.value.filter((app) => followUpState(app) === 'today').length },
  { id: 'overdue', label: label('逾期跟进', 'Overdue'), count: applications.value.filter((app) => followUpState(app) === 'overdue').length },
  { id: 'high-match', label: label('高匹配', 'High match'), count: applications.value.filter((app) => app.match >= 85).length },
])

const filteredApplications = computed(() =>
  applications.value
    .filter((item) => pipelineFilter.value === 'all' || item.stage === pipelineFilter.value)
    .filter((item) => {
      if (pipelineFocus.value === 'today') return followUpState(item) === 'today'
      if (pipelineFocus.value === 'overdue') return followUpState(item) === 'overdue'
      if (pipelineFocus.value === 'high-match') return item.match >= 85
      return true
    })
    .filter((item) => {
      const query = pipelineSearch.value.trim().toLowerCase()
      if (!query) return true
      return [
        item.company,
        item.role,
        item.department,
        item.location,
        item.resumeTitle,
        item.nextAction,
        item.contactName,
        item.contactEmail,
        item.jobPostUrl,
        item.jobDescription?.description ?? '',
        item.notes,
      ].some((value) => value.toLowerCase().includes(query))
    })
    .slice()
    .sort((a, b) => {
      if (pipelineSort.value === 'match-desc') return b.match - a.match
      if (pipelineSort.value === 'company-asc') return a.company.localeCompare(b.company)
      return new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime()
    }),
)

const pipelineSortLabel = computed(() => {
  if (pipelineSort.value === 'match-desc') return label('按匹配度排序', 'sorted by match')
  if (pipelineSort.value === 'company-asc') return label('按公司排序', 'sorted by company')
  return label('按投递时间排序', 'sorted by applied date')
})

const pipelineStats = computed(() => {
  const saved = applications.value.filter((app) => app.stage === 'saved').length
  const applied = applications.value.filter((app) => app.stage === 'applied').length
  const offer = applications.value.filter((app) => app.stage === 'offer').length
  const closed = applications.value.filter((app) => app.stage === 'rejected').length
  const active = applications.value.length - saved - offer - closed
  return { saved, applied, offer, active, closed }
})

const activities = computed(() => store.activityLog)

const selectedApplication = computed(() =>
  applications.value.find((app) => app.id === selectedApplicationId.value) ?? null,
)

const jdSectionReviews = computed(() => {
  const draft = jdDraft.value
  if (!draft) return []
  return [
    {
      id: 'summary' as const,
      label: label('个人简介', 'Summary'),
      before: previewText(store.data.personal.summary),
      after: previewText(draft.data.personal.summary),
    },
    {
      id: 'experience' as const,
      label: label('工作经历', 'Experience'),
      before: previewExperience(store.data.experience),
      after: previewExperience(draft.data.experience),
    },
    {
      id: 'skills' as const,
      label: label('技能', 'Skills'),
      before: previewSkills(store.data.skills),
      after: previewSkills(draft.data.skills),
    },
    {
      id: 'projects' as const,
      label: label('项目', 'Projects'),
      before: previewProjects(store.data.projects),
      after: previewProjects(draft.data.projects),
    },
  ]
})

const selectedJdSectionCount = computed(() =>
  (Object.keys(jdApplySections) as JdReviewSection[]).filter((section) => jdApplySections[section]).length,
)

const templates: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'classic', label: '经典', desc: '简洁·全页' },
  { id: 'modern', label: '现代', desc: '双栏·标题色块' },
  { id: 'sidebar', label: '侧边栏', desc: '色彩·个性' },
  { id: 'compact', label: '紧凑', desc: '信息密集·一页优先' },
  { id: 'executive', label: '高管', desc: '稳重·管理层叙事' },
  { id: 'creative', label: '创意', desc: '视觉·作品集友好' },
  { id: 'academic', label: '学术', desc: '论文项目·教育优先' },
  { id: 'technical', label: '技术', desc: '技能矩阵·工程导向' },
  { id: 'product', label: '产品', desc: '成果指标·产品叙事' },
  { id: 'minimal', label: '极简', desc: '留白·轻量现代' },
]

const accents: { id: TweakAccent; hex: string; label: string }[] = [
  { id: 'ocean', hex: '#3E7891', label: 'Clear ocean' },
  { id: 'sage', hex: '#7D8F73', label: 'Soft sage' },
  { id: 'prussian', hex: '#31566A', label: 'Deep teal' },
  { id: 'amber', hex: '#B9812F', label: 'Amber' },
  { id: 'coral', hex: '#D96B5C', label: 'Warm coral' },
  { id: 'rosewood', hex: '#9B4D5C', label: 'Rosewood' },
  { id: 'moss', hex: '#6F7F45', label: 'Olive moss' },
  { id: 'vermillion', hex: '#C65A3A', label: 'Terracotta' },
  { id: 'lilac', hex: '#7B6A9B', label: 'Dusty lilac' },
  { id: 'ink-only', hex: '#3A2A22', label: 'Walnut ink' },
]

const papers: { id: TweakPaper; hex: string; label: string }[] = [
  { id: 'mist', hex: '#EEF3EF', label: 'Sage mist' },
  { id: 'snow', hex: '#FFFAF4', label: 'Soft white' },
  { id: 'stone', hex: '#F2F0EC', label: 'Warm stone' },
  { id: 'cream', hex: '#FBF4EA', label: 'Warm cream' },
  { id: 'newsprint', hex: '#F3EADC', label: 'Newsprint' },
  { id: 'blush', hex: '#FBEDEA', label: 'Blush paper' },
]

const interfaceFonts: { id: TweakFont; name: string; meta: string; className: string }[] = [
  { id: 'serif', name: 'Serif', meta: 'editorial · warm', className: 'serif-stack' },
  { id: 'sans', name: 'Sans', meta: 'neutral · crisp', className: 'sans-stack' },
  { id: 'mono', name: 'Mono', meta: 'technical · compact', className: 'mono-stack' },
]

const densities: TweakDensity[] = ['tight', 'cozy', 'loose']

function label(zh: string, en: string) {
  return locale.value === 'zh-CN' ? zh : en
}

function activityMessage(event: ActivityEvent) {
  return locale.value === 'zh-CN'
    ? event.messageZh || event.message
    : event.messageEn || event.message
}

function activityWhen(date: string) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return label('刚刚', 'now')
  if (minutes < 60) return label(`${minutes} 分钟前`, `${minutes}m`)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return label(`${hours} 小时前`, `${hours}h`)
  const days = Math.floor(hours / 24)
  return label(`${days} 天前`, `${days}d`)
}

function activityHash(id: string) {
  return id.replace(/^activity-/, '').slice(-7)
}

function stageLabel(stage: ApplicationStage) {
  const item = stageOptions.find((option) => option.id === stage)
  return item ? label(item.zh, item.en) : stage
}

function templateDescKey(id: TemplateId) {
  return `${id}Desc` as
    | 'classicDesc'
    | 'modernDesc'
    | 'sidebarDesc'
    | 'compactDesc'
    | 'executiveDesc'
    | 'creativeDesc'
    | 'academicDesc'
    | 'technicalDesc'
    | 'productDesc'
    | 'minimalDesc'
}

function resetApplicationDraft(app?: JobApplication) {
  editingApplicationId.value = app?.id ?? ''
  applicationDraft.company = app?.company ?? ''
  applicationDraft.location = app?.location ?? ''
  applicationDraft.role = app?.role ?? store.data.personal.title ?? ''
  applicationDraft.department = app?.department ?? ''
  applicationDraft.resumeId = app?.resumeId ?? store.activeResumeId
  applicationDraft.stage = app?.stage ?? 'saved'
  applicationDraft.match = app?.match ?? Math.max(60, store.completeness)
  applicationDraft.appliedAt = app?.appliedAt ?? ''
  applicationDraft.nextAction = app?.nextAction ?? label('评估 JD，决定是否投递', 'Review JD and decide whether to apply')
  applicationDraft.followUpAt = app?.followUpAt ?? ''
  applicationDraft.contactName = app?.contactName ?? ''
  applicationDraft.contactEmail = app?.contactEmail ?? ''
  applicationDraft.jobPostUrl = app?.jobPostUrl ?? app?.jobDescription?.url ?? ''
  applicationDraft.jdArchive = app?.jobDescription?.description ?? ''
  applicationDraft.notes = app?.notes ?? ''
}

function formatAppliedDate(date: string) {
  if (!date) return label('未填写', 'No date')
  return new Intl.DateTimeFormat(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function daysAgo(date: string) {
  if (!date) return ''
  const diff = Math.max(0, Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86400000))
  if (locale.value === 'zh-CN') return diff === 0 ? '今天' : `${diff} 天前`
  if (diff === 0) return 'today'
  return `${diff}d ago`
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function followUpState(app: JobApplication): 'none' | 'today' | 'overdue' | 'future' {
  if (!app.followUpAt || app.stage === 'offer' || app.stage === 'rejected') return 'none'
  const today = localDateKey()
  if (app.followUpAt < today) return 'overdue'
  if (app.followUpAt === today) return 'today'
  return 'future'
}

function followUpLabel(app: JobApplication) {
  const state = followUpState(app)
  if (state === 'overdue') return label('逾期', 'Overdue')
  if (state === 'today') return label('今日', 'Today')
  if (state === 'future') return formatAppliedDate(app.followUpAt)
  return label('未设置', 'Not set')
}

function latestProgress(app: JobApplication) {
  return app.progressLog?.[app.progressLog.length - 1]
}

function progressWhen(date: string) {
  if (!date) return label('未记录日期', 'No date')
  return formatAppliedDate(date)
}

function openApplicationForm(app?: JobApplication) {
  resetApplicationDraft(app)
  applicationFormOpen.value = true
}

function closeApplicationForm() {
  applicationFormOpen.value = false
  editingApplicationId.value = ''
  applicationError.value = ''
}

function saveApplication() {
  if (!applicationDraft.company.trim() || !applicationDraft.role.trim()) {
    applicationError.value = label('请先填写公司和岗位。', 'Add company and role before saving.')
    showToast(label('公司和岗位必填', 'Company and role are required'), 'error')
    return
  }
  applicationError.value = ''
  const payload = {
    company: applicationDraft.company.trim(),
    location: applicationDraft.location.trim(),
    role: applicationDraft.role.trim(),
    department: applicationDraft.department.trim(),
    resumeId: applicationDraft.resumeId,
    stage: applicationDraft.stage,
    match: applicationDraft.match,
    appliedAt: applicationDraft.appliedAt,
    nextAction: applicationDraft.nextAction.trim(),
    followUpAt: applicationDraft.followUpAt,
    contactName: applicationDraft.contactName.trim(),
    contactEmail: applicationDraft.contactEmail.trim(),
    jobPostUrl: applicationDraft.jobPostUrl.trim(),
    jobDescription: applicationDraft.jdArchive.trim() || applicationDraft.jobPostUrl.trim()
      ? {
          company: applicationDraft.company.trim(),
          title: applicationDraft.role.trim(),
          location: applicationDraft.location.trim(),
          description: applicationDraft.jdArchive.trim(),
          requirements: splitBullets(applicationDraft.jdArchive),
          url: applicationDraft.jobPostUrl.trim(),
          archivedAt: applicationDraft.jdArchive.trim() ? new Date().toISOString() : undefined,
        }
      : undefined,
    notes: applicationDraft.notes.trim(),
  }
  if (editingApplicationId.value) {
    store.updateApplication(editingApplicationId.value, payload)
    showToast(label('岗位记录已更新', 'Opportunity updated'), 'success')
  } else {
    store.addApplication(payload)
    showToast(label('岗位已加入管线', 'Opportunity added to pipeline'), 'success')
  }
  pipelineFilter.value = 'all'
  closeApplicationForm()
}

function removeApplication(id: string) {
  if (selectedApplicationId.value === id) selectedApplicationId.value = ''
  store.deleteApplication(id)
  showToast(label('岗位记录已删除', 'Opportunity deleted'), 'success')
}

function openApplicationDetail(app: JobApplication) {
  selectedApplicationId.value = app.id
  editingProgressEventId.value = ''
}

function closeApplicationDetail() {
  selectedApplicationId.value = ''
  editingProgressEventId.value = ''
}

function markApplicationApplied(app: JobApplication) {
  const appliedAt = new Date().toISOString().slice(0, 10)
  store.updateApplication(app.id, {
    stage: 'applied',
    appliedAt,
    nextAction: app.nextAction || label('等待 HR 初筛反馈', 'Wait for recruiter screening'),
  })
  showToast(label('已标记为已投递', 'Marked as applied'), 'success')
}

function advanceApplication(app: JobApplication) {
  const order: ApplicationStage[] = ['saved', 'applied', 'screen', 'onsite', 'offer']
  const next = order[Math.min(order.indexOf(app.stage) + 1, order.length - 1)] ?? app.stage
  store.updateApplication(app.id, {
    stage: next,
    appliedAt: app.appliedAt || (next === 'saved' ? '' : new Date().toISOString().slice(0, 10)),
  })
  showToast(label('进度已推进', 'Stage advanced'), 'success')
}

function addProgressNote(app: JobApplication) {
  const note = (progressDrafts[app.id] || '').trim()
  if (!note) {
    showToast(label('先写一条进度备注', 'Write a progress note first'), 'info')
    return
  }
  store.updateApplication(app.id, {
    progressLog: [
      ...app.progressLog,
      {
        id: `progress-${Date.now()}`,
        stage: app.stage,
        title: label('手动记录', 'Manual note'),
        note,
        happenedAt: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      },
    ],
    nextAction: note,
  })
  progressDrafts[app.id] = ''
  showToast(label('进度已记录', 'Progress recorded'), 'success')
}

function startProgressEventEdit(event: ApplicationProgressEvent) {
  editingProgressEventId.value = event.id
  progressEventDraft.stage = event.stage
  progressEventDraft.title = event.title
  progressEventDraft.note = event.note
  progressEventDraft.happenedAt = event.happenedAt || localDateKey()
}

function cancelProgressEventEdit() {
  editingProgressEventId.value = ''
  progressEventDraft.stage = 'saved'
  progressEventDraft.title = ''
  progressEventDraft.note = ''
  progressEventDraft.happenedAt = ''
}

function saveProgressEvent(app: JobApplication) {
  if (!editingProgressEventId.value) return
  if (!progressEventDraft.title.trim() || !progressEventDraft.happenedAt) {
    showToast(label('请填写进度标题和日期', 'Add a progress title and date'), 'error')
    return
  }
  store.updateApplication(app.id, {
    progressLog: app.progressLog.map((event) => event.id === editingProgressEventId.value
      ? {
          ...event,
          stage: progressEventDraft.stage,
          title: progressEventDraft.title.trim(),
          note: progressEventDraft.note.trim(),
          happenedAt: progressEventDraft.happenedAt,
        }
      : event),
  })
  cancelProgressEventEdit()
  showToast(label('时间线事件已更新', 'Timeline event updated'), 'success')
}

function deleteProgressEvent(app: JobApplication, eventId: string) {
  store.updateApplication(app.id, {
    progressLog: app.progressLog.filter((event) => event.id !== eventId),
  })
  if (editingProgressEventId.value === eventId) cancelProgressEventEdit()
  showToast(label('时间线事件已删除', 'Timeline event deleted'), 'success')
}

function createProgressEvent(app: JobApplication) {
  const event: ApplicationProgressEvent = {
    id: `progress-${Date.now()}`,
    stage: app.stage,
    title: label('新的进度事件', 'New timeline event'),
    note: '',
    happenedAt: localDateKey(),
    createdAt: new Date().toISOString(),
  }
  store.updateApplication(app.id, {
    progressLog: [...app.progressLog, event],
  })
  startProgressEventEdit(event)
}

function openEditor() {
  emit('navigate', 'editor')
}

function createBlank() {
  store.createResume(true)
  emit('navigate', 'editor')
  showToast(locale.value === 'zh-CN' ? '已创建新的空白简历' : 'Created a new blank resume', 'success')
}

function openDocument(id: string) {
  store.selectResume(id)
  emit('navigate', 'editor')
}

function documentApplications(id: string) {
  return store.applications.filter((app) => app.resumeId === id || app.tailoring?.sourceResumeId === id)
}

function documentLastExport(doc: ResumeDocument) {
  return store.activityLog.find((event) => event.type === 'export' && event.tag === 'PDF' && event.resumeId === doc.id)
}

function documentOriginLabel(doc: ResumeDocument) {
  const origins: Record<ResumeDocument['origin'], string> = {
    sample: label('示例', 'Sample'),
    blank: label('空白创建', 'Blank'),
    import: label('导入', 'Import'),
    copy: label('复制', 'Copy'),
    'jd-draft': label('JD 草稿生成', 'JD draft'),
    platform: label('平台生成', 'Platform'),
  }
  const base = origins[doc.origin] ?? origins.sample
  return doc.sourceResumeTitle ? `${base} · ${doc.sourceResumeTitle}` : base
}

function formatShortDate(value?: string) {
  if (!value) return label('暂无', 'None')
  return value.slice(0, 10)
}

function toggleDocumentSelection(id: string, checked: boolean) {
  selectedDocumentIds.value = checked
    ? [...new Set([...selectedDocumentIds.value, id])]
    : selectedDocumentIds.value.filter((item) => item !== id)
}

function toggleDocumentSelectionFromEvent(id: string, event: Event) {
  toggleDocumentSelection(id, Boolean((event.target as HTMLInputElement | null)?.checked))
}

function selectAllVisibleDocuments() {
  const ids = visibleDocuments.value.map((doc) => doc.id)
  const allSelected = ids.length > 0 && ids.every((id) => selectedDocumentIds.value.includes(id))
  selectedDocumentIds.value = allSelected
    ? selectedDocumentIds.value.filter((id) => !ids.includes(id))
    : [...new Set([...selectedDocumentIds.value, ...ids])]
}

function clearDocumentSelection() {
  selectedDocumentIds.value = []
}

function bulkArchiveDocuments(archived: boolean) {
  selectedDocuments.value.forEach((doc) => {
    if (doc.archived !== archived) store.updateResumeMetadata(doc.id, { archived })
  })
  showToast(archived ? label('已批量归档简历', 'Resumes archived') : label('已批量恢复简历', 'Resumes restored'), 'success')
  clearDocumentSelection()
}

function requestBulkDeleteDocuments() {
  const docs = selectedDocuments.value
  if (!docs.length) return
  if (store.documents.length - docs.length < 1) {
    showToast(label('至少保留一份简历', 'Keep at least one resume'), 'error')
    return
  }
  pendingBulkDelete.value = {
    ids: docs.map((doc) => doc.id),
    titles: docs.map((doc) => doc.title),
  }
}

function confirmBulkDeleteDocuments() {
  if (!pendingBulkDelete.value) return
  const ids = pendingBulkDelete.value.ids
  bulkDeleteSnapshot.value = {
    documents: store.documents.filter((doc) => ids.includes(doc.id)).map((doc) => JSON.parse(JSON.stringify(doc))),
    applications: store.applications.map((app) => JSON.parse(JSON.stringify(app))),
    activeResumeId: store.activeResumeId,
  }
  ids.forEach((id) => store.deleteResume(id))
  showToast(label('简历已删除，可短时撤销', 'Resumes deleted. Undo is available briefly.'), 'success', 8000)
  selectedDocumentIds.value = []
  pendingBulkDelete.value = null
  window.setTimeout(() => {
    bulkDeleteSnapshot.value = null
  }, 8000)
}

function undoBulkDeleteDocuments() {
  if (!bulkDeleteSnapshot.value) return
  store.restoreDeletedResumes(bulkDeleteSnapshot.value)
  bulkDeleteSnapshot.value = null
  showToast(label('已撤销批量删除', 'Bulk delete undone'), 'success')
}

function startRename(id: string, title: string) {
  renameId.value = id
  renameDraft.value = title
}

function cancelRename() {
  renameId.value = ''
  renameDraft.value = ''
}

function finishRename() {
  if (!renameId.value) return
  store.renameResume(renameId.value, renameDraft.value)
  renameId.value = ''
  renameDraft.value = ''
}

function startMetadataEdit(id: string) {
  const doc = store.documents.find((item) => item.id === id)
  if (!doc) return
  metaEditId.value = id
  metaDraft.folder = doc.folder
  metaDraft.targetRole = doc.targetRole
  metaDraft.targetCompany = doc.targetCompany
  metaDraft.tags = doc.tags.join(', ')
}

function cancelMetadataEdit() {
  metaEditId.value = ''
  metaDraft.folder = ''
  metaDraft.targetRole = ''
  metaDraft.targetCompany = ''
  metaDraft.tags = ''
}

function saveMetadataEdit() {
  if (!metaEditId.value) return
  store.updateResumeMetadata(metaEditId.value, {
    folder: metaDraft.folder,
    targetRole: metaDraft.targetRole,
    targetCompany: metaDraft.targetCompany,
    tags: splitItems(metaDraft.tags),
  })
  cancelMetadataEdit()
  showToast(label('简历标签已更新', 'Resume metadata updated'), 'success')
}

function duplicateDocument(id: string) {
  store.duplicateResume(id)
  showToast(locale.value === 'zh-CN' ? '已复制一份简历' : 'Resume duplicated', 'success')
}

function toggleFavoriteDocument(id: string) {
  store.toggleResumeFavorite(id)
}

function toggleArchiveDocument(id: string) {
  const doc = store.documents.find((item) => item.id === id)
  const wasArchived = Boolean(doc?.archived)
  store.toggleResumeArchive(id)
  if (doc?.id === store.activeResumeId && !wasArchived) {
    const fallback = store.documents.find((item) => item.id !== id && !item.archived)
    if (fallback) store.selectResume(fallback.id)
  }
  showToast(wasArchived ? label('已恢复简历', 'Resume restored') : label('已归档简历', 'Resume archived'), 'success')
}

function deleteDocument(id: string) {
  const doc = store.documents.find((item) => item.id === id)
  if (!doc) return
  if (store.documents.length <= 1) {
    store.deleteResume(id)
    return
  }
  pendingDeleteResume.value = { id, title: doc.title }
}

function confirmDeleteDocument() {
  if (!pendingDeleteResume.value) return
  store.deleteResume(pendingDeleteResume.value.id)
  showToast(label('简历已删除', 'Resume deleted'), 'success')
  pendingDeleteResume.value = null
}

function growthTypeLabel(type: GrowthEntryType) {
  const option = growthTypeOptions.find((item) => item.id === type)
  return option ? label(option.zh, option.en) : type
}

function growthUsageLabel(entry: GrowthEntry) {
  const count = entry.usedByResumeIds.length + entry.usedByApplicationIds.length
  if (count > 0) return label(`已使用 ${count} 次`, `Used ${count} time${count > 1 ? 's' : ''}`)
  return label('未使用', 'Unused')
}

function resetGrowthDraft(entry?: GrowthEntry) {
  growthEditId.value = entry?.id ?? ''
  growthDraft.date = entry?.date ?? new Date().toISOString().slice(0, 10)
  growthDraft.type = entry?.type ?? 'achievement'
  growthDraft.company = entry?.company ?? store.activeDocument.targetCompany ?? ''
  growthDraft.project = entry?.project ?? ''
  growthDraft.title = entry?.title ?? ''
  growthDraft.content = entry?.content ?? ''
  growthDraft.metrics = entry?.metrics ?? ''
  growthDraft.skills = entry?.skills.join(', ') ?? ''
  growthDraft.evidenceUrl = entry?.evidenceUrl ?? ''
  growthDraft.private = entry?.private ?? false
  growthDraft.sourceResumeId = entry?.sourceResumeId ?? store.activeResumeId
}

function saveGrowthEntry() {
  if (!growthDraft.title.trim() || !growthDraft.content.trim()) {
    showToast(label('请填写成长记录标题和内容', 'Add a title and content for the growth entry'), 'error')
    return
  }
  const source = store.documents.find((doc) => doc.id === growthDraft.sourceResumeId) ?? store.activeDocument
  store.upsertGrowthEntry({
    id: growthEditId.value || undefined,
    date: growthDraft.date,
    type: growthDraft.type,
    company: growthDraft.company.trim(),
    project: growthDraft.project.trim(),
    title: growthDraft.title.trim(),
    content: growthDraft.content.trim(),
    metrics: growthDraft.metrics.trim(),
    skills: splitItems(growthDraft.skills),
    evidenceUrl: growthDraft.evidenceUrl.trim(),
    private: growthDraft.private,
    sourceResumeId: source.id,
    sourceResumeTitle: source.title,
  })
  resetGrowthDraft()
  showToast(label('成长记录已保存', 'Growth entry saved'), 'success')
}

function editGrowthEntry(entry: GrowthEntry) {
  resetGrowthDraft(entry)
}

function toggleGrowthArchive(entry: GrowthEntry) {
  store.toggleGrowthEntryArchived(entry.id)
  showToast(entry.archived ? label('成长记录已恢复', 'Growth entry restored') : label('成长记录已归档', 'Growth entry archived'), 'success')
}

function recordCareerUpdate() {
  if (!careerChecklistDone.value) {
    showToast(label('先完成职业更新清单，再记录本次更新', 'Complete the career checklist before recording this update'), 'error', 4200)
    return
  }
  store.markCareerUpdated()
  showToast(locale.value === 'zh-CN' ? '已沉淀为职业记忆，两周后再次提醒' : 'Saved to career memory. Next reminder is in two weeks.', 'success', 4000)
}

function setCareerChecklistItem(key: CareerUpdateKey, value: Event) {
  const checked = value.target instanceof HTMLInputElement ? value.target.checked : false
  store.setCareerChecklistItem(store.activeResumeId, key, checked)
}

function setCareerChecklistNotes(value: Event) {
  const notes = value.target instanceof HTMLTextAreaElement ? value.target.value : ''
  store.updateCareerChecklist(store.activeResumeId, { notes })
}

function setTemplate(id: TemplateId) {
  store.setTemplate(id)
  showToast(locale.value === 'zh-CN' ? `已切换到${t(id)}模板` : `Switched to ${t(id)} template`, 'success')
}

function setStudioTheme<K extends keyof StudioTheme>(key: K, value: StudioTheme[K]) {
  store.setStudioTheme(key, value)
}

function resetStudioTheme() {
  store.resetStudioTheme()
  showToast(locale.value === 'zh-CN' ? '页面主题已恢复默认' : 'Page theme reset to defaults', 'success')
}

function splitItems(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitBullets(value: string) {
  return value
    .split('\n')
    .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean)
}

function previewText(value: string) {
  const text = value.trim().replace(/\s+/g, ' ')
  return text || label('暂无内容', 'No content yet')
}

function previewExperience(items: ResumeData['experience']) {
  if (!items.length) return label('暂无工作经历', 'No experience yet')
  return items
    .slice(0, 2)
    .map((item) => `${item.company || label('未填写公司', 'Untitled company')} · ${item.position || label('未填写岗位', 'Untitled role')}`)
    .join('\n')
}

function previewSkills(items: ResumeData['skills']) {
  if (!items.length) return label('暂无技能', 'No skills yet')
  return items
    .slice(0, 3)
    .map((item) => `${item.category || label('技能', 'Skills')}: ${item.items}`)
    .join('\n')
}

function previewProjects(items: ResumeData['projects']) {
  if (!items.length) return label('暂无项目', 'No projects yet')
  return items
    .slice(0, 2)
    .map((item) => `${item.name || label('未命名项目', 'Untitled project')} · ${item.tech || item.role}`)
    .join('\n')
}

function currentJdSnapshot(role = jdRole.value.trim() || store.data.personal.title.trim()) {
  return {
    company: jdCompany.value.trim(),
    title: role,
    location: '',
    description: jdText.value.trim(),
    requirements: splitBullets(jdText.value),
    url: '',
  }
}

async function generateJdDraft() {
  const role = jdRole.value.trim() || store.data.personal.title.trim()
  const description = jdText.value.trim()
  if (!role || !description) {
    jdError.value = label('请至少填写目标岗位和 JD 内容。', 'Add a target role and JD text first.')
    return
  }
  if (!store.data.experience.length) {
    jdError.value = label('请先补充至少一段工作经历，再生成定制草稿。', 'Add at least one work experience before generating a draft.')
    return
  }

  jdGenerating.value = true
  jdError.value = ''
  jdDraft.value = null
  try {
    const draft = await backendApi.generateAssistantResumeDraft({
      requestId: `front-${Date.now()}`,
      persist: false,
      locale: store.config.locale,
      templateId: store.config.templateId,
      personal: store.data.personal,
      workHistory: store.data.experience.map((item) => ({
        id: item.id,
        company: item.company || label('未填写公司', 'Untitled company'),
        title: item.position || label('未填写岗位', 'Untitled role'),
        location: item.location,
        startDate: item.startDate,
        endDate: item.endDate,
        current: item.current,
        description: item.description,
        achievements: splitBullets(item.description),
        skills: store.data.skills.flatMap((skill) => splitItems(skill.items)),
      })),
      education: store.data.education,
      skills: store.data.skills.flatMap((skill) => splitItems(skill.items)),
      projects: store.data.projects,
      jobDescription: currentJdSnapshot(role),
    })
    jdDraft.value = draft
    resetJdApplySections(true)
    store.logActivity({
      type: 'ai',
      tag: 'JD',
      message: 'Generated JD-tailored resume draft',
      messageZh: '生成 JD 定制简历草稿',
      messageEn: 'Generated JD-tailored resume draft',
      meta: draft.title,
    })
    showToast(label('已生成 JD 定制草稿', 'JD-tailored draft generated'), 'success')
  } catch (error) {
    jdError.value = error instanceof Error ? error.message : String(error)
    showToast(label('生成失败，请确认后端已连接', 'Generation failed. Check backend connection.'), 'error', 4200)
  } finally {
    jdGenerating.value = false
  }
}

function resetJdApplySections(value: boolean) {
  ;(Object.keys(jdApplySections) as JdReviewSection[]).forEach((section) => {
    jdApplySections[section] = value
  })
}

function applyJdDraft() {
  if (!jdDraft.value) return
  if (!selectedJdSectionCount.value) {
    showToast(label('请至少选择一个要应用的章节', 'Select at least one section to apply'), 'error')
    return
  }
  const nextData = {
    ...store.data,
    personal: {
      ...store.data.personal,
      summary: jdApplySections.summary ? jdDraft.value.data.personal.summary : store.data.personal.summary,
    },
    experience: jdApplySections.experience ? jdDraft.value.data.experience : store.data.experience,
    skills: jdApplySections.skills ? jdDraft.value.data.skills : store.data.skills,
    projects: jdApplySections.projects ? jdDraft.value.data.projects : store.data.projects,
  }
  store.data = nextData
  jdDraft.value.generation.appliedAt = new Date().toISOString()
  store.logActivity({
    type: 'ai',
    tag: 'JD',
    message: 'Applied selected JD-tailored resume sections',
    messageZh: '采纳 JD 定制草稿的所选章节',
    messageEn: 'Applied selected JD-tailored resume sections',
    meta: `${selectedJdSectionCount.value} · ${jdDraft.value.match.score}/100`,
  })
  emit('navigate', 'editor')
  showToast(label('已应用所选草稿章节', 'Selected draft sections applied'), 'success')
}

function createApplicationFromJdDraft() {
  if (!jdDraft.value) return
  const company = jdCompany.value.trim() || label('未填写公司', 'Untitled company')
  const role = jdRole.value.trim() || jdDraft.value.data.personal.title || store.data.personal.title
  const created = store.addApplication({
    company,
    role,
    resumeId: store.activeResumeId,
    match: jdDraft.value.match.score,
    appliedAt: new Date().toISOString().slice(0, 10),
    nextAction: label('跟进 JD 定制投递结果', 'Follow up on the JD-tailored application'),
    followUpAt: '',
    contactName: '',
    contactEmail: '',
    jobPostUrl: '',
    notes: label('由 JD 定制草稿创建。', 'Created from JD-tailored draft.'),
    jobDescription: currentJdSnapshot(role),
    tailoring: {
      requestId: jdDraft.value.requestId || '',
      sourceResumeId: store.activeResumeId,
      draftTitle: jdDraft.value.title,
      matchScore: jdDraft.value.match.score,
      matchedKeywords: jdDraft.value.match.matchedKeywords,
      selectedExperienceIds: jdDraft.value.match.selectedExperienceIds,
      strategy: jdDraft.value.generation.strategy,
      generatedAt: jdDraft.value.generation.generatedAt,
      appliedAt: jdDraft.value.generation.appliedAt,
    },
  })
  pipelineFilter.value = 'all'
  pipelineSearch.value = created.company
  store.logActivity({
    type: 'application',
    tag: 'JD',
    message: 'Created application from JD-tailored draft',
    messageZh: '从 JD 定制草稿创建投递记录',
    messageEn: 'Created application from JD-tailored draft',
    meta: `${created.company} · ${created.match}`,
    resumeId: created.resumeId,
  })
  emit('navigate', 'pipeline')
  showToast(label('已创建投递记录并保存 JD 信息', 'Application created with JD details'), 'success')
}

function runAssistant() {
  if (!assistantPrompt.value.trim()) {
    showToast(locale.value === 'zh-CN' ? '先输入想优化的方向' : 'Enter an optimization goal first', 'info', 3500)
    return
  }
  const prompt = assistantPrompt.value.trim()
  assistantSuggestions.value.unshift({
    id: `suggestion-${Date.now()}`,
    zh: `根据“${prompt}”重写个人简介，并保留一页版式。`,
    en: `Rewrite the summary for "${prompt}" and keep the resume to one page.`,
    summaryZh: `面向“${prompt}”优化个人简介，突出最近经历、关键技术和可验证成果。`,
    summaryEn: `Tailor the summary for "${prompt}", emphasizing recent experience, key technologies, and verifiable outcomes.`,
  })
  store.logActivity({
    type: 'ai',
    tag: 'AI',
    message: 'Generated local resume advice',
    messageZh: '生成本地简历优化建议',
    messageEn: 'Generated local resume advice',
    meta: prompt,
  })
  showToast(locale.value === 'zh-CN' ? '已生成优化建议，可直接采纳到个人简介' : 'Advice generated. You can apply it to the summary.', 'success', 3500)
  assistantPrompt.value = ''
}

function applySuggestion(suggestion: AssistantSuggestion) {
  const current = store.data.personal.summary.trim()
  const fallback = locale.value === 'zh-CN'
    ? '前端开发工程师，熟悉 Vue3、TypeScript 与工程化体系。'
    : 'Frontend engineer experienced with Vue, TypeScript, and modern web tooling.'
  const addition = locale.value === 'zh-CN' ? suggestion.summaryZh : suggestion.summaryEn
  const joiner = locale.value === 'zh-CN' ? ' ' : ' '
  store.data.personal.summary = `${current || fallback}${joiner}${addition}`.trim()
  store.logActivity({
    type: 'ai',
    tag: 'AI',
    message: 'Applied AI suggestion to summary',
    messageZh: '采纳 AI 建议到个人简介',
    messageEn: 'Applied AI suggestion to summary',
    meta: 'summary.mdx',
  })
  emit('navigate', 'editor')
  showToast(locale.value === 'zh-CN' ? '建议已写入个人简介' : 'Advice applied to the summary', 'success')
}

function matchClass(score: number) {
  if (score >= 85) return 'bar--match-hi'
  if (score >= 70) return 'bar--match-md'
  return 'bar--match-lo'
}
</script>

<template>
  <main id="main-content" class="workspace-main" :class="`workspace-main--${props.mode}`">
    <div class="workspace-inner">
      <section v-if="props.mode === 'workspace' || props.mode === 'editor'" class="section">
        <div class="section__head">
          <div>
            <div class="num">01 · {{ t('nowEditing') }}</div>
            <h2>{{ t('pickUp') }}</h2>
          </div>
          <div class="meta">
            <span>{{ t('lastSession') }}</span>
            <button @click="openEditor">{{ t('openEditor') }} →</button>
          </div>
        </div>

        <div class="hero">
          <div class="hero__left">
            <div class="hero__eyebrow">
              <span class="dot"></span>
              <span>{{ t('nowEditing') }}</span>
            <span class="version">{{ store.activeDocument.title }} · v1.0</span>
            </div>
            <h1 class="hero__title">
              {{ store.data.personal.title || label('目标岗位', 'Target role') }} <em>{{ store.data.personal.name || label('未命名简历', 'Untitled resume') }}</em>
            </h1>
            <div class="hero__sub">
              <span class="pill">{{ store.config.locale }}</span>
              <span>{{ t(store.config.templateId) }} · {{ label('模板', 'template') }}</span>
              <span>·</span>
                <span>{{ label('完整度', 'Complete') }} {{ store.completeness }}%</span>
            </div>

            <div class="hero__stats">
              <div class="hero__stat">
                <div class="k">{{ label('章节', 'Sections') }}</div>
                <div class="v">{{ store.config.sectionOrder.length }}<small>{{ label('项', 'files') }}</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">{{ label('项目', 'Projects') }}</div>
                <div class="v">{{ store.data.projects.length }}<small>{{ label('项', 'items') }}</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">{{ label('经历', 'Experience') }}</div>
                <div class="v">{{ store.data.experience.length }}<small>{{ label('段', 'roles') }}</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">{{ label('匹配', 'Match') }}</div>
                <div class="v">{{ store.completeness }}<small>/100</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">{{ locale === 'zh-CN' ? '双周更新' : 'Biweekly' }}</div>
                <div class="v career-due">{{ careerUpdateDays < 0 ? '!' : Math.max(0, careerUpdateDays) }}<small>{{ locale === 'zh-CN' ? '天' : 'days' }}</small></div>
              </div>
            </div>

            <div class="hero__actions">
              <button class="btn btn--primary" @click="openEditor">{{ t('openEditor') }} <kbd>E</kbd></button>
              <button class="btn" @click="emit('navigate', 'editor')">{{ t('tailorWithAI') }}</button>
              <button class="btn btn--ghost" @click="emit('navigate', 'documents')">{{ t('documentsPage') }}</button>
              <button class="btn btn--ghost" @click="emit('navigate', 'growth')">{{ t('growth') }}</button>
              <button class="btn btn--ghost" @click="emit('command', 'export')">{{ t('exportPdf') }}</button>
              <button class="btn btn--ghost" @click="emit('navigate', 'pipeline')">{{ t('pipeline') }}</button>
            </div>
          </div>

          <div class="hero__right">
            <div class="preview__bar">
              <div class="tabs">
                <span class="on">preview.pdf</span>
                <span>header.mdx</span>
                <span>experience.mdx</span>
              </div>
              <span>A4 · live</span>
            </div>
            <div class="preview">
              <div class="preview__paper">
                <h1>{{ store.data.personal.name || label('你的姓名', 'Your Name') }}</h1>
                <div class="role">{{ store.data.personal.title || label('目标岗位', 'Target Role') }} · {{ store.data.personal.location || label('城市', 'Location') }}</div>
                <div class="rule"></div>
                <h3>{{ label('个人简介', 'Summary') }}</h3>
                <p>{{ store.data.personal.summary || label('这里会显示你的个人简介。', 'Your summary will appear here.') }}</p>
                <h3>{{ label('工作经历', 'Experience') }}</h3>
                <div v-for="item in store.data.experience.slice(0, 2)" :key="item.id">
                  <div class="row"><strong>{{ item.company || label('公司名称', 'Company') }} · {{ item.position || label('岗位', 'Role') }}</strong><span>{{ item.startDate }} — {{ item.current ? label('至今', 'Now') : item.endDate }}</span></div>
                  <p>{{ item.description.split('\n')[0] }}</p>
                </div>
                <h3>{{ label('技能', 'Skills') }}</h3>
                <p>{{ store.data.skills.map((s) => s.items).join(' · ') }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="props.mode === 'templates'" class="section">
        <div class="section__head">
          <div>
            <div class="num">01 · {{ t('templates') }}</div>
            <h2>{{ t('chooseLayout') }}</h2>
          </div>
          <div class="meta">
            <span>{{ label('当前', 'Current') }} · {{ t(store.config.templateId) }}</span>
            <button @click="emit('navigate', 'editor')">{{ t('previewInEditor') }} →</button>
          </div>
        </div>
        <div class="template-grid">
          <button v-for="template in templates" :key="template.id"
            class="template-card"
            :class="{ active: store.config.templateId === template.id }"
            @click="setTemplate(template.id)">
            <TemplateThumbnail :type="template.id" :color="store.config.themeColor" />
            <strong>{{ t(template.id) }}</strong>
            <span>{{ t(templateDescKey(template.id)) }}</span>
          </button>
        </div>
      </section>

      <section v-if="props.mode === 'growth'" class="section">
        <div class="section__head">
          <div>
            <div class="num">01 · {{ t('growth') }}</div>
            <h2>{{ label('成长经历记录', 'Growth experience log') }}</h2>
          </div>
          <div class="meta">
            <span>{{ growthEntries.length }} {{ label('条职业记忆', 'career memories') }}</span>
            <button @click="emit('navigate', 'editor')">{{ t('tailorWithAI') }} →</button>
          </div>
        </div>
        <div class="career-reminder" :class="{ due: careerUpdateDays <= 0 }">
          <div>
            <span>{{ locale === 'zh-CN' ? '职业经历双周更新' : 'Biweekly career update' }}</span>
            <strong>{{ careerUpdateLabel }}</strong>
            <p>{{ locale === 'zh-CN' ? '建议每两周补充一次新项目、职责变化、成果数字或面试反馈。' : 'Every two weeks, add new projects, responsibility changes, measurable outcomes, or interview feedback.' }}</p>
            <div class="career-checklist">
              <label v-for="item in careerChecklistItems" :key="item.key">
                <input
                  type="checkbox"
                  :checked="store.activeDocument.careerUpdateChecklist[item.key]"
                  @change="setCareerChecklistItem(item.key, $event)" />
                <span>{{ label(item.zh, item.en) }}</span>
              </label>
              <textarea
                :value="store.activeDocument.careerUpdateChecklist.notes"
                rows="2"
                :placeholder="label('本轮更新备注：新增项目、面试反馈或技能变化', 'Update notes: projects, feedback, or skill changes')"
                @input="setCareerChecklistNotes" />
            </div>
          </div>
          <button :class="{ ready: careerChecklistDone }" @click="recordCareerUpdate">{{ locale === 'zh-CN' ? '我已更新' : 'I updated it' }}</button>
        </div>

        <div class="growth-memory">
          <form class="growth-form" @submit.prevent="saveGrowthEntry">
            <div class="growth-form__head">
              <strong>{{ growthEditId ? label('编辑职业记忆', 'Edit career memory') : label('新增职业记忆', 'New career memory') }}</strong>
              <button type="button" @click="resetGrowthDraft()">{{ label('新建', 'New') }}</button>
            </div>
            <div class="growth-form__grid">
              <label>
                <span>{{ label('日期', 'Date') }}</span>
                <input v-model="growthDraft.date" type="date" />
              </label>
              <label>
                <span>{{ label('类型', 'Type') }}</span>
                <select v-model="growthDraft.type">
                  <option v-for="type in growthTypeOptions" :key="type.id" :value="type.id">{{ label(type.zh, type.en) }}</option>
                </select>
              </label>
              <label>
                <span>{{ label('公司', 'Company') }}</span>
                <input v-model="growthDraft.company" :placeholder="label('可选', 'Optional')" />
              </label>
              <label>
                <span>{{ label('项目', 'Project') }}</span>
                <input v-model="growthDraft.project" :placeholder="label('可选', 'Optional')" />
              </label>
              <label class="growth-form__wide">
                <span>{{ label('标题', 'Title') }}</span>
                <input v-model="growthDraft.title" :placeholder="label('例如：将首页加载时间降低 70%', 'Example: Reduced home page load time by 70%')" />
              </label>
              <label>
                <span>{{ label('来源简历', 'Source resume') }}</span>
                <select v-model="growthDraft.sourceResumeId">
                  <option v-for="doc in documents" :key="doc.id" :value="doc.id">{{ doc.title }}</option>
                </select>
              </label>
              <label class="growth-form__wide">
                <span>{{ label('量化指标', 'Metrics') }}</span>
                <input v-model="growthDraft.metrics" :placeholder="label('例如：4s -> 1.2s，留存 +20%', 'Example: 4s -> 1.2s, retention +20%')" />
              </label>
              <label>
                <span>{{ label('技能关键词', 'Skills') }}</span>
                <input v-model="growthDraft.skills" :placeholder="label('Vue, TypeScript', 'Vue, TypeScript')" />
              </label>
              <label>
                <span>{{ label('证据链接', 'Evidence URL') }}</span>
                <input v-model="growthDraft.evidenceUrl" type="url" placeholder="https://..." />
              </label>
              <label class="growth-form__notes">
                <span>{{ label('内容', 'Content') }}</span>
                <textarea v-model="growthDraft.content" rows="4" :placeholder="label('记录职责、行动、结果和可复用素材。', 'Capture responsibility, action, result, and reusable material.')" />
              </label>
              <label class="growth-form__privacy">
                <input v-model="growthDraft.private" type="checkbox" />
                <span>{{ label('包含敏感信息，仅本地引用时提醒', 'Contains sensitive information; remind before reuse') }}</span>
              </label>
            </div>
            <div class="growth-form__actions">
              <button type="submit" class="btn btn--primary">{{ label('保存职业记忆', 'Save memory') }}</button>
            </div>
          </form>

          <div class="growth-library">
            <div class="growth-library__toolbar">
              <div class="doc-filter">
                <button
                  v-for="filter in growthFilters"
                  :key="filter.id"
                  :class="{ on: growthFilter === filter.id }"
                  @click="growthFilter = filter.id">
                  {{ filter.label }}<span>{{ filter.count }}</span>
                </button>
              </div>
              <input v-model="growthSearch" type="search" :placeholder="label('搜索项目、指标、技能', 'Search projects, metrics, skills')" />
            </div>
            <div class="growth-entry-list">
              <article v-for="entry in filteredGrowthEntries" :key="entry.id" class="growth-entry-card" :class="{ archived: entry.archived }">
                <div class="growth-entry-card__head">
                  <span>{{ growthTypeLabel(entry.type) }} · {{ entry.date }}</span>
                  <b>{{ growthUsageLabel(entry) }}</b>
                </div>
                <h3>{{ entry.title }}</h3>
                <p>{{ entry.content }}</p>
                <div class="growth-entry-card__meta">
                  <span v-if="entry.company">{{ entry.company }}</span>
                  <span v-if="entry.project">{{ entry.project }}</span>
                  <span v-if="entry.metrics">{{ entry.metrics }}</span>
                  <span v-for="skill in entry.skills.slice(0, 5)" :key="skill">{{ skill }}</span>
                  <span v-if="entry.private">{{ label('敏感', 'Private') }}</span>
                </div>
                <div class="growth-entry-card__foot">
                  <small>{{ label('来源', 'From') }} · {{ entry.sourceResumeTitle }}</small>
                  <div>
                    <a v-if="entry.evidenceUrl" :href="entry.evidenceUrl" target="_blank" rel="noreferrer">{{ label('证据', 'Evidence') }}</a>
                    <button @click="editGrowthEntry(entry)">{{ label('编辑', 'Edit') }}</button>
                    <button @click="toggleGrowthArchive(entry)">{{ entry.archived ? label('恢复', 'Restore') : label('归档', 'Archive') }}</button>
                  </div>
                </div>
              </article>
              <div v-if="!filteredGrowthEntries.length" class="empty-row">
                {{ label('还没有匹配的职业记忆。记录一个项目、指标或反馈，后续 JD 定制可复用。', 'No matching career memories yet. Capture a project, metric, or feedback for future JD tailoring.') }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="props.mode === 'documents'" class="section">
        <div class="section__head">
          <div>
            <div class="num">01 · {{ t('documentsPage') }}</div>
            <h2>{{ t('documents') }}</h2>
          </div>
          <div class="meta">
            <button @click="openEditor">{{ t('openCurrent') }} →</button>
            <button @click="createBlank">{{ t('newResumeFull') }}</button>
          </div>
        </div>
        <div class="doc-filter">
          <button
            v-for="filter in documentFilters"
            :key="filter.id"
            :class="{ on: documentFilter === filter.id }"
            @click="documentFilter = filter.id">
            {{ filter.label }}<span>{{ filter.count }}</span>
          </button>
        </div>
        <div class="doc-library-toolbar">
          <div class="doc-library-toolbar__search">
            <input v-model="documentSearch" :placeholder="label('搜索公司、岗位、标签、投递', 'Search company, role, tags, applications')" />
            <select v-model="documentSort">
              <option value="updated-desc">{{ label('最近编辑', 'Recently edited') }}</option>
              <option value="created-desc">{{ label('最近创建', 'Recently created') }}</option>
              <option value="applications-desc">{{ label('关联投递多', 'Most applications') }}</option>
              <option value="title-asc">{{ label('标题 A-Z', 'Title A-Z') }}</option>
            </select>
          </div>
          <div class="doc-bulk-actions">
            <button @click="selectAllVisibleDocuments">
              {{ selectedVisibleDocumentCount === visibleDocuments.length && visibleDocuments.length ? label('取消全选', 'Clear visible') : label('选择当前', 'Select visible') }}
            </button>
            <button :disabled="!selectedDocuments.length" @click="bulkArchiveDocuments(true)">{{ label('批量归档', 'Archive') }}</button>
            <button :disabled="!selectedDocuments.length" @click="bulkArchiveDocuments(false)">{{ label('批量恢复', 'Restore') }}</button>
            <button class="danger-link" :disabled="!selectedDocuments.length" @click="requestBulkDeleteDocuments">{{ label('批量删除', 'Delete') }}</button>
          </div>
        </div>
        <div v-if="bulkDeleteSnapshot" class="doc-undo">
          <span>{{ label('刚刚删除了简历', 'Recently deleted resumes') }} · {{ bulkDeleteSnapshot.documents.length }}</span>
          <button @click="undoBulkDeleteDocuments">{{ label('撤销', 'Undo') }}</button>
        </div>
        <div class="docs">
          <article v-for="doc in visibleDocuments" :key="doc.id" class="doc" :class="{ active: doc.id === store.activeResumeId, archived: doc.archived }" @click="openDocument(doc.id)">
            <div class="doc__head">
              <label class="doc-select" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedDocumentIds.includes(doc.id)"
                  @change="toggleDocumentSelectionFromEvent(doc.id, $event)" />
              </label>
              <span class="lang">{{ doc.favorite ? '★' : doc.config.locale === 'zh-CN' ? 'ZH' : 'EN' }}</span>
              <span class="menu">{{ doc.id === store.activeResumeId ? 'LIVE' : '···' }}</span>
            </div>
            <div>
              <input v-if="renameId === doc.id" v-model="renameDraft" class="doc-rename" @click.stop @keydown.enter="finishRename" @keydown.esc="cancelRename" @blur="finishRename" />
              <div v-else class="doc__title">{{ doc.title }}</div>
              <div class="doc__role">{{ doc.folder }} · {{ doc.targetCompany || doc.targetRole || doc.data.personal.title || label('未命名', 'Untitled') }}</div>
              <div class="doc__source">{{ label('来源', 'From') }} · {{ documentOriginLabel(doc) }}</div>
              <div v-if="doc.tags.length" class="doc-tags">
                <span v-for="tag in doc.tags.slice(0, 4)" :key="tag">{{ tag }}</span>
              </div>
              <div class="doc-lineage">
                <span>{{ label('关联投递', 'Applications') }} · {{ documentApplications(doc.id).length }}</span>
                <span>{{ label('最近导出', 'Last export') }} · {{ formatShortDate(documentLastExport(doc)?.createdAt) }}</span>
                <span>{{ label('最近编辑', 'Edited') }} · {{ formatShortDate(doc.updatedAt) }}</span>
              </div>
              <div v-if="documentApplications(doc.id).length" class="doc-apps">
                <span v-for="app in documentApplications(doc.id).slice(0, 3)" :key="app.id">{{ app.company }} · {{ app.role }}</span>
              </div>
            </div>
            <div v-if="metaEditId === doc.id" class="doc-meta-edit" @click.stop>
              <input v-model="metaDraft.folder" :placeholder="label('文件夹', 'Folder')" />
              <input v-model="metaDraft.targetCompany" :placeholder="label('目标公司', 'Target company')" />
              <input v-model="metaDraft.targetRole" :placeholder="label('目标岗位', 'Target role')" />
              <input v-model="metaDraft.tags" :placeholder="label('标签，用逗号分隔', 'Tags, comma-separated')" />
              <div>
                <button @click="saveMetadataEdit">{{ label('保存', 'Save') }}</button>
                <button @click="cancelMetadataEdit">{{ label('取消', 'Cancel') }}</button>
              </div>
            </div>
            <div class="doc__sig">{{ (doc.data.personal.name || doc.title || 'R').slice(0, 1) }}</div>
            <div class="doc__meta">
              <span class="dot" :class="{ live: doc.id === store.activeResumeId }"></span>
              <span>{{ doc.data.experience.length }} {{ label('经历', 'exp') }}</span>
              <span>·</span>
              <span>{{ doc.data.projects.length }} {{ label('项目', 'projects') }}</span>
              <span class="push">{{ locale === 'zh-CN' ? '更新' : 'due' }} {{ Math.max(0, store.daysUntilCareerUpdate(doc.id)) }}{{ locale === 'zh-CN' ? '天' : 'd' }}</span>
            </div>
            <div class="doc-actions" @click.stop>
              <button @click="toggleFavoriteDocument(doc.id)">{{ doc.favorite ? label('取消收藏', 'Unstar') : label('收藏', 'Star') }}</button>
              <button @click="startRename(doc.id, doc.title)">{{ locale === 'zh-CN' ? '重命名' : 'Rename' }}</button>
              <button @click="startMetadataEdit(doc.id)">{{ label('标签', 'Meta') }}</button>
              <button @click="duplicateDocument(doc.id)">{{ locale === 'zh-CN' ? '复制' : 'Copy' }}</button>
              <button @click="toggleArchiveDocument(doc.id)">{{ doc.archived ? label('恢复', 'Restore') : label('归档', 'Archive') }}</button>
              <button class="danger-link" @click="deleteDocument(doc.id)">{{ locale === 'zh-CN' ? '删除' : 'Delete' }}</button>
            </div>
          </article>
          <article class="doc doc--new" @click="createBlank">
            <div class="plus">＋</div>
            <strong>{{ t('newResumeFull') }}</strong>
              <span>{{ label('空白 · 导入 · 编辑', 'blank · import · edit') }}</span>
          </article>
          <article v-if="!visibleDocuments.length" class="doc doc--empty">
            <strong>{{ label('没有匹配的简历', 'No matching resumes') }}</strong>
            <span>{{ label('换个关键词、筛选条件或新建一份岗位版本。', 'Try another keyword or filter, or create a role-specific version.') }}</span>
          </article>
        </div>
      </section>

      <section v-if="props.mode === 'pipeline'" class="section">
        <div class="section__head section__head--double">
          <div>
            <div class="num">01 · {{ t('pipeline') }}</div>
            <h2>{{ t('pipelineTitle') }}</h2>
          </div>
          <div class="meta">
            <span>{{ pipelineStats.saved }} {{ label('个待投递', 'saved') }} · {{ pipelineStats.applied }} {{ label('已投递', 'applied') }} · {{ pipelineStats.active }} {{ label('跟进中', 'active') }} · {{ pipelineStats.offer }} Offer</span>
            <button @click="openApplicationForm()">+ {{ label('收藏岗位', 'Save role') }}</button>
          </div>
        </div>
        <div class="apps">
          <div class="apps__toolbar">
            <div class="apps__filters">
              <button v-for="filter in filters" :key="filter.id"
                :class="{ on: pipelineFilter === filter.id }"
                @click="pipelineFilter = filter.id">
                {{ filter.label }}<span class="count">{{ filter.id === 'all' ? applications.length : applications.filter((a) => a.stage === filter.id).length }}</span>
              </button>
            </div>
            <div class="apps__focus">
              <button
                v-for="focus in pipelineFocusOptions"
                :key="focus.id"
                :class="{ on: pipelineFocus === focus.id }"
                @click="pipelineFocus = focus.id">
                {{ focus.label }}<span>{{ focus.count }}</span>
              </button>
            </div>
            <div class="apps__tools">
              <input v-model="pipelineSearch" type="search" :placeholder="label('搜索公司、岗位、简历', 'Search company, role, resume')" />
              <select v-model="pipelineSort">
                <option value="applied-desc">{{ label('最近投递', 'Newest applied') }}</option>
                <option value="match-desc">{{ label('匹配度最高', 'Highest match') }}</option>
                <option value="company-asc">{{ label('公司 A-Z', 'Company A-Z') }}</option>
              </select>
            </div>
            <span class="toolbar-note">{{ pipelineSortLabel }}</span>
          </div>

          <form v-if="applicationFormOpen" class="application-form" @submit.prevent="saveApplication">
            <div class="application-form__head">
              <strong>{{ editingApplicationId ? label('编辑岗位记录', 'Edit opportunity') : label('新增岗位记录', 'New opportunity') }}</strong>
              <button type="button" @click="closeApplicationForm">×</button>
            </div>
            <p v-if="applicationError" class="form-error">{{ applicationError }}</p>
            <div class="application-form__grid">
              <label>
                <span>{{ t('company') }}</span>
                <input v-model="applicationDraft.company" :placeholder="label('例如：字节跳动', 'Example: Vercel')" />
              </label>
              <label>
                <span>{{ t('role') }}</span>
                <input v-model="applicationDraft.role" :placeholder="label('前端开发工程师', 'Frontend Engineer')" />
              </label>
              <label>
                <span>{{ label('部门 / 团队', 'Department / team') }}</span>
                <input v-model="applicationDraft.department" :placeholder="label('商业化平台', 'Web Platform')" />
              </label>
              <label>
                <span>{{ label('地点', 'Location') }}</span>
                <input v-model="applicationDraft.location" :placeholder="label('上海 · 混合办公', 'Remote · Global')" />
              </label>
              <label>
                <span>{{ t('resumeUsed') }}</span>
                <select v-model="applicationDraft.resumeId">
                  <option v-for="doc in documents" :key="doc.id" :value="doc.id">{{ doc.title }}</option>
                </select>
              </label>
              <label>
                <span>{{ t('stage') }}</span>
                <select v-model="applicationDraft.stage">
                  <option v-for="stage in stageOptions" :key="stage.id" :value="stage.id">{{ label(stage.zh, stage.en) }}</option>
                </select>
              </label>
              <label>
                <span>{{ t('match') }}</span>
                <input v-model.number="applicationDraft.match" type="number" min="0" max="100" />
              </label>
              <label>
                <span>{{ applicationDraft.stage === 'saved' ? label('计划投递日期', 'Planned apply date') : t('applied') }}</span>
                <input v-model="applicationDraft.appliedAt" type="date" />
              </label>
              <label>
                <span>{{ label('下一步', 'Next action') }}</span>
                <input v-model="applicationDraft.nextAction" :placeholder="label('例如：周五前发送项目案例', 'Example: send project examples by Friday')" />
              </label>
              <label>
                <span>{{ label('跟进日期', 'Follow-up') }}</span>
                <input v-model="applicationDraft.followUpAt" type="date" />
              </label>
              <label>
                <span>{{ label('联系人', 'Contact') }}</span>
                <input v-model="applicationDraft.contactName" :placeholder="label('招聘负责人 / 内推人', 'Recruiter / referrer')" />
              </label>
              <label>
                <span>{{ label('联系人邮箱', 'Contact email') }}</span>
                <input v-model="applicationDraft.contactEmail" type="email" placeholder="name@example.com" />
              </label>
              <label class="application-form__wide">
                <span>{{ label('招聘链接', 'Job post URL') }}</span>
                <input v-model="applicationDraft.jobPostUrl" type="url" placeholder="https://..." />
              </label>
              <label class="application-form__wide">
                <span>{{ label('JD 归档', 'JD archive') }}</span>
                <textarea v-model="applicationDraft.jdArchive" rows="3" :placeholder="label('粘贴岗位职责、要求和关键词，后续可追溯每次投递依据。', 'Paste responsibilities, requirements, and keywords for traceability.')" />
              </label>
              <label class="application-form__notes">
                <span>{{ label('备注', 'Notes') }}</span>
                <textarea v-model="applicationDraft.notes" rows="3" :placeholder="label('记录岗位重点、下一步动作或面试反馈', 'Track role focus, next step, or interview feedback')" />
              </label>
            </div>
            <div class="application-form__actions">
              <button type="button" class="btn btn--ghost" @click="closeApplicationForm">{{ label('取消', 'Cancel') }}</button>
              <button type="submit" class="btn btn--primary">{{ editingApplicationId ? label('保存修改', 'Save changes') : label('加入管线', 'Add to pipeline') }}</button>
            </div>
          </form>

          <table class="apps__table">
            <thead>
              <tr>
                <th>{{ t('company') }}</th>
                <th>{{ t('role') }}</th>
                <th>{{ t('resumeUsed') }}</th>
                <th>{{ t('stage') }}</th>
                <th>{{ t('match') }}</th>
                <th>{{ t('applied') }}</th>
                <th>{{ label('操作', 'Actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="app in filteredApplications" :key="app.id">
                <tr :class="`follow-${followUpState(app)}`">
                  <td>
                    <div class="co">
                      <div class="co__logo">{{ app.companyMono }}</div>
                      <div>
                        <div class="co__name">{{ app.company }}</div>
                        <div class="co__loc">{{ app.location || label('未填写地点', 'No location') }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="role-cell">
                      {{ app.role || label('未填写岗位', 'Untitled role') }}
                      <small>{{ app.nextAction || app.department || label('未填写下一步', 'No next action') }}</small>
                    </div>
                  </td>
                  <td><span class="mono">{{ app.resumeTitle }}</span></td>
                  <td>
                    <span class="stage" :class="`stage--${app.stage}`">{{ stageLabel(app.stage) }}</span>
                    <span v-if="app.tailoring" class="jd-chip">JD {{ app.tailoring.matchScore }}</span>
                  </td>
                  <td>
                    <div class="match-cell">
                      <div class="bar" :class="matchClass(app.match)"><i :style="{ width: `${app.match}%` }"></i></div>
                      <span>{{ app.match }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="applied-when">
                      {{ app.stage === 'saved' ? label('待投递', 'Not applied') : formatAppliedDate(app.appliedAt) }}
                      <small>
                        <b v-if="followUpState(app) !== 'none'" :class="`follow-chip follow-chip--${followUpState(app)}`">{{ followUpLabel(app) }}</b>
                        {{ app.followUpAt ? `${label('跟进', 'Follow')} ${formatAppliedDate(app.followUpAt)}` : app.stage === 'saved' ? (app.nextAction || label('评估岗位', 'Review role')) : daysAgo(app.appliedAt) }}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button v-if="app.stage === 'saved'" @click="markApplicationApplied(app)">{{ label('标记投递', 'Mark applied') }}</button>
                      <button v-else-if="app.stage !== 'offer' && app.stage !== 'rejected'" @click="advanceApplication(app)">{{ label('推进', 'Advance') }}</button>
                      <button @click="openApplicationDetail(app)">{{ label('详情', 'Details') }}</button>
                      <button @click="openApplicationForm(app)">{{ label('编辑', 'Edit') }}</button>
                      <button @click="removeApplication(app.id)">{{ label('删除', 'Delete') }}</button>
                    </div>
                  </td>
                </tr>
                <tr class="progress-row">
                  <td colspan="7">
                    <div class="progress-log">
                      <div class="progress-log__head">
                        <strong>{{ label('进度记录', 'Progress log') }}</strong>
                        <span v-if="latestProgress(app)">{{ progressWhen(latestProgress(app)!.happenedAt) }} · {{ latestProgress(app)!.title }}</span>
                      </div>
                      <div class="progress-log__events">
                        <div v-for="event in app.progressLog.slice(-4)" :key="event.id" class="progress-event">
                          <i :class="`stage--${event.stage}`"></i>
                          <span>{{ progressWhen(event.happenedAt) }}</span>
                          <b>{{ event.title }}</b>
                          <em>{{ event.note || stageLabel(event.stage) }}</em>
                        </div>
                      </div>
                      <div class="progress-compose">
                        <input v-model="progressDrafts[app.id]" :placeholder="label('记录一次跟进、沟通、面试反馈或待办', 'Log a follow-up, conversation, interview note, or todo')" @keydown.enter="addProgressNote(app)" />
                        <button @click="addProgressNote(app)">{{ label('记录', 'Log') }}</button>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="!filteredApplications.length">
                <td colspan="7">
                  <div class="empty-row">
                    {{ pipelineSearch ? label('没有匹配的岗位记录，换个关键词试试。', 'No matching opportunities. Try another keyword.') : label('还没有岗位记录，先收藏一个可能投递的岗位。', 'No opportunities yet. Save a role first.') }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <Teleport to="body">
            <div v-if="selectedApplication" class="application-detail-backdrop" @click.self="closeApplicationDetail">
              <aside class="application-detail-drawer">
                <div class="application-detail__head">
                  <div>
                    <span>{{ label('投递详情', 'Application detail') }}</span>
                    <h3>{{ selectedApplication.company }} · {{ selectedApplication.role || label('未填写岗位', 'Untitled role') }}</h3>
                    <p>{{ selectedApplication.resumeTitle }} · {{ stageLabel(selectedApplication.stage) }} · {{ selectedApplication.match }}/100</p>
                  </div>
                  <button @click="closeApplicationDetail">×</button>
                </div>

                <div class="application-detail__actions">
                  <button class="btn btn--primary" @click="advanceApplication(selectedApplication)">{{ label('推进阶段', 'Advance stage') }}</button>
                  <button class="btn btn--ghost" @click="openApplicationForm(selectedApplication)">{{ label('编辑岗位', 'Edit role') }}</button>
                </div>

                <section class="application-detail__section">
                  <div class="detail-grid">
                    <div>
                      <span>{{ label('跟进状态', 'Follow-up') }}</span>
                      <strong :class="`follow-text follow-text--${followUpState(selectedApplication)}`">{{ followUpLabel(selectedApplication) }}</strong>
                    </div>
                    <div>
                      <span>{{ label('投递日期', 'Applied') }}</span>
                      <strong>{{ selectedApplication.appliedAt ? formatAppliedDate(selectedApplication.appliedAt) : label('未投递', 'Not applied') }}</strong>
                    </div>
                    <div>
                      <span>{{ label('联系人', 'Contact') }}</span>
                      <strong>{{ selectedApplication.contactName || selectedApplication.contactEmail || label('未填写', 'Not set') }}</strong>
                    </div>
                    <div>
                      <span>{{ label('下一步', 'Next') }}</span>
                      <strong>{{ selectedApplication.nextAction || label('未填写', 'Not set') }}</strong>
                    </div>
                  </div>
                </section>

                <section v-if="selectedApplication.jobDescription" class="application-detail__section">
                  <div class="detail-section-head">
                    <span>{{ label('JD 快照', 'JD snapshot') }}</span>
                    <a v-if="selectedApplication.jobDescription.url" :href="selectedApplication.jobDescription.url" target="_blank" rel="noreferrer">{{ label('打开链接', 'Open link') }}</a>
                  </div>
                  <p class="jd-snapshot">{{ selectedApplication.jobDescription.description || selectedApplication.jobDescription.requirements.join(' · ') || label('已保存 JD 元数据', 'JD metadata saved') }}</p>
                </section>

                <section v-if="selectedApplication.tailoring" class="application-detail__section">
                  <div class="detail-section-head">
                    <span>{{ label('定制元数据', 'Tailoring metadata') }}</span>
                    <b>JD {{ selectedApplication.tailoring.matchScore }}</b>
                  </div>
                  <dl class="detail-meta-list">
                    <div><dt>request id</dt><dd>{{ selectedApplication.tailoring.requestId || label('未返回', 'missing') }}</dd></div>
                    <div><dt>{{ label('生成策略', 'strategy') }}</dt><dd>{{ selectedApplication.tailoring.strategy }}</dd></div>
                    <div><dt>{{ label('命中关键词', 'keywords') }}</dt><dd>{{ selectedApplication.tailoring.matchedKeywords.join(' · ') || label('暂无', 'none') }}</dd></div>
                  </dl>
                </section>

                <section class="application-detail__section">
                  <div class="detail-section-head">
                    <span>{{ label('时间线', 'Timeline') }}</span>
                    <button class="mini-link" @click="createProgressEvent(selectedApplication)">{{ label('新增事件', 'New event') }}</button>
                  </div>
                  <div class="detail-progress-list">
                    <article v-for="event in selectedApplication.progressLog" :key="event.id" class="detail-progress-event">
                      <i :class="`stage--${event.stage}`"></i>
                      <div v-if="editingProgressEventId === event.id" class="progress-event-editor">
                        <div class="progress-event-editor__grid">
                          <select v-model="progressEventDraft.stage">
                            <option v-for="stage in stageOptions" :key="stage.id" :value="stage.id">{{ label(stage.zh, stage.en) }}</option>
                          </select>
                          <input v-model="progressEventDraft.happenedAt" type="date" />
                          <input v-model="progressEventDraft.title" :placeholder="label('事件标题', 'Event title')" />
                          <input v-model="progressEventDraft.note" :placeholder="label('备注', 'Note')" />
                        </div>
                        <div class="progress-event-editor__actions">
                          <button @click="saveProgressEvent(selectedApplication)">{{ label('保存', 'Save') }}</button>
                          <button @click="cancelProgressEventEdit">{{ label('取消', 'Cancel') }}</button>
                        </div>
                      </div>
                      <div v-else>
                        <span>{{ progressWhen(event.happenedAt) }} · {{ stageLabel(event.stage) }}</span>
                        <strong>{{ event.title }}</strong>
                        <p>{{ event.note || selectedApplication.nextAction || label('暂无备注', 'No note') }}</p>
                        <div class="detail-progress-event__actions">
                          <button @click="startProgressEventEdit(event)">{{ label('编辑', 'Edit') }}</button>
                          <button @click="deleteProgressEvent(selectedApplication, event.id)">{{ label('删除', 'Delete') }}</button>
                        </div>
                      </div>
                    </article>
                    <div v-if="!selectedApplication.progressLog.length" class="empty-row">
                      {{ label('还没有进度事件，先在表格里记录一次跟进。', 'No timeline events yet. Add a note from the table first.') }}
                    </div>
                  </div>
                </section>

                <section v-if="selectedApplication.notes" class="application-detail__section">
                  <div class="detail-section-head"><span>{{ label('备注', 'Notes') }}</span></div>
                  <p class="jd-snapshot">{{ selectedApplication.notes }}</p>
                </section>
              </aside>
            </div>
          </Teleport>
        </div>
      </section>

      <section v-if="props.mode === 'history'" class="section">
        <div class="lower">
          <div class="panel">
            <div class="panel__head">
              <div class="ttl">{{ t('commits') }} · <em>{{ store.activeDocument.title }}</em></div>
              <button @click="emit('navigate', 'history')">{{ t('fullLog') }} →</button>
            </div>
            <div class="timeline">
              <div v-for="event in activities" :key="event.id" class="commit" :class="`commit--${event.type}`">
                <div class="commit__graph"><span class="commit__dot"></span></div>
                <div class="commit__body">
                  <div class="commit__msg"><span class="tag" :class="`tag--${event.type}`">{{ event.tag }}</span>{{ activityMessage(event) }}</div>
                  <div class="commit__meta">{{ event.meta }}</div>
                </div>
                <div class="commit__sha"><div class="hash">{{ activityHash(event.id) }}</div><div>{{ activityWhen(event.createdAt) }}</div></div>
              </div>
              <div v-if="!activities.length" class="empty-row">
                {{ label('还没有历史记录。编辑简历、导出或记录投递后会自动出现。', 'No history yet. Edits, exports, and applications will appear here.') }}
              </div>
            </div>
          </div>

          <div v-if="false" class="panel ai-panel">
            <div class="panel__head">
              <div class="ttl">AI · <em>{{ t('coEditor') }}</em></div>
              <div class="live">{{ label('会话', 'SESSION') }} · {{ t('ready') }}</div>
            </div>
            <div class="ai">
              <div class="ai__convo">
                <div class="ai__msg ai__msg--user">
                  <div class="gut">›</div>
                  <div class="body">{{ label('针对目标岗位优化这份简历，保持一页，优先强化最近经历。', 'Tailor this resume for the target role, keep it to one page, and prioritize recent experience.') }}</div>
                </div>
                <div class="ai__msg ai__msg--ai">
                  <div class="gut">∗</div>
                  <div class="body">
                    {{ label('我会检查摘要、经历和项目三块。当前完整度', 'I will review the summary, experience, and projects. Current completeness') }} <strong>{{ store.completeness }}</strong>{{ label('，建议先补量化结果，再压缩弱相关内容。', '. Add measurable outcomes first, then trim weaker details.') }}
                    <div class="ai__tool">
                      <div class="ai__tool__head"><span class="name">read_resume</span><span class="status">{{ label('完成', 'DONE') }}</span></div>
                      <div class="ai__tool__body">
                        <div class="row"><span class="k">{{ label('章节', 'sections') }}</span><span class="v">{{ store.config.sectionOrder.length }} {{ label('块', 'blocks') }}</span></div>
                        <div class="row"><span class="k">{{ label('模板', 'template') }}</span><span class="v">{{ t(store.config.templateId) }}</span></div>
                      </div>
                    </div>
                    <div class="jd-builder">
                      <div class="jd-builder__head">
                        <span>{{ label('JD 定制草稿', 'JD-tailored draft') }}</span>
                        <b>{{ jdDraft ? `${jdDraft?.match.score}/100` : label('待生成', 'ready') }}</b>
                      </div>
                      <div class="jd-builder__grid">
                        <input v-model="jdCompany" :placeholder="label('目标公司', 'Target company')" />
                        <input v-model="jdRole" :placeholder="label('目标岗位', 'Target role')" />
                      </div>
                      <textarea v-model="jdText" rows="5" :placeholder="label('粘贴招聘 JD：职责、要求、关键词都会用于排序经历和生成摘要。', 'Paste the JD: responsibilities, requirements, and keywords will rank experience and shape the summary.')" />
                      <p v-if="jdError" class="form-error">{{ jdError }}</p>
                      <div v-if="jdDraft" class="jd-result">
                        <div>
                          <strong>{{ jdDraft?.title }}</strong>
                          <span>{{ label('命中关键词', 'Matched keywords') }} · {{ jdDraft?.match.matchedKeywords.slice(0, 8).join(' · ') || label('暂无', 'none') }}</span>
                        </div>
                        <div class="jd-review">
                          <div class="jd-review__head">
                            <span>{{ label('选择要应用的章节', 'Choose sections to apply') }}</span>
                            <div>
                              <button class="mini-link" @click="resetJdApplySections(true)">{{ label('全选', 'All') }}</button>
                              <button class="mini-link" @click="resetJdApplySections(false)">{{ label('清空', 'None') }}</button>
                            </div>
                          </div>
                          <label v-for="section in jdSectionReviews" :key="section.id" class="jd-review__item">
                            <input v-model="jdApplySections[section.id]" type="checkbox" />
                            <span class="jd-review__label">{{ section.label }}</span>
                            <span class="jd-review__preview">
                              <em>{{ label('当前', 'Current') }}</em>{{ section.before }}
                              <em>{{ label('草稿', 'Draft') }}</em>{{ section.after }}
                            </span>
                          </label>
                        </div>
                        <div class="jd-result__actions">
                          <button class="btn btn--primary" @click="applyJdDraft">
                            {{ label(`应用所选 (${selectedJdSectionCount})`, `Apply selected (${selectedJdSectionCount})`) }}
                          </button>
                          <button class="btn btn--ghost" @click="createApplicationFromJdDraft">{{ label('记录投递', 'Log application') }}</button>
                        </div>
                      </div>
                      <button class="btn" :disabled="jdGenerating" @click="generateJdDraft">
                        {{ jdGenerating ? label('生成中...', 'Generating...') : label('根据 JD 生成草稿', 'Generate from JD') }}
                      </button>
                    </div>
                    <div class="ai-suggestions">
                      <button v-for="suggestion in assistantSuggestions" :key="suggestion.id" @click="applySuggestion(suggestion)">
                        <span>{{ locale === 'zh-CN' ? suggestion.zh : suggestion.en }}</span>
                        <b>{{ t('apply') }}</b>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="ai__compose">
                <input v-model="assistantPrompt" :placeholder="t('aiPlaceholder')" @keydown.enter="runAssistant" />
                <button class="btn btn--primary" @click="runAssistant">{{ t('generateAdvice') }}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="props.mode === 'settings'" class="section">
        <div class="section__head">
          <div>
            <div class="num">01 · {{ t('settings') }}</div>
            <h2>{{ t('studioPrefs') }}</h2>
          </div>
        </div>
        <div class="settings-panel">
          <section class="settings-card settings-card--wide settings-card--app">
            <div class="settings-card__head">
              <div>
                <em>{{ label('网站应用风格', 'Website style') }}</em>
                <span>{{ label('工作台外观', 'Workspace appearance') }}</span>
                <strong>{{ label('只影响导航、页面、表单和面板，不会改变导出的简历', 'Only affects navigation, pages, forms, and panels. It will not change exported resumes.') }}</strong>
              </div>
              <button class="btn btn--ghost" @click="resetStudioTheme">{{ label('恢复默认', 'Reset') }}</button>
            </div>

            <div class="settings-rows">
              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('强调色', 'Accent') }}</span>
                  <small>{{ label('网站导航、按钮、提示和分数条', 'Website navigation, buttons, toasts, and meters') }}</small>
                </div>
                <div class="settings-swatches">
                  <button v-for="accent in accents" :key="accent.id"
                    class="settings-swatch"
                    :class="{ on: store.config.studioTheme.accent === accent.id }"
                    :style="{ background: accent.hex }"
                    :title="accent.label"
                    @click="setStudioTheme('accent', accent.id)"></button>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('纸张', 'Paper') }}</span>
                  <small>{{ label('整站背景和面板底色', 'App background and panels') }}</small>
                </div>
                <div class="settings-swatches">
                  <button v-for="paper in papers" :key="paper.id"
                    class="settings-swatch"
                    :class="{ on: store.config.studioTheme.paper === paper.id }"
                    :style="{ background: paper.hex }"
                    :title="paper.label"
                    @click="setStudioTheme('paper', paper.id)"></button>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('全局辅助线', 'Global rule lines') }}</span>
                  <small>{{ label('工作台背景参考线', 'Workspace background guides') }}</small>
                </div>
                <button class="tgl" :class="{ on: store.config.studioTheme.ruleLines }"
                  @click="setStudioTheme('ruleLines', !store.config.studioTheme.ruleLines)"></button>
              </div>

              <div class="settings-row settings-row--fonts">
                <div class="settings-row__copy">
                  <span>{{ label('界面字体', 'Interface font') }}</span>
                  <small>{{ label('仅影响工作台界面', 'Workspace UI only') }}</small>
                </div>
                <div class="settings-fonts">
                  <button v-for="font in interfaceFonts" :key="font.id"
                    class="font-swatch"
                    :class="[font.className, { on: store.config.studioTheme.font === font.id }]"
                    @click="setStudioTheme('font', font.id)">
                    <div>
                      <div class="name">{{ font.name }}</div>
                      <div class="meta">{{ font.meta }}</div>
                    </div>
                    <div class="meta">Aa</div>
                  </button>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('页面密度', 'Page density') }}</span>
                  <small>{{ label('控制工作台间距', 'Controls workspace spacing') }}</small>
                </div>
                <div class="seg-radio">
                  <button v-for="density in densities" :key="density"
                    :class="{ on: store.config.studioTheme.density === density }"
                    @click="setStudioTheme('density', density)">{{ density }}</button>
                </div>
              </div>
            </div>
          </section>

          <section class="settings-card">
            <div class="settings-card__head">
              <div>
                <span>{{ label('数据', 'Data') }}</span>
                <strong>{{ label('恢复示例会覆盖当前简历内容', 'Restoring demo content overwrites the current resume') }}</strong>
              </div>
            </div>
            <button class="btn btn--ghost settings-danger" @click="store.resetToDefault()">{{ t('restoreDemo') }}</button>
          </section>
        </div>
      </section>
    </div>
    <ConfirmDialog v-if="pendingDeleteResume"
      :title="label('删除这份简历？', 'Delete this resume?')"
      :message="label(`“${pendingDeleteResume.title}”会从列表移除，关联投递会自动改到另一份简历。`, `“${pendingDeleteResume.title}” will be removed, and linked applications will move to another resume.`)"
      danger
      @confirm="confirmDeleteDocument"
      @cancel="pendingDeleteResume = null" />
    <ConfirmDialog v-if="pendingBulkDelete"
      :title="label('批量删除简历？', 'Delete selected resumes?')"
      :message="label(`将删除 ${pendingBulkDelete.titles.length} 份简历：${pendingBulkDelete.titles.join('、')}。关联投递会自动改到保留的简历。`, `This will delete ${pendingBulkDelete.titles.length} resumes: ${pendingBulkDelete.titles.join(', ')}. Linked applications will move to a remaining resume.`)"
      danger
      @confirm="confirmBulkDeleteDocuments"
      @cancel="pendingBulkDelete = null" />
  </main>
</template>
