<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import TopBar from './components/TopBar.vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ToastContainer from './components/ToastContainer.vue'
import WelcomeDialog from './components/WelcomeDialog.vue'
import WorkspacePanel from './components/WorkspacePanel.vue'
import CommandPalette from './components/CommandPalette.vue'
import TweaksPanel from './components/TweaksPanel.vue'
import TemplateThumbnail from './components/TemplateThumbnail.vue'
import { useResumeStore } from './stores/resume'
import { showToast } from './composables/toast'
import { useI18n } from './i18n'
import { useLocaleText } from './composables/useLocaleText'
import { backendApi, type PlatformResumeDraft } from './api/backend'
import type { ResumeData, TemplateId } from './types/resume'

type AppView = 'workspace' | 'editor' | 'documents' | 'templates' | 'growth' | 'pipeline' | 'history' | 'settings'
type JdReviewSection = 'summary' | 'experience' | 'skills' | 'projects'
type OnboardingTarget = 'personal' | 'title' | 'summary' | 'experience' | 'skills' | 'export'

const store = useResumeStore()
const { t } = useI18n()
const { l } = useLocaleText()
const tr = (key: string) => t(key as never)
const showWelcome = ref(!localStorage.getItem('resume-visited'))
const currentView = ref<AppView>('workspace')
const commandOpen = ref(false)
const editorTweaksOpen = ref(false)
const editorJdCompany = ref('')
const editorJdRole = ref('')
const editorJdText = ref('')
const editorJdGenerating = ref(false)
const editorJdDraft = ref<PlatformResumeDraft | null>(null)
const editorJdError = ref('')
const editorJdApplySections = reactive<Record<JdReviewSection, boolean>>({
  summary: true,
  experience: true,
  skills: true,
  projects: true,
})

const resumeColorPresets = [
  { hex: '#3E7891', label: 'Ocean' },
  { hex: '#6F8A78', label: 'Sage' },
  { hex: '#C65A3A', label: 'Terracotta' },
  { hex: '#6F7F45', label: 'Olive' },
  { hex: '#31566A', label: 'Deep teal' },
  { hex: '#8F4F3F', label: 'Cedar' },
  { hex: '#3A2A22', label: 'Walnut' },
]

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

function navigate(view: AppView) {
  currentView.value = view
  window.history.replaceState(null, '', `#${view}`)
}

