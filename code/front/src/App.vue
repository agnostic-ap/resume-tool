<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ToastContainer from './components/ToastContainer.vue'
import WelcomeDialog from './components/WelcomeDialog.vue'
import WorkspacePanel from './components/WorkspacePanel.vue'
import CommandPalette from './components/CommandPalette.vue'
import TweaksPanel from './components/TweaksPanel.vue'
import TemplateThumbnail from './components/TemplateThumbnail.vue'
import UpgradeDialog from './components/UpgradeDialog.vue'
import PublicResumeView from './components/PublicResumeView.vue'
import { useResumeStore } from './stores/resume'
import { showToast } from './composables/toast'
import { useI18n } from './i18n'
import { useLocaleText } from './composables/useLocaleText'
import { backendApi, type PlatformResumeDraft } from './api/backend'
import { getDistinctId } from './utils/analytics'
import { openPaywall } from './composables/paywall'
import { useNextBestAction } from './composables/nextBestAction'
import { getMobileCommandFallback } from './utils/mobileNavigation'
import { RESUME_COLOR_PRESETS, getResumeColorLabel } from './utils/resumeTheme'
import { getSyncRetryLaterCopy } from './utils/syncCopy'
import { getEditorSettingsLauncherLabel } from './utils/editorSettingsDisplay'
import { getQuickActionLabel } from './utils/commandPalette'
import { getTailoringStrategyLabel } from './utils/tailoringDisplay'
import { buildShareUrl, decodeResumeShare, encodeResumeShare, getReferralCode, parseRefParam, parseShareToken, type ResumeSharePayload } from './utils/share'
import type { ResumeData, TemplateId } from './types/resume'

type AppView = 'workspace' | 'editor' | 'documents' | 'templates' | 'growth' | 'pipeline' | 'history' | 'settings'
type JdReviewSection = 'summary' | 'experience' | 'skills' | 'projects'
type OnboardingTarget = 'personal' | 'title' | 'summary' | 'experience' | 'skills' | 'export'

const store = useResumeStore()
const { t } = useI18n()
const { l } = useLocaleText()
const tr = (key: string) => t(key as never)

function readPublicShare(): ResumeSharePayload | null {
  if (typeof window === 'undefined') return null
  const token = parseShareToken(window.location.hash)
  return token ? decodeResumeShare(token) : null
}
const publicShare = ref<ResumeSharePayload | null>(readPublicShare())
const showWelcome = ref(!localStorage.getItem('resume-visited'))
const currentView = ref<AppView>('workspace')
const commandOpen = ref(false)
const focusedApplicationId = ref('')
const editorTweaksOpen = ref(false)
const editorPanelRef = ref<{ focusOnboardingTarget: (target: OnboardingTarget) => void } | null>(null)
const editorJdCompany = ref('')
const editorJdRole = ref('')
const editorJdText = ref('')
const editorJdGenerating = ref(false)
const editorJdDraft = ref<PlatformResumeDraft | null>(null)
const editorJdError = ref('')
const editorJdGrowthEntryIds = ref<string[]>([])
const editorJdAttention = ref(false)
const editorJdCardRef = ref<HTMLElement | null>(null)
const editorJdRoleRef = ref<HTMLInputElement | null>(null)
const editorJdTextRef = ref<HTMLTextAreaElement | null>(null)
const trackedCoreFields = new Set<string>()
const editorJdApplySections = reactive<Record<JdReviewSection, boolean>>({
  summary: true,
  experience: true,
  skills: true,
  projects: true,
})

const resumeColorPresets = RESUME_COLOR_PRESETS

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

const activeSections = computed(() =>
  store.config.sectionOrder.filter((id) => store.config.sectionVisible[id]).length,
)

const primaryAdvice = computed(() => {
  if (!store.data.personal.summary.trim()) return l('先补一段 2-3 句的个人简介，预览页会立刻更完整。', 'Start with a 2-3 sentence summary so the preview feels complete.')
  if (!store.data.experience.length) return l('加入最近一段工作经历，让简历主体更可信。', 'Add your most recent role to make the resume feel credible.')
  if (!store.data.projects.length) return l('补充一个能体现结果的项目，建议写清技术栈和量化成果。', 'Add one outcome-driven project with stack and measurable impact.')
  if (store.completeness < 90) return l('继续补齐隐藏或空白章节，导出前建议把完整度推到 90 以上。', 'Fill the remaining visible sections before export; aim for 90+ completeness.')
  return l('内容结构已经很稳，导出前只需要检查分页线和主题色。', 'The structure is solid. Check page breaks and theme color before export.')
})

const editorJdSectionReviews = computed(() => {
  const draft = editorJdDraft.value
  if (!draft) return []
  return [
    {
      id: 'summary' as const,
      label: l('个人简介', 'Summary'),
      before: previewText(store.data.personal.summary),
      after: previewText(draft.data.personal.summary),
    },
    {
      id: 'experience' as const,
      label: l('工作经历', 'Experience'),
      before: previewExperience(store.data.experience),
      after: previewExperience(draft.data.experience),
    },
    {
      id: 'skills' as const,
      label: l('技能', 'Skills'),
      before: previewSkills(store.data.skills),
      after: previewSkills(draft.data.skills),
    },
    {
      id: 'projects' as const,
      label: l('项目', 'Projects'),
      before: previewProjects(store.data.projects),
      after: previewProjects(draft.data.projects),
    },
  ]
})

