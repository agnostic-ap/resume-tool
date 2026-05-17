<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { TemplateId } from '../types/resume'
import { showToast } from '../composables/toast'
import ConfirmDialog from './ConfirmDialog.vue'
import TemplateThumbnail from './TemplateThumbnail.vue'
import { useI18n } from '../i18n'
import { useLocaleText } from '../composables/useLocaleText'

defineProps<{ currentView: string }>()
const emit = defineEmits<{
  navigate: ['workspace' | 'editor' | 'templates' | 'assistant' | 'pipeline' | 'history' | 'settings']
  openCommand: []
}>()

const store = useResumeStore()
const { t } = useI18n()
const { l } = useLocaleText()
const fileInput = ref<HTMLInputElement>()

// ── Auto-save indicator ──────────────────────────────────────
const saved = ref(true)
watch(() => store.data, () => { saved.value = false }, { deep: true })
watch(saved, (v) => { if (!v) setTimeout(() => (saved.value = true), 600) })

const syncLabel = computed(() => {
  if (store.backendStatus.connecting) return l('连接中', 'Connecting')
  if (store.backendStatus.online) return l('云端同步', 'Synced')
  return l('本地模式', 'Local')
})

const syncTitle = computed(() => {
  if (store.backendStatus.online) return l(`已连接 ${store.backendStatus.baseUrl}`, `Connected to ${store.backendStatus.baseUrl}`)
  return store.backendStatus.error
    ? l(`后端不可用：${store.backendStatus.error}`, `Backend unavailable: ${store.backendStatus.error}`)
    : l('后端不可用，数据会保存在本地', 'Backend unavailable. Data is saved locally.')
})

async function reconnectBackend() {
  const ok = await store.connectBackend()
  showToast(
    ok ? l('已连接后端同步', 'Backend sync connected') : l('后端仍不可用，继续使用本地模式', 'Backend still unavailable. Continuing locally.'),
    ok ? 'success' : 'info',
    3200,
  )
}

// ── Template picker popover ──────────────────────────────────
const showTemplatePicker = ref(false)
const templatePickerRef = ref<HTMLElement>()

const templates: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'classic',  label: '经典',   desc: '简洁·全页' },
  { id: 'modern',   label: '现代',   desc: '双栏·标题色块' },
  { id: 'sidebar',  label: '侧边栏', desc: '色彩·个性' },
]

function templateLabel(id: TemplateId) {
  return t(id)
}

function templateDesc(id: TemplateId) {
  return t(`${id}Desc` as 'classicDesc' | 'modernDesc' | 'sidebarDesc')
}

