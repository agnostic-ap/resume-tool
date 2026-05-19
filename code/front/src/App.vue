<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
import type { TemplateId } from './types/resume'

type AppView = 'workspace' | 'editor' | 'templates' | 'assistant' | 'pipeline' | 'history' | 'settings'

const store = useResumeStore()
const { t } = useI18n()
const { l } = useLocaleText()
const tr = (key: string) => t(key as never)
const showWelcome = ref(!localStorage.getItem('resume-visited'))
const currentView = ref<AppView>('workspace')
const commandOpen = ref(false)
const editorTweaksOpen = ref(false)

const resumeColorPresets = [
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

const viewTitle: Record<AppView, string> = {
  workspace: 'workspace',
  editor: 'editor',
  templates: 'templates',
  assistant: 'assistant',
  pipeline: 'pipeline',
  history: 'history',
  settings: 'settings',
}

const railItems = computed<{ id: AppView; icon: string; label: string; count?: number }[]>(() => [
  { id: 'workspace', icon: '⌂', label: 'workspace' },
  { id: 'editor', icon: '§', label: 'editor' },
  { id: 'templates', icon: '▦', label: 'templates' },
  { id: 'assistant', icon: '✦', label: 'assistant' },
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
    navigate('assistant')
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

function resetResumeAppearance() {
  store.setThemeColor('#C65A3A')
  store.config.fontSize = 14
  showToast(l('简历外观已恢复默认', 'Resume appearance reset'), 'success')
}

function setEditorTemplate(id: TemplateId) {
  store.setTemplate(id)
  showToast(l(`已切换到${t(id)}模板`, `Switched to ${t(id)} template`), 'success')
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
                <small>{{ t(`${template.id}Desc` as 'classicDesc' | 'modernDesc' | 'sidebarDesc') }}</small>
              </span>
            </button>
          </div>
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