const selectedEditorJdSectionCount = computed(() =>
  (Object.keys(editorJdApplySections) as JdReviewSection[]).filter((section) => editorJdApplySections[section]).length,
)

const editorJdDiffBySection = computed(() => {
  const map: Partial<Record<JdReviewSection, { rationale: string; confidence: number; source: string; count: number }>> = {}
  for (const op of editorJdDraft.value?.diff ?? []) {
    const section = op.section as JdReviewSection
    const existing = map[section]
    if (existing) {
      existing.count += 1
      continue
    }
    map[section] = { rationale: op.rationale, confidence: op.confidence, source: op.source, count: 1 }
  }
  return map
})

const editorJdStrategyLabel = computed(() => {
  return getTailoringStrategyLabel(editorJdDraft.value?.generation.strategy ?? '', store.config.locale)
})

const editorJdGrowthEntries = computed(() => {
  const activeEntries = store.growthEntries.filter((entry) => !entry.archived)
  const selectedEntries = activeEntries.filter((entry) => editorJdGrowthEntryIds.value.includes(entry.id))
  const recentEntries = activeEntries
    .filter((entry) => !editorJdGrowthEntryIds.value.includes(entry.id))
    .slice(0, Math.max(0, 6 - selectedEntries.length))
  return [...selectedEntries, ...recentEntries]
})

const selectedEditorJdGrowthEntries = computed(() =>
  store.growthEntries.filter((entry) => editorJdGrowthEntryIds.value.includes(entry.id)),
)
const editableDocuments = computed(() => store.documents.filter((doc) => !doc.archived))

const nextBestAction = useNextBestAction(() => ({
  locale: store.config.locale,
  data: store.data,
  completeness: store.completeness,
  showAI: store.config.tweaks.showAI,
  applications: store.applications,
  syncOperations: store.syncOperations,
}))

const onboardingItems = computed<Array<{ id: OnboardingTarget; label: string; done: boolean; action: string }>>(() => [
  {
    id: 'personal',
    label: l('填写姓名与联系方式', 'Add name and contact'),
    done: Boolean(store.data.personal.name.trim() && (store.data.personal.email.trim() || store.data.personal.phone.trim())),
    action: l('去填写', 'Fill'),
  },
  {
    id: 'title',
    label: l('明确求职标题', 'Set target title'),
    done: Boolean(store.data.personal.title.trim()),
    action: l('定位岗位', 'Set title'),
  },
  {
    id: 'summary',
    label: l('写 2-3 句个人简介', 'Write a 2-3 sentence summary'),
    done: store.data.personal.summary.trim().length > 20,
    action: l('补简介', 'Add summary'),
  },
  {
    id: 'experience',
    label: l('补最近一段工作经历', 'Add recent experience'),
    done: store.data.experience.length > 0 && store.data.experience.some((item) => item.description.trim().length > 30),
    action: l('加经历', 'Add role'),
  },
  {
    id: 'skills',
    label: l('列出核心技能关键词', 'List core skills'),
    done: store.data.skills.length > 0 && store.data.skills.some((item) => item.items.trim()),
    action: l('加技能', 'Add skills'),
  },
  {
    id: 'export',
    label: l('完成导出前检查', 'Run export precheck'),
    done: store.completeness >= 80,
    action: l('检查导出', 'Precheck'),
  },
])

const onboardingDoneCount = computed(() => onboardingItems.value.filter((item) => item.done).length)

watch(onboardingItems, (items) => {
  items.forEach((item) => {
    if (!item.done || item.id === 'export') return
    const key = `${store.activeResumeId}:${item.id}`
    if (trackedCoreFields.has(key)) return
    trackedCoreFields.add(key)
    store.trackProductEvent('resume_core_field_completed', {
      field: item.id,
      resume_id: store.activeResumeId,
    })
  })
}, { deep: true })

const viewTitle: Record<AppView, string> = {
  workspace: 'workspace',
  editor: 'editor',
  documents: 'documentsPage',
  templates: 'templates',
  growth: 'growth',
  pipeline: 'pipeline',
  history: 'history',
  settings: 'settings',
}

const railItems = computed<{ id: AppView; icon: string; label: string; count?: number }[]>(() => [
  { id: 'workspace', icon: '⌂', label: 'workspace' },
  { id: 'editor', icon: '§', label: 'editor' },
  { id: 'documents', icon: '▣', label: 'documentsPage', count: store.documents.length },
  { id: 'templates', icon: '▦', label: 'templates' },
  { id: 'growth', icon: '◇', label: 'growth' },
  { id: 'pipeline', icon: '▤', label: 'pipeline', count: store.applications.length },
  { id: 'history', icon: '↺', label: 'history' },
])

const editorClasses = computed(() => [
  'studio-main',
  `theme-${store.config.tweaks.accent}`,
  `paper-${store.config.tweaks.paper}`,
  `density-${store.config.tweaks.density}`,
  `font-${store.config.tweaks.font}`,
  store.config.tweaks.ruleLines ? 'lines-on' : '',
].filter(Boolean))

const shellClasses = computed(() => [
  'studio-shell',
  `theme-${store.config.studioTheme.accent}`,
  `paper-${store.config.studioTheme.paper}`,
  `density-${store.config.studioTheme.density}`,
  `font-${store.config.studioTheme.font}`,
  store.config.studioTheme.ruleLines ? 'lines-on' : '',
].filter(Boolean))