function closePicker(e: MouseEvent) {
  if (!templatePickerRef.value?.contains(e.target as Node)) {
    showTemplatePicker.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', closePicker))
onUnmounted(() => document.removeEventListener('mousedown', closePicker))

// ── Confirm dialog ────────────────────────────────────────────
type ConfirmAction = 'clearAll' | 'resetDemo'
const confirmVisible = ref(false)
const confirmAction = ref<ConfirmAction>('clearAll')
const confirmMeta = computed(() => ({
  clearAll: {
    title: l('新建空白简历', 'Create blank resume'),
    message: l('当前内容将被清空，无法撤销。确认继续？', 'The current content will be cleared and cannot be undone. Continue?'),
    danger: true,
  },
  resetDemo: {
    title: l('重置为示例数据', 'Reset to demo data'),
    message: l('当前内容将被示例数据覆盖，无法撤销。确认继续？', 'The current content will be overwritten with demo data and cannot be undone. Continue?'),
    danger: true,
  },
}))

function askConfirm(action: ConfirmAction) {
  confirmAction.value = action
  confirmVisible.value = true
}

function onConfirm() {
  confirmVisible.value = false
  if (confirmAction.value === 'clearAll') {
    store.createResume(true)
    showToast(l('已新建空白简历，请从个人信息开始填写', 'Created a blank resume. Start with personal info.'), 'info', 3500)
    emit('navigate', 'editor')
  } else {
    store.resetToDefault()
  }
}

// ── Data import/export ────────────────────────────────────────
function handleExportJSON() {
  const json = store.exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.data.personal.name || l('我的简历', 'my-resume')}-backup.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast(l('数据已备份到本地', 'Backup saved locally'), 'success')
}

function handleImportClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.name.endsWith('.json')) {
    showToast(l('请选择 .json 格式的备份文件', 'Choose a .json backup file'), 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => store.importData(ev.target?.result as string)
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <header class="studio-topbar">
    <div class="topbar-brand">
      <div class="brand-logo">R</div>
      <div class="brand-copy">
        <strong>Resume</strong>
        <span>STUDIO</span>
      </div>
    </div>

    <div class="locale-switch">
      <button :class="{ on: store.config.locale === 'zh-CN' }" @click="store.setLocale('zh-CN')">中</button>
      <button :class="{ on: store.config.locale === 'en-US' }" @click="store.setLocale('en-US')">EN</button>
    </div>

    <nav class="topbar-crumbs" :aria-label="l('当前位置', 'Current location')">
      <button class="crumb-link" @click="emit('navigate', 'workspace')">{{ t('workspace') }}</button>
      <span class="sep">/</span>
      <strong>{{ store.data.personal.name || l('未命名简历', 'Untitled resume') }}</strong>
      <span class="status-badge">{{ templateLabel(store.config.templateId) }}</span>
      <span class="status-badge">{{ currentView }}</span>
      <span class="status-badge">v1.0</span>
    </nav>

    <button class="topbar-button command-trigger" @click="emit('openCommand')">
      <span>⌕</span>
      {{ t('command') }}
      <kbd>⌘K</kbd>
    </button>

    <button @click="askConfirm('clearAll')"
      class="topbar-button">
      <span>＋</span>
      {{ t('newResume') }}
    </button>

    <div ref="templatePickerRef" class="template-menu">
      <button @click="showTemplatePicker = !showTemplatePicker"
        class="topbar-button">
        <span>▦</span>
        <span class="font-semibold">{{ templateLabel(store.config.templateId) }}</span>
        <span class="caret">▾</span>
      </button>

      <Transition name="fade">
        <div v-if="showTemplatePicker"
          class="template-popover">
          <button v-for="t in templates" :key="t.id"
            @click="store.setTemplate(t.id); showTemplatePicker = false"
            class="template-option"
            :class="{ active: store.config.templateId === t.id }">
            <TemplateThumbnail :type="t.id" :color="store.config.themeColor" />
            <div>
              <strong>{{ templateLabel(t.id) }}</strong>
              <small>{{ templateDesc(t.id) }}</small>
            </div>
          </button>
        </div>
      </Transition>
    </div>

    <div class="save-state" :class="{ pending: !saved }">
      <i />
      <span>{{ saved ? t('saved') : t('saving') }}</span>
    </div>

    <button class="sync-state"
      :class="{ online: store.backendStatus.online, pending: store.backendStatus.connecting }"
      :title="syncTitle"
      @click="reconnectBackend">
      <i />
      <span>{{ syncLabel }}</span>
    </button>

    <div class="topbar-actions">
      <button @click="handleImportClick"
        class="topbar-button">
        <span>↥</span>
        {{ t('import') }}
      </button>
      <button @click="handleExportJSON"
        class="topbar-button">
        <span>↧</span>
        {{ t('backup') }}
      </button>
      <button @click="askConfirm('resetDemo')"
        class="topbar-link">
        {{ t('resetDemo') }}
      </button>
    </div>

    <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileChange" />
  </header>

  <!-- Confirm Dialog -->
  <ConfirmDialog v-if="confirmVisible"
    :title="confirmMeta[confirmAction].title"
    :message="confirmMeta[confirmAction].message"
    :danger="confirmMeta[confirmAction].danger"
    @confirm="onConfirm"
    @cancel="confirmVisible = false" />
</template>
