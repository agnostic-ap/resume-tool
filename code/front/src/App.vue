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
import { useResumeStore } from './stores/resume'
import { showToast } from './composables/toast'

type AppView = 'workspace' | 'editor' | 'templates' | 'assistant' | 'pipeline' | 'history' | 'settings'

const store = useResumeStore()
const showWelcome = ref(!localStorage.getItem('resume-visited'))
const currentView = ref<AppView>('workspace')
const commandOpen = ref(false)
const tweaksOpen = ref(false)

const activeSections = computed(() =>
  store.config.sectionOrder.filter((id) => store.config.sectionVisible[id]).length,
)

const primaryAdvice = computed(() => {
  if (!store.data.personal.summary.trim()) return '先补一段 2-3 句的个人简介，预览页会立刻更完整。'
  if (!store.data.experience.length) return '加入最近一段工作经历，让简历主体更可信。'
  if (!store.data.projects.length) return '补充一个能体现结果的项目，建议写清技术栈和量化成果。'
  if (store.completeness < 90) return '继续补齐隐藏或空白章节，导出前建议把完整度推到 90 以上。'
  return '内容结构已经很稳，导出前只需要检查分页线和主题色。'
})

const viewTitle: Record<AppView, string> = {
  workspace: 'Overview',
  editor: 'Editor',
  templates: 'Templates',
  assistant: 'AI Studio',
  pipeline: 'Pipeline',
  history: 'History',
  settings: 'Settings',
}

const railItems: { id: AppView; icon: string; label: string; count?: number }[] = [
  { id: 'workspace', icon: '⌂', label: 'Overview' },
  { id: 'editor', icon: '§', label: 'Editor' },
  { id: 'templates', icon: '▦', label: 'Templates' },
  { id: 'assistant', icon: '✦', label: 'AI Studio' },
  { id: 'pipeline', icon: '▤', label: 'Pipeline', count: 6 },
  { id: 'history', icon: '↺', label: 'History' },
]

const editorClasses = computed(() => [
  'studio-main',
  `theme-${store.config.tweaks.accent}`,
  `paper-${store.config.tweaks.paper}`,
  `density-${store.config.tweaks.density}`,
  `font-${store.config.tweaks.font}`,
  store.config.tweaks.ruleLines ? 'lines-on' : '',
].filter(Boolean))

const editorGridStyle = computed(() => ({
  gridTemplateColumns: [
    store.config.tweaks.showTree ? 'minmax(520px, 0.9fr)' : 'minmax(320px, 0.7fr)',
    'minmax(420px, 1.1fr)',
    store.config.tweaks.showAI ? '280px' : '0px',
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
    store.clearAll()
    navigate('editor')
    showToast('已新建空白简历，请从个人信息开始填写', 'info', 3500)
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
  } else if (command === 'export') {
    navigate('editor')
    showToast('请在预览区点击“下载 PDF”导出当前简历', 'info', 3500)
  }
}

function syncHash() {
  const hash = window.location.hash.replace('#', '') as AppView
  if (hash && viewTitle[hash]) currentView.value = hash
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    commandOpen.value = !commandOpen.value
  }
  if (e.key.toLowerCase() === 'e' && !e.metaKey && !e.ctrlKey && currentView.value === 'workspace') {
    navigate('editor')
  }
}

onMounted(() => {
  syncHash()
  window.addEventListener('hashchange', syncHash)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncHash)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="studio-shell">
    <aside class="studio-rail" aria-label="主导航">
      <div class="rail-mark">R</div>
      <button v-for="item in railItems" :key="item.id"
        class="rail-action"
        :class="{ 'is-active': currentView === item.id }"
        :title="item.label"
        @click="navigate(item.id)">
        <span>{{ item.icon }}</span>
        <small v-if="item.count">{{ item.count }}</small>
      </button>
      <div class="rail-spacer" />
      <button class="rail-action" :class="{ 'is-active': currentView === 'settings' }" title="设置" @click="navigate('settings')">
        <span>⌘</span>
      </button>
    </aside>

    <TopBar
      :current-view="viewTitle[currentView]"
      @navigate="navigate"
      @open-command="commandOpen = true"
      @open-tweaks="tweaksOpen = true" />

    <WorkspacePanel
      v-if="currentView === 'workspace'"
      @navigate="navigate"
      @command="runCommand" />

    <main v-else-if="currentView === 'editor'" :class="editorClasses" :style="editorGridStyle">
      <EditorPanel :show-tree="store.config.tweaks.showTree" />
      <PreviewPanel />
      <aside v-if="store.config.tweaks.showAI" class="inspector-panel">
        <div class="inspector-card score-card">
          <span class="inspector-eyebrow">Match score</span>
          <strong>{{ store.completeness }}<small>/100</small></strong>
          <div class="score-track">
            <i :style="{ width: `${store.completeness}%` }" />
          </div>
          <p>{{ primaryAdvice }}</p>
        </div>

        <div class="inspector-card">
          <span class="inspector-eyebrow">Workspace</span>
          <dl class="compact-list">
            <div>
              <dt>模板</dt>
              <dd>{{ store.config.templateId }}</dd>
            </div>
            <div>
              <dt>可见章节</dt>
              <dd>{{ activeSections }}</dd>
            </div>
            <div>
              <dt>主题色</dt>
              <dd>
                <span class="color-dot" :style="{ background: store.config.themeColor }" />
                {{ store.config.themeColor }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="inspector-card note-card">
          <span class="inspector-eyebrow">Before export</span>
          <ul>
            <li>每条经历使用动词开头</li>
            <li>优先保留有数字结果的项目</li>
            <li>控制在 1 页时投递转化更稳定</li>
          </ul>
        </div>
      </aside>
      <button class="tweaks-fab" @click="tweaksOpen = true" aria-label="Open Tweaks">
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
      :open="tweaksOpen"
      @close="tweaksOpen = false" />
    <ToastContainer />
    <WelcomeDialog v-if="showWelcome" @close="showWelcome = false" />
  </div>
</template>