const editorGridStyle = computed(() => ({
  gridTemplateColumns: [
    store.config.tweaks.showTree ? 'minmax(520px, 0.9fr)' : 'minmax(320px, 0.7fr)',
    'minmax(420px, 1.1fr)',
    '280px',
  ].join(' '),
  fontSize: `${store.config.tweaks.fontScale / 100}rem`,
}))

const currentViewLabel = computed(() => tr(viewTitle[currentView.value]))

function isNarrowViewport() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 720px)').matches
}

function navigate(view: AppView) {
  currentView.value = view
  window.history.replaceState(null, '', `#${view}`)
}

async function focusEditorJdTailoring() {
  await nextTick()
  window.setTimeout(() => {
    const card = editorJdCardRef.value
    if (!card) return
    const block: ScrollLogicalPosition = card.offsetHeight > window.innerHeight ? 'start' : 'center'
    card.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' })
    editorJdAttention.value = true
    window.setTimeout(() => {
      const target = editorJdRole.value.trim() ? editorJdTextRef.value : editorJdRoleRef.value
      target?.focus({ preventScroll: true })
    }, 180)
    window.setTimeout(() => {
      editorJdAttention.value = false
    }, 2200)
  }, 80)
}

function openEditorJdTailoring(options: { silent?: boolean } = {}) {
  navigate('editor')
  if (!options.silent) {
    showToast(l('已打开 JD 定制入口，粘贴岗位 JD 后生成结构化草稿。', 'JD tailoring is open. Paste the job description to generate a structured draft.'), 'info', 3600)
  }
  void focusEditorJdTailoring()
}

async function retrySyncQueue() {
  const ok = await store.retryFailedSyncs()
  const retryLaterCopy = getSyncRetryLaterCopy()
  showToast(
    ok ? l('同步队列已恢复', 'Sync queue restored') : l(retryLaterCopy.zh, retryLaterCopy.en),
    ok ? 'success' : 'info',
    3600,
  )
}

function runNextBestAction(source: 'workspace' | 'editor' = currentView.value === 'editor' ? 'editor' : 'workspace') {
  const action = nextBestAction.value
  store.trackProductEvent('next_action_clicked', {
    kind: action.kind,
    command: action.primaryCommand,
    target_id: action.targetId,
    source,
    view: currentView.value,
  })
  runCommand(action.primaryCommand)
}

function useGrowthEntryForJd(entryId: string) {
  const entry = store.growthEntries.find((item) => item.id === entryId)
  if (!entry || entry.archived) {
    navigate('growth')
    showToast(l('这条职业记忆不可引用，请先确认它仍处于活跃状态。', 'This career memory cannot be referenced. Check that it is still active.'), 'error', 4200)
    return
  }
  editorJdGrowthEntryIds.value = Array.from(new Set([entry.id, ...editorJdGrowthEntryIds.value]))
  openEditorJdTailoring({ silent: true })
  showToast(l(`已引用职业记忆：${entry.title}`, `Career memory selected: ${entry.title}`), 'success', 3600)
}

function handleWelcomeClose(action?: 'demo' | 'blank' | 'import') {
  showWelcome.value = false
  if (action === 'blank') {
    if (isNarrowViewport()) {
      navigate('documents')
      showToast(l('已新建空白简历。手机上可先在简历库确认版本，编辑请切到桌面。', 'Created a blank resume. On mobile, review it in the library and edit on desktop.'), 'info', 4200)
    } else {
      navigate('editor')
      showToast(l('已新建空白简历，请从个人信息开始填写', 'Created a blank resume. Start with personal info.'), 'info', 3500)
      void runOnboardingAction('personal')
    }
  }
}

function handleMobileCommandFallback(command: string) {
  const fallback = getMobileCommandFallback(command, isNarrowViewport())
  if (!fallback) return false

  if (fallback.reason === 'resume-selected' && command.startsWith('resume:')) {
    const selected = store.selectResume(command.slice('resume:'.length))
    navigate(fallback.view)
    showToast(
      selected
        ? l('已选中这份简历。手机上可先在简历库管理版本，编辑和导出请切到桌面继续。', 'Resume selected. Use the library on mobile; continue editing and exporting on desktop.')
        : l('这份简历已归档，请先在简历库恢复。', 'This resume is archived. Restore it from the library first.'),
      'info',
      4200,
    )
    return true
  }

  navigate(fallback.view)
  showToast(
    l(
      '手机上可先在简历库查找和管理版本。编辑、JD 定制、投递和导出请切到桌面继续。',
      'On mobile, use the resume library to find and manage versions. Continue editing, JD tailoring, applications, and export on desktop.',
    ),
    'info',
    4600,
  )
  return true
}

