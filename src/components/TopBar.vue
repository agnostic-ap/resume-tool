<script setup lang="ts">
import { ref, watch } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { TemplateId } from '../types/resume'
import { showToast } from '../composables/toast'

const store = useResumeStore()
const fileInput = ref<HTMLInputElement>()

// Auto-save indicator
const saved = ref(true)
watch(() => store.data, () => { saved.value = false }, { deep: true })
watch(saved, (v) => { if (!v) setTimeout(() => (saved.value = true), 600) })

const templates: { id: TemplateId; label: string }[] = [
  { id: 'classic', label: '经典' },
  { id: 'modern', label: '现代' },
  { id: 'sidebar', label: '侧边栏' },
]

const presetColors = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#374151', '#9f1239',
]

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
  <header class="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-5 shrink-0 overflow-x-auto">
    <!-- Logo -->
    <div class="flex items-center gap-2 shrink-0">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm"
        style="background:#2563eb;">简</div>
      <span class="text-sm font-bold text-gray-800 whitespace-nowrap">简历工具</span>
    </div>

    <div class="h-6 w-px bg-gray-200 shrink-0" />

    <!-- Template Selector -->
    <div class="flex items-center gap-2 shrink-0">
      <span class="text-xs text-gray-500">模板</span>
      <div class="flex gap-1">
        <button v-for="t in templates" :key="t.id" @click="store.setTemplate(t.id)"
          class="px-3 py-1 text-xs rounded-lg border transition-all whitespace-nowrap"
          :class="store.config.templateId === t.id
            ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
            : 'border-gray-200 text-gray-600 hover:border-gray-300'">
          {{ t.label }}
        </button>
      </div>
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
      <button @click="store.resetToDefault()"
        class="text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap px-2">
        重置示例
      </button>
    </div>

    <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileChange" />
  </header>
</template>