function runCommand(command: string) {
  commandOpen.value = false
  if (command === 'new') {
    store.createResume(true)
    navigate('editor')
    showToast(l('已新建空白简历，请从个人信息开始填写', 'Created a blank resume. Start with personal info.'), 'info', 3500)
  } else if (command === 'editor') {
    navigate('editor')
  } else if (command === 'workspace') {
    navigate('workspace')
  } else if (command === 'templates') {
    navigate('templates')
  } else if (command === 'assistant') {
    navigate('editor')
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

function resetResumeAppearance() {
  store.setThemeColor('#3E7891')
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
  store.selectResume(id)
  showToast(l('已切换编辑简历', 'Editing resume switched'), 'success')
}

function runOnboardingAction(target: OnboardingTarget) {
  if (target === 'experience' && !store.data.experience.length) store.addExperience()
  if (target === 'skills' && !store.data.skills.length) store.addSkill()
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
  document.querySelector('.editor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  editorJdGenerating.value = true
  editorJdError.value = ''
  editorJdDraft.value = null
  try {
    const draft = await backendApi.generateAssistantResumeDraft({
      requestId: `front-editor-${Date.now()}`,
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
      jobDescription: currentEditorJdSnapshot(role),
    })
    editorJdDraft.value = draft
    resetEditorJdApplySections(true)
    store.logActivity({
      type: 'ai',
      tag: 'JD',
      message: 'Generated editor JD-tailored resume draft',
      messageZh: '在编辑器生成 JD 定制简历草稿',
      messageEn: 'Generated editor JD-tailored resume draft',
      meta: `${draft.title} · ${draft.match.score}/100`,
    })
    showToast(l('已生成 JD 定制草稿', 'JD-tailored draft generated'), 'success')
  } catch (error) {
    editorJdError.value = error instanceof Error ? error.message : String(error)
    showToast(l('生成失败，请确认后端已连接', 'Generation failed. Check backend connection.'), 'error', 4200)
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
  store.data = {
    ...store.data,
    personal: {
      ...store.data.personal,
      summary: editorJdApplySections.summary ? draft.data.personal.summary : store.data.personal.summary,
    },
    experience: editorJdApplySections.experience ? draft.data.experience : store.data.experience,
    skills: editorJdApplySections.skills ? draft.data.skills : store.data.skills,
    projects: editorJdApplySections.projects ? draft.data.projects : store.data.projects,
  }
  draft.generation.appliedAt = new Date().toISOString()
  store.logActivity({
    type: 'ai',
    tag: 'JD',
    message: 'Applied selected editor JD-tailored sections',
    messageZh: '采纳编辑器 JD 定制草稿的所选章节',
    messageEn: 'Applied selected editor JD-tailored sections',
    meta: `${draft.requestId || 'local-request'} · ${selectedEditorJdSectionCount.value} sections · ${draft.match.score}/100`,
  })
  showToast(l('已应用所选草稿章节', 'Selected draft sections applied'), 'success')
}

function createApplicationFromEditorJdDraft() {
  if (!editorJdDraft.value) return
  const draft = editorJdDraft.value
  const company = editorJdCompany.value.trim() || l('未填写公司', 'Untitled company')
  const role = editorJdRole.value.trim() || draft.data.personal.title || store.data.personal.title
  const created = store.addApplication({
    company,
    role,
    stage: 'saved',
    resumeId: store.activeResumeId,
    match: draft.match.score,
    appliedAt: '',
    nextAction: l('评估 JD 定制草稿，决定是否投递', 'Review the JD-tailored draft and decide whether to apply'),
    followUpAt: '',
    contactName: '',
    contactEmail: '',
    jobPostUrl: '',
    notes: l('由编辑器 JD 定制草稿创建。', 'Created from the editor JD-tailored draft.'),
    jobDescription: currentEditorJdSnapshot(role),
    tailoring: {
      requestId: draft.requestId || '',
      sourceResumeId: store.activeResumeId,
      draftTitle: draft.title,
      matchScore: draft.match.score,
      matchedKeywords: draft.match.matchedKeywords,
      selectedExperienceIds: draft.match.selectedExperienceIds,
      strategy: draft.generation.strategy,
      generatedAt: draft.generation.generatedAt,
      appliedAt: draft.generation.appliedAt,
    },
  })
  store.logActivity({
    type: 'application',
    tag: 'JD',
    message: 'Created application from editor JD-tailored draft',
    messageZh: '从编辑器 JD 定制草稿创建投递记录',
    messageEn: 'Created application from editor JD-tailored draft',
    meta: `${created.company} · ${created.match}`,
    resumeId: created.resumeId,
  })
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

onMounted(() => {
  syncHash()
  void store.connectBackend()
  window.addEventListener('hashchange', syncHash)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncHash)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div :class="shellClasses">
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

    <WorkspacePanel
      v-if="currentView === 'workspace'"
      @navigate="navigate"
      @command="runCommand" />

    <main v-else-if="currentView === 'editor'" id="main-content" :class="editorClasses" :style="editorGridStyle">
      <EditorPanel :show-tree="store.config.tweaks.showTree" />
      <PreviewPanel />
      <aside class="inspector-panel">
        <div v-if="store.config.tweaks.showAI" class="inspector-card score-card">
          <span class="inspector-eyebrow">{{ t('matchScore') }}</span>
          <strong>{{ store.completeness }}<small>/100</small></strong>
          <div class="score-track">
            <i :style="{ width: `${store.completeness}%` }" />
          </div>
          <p>{{ primaryAdvice }}</p>
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

        <div v-if="store.config.tweaks.showAI" class="inspector-card editor-jd-card jd-builder">
          <div class="inspector-card__head">
            <span class="inspector-eyebrow">{{ l('JD 定制草稿', 'JD-tailored draft') }}</span>
            <button :disabled="editorJdGenerating" @click="generateEditorJdDraft">
              {{ editorJdGenerating ? l('生成中', 'Generating') : l('生成', 'Generate') }}
            </button>
          </div>
          <div class="jd-builder__grid">
            <input v-model="editorJdCompany" :placeholder="l('目标公司', 'Target company')" />
            <input v-model="editorJdRole" :placeholder="l('目标岗位', 'Target role')" />
          </div>
          <textarea
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
              <span>{{ l('生成策略', 'Strategy') }} · {{ editorJdDraft.generation.strategy }}</span>
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
            {{ l('这是结构化 JD 定制入口。AI 开关关闭时，本卡片会一起隐藏。', 'This is the structured JD tailoring flow. It follows the same AI visibility toggle.') }}
          </p>
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
              <option v-for="doc in store.documents" :key="doc.id" :value="doc.id">
                {{ doc.title }}{{ doc.archived ? l('（已归档）', ' (archived)') : '' }}
              </option>
            </select>
          </label>
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
              :title="color.label"
              @click="store.setThemeColor(color.hex)"></button>
          </div>
          <label class="inspector-field">
            <span>{{ t('fontSize') }}</span>
            <input type="range" min="12" max="18" :value="store.config.fontSize"
              @input="(e) => store.config.fontSize = Number((e.target as HTMLInputElement).value)" />
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

        <div v-if="store.config.tweaks.showAI" class="inspector-card note-card">
          <span class="inspector-eyebrow">{{ t('beforeExport') }}</span>
          <ul>
            <li>{{ t('noteVerb') }}</li>
            <li>{{ t('noteNumbers') }}</li>
            <li>{{ t('noteOnePage') }}</li>
          </ul>
        </div>
      </aside>
      <button class="tweaks-fab" @click="editorTweaksOpen = true" aria-label="Open editor tweaks">
        Tw
        <span class="ind"></span>
      </button>
    </main>

    <main v-else class="studio-utility">
      <WorkspacePanel
        :mode="currentView"
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
    <WelcomeDialog v-if="showWelcome" @close="showWelcome = false" />
  </div>
</template>