function runCommand(command: string) {
  commandOpen.value = false
  if (handleMobileCommandFallback(command)) return
  if (command === 'new') {
    store.refreshBilling()
    if (!store.canCreateResume) {
      store.trackProductEvent('paywall_viewed', { reason: 'resumes' })
      openPaywall('resumes')
      return
    }
    store.createResume(true)
    if (isNarrowViewport()) {
      navigate('documents')
      showToast(l('已新建空白简历。手机上可先在简历库确认版本，编辑请切到桌面。', 'Created a blank resume. On mobile, review it in the library and edit on desktop.'), 'info', 4200)
    } else {
      showToast(l('已新建空白简历，请从个人信息开始填写', 'Created a blank resume. Start with personal info.'), 'info', 3500)
      void runOnboardingAction('personal')
    }
  } else if (command === 'editor') {
    navigate('editor')
  } else if (command === 'workspace') {
    navigate('workspace')
  } else if (command === 'templates') {
    navigate('templates')
  } else if (command === 'jd') {
    openEditorJdTailoring()
  } else if (command === 'sync:retry') {
    void retrySyncQueue()
  } else if (command.startsWith('onboarding:')) {
    void runOnboardingAction(command.slice('onboarding:'.length) as OnboardingTarget)
  } else if (command.startsWith('resume:')) {
    const selected = store.selectResume(command.slice('resume:'.length))
    if (selected) navigate('editor')
    else {
      navigate('documents')
      showToast(l('这份简历已归档，请先恢复后再编辑。', 'This resume is archived. Restore it before editing.'), 'info', 3600)
    }
  } else if (command.startsWith('application:')) {
    focusedApplicationId.value = command.slice('application:'.length)
    navigate('pipeline')
  } else if (command.startsWith('template:')) {
    store.setTemplate(command.slice('template:'.length) as TemplateId)
    navigate('templates')
  } else if (command.startsWith('growth:')) {
    useGrowthEntryForJd(command.slice('growth:'.length))
  } else if (command === 'documents') {
    navigate('documents')
  } else if (command === 'growth') {
    navigate('growth')
  } else if (command === 'pipeline') {
    navigate('pipeline')
  } else if (command === 'history') {
    navigate('history')
  } else if (command === 'settings') {
    navigate('settings')
  } else if (command === 'export') {
    navigate('editor')
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('resume-export-pdf'))
    }, 80)
  }
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

function openUpgrade() {
  store.trackProductEvent('paywall_viewed', { reason: 'general' })
  openPaywall('general')
}

async function shareCurrentResume() {
  const token = encodeResumeShare({
    v: 1,
    title: store.activeDocument.title,
    data: store.data,
    config: store.config,
    ref: getReferralCode(getDistinctId()),
  })
  const url = buildShareUrl(window.location.origin, token)
  try {
    await navigator.clipboard?.writeText(url)
    showToast(l('分享链接已复制，可只读查看且自带邀请。', 'Share link copied — read-only, with your invite built in.'), 'success', 3600)
  } catch {
    showToast(l('分享链接已生成，请手动复制。', 'Share link ready. Copy it manually.'), 'info', 3600)
  }
  store.trackProductEvent('resume_shared', { resume_id: store.activeResumeId, length: url.length })
}

function captureReferral() {
  if (typeof window === 'undefined') return
  const ref = parseRefParam(window.location.search)
  if (!ref) return
  const seen = localStorage.getItem('resume-referrer')
  if (seen) return
  localStorage.setItem('resume-referrer', ref)
  store.trackProductEvent('referral_captured', { ref })
}

function resetResumeAppearance() {
  store.setThemeColor('#1677FF')
  store.config.fontSize = 14
  showToast(l('简历外观已恢复默认', 'Resume appearance reset'), 'success')
}

function setEditorTemplate(id: TemplateId) {
  store.setTemplate(id)
  showToast(l(`已切换到${t(id)}模板`, `Switched to ${t(id)} template`), 'success')
}

function selectEditorResume(value: Event) {
  const id = value.target instanceof HTMLSelectElement ? value.target.value : ''
  if (!id) return
  if (store.selectResume(id)) {
    showToast(l('已切换编辑简历', 'Editing resume switched'), 'success')
  } else {
    showToast(l('这份简历已归档，请先在简历库恢复。', 'This resume is archived. Restore it from the library first.'), 'info', 3600)
  }
}

async function runOnboardingAction(target: OnboardingTarget) {
  navigate('editor')
  if (target === 'experience' && !store.data.experience.length) store.addExperience()
  if (target === 'skills' && !store.data.skills.length) store.addSkill()
  await nextTick()
  if (target === 'export') {
    window.dispatchEvent(new CustomEvent('resume-export-pdf'))
    return
  }
  const labelByTarget: Record<OnboardingTarget, string> = {
    personal: l('已打开编辑器，请先补个人信息。', 'Editor is open. Add personal info first.'),
    title: l('在个人信息里填写目标岗位。', 'Add your target title in personal info.'),
    summary: l('展开个人简介章节，写 2-3 句岗位定位。', 'Open Summary and add 2-3 sentences.'),
    experience: l('已创建一段工作经历，请补公司、岗位和成果。', 'A role was created. Add company, title, and impact.'),
    skills: l('已创建技能分类，请填关键词。', 'A skill group was created. Add keywords.'),
    export: '',
  }
  showToast(labelByTarget[target], 'info', 3200)
  window.setTimeout(() => {
    editorPanelRef.value?.focusOnboardingTarget(target)
  }, 40)
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
  return text || l('暂无内容', 'No content yet')
}

function previewExperience(items: ResumeData['experience']) {
  if (!items.length) return l('暂无工作经历', 'No experience yet')
  return items
    .slice(0, 2)
    .map((item) => `${item.company || l('未填写公司', 'Untitled company')} · ${item.position || l('未填写岗位', 'Untitled role')}`)
    .join('\n')
}

function previewSkills(items: ResumeData['skills']) {
  if (!items.length) return l('暂无技能', 'No skills yet')
  return items
    .slice(0, 3)
    .map((item) => `${item.category || l('技能', 'Skills')}: ${item.items}`)
    .join('\n')
}

function previewProjects(items: ResumeData['projects']) {
  if (!items.length) return l('暂无项目', 'No projects yet')
  return items
    .slice(0, 2)
    .map((item) => `${item.name || l('未命名项目', 'Untitled project')} · ${item.tech || item.role}`)
    .join('\n')
}

