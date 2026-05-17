<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { TemplateId } from '../types/resume'
import { showToast } from '../composables/toast'
import ConfirmDialog from './ConfirmDialog.vue'
import TemplateThumbnail from './TemplateThumbnail.vue'

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
  if (confirmAction.value === 'clearAll') store.clearAll()
  else store.resetToDefault()
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
  <header class="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-4 shrink-0 overflow-x-auto">
    <!-- Logo -->
    <div class="flex items-center gap-2 shrink-0">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm"
        style="background:#2563eb;">简</div>
      <span class="text-sm font-bold text-gray-800 whitespace-nowrap">简历工具</span>
    </div>

    <div class="h-6 w-px bg-gray-200 shrink-0" />

    <!-- New blank resume -->
    <button @click="askConfirm('clearAll')"
      class="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all whitespace-nowrap shrink-0">
      + 新建简历
    </button>

    <div class="h-6 w-px bg-gray-200 shrink-0" />

    <!-- Template picker -->
    <div ref="templatePickerRef" class="relative shrink-0">
      <button @click="showTemplatePicker = !showTemplatePicker"
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 border border-gray-200 rounded-lg hover:border-gray-400 transition-all whitespace-nowrap">
        <span>模板</span>
        <span class="font-semibold">{{ templates.find(t => t.id === store.config.templateId)?.label }}</span>
        <span class="text-gray-400 text-xs">▾</span>
      </button>

      <!-- Popover -->
      <Transition name="fade">
        <div v-if="showTemplatePicker"
          class="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex gap-3 z-40">
          <button v-for="t in templates" :key="t.id"
            @click="store.setTemplate(t.id); showTemplatePicker = false"
            class="flex flex-col items-center gap-2 p-2.5 rounded-xl transition-all hover:bg-gray-50"
            :class="store.config.templateId === t.id
              ? 'bg-blue-50 ring-2 ring-blue-400 ring-offset-1'
              : 'border border-gray-100'">
            <TemplateThumbnail :type="t.id" :color="store.config.themeColor" />
            <div class="text-center">
              <div class="text-xs font-semibold text-gray-800">{{ t.label }}</div>
              <div class="text-xs text-gray-400">{{ t.desc }}</div>
            </div>
          </button>
        </div>
      </Transition>
    </div>

    <div class="h-6 w-px bg-gray-200 shrink-0" />

    <!-- Color Picker -->
    <div class="flex items-center gap-2 shrink-0">
      <span class="text-xs text-gray-500">主题色</span>
      <div class="flex gap-1.5">
        <button v-for="color in presetColors" :key="color" @click="store.setThemeColor(color)"
          class="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
          :style="`background:${color}`"
          :class="store.config.themeColor === color ? 'border-gray-800 scale-110' : 'border-transparent'" />
      </div>
      <input type="color" :value="store.config.themeColor"
        @input="(e) => store.setThemeColor((e.target as HTMLInputElement).value)"
        class="w-6 h-6 rounded border border-gray-200 cursor-pointer" title="自定义颜色" />
    </div>

    <div class="flex-1" />

    <!-- Auto-save indicator -->
    <div class="flex items-center gap-1.5 shrink-0">
      <div class="w-1.5 h-1.5 rounded-full transition-colors duration-300"
        :class="saved ? 'bg-green-400' : 'bg-amber-400'" />
      <span class="text-xs text-gray-400 whitespace-nowrap">{{ saved ? '已保存' : '保存中…' }}</span>
    </div>

    <div class="h-6 w-px bg-gray-200 shrink-0" />

    <!-- Data Actions -->
    <div class="flex items-center gap-2 shrink-0">
      <button @click="handleImportClick"
        class="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all whitespace-nowrap">
        导入数据
      </button>
      <button @click="handleExportJSON"
        class="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all whitespace-nowrap">
        备份 JSON
      </button>
      <button @click="askConfirm('resetDemo')"
        class="text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap px-2">
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
