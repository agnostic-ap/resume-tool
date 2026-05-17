<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { TemplateId } from '../types/resume'
import { showToast } from '../composables/toast'
import ConfirmDialog from './ConfirmDialog.vue'
import TemplateThumbnail from './TemplateThumbnail.vue'

defineProps<{ currentView: string }>()
const emit = defineEmits<{
  navigate: ['workspace' | 'editor' | 'templates' | 'assistant' | 'pipeline' | 'history' | 'settings']
  openCommand: []
  openTweaks: []
}>()

const store = useResumeStore()
const fileInput = ref<HTMLInputElement>()

// ── Auto-save indicator ──────────────────────────────────────
const saved = ref(true)
watch(() => store.data, () => { saved.value = false }, { deep: true })
watch(saved, (v) => { if (!v) setTimeout(() => (saved.value = true), 600) })

// ── Template picker popover ──────────────────────────────────
const showTemplatePicker = ref(false)
const templatePickerRef = ref<HTMLElement>()

const templates: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'classic',  label: '经典',   desc: '简洁·全页' },
  { id: 'modern',   label: '现代',   desc: '双栏·标题色块' },
  { id: 'sidebar',  label: '侧边栏', desc: '色彩·个性' },
]

function closePicker(e: MouseEvent) {
  if (!templatePickerRef.value?.contains(e.target as Node)) {
    showTemplatePicker.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', closePicker))
onUnmounted(() => document.removeEventListener('mousedown', closePicker))

// ── Theme colors ─────────────────────────────────────────────
const presetColors = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#374151', '#9f1239',
]

// ── Confirm dialog ────────────────────────────────────────────
type ConfirmAction = 'clearAll' | 'resetDemo'
const confirmVisible = ref(false)
const confirmAction = ref<ConfirmAction>('clearAll')
const confirmMeta = {
  clearAll:  { title: '新建空白简历', message: '当前内容将被清空，无法撤销。确认继续？', danger: true },
  resetDemo: { title: '重置为示例数据', message: '当前内容将被示例数据覆盖，无法撤销。确认继续？', danger: true },
}

function askConfirm(action: ConfirmAction) {
  confirmAction.value = action
  confirmVisible.value = true
}

function onConfirm() {
  confirmVisible.value = false
  if (confirmAction.value === 'clearAll') {
    store.clearAll()
    showToast('已新建空白简历，请从个人信息开始填写', 'info', 3500)
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
  a.download = `${store.data.personal.name || '我的简历'}-backup.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast('数据已备份到本地', 'success')
}

function handleImportClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.name.endsWith('.json')) {
    showToast('请选择 .json 格式的备份文件', 'error')
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

    <nav class="topbar-crumbs" aria-label="当前位置">
      <button class="crumb-link" @click="emit('navigate', 'workspace')">workspace</button>
      <span class="sep">/</span>
      <strong>{{ store.data.personal.name || '未命名简历' }}</strong>
      <span class="status-badge">{{ templates.find(t => t.id === store.config.templateId)?.label }}</span>
      <span class="status-badge">{{ currentView }}</span>
      <span class="status-badge">v1.0</span>
    </nav>

    <button class="topbar-button command-trigger" @click="emit('openCommand')">
      <span>⌕</span>
      命令
      <kbd>⌘K</kbd>
    </button>

    <button class="topbar-button" @click="emit('openTweaks')">
      <span>⌘</span>
      Tweaks
    </button>

    <button @click="askConfirm('clearAll')"
      class="topbar-button">
      <span>＋</span>
      新建
    </button>

    <div ref="templatePickerRef" class="template-menu">
      <button @click="showTemplatePicker = !showTemplatePicker"
        class="topbar-button">
        <span>▦</span>
        <span class="font-semibold">{{ templates.find(t => t.id === store.config.templateId)?.label }}</span>
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
              <strong>{{ t.label }}</strong>
              <small>{{ t.desc }}</small>
            </div>
          </button>
        </div>
      </Transition>
    </div>

    <div class="theme-picker">
      <span>主题色</span>
      <div class="swatches">
        <button v-for="color in presetColors" :key="color" @click="store.setThemeColor(color)"
          class="swatch"
          :style="{ background: color }"
          :class="{ active: store.config.themeColor === color }" />
      </div>
      <input type="color" :value="store.config.themeColor"
        @input="(e) => store.setThemeColor((e.target as HTMLInputElement).value)"
        class="color-input" title="自定义颜色" />
    </div>

    <div class="save-state" :class="{ pending: !saved }">
      <i />
      <span>{{ saved ? 'Saved' : 'Saving' }}</span>
    </div>

    <div class="topbar-actions">
      <button @click="handleImportClick"
        class="topbar-button">
        <span>↥</span>
        导入
      </button>
      <button @click="handleExportJSON"
        class="topbar-button">
        <span>↧</span>
        备份
      </button>
      <button @click="askConfirm('resetDemo')"
        class="topbar-link">
        重置示例
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