function currentEditorJdSnapshot(role = editorJdRole.value.trim() || store.data.personal.title.trim()) {
  return {
    company: editorJdCompany.value.trim(),
    title: role,
    location: '',
    description: editorJdText.value.trim(),
    requirements: splitBullets(editorJdText.value),
    url: '',
  }
}

function resetEditorJdApplySections(value: boolean) {
  ;(Object.keys(editorJdApplySections) as JdReviewSection[]).forEach((section) => {
    editorJdApplySections[section] = value
  })
}

function toggleEditorJdGrowthEntry(id: string) {
  editorJdGrowthEntryIds.value = editorJdGrowthEntryIds.value.includes(id)
    ? editorJdGrowthEntryIds.value.filter((item) => item !== id)
    : [...editorJdGrowthEntryIds.value, id]
}

async function generateEditorJdDraft() {
  const role = editorJdRole.value.trim() || store.data.personal.title.trim()
  const description = editorJdText.value.trim()
  if (!role || !description) {
    editorJdError.value = l('请至少填写目标岗位和 JD 内容。', 'Add a target role and JD text first.')
    showToast(editorJdError.value, 'error')
    return
  }
  if (!store.data.experience.length) {
    editorJdError.value = l('请先补充至少一段工作经历，再生成定制草稿。', 'Add at least one work experience before generating a draft.')
    showToast(editorJdError.value, 'error', 4200)
    return
  }
  store.refreshBilling()
  if (!store.canGenerateAiDraft) {
    store.trackProductEvent('paywall_viewed', { reason: 'ai' })
    openPaywall('ai')
    return
  }

  editorJdGenerating.value = true
  editorJdError.value = ''
  editorJdDraft.value = null
  const requestId = `front-editor-${Date.now()}`
  store.trackProductEvent('jd_draft_requested', {
    resume_id: store.activeResumeId,
    has_company: Boolean(editorJdCompany.value.trim()),
    jd_length: description.length,
  })
  try {
    const draft = await backendApi.generateAssistantResumeDraft({
      requestId,
      persist: false,
      locale: store.config.locale,
      templateId: store.config.templateId,
      personal: store.data.personal,
      workHistory: store.data.experience.map((item) => ({
        id: item.id,
        company: item.company || l('未填写公司', 'Untitled company'),
        title: item.position || l('未填写岗位', 'Untitled role'),
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
      growthEntries: selectedEditorJdGrowthEntries.value,
      jobDescription: currentEditorJdSnapshot(role),
    })
    editorJdDraft.value = draft
    store.recordAiDraftUsage()
    resetEditorJdApplySections(true)
    store.logActivity({
      type: 'ai',
      tag: 'JD',
      message: 'Generated editor JD-tailored resume draft',
      messageZh: '在编辑器生成 JD 定制简历草稿',
      messageEn: 'Generated editor JD-tailored resume draft',
      meta: `${draft.title} · ${draft.match.score}/100`,
    })
    store.trackProductEvent('jd_draft_generated', {
      request_id: draft.requestId || requestId,
      score: draft.match.score,
      matched_keyword_count: draft.match.matchedKeywords.length,
    })
    showToast(l('已生成 JD 定制草稿', 'JD-tailored draft generated'), 'success')
  } catch (error) {
    editorJdError.value = error instanceof Error ? error.message : String(error)
    showToast(l('生成失败，请确认云端服务已连接', 'Generation failed. Check cloud sync connection.'), 'error', 4200)
  } finally {
    editorJdGenerating.value = false
  }
}

function applyEditorJdDraft() {
  if (!editorJdDraft.value) return
  if (!selectedEditorJdSectionCount.value) {
    showToast(l('请至少选择一个要应用的章节', 'Select at least one section to apply'), 'error')
    return
  }
  const draft = editorJdDraft.value
  store.applyJdDraftSections(draft, editorJdApplySections, editorJdGrowthEntryIds.value)
  showToast(l('已应用所选草稿章节', 'Selected draft sections applied'), 'success')
}

function createApplicationFromEditorJdDraft() {
  if (!editorJdDraft.value) return
  const draft = editorJdDraft.value
  const company = editorJdCompany.value.trim() || l('未填写公司', 'Untitled company')
  const role = editorJdRole.value.trim() || draft.data.personal.title || store.data.personal.title
  const application = store.createApplicationFromJdDraft(draft, {
    company,
    role,
    nextAction: l('评估 JD 定制草稿，决定是否投递', 'Review the JD-tailored draft and decide whether to apply'),
    notes: l('由编辑器 JD 定制草稿创建。', 'Created from the editor JD-tailored draft.'),
    jobDescription: currentEditorJdSnapshot(role),
    growthEntryIds: editorJdGrowthEntryIds.value,
  })
  focusedApplicationId.value = application.id
  navigate('pipeline')
  showToast(l('已创建投递记录并保存 JD 信息', 'Application created with JD details'), 'success')
}

function syncHash() {
  const hash = window.location.hash.replace('#', '') as AppView
  if (hash && viewTitle[hash]) currentView.value = hash
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const isEditingText = target?.matches('input, textarea, select, [contenteditable="true"]')
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    commandOpen.value = !commandOpen.value
  }
  if (!isEditingText && e.key.toLowerCase() === 'e' && !e.metaKey && !e.ctrlKey && currentView.value === 'workspace') {
    navigate('editor')
  }
}

function onPrecheckFocusEvent(event: Event) {
  const target = (event as CustomEvent<{ target?: OnboardingTarget }>).detail?.target
  if (!target || target === 'export') return
  void runOnboardingAction(target)
}

onMounted(() => {
  getDistinctId()
  if (publicShare.value) {
    store.trackProductEvent('public_resume_viewed', { has_ref: Boolean(publicShare.value.ref) })
    return
  }
  syncHash()
  captureReferral()
  void store.connectBackend()
  window.addEventListener('hashchange', syncHash)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resume-focus-onboarding-target', onPrecheckFocusEvent)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncHash)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resume-focus-onboarding-target', onPrecheckFocusEvent)
})
</script>

<template>
  <PublicResumeView v-if="publicShare" :payload="publicShare" />
  <div v-else :class="shellClasses" :data-view="currentView">
    <a class="skip-link" href="#main-content">{{ l('跳到主要内容', 'Skip to main content') }}</a>
    <aside class="studio-rail" aria-label="主导航">
      <div class="rail-mark">R</div>
      <button v-for="item in railItems" :key="item.id"
        class="rail-action"
        :class="{ 'is-active': currentView === item.id }"
        :title="tr(item.label)"
        :aria-label="tr(item.label)"
        :aria-current="currentView === item.id ? 'page' : undefined"
        @click="navigate(item.id)">
        <span>{{ item.icon }}</span>
        <b class="rail-label">{{ tr(item.label) }}</b>
        <small v-if="item.count">{{ item.count }}</small>
      </button>
      <div class="rail-spacer" />
      <button class="rail-action" :class="{ 'is-active': currentView === 'settings' }" :title="t('settings')" :aria-label="t('settings')" :aria-current="currentView === 'settings' ? 'page' : undefined" @click="navigate('settings')">
        <span>⌘</span>
        <b class="rail-label">{{ t('settings') }}</b>
      </button>
    </aside>

    <TopBar
      :current-view="tr(viewTitle[currentView])"
      @navigate="navigate"
      @open-command="commandOpen = true" />

    <section v-if="currentView !== 'documents'" class="mobile-support-panel" aria-labelledby="mobile-support-title">
      <div class="mobile-support-card">
        <span class="mobile-support-eyebrow">{{ l('窄屏模式', 'Narrow screen') }}</span>
        <h1 id="mobile-support-title">{{ l('当前页面需要更宽的工作区', 'This page needs a wider workspace') }}</h1>
        <p>
          {{ l(
            '编辑器、预览和投递工作台是多栏桌面流程。请在平板或桌面继续；手机上可以先进入简历库查找、确认和管理版本。',
            'The editor, preview, and pipeline are multi-column desktop workflows. Continue on a tablet or desktop; on mobile, use the resume library to find and manage versions.',
          ) }}
        </p>
        <dl>
          <div>
            <dt>{{ l('当前页面', 'Current page') }}</dt>
            <dd>{{ currentViewLabel }}</dd>
          </div>
          <div>
            <dt>{{ l('建议宽度', 'Recommended width') }}</dt>
            <dd>≥ 720px</dd>
          </div>
        </dl>
        <div class="mobile-support-actions">
          <button class="btn btn--primary" @click="navigate('documents')">{{ l('打开简历库', 'Open library') }}</button>
          <button class="btn btn--ghost" @click="commandOpen = true">{{ getQuickActionLabel(store.config.locale) }}</button>
        </div>
      </div>
    </section>

    <WorkspacePanel
      v-if="currentView === 'workspace'"
      :next-action="nextBestAction"
      @navigate="navigate"
      @command="runCommand" />

    <main v-else-if="currentView === 'editor'" id="main-content" :class="editorClasses" :style="editorGridStyle">
      <EditorPanel ref="editorPanelRef" :show-tree="store.config.tweaks.showTree" />
      <PreviewPanel />
      <aside class="inspector-panel">
        <div class="inspector-card next-action-card" :class="`next-action-card--${nextBestAction.severity}`">
          <span class="inspector-eyebrow">{{ l('建议下一步', 'Recommended next step') }}</span>
          <strong>{{ nextBestAction.title }}</strong>
          <p>{{ nextBestAction.detail }}</p>
          <button class="btn btn--primary" @click="runNextBestAction('editor')">
            {{ l('继续', 'Continue') }}
          </button>
        </div>

        <div
          ref="editorJdCardRef"
          class="inspector-card editor-jd-card jd-builder"
          :class="{ 'is-attention': editorJdAttention }">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ l('JD 定制草稿', 'JD-tailored draft') }}</span>
            <button :disabled="editorJdGenerating" @click="generateEditorJdDraft">
              {{ editorJdGenerating ? l('生成中', 'Generating') : l('生成', 'Generate') }}
            </button>
          </div>
          <div class="jd-steps" :aria-label="l('JD 定制步骤', 'JD tailoring steps')">
            <span class="on">1 {{ l('粘贴 JD', 'Paste JD') }}</span>
            <span :class="{ on: editorJdGenerating || editorJdDraft }">2 {{ l('查看草稿', 'Review draft') }}</span>
            <span :class="{ on: editorJdDraft }">3 {{ l('应用或记录', 'Apply or log') }}</span>
          </div>
          <div class="jd-builder__grid">
            <input v-model="editorJdCompany" :placeholder="l('目标公司', 'Target company')" />
            <input ref="editorJdRoleRef" v-model="editorJdRole" :placeholder="l('目标岗位', 'Target role')" />
          </div>
          <div v-if="editorJdGrowthEntries.length" class="jd-growth-picker">
            <div class="jd-review__head">
              <span>{{ l('引用职业记忆', 'Reference career memories') }}</span>
              <button class="mini-link" @click="navigate('growth')">{{ l('管理', 'Manage') }}</button>
            </div>
            <button
              v-for="entry in editorJdGrowthEntries"
              :key="entry.id"
              :class="{ on: editorJdGrowthEntryIds.includes(entry.id) }"
              @click="toggleEditorJdGrowthEntry(entry.id)">
              <b>{{ entry.title }}</b>
              <span>{{ entry.metrics || entry.skills.join(' · ') || entry.date }}</span>
            </button>
          </div>
          <textarea
            ref="editorJdTextRef"
            v-model="editorJdText"
            rows="6"
            :placeholder="l('粘贴招聘 JD：职责、要求和关键词会用于生成结构化草稿。', 'Paste the JD: responsibilities, requirements, and keywords will shape a structured draft.')"
            @keydown.meta.enter.prevent="generateEditorJdDraft"
            @keydown.ctrl.enter.prevent="generateEditorJdDraft"></textarea>
          <p v-if="editorJdError" class="form-error">{{ editorJdError }}</p>

          <div v-if="editorJdDraft" class="jd-result">
            <div>
              <strong>{{ editorJdDraft.title }}</strong>
              <span>{{ l('匹配分', 'Match') }} · {{ editorJdDraft.match.score }}/100</span>
              <span>{{ l('命中关键词', 'Matched keywords') }} · {{ editorJdDraft.match.matchedKeywords.slice(0, 8).join(' · ') || l('暂无', 'none') }}</span>
              <span>{{ l('定制方式', 'Tailoring type') }} · <b class="jd-strategy-chip" :class="{ 'is-llm': editorJdDraft.generation.strategy.startsWith('llm') }">{{ editorJdStrategyLabel }}</b></span>
            </div>
            <div class="jd-review">
              <div class="jd-review__head">
                <span>{{ l('选择要应用的章节', 'Choose sections to apply') }}</span>
                <div>
                  <button class="mini-link" @click="resetEditorJdApplySections(true)">{{ l('全选', 'All') }}</button>
                  <button class="mini-link" @click="resetEditorJdApplySections(false)">{{ l('清空', 'None') }}</button>
                </div>
              </div>
              <label v-for="section in editorJdSectionReviews" :key="section.id" class="jd-review__item">
                <input v-model="editorJdApplySections[section.id]" type="checkbox" />
                <span class="jd-review__label">{{ section.label }}</span>
                <span class="jd-review__preview">
                  <em>{{ l('当前', 'Current') }}</em>{{ section.before }}
                  <em>{{ l('草稿', 'Draft') }}</em>{{ section.after }}
                </span>
                <span v-if="editorJdDiffBySection[section.id]" class="jd-review__rationale">
                  {{ editorJdDiffBySection[section.id]!.rationale }}
                  · {{ l('置信度', 'Confidence') }} {{ Math.round(editorJdDiffBySection[section.id]!.confidence * 100) }}%
                </span>
              </label>
            </div>
            <div class="jd-result__actions">
              <button class="btn btn--primary" @click="applyEditorJdDraft">
                {{ l(`应用所选 (${selectedEditorJdSectionCount})`, `Apply selected (${selectedEditorJdSectionCount})`) }}
              </button>
              <button class="btn btn--ghost" @click="createApplicationFromEditorJdDraft">{{ l('创建投递记录', 'Create application') }}</button>
            </div>
          </div>
          <p v-else class="jd-helper">
            {{ l('粘贴岗位 JD 后，可以逐段查看改写差异，再应用到简历或创建投递记录。', 'Paste a JD to review section-level changes, then apply them to the resume or create an application record.') }}
          </p>
        </div>

        <div class="inspector-card export-status-card">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ l('导出状态', 'Export readiness') }}</span>
            <button @click="runOnboardingAction('export')">{{ l('运行预检', 'Run precheck') }}</button>
          </div>
          <strong>{{ store.completeness }}<small>/100</small></strong>
          <div class="score-track">
            <i :style="{ width: `${store.completeness}%` }" />
          </div>
          <p>{{ primaryAdvice }}</p>
          <dl class="compact-list">
            <div>
              <dt>{{ l('本月导出', 'Exports this month') }}</dt>
              <dd>{{ store.isPro ? l('无限', 'Unlimited') : `${store.exportsRemaining} ${l('次剩余', 'left')}` }}</dd>
            </div>
            <div>
              <dt>{{ l('检查重点', 'Check focus') }}</dt>
              <dd>{{ l('联系方式、空章节、分页', 'Contact, empty sections, pages') }}</dd>
            </div>
          </dl>
        </div>

        <div class="inspector-card onboarding-card">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ l('空白简历引导', 'Blank resume guide') }}</span>
            <button @click="runOnboardingAction('export')">{{ onboardingDoneCount }}/{{ onboardingItems.length }}</button>
          </div>
          <div class="onboarding-list">
            <button
              v-for="item in onboardingItems"
              :key="item.id"
              :class="{ done: item.done }"
              @click="runOnboardingAction(item.id)">
              <i>{{ item.done ? '✓' : '·' }}</i>
              <span>{{ item.label }}</span>
              <b>{{ item.done ? l('完成', 'Done') : item.action }}</b>
            </button>
          </div>
        </div>

        <div class="inspector-card plan-card">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ l('套餐与额度', 'Plan & limits') }}</span>
            <b class="plan-chip" :class="{ 'is-pro': store.isPro }">{{ store.isPro ? 'Pro' : l('免费版', 'Free') }}</b>
          </div>
          <dl class="compact-list">
            <div>
              <dt>{{ l('今日 JD 定制', 'JD drafts today') }}</dt>
              <dd>{{ store.isPro ? l('无限', 'Unlimited') : `${store.aiDraftsRemaining} ${l('次剩余', 'left')}` }}</dd>
            </div>
            <div>
              <dt>{{ l('公开分享', 'Public sharing') }}</dt>
              <dd>{{ store.isPro ? l('无水印', 'No watermark') : l('免费版水印', 'Free watermark') }}</dd>
            </div>
          </dl>
          <button v-if="!store.isPro" class="btn btn--primary plan-card__cta" @click="openUpgrade">
            {{ l('升级到 Pro', 'Upgrade to Pro') }}
          </button>
        </div>

        <div class="inspector-card resume-template-card">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ t('templates') }}</span>
            <button @click="navigate('templates')">{{ l('查看全部', 'All') }}</button>
          </div>
          <div class="inspector-template-list">
            <button v-for="template in templates" :key="template.id"
              class="inspector-template-option"
              :class="{ on: store.config.templateId === template.id }"
              @click="setEditorTemplate(template.id)">
              <TemplateThumbnail :type="template.id" :color="store.config.themeColor" />
              <span>
                <b>{{ t(template.id) }}</b>
                <small>{{ t(templateDescKey(template.id)) }}</small>
              </span>
            </button>
          </div>
        </div>

        <div class="inspector-card">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ t('documentsPage') }}</span>
            <button @click="navigate('documents')">{{ l('管理', 'Manage') }}</button>
          </div>
          <label class="inspector-field">
            <span>{{ l('当前编辑简历', 'Current resume') }}</span>
            <select :value="store.activeResumeId" @change="selectEditorResume">
              <option v-for="doc in editableDocuments" :key="doc.id" :value="doc.id">
                {{ doc.title }}
              </option>
            </select>
          </label>
          <button class="btn btn--ghost inspector-share-btn" @click="shareCurrentResume">
            {{ l('复制公开分享链接', 'Copy public share link') }}
          </button>
        </div>

        <div class="inspector-card resume-style-card">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ l('简历风格', 'Resume style') }}</span>
            <button @click="resetResumeAppearance">{{ l('重置', 'Reset') }}</button>
          </div>
          <label class="inspector-field">
            <span>{{ t('themeColor') }}</span>
            <input type="color" :value="store.config.themeColor" @input="(e) => store.setThemeColor((e.target as HTMLInputElement).value)" />
          </label>
          <div class="inspector-swatches">
            <button v-for="color in resumeColorPresets" :key="color.hex"
              :class="{ on: store.config.themeColor.toLowerCase() === color.hex.toLowerCase() }"
              :style="{ background: color.hex }"
              :title="getResumeColorLabel(color, store.config.locale)"
              @click="store.setThemeColor(color.hex)"></button>
          </div>
          <label class="inspector-field">
            <span>{{ t('fontSize') }}</span>
            <input type="range" min="12" max="18" :value="store.config.fontSize"
              @input="(e) => store.setResumeFontSize(Number((e.target as HTMLInputElement).value))" />
            <small>{{ store.config.fontSize }}px</small>
          </label>
          <div class="resume-mini-preview">
            <b :style="{ color: store.config.themeColor }">{{ store.data.personal.name || l('你的姓名', 'Your name') }}</b>
            <i :style="{ background: store.config.themeColor }"></i>
            <span>{{ l('影响预览和 PDF', 'Preview and PDF only') }}</span>
          </div>
        </div>

        <div class="inspector-card">
          <span class="inspector-eyebrow">{{ t('workspace') }}</span>
          <dl class="compact-list">
            <div>
              <dt>{{ t('templates') }}</dt>
              <dd>{{ store.config.templateId }}</dd>
            </div>
            <div>
              <dt>{{ t('visibleSections') }}</dt>
              <dd>{{ activeSections }}</dd>
            </div>
            <div>
              <dt>{{ t('themeColor') }}</dt>
              <dd>
                <span class="color-dot" :style="{ background: store.config.themeColor }" />
                {{ store.config.themeColor }}
              </dd>
            </div>
          </dl>
        </div>

      </aside>
      <button class="tweaks-fab" @click="editorTweaksOpen = true" :aria-label="getEditorSettingsLauncherLabel(store.config.locale)">
        {{ getEditorSettingsLauncherLabel(store.config.locale) }}
        <span class="ind"></span>
      </button>
    </main>

    <main v-else class="studio-utility">
      <WorkspacePanel
        :mode="currentView"
        :focus-application-id="focusedApplicationId"
        :next-action="nextBestAction"
        @navigate="navigate"
        @command="runCommand" />
    </main>

    <CommandPalette
      :open="commandOpen"
      @close="commandOpen = false"
      @command="runCommand" />
    <TweaksPanel
      :open="editorTweaksOpen"
      @close="editorTweaksOpen = false" />
    <ToastContainer />
    <UpgradeDialog />
    <WelcomeDialog v-if="showWelcome" @close="handleWelcomeClose" />
  </div>
</template>
