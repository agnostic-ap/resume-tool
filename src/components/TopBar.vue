<script setup lang="ts">
import { useResumeStore } from '../stores/resume'
import type { TemplateId } from '../types/resume'

const store = useResumeStore()

const templates: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'classic', label: '经典', desc: '简洁大方' },
  { id: 'modern', label: '现代', desc: '双栏布局' },
  { id: 'sidebar', label: '侧边栏', desc: '个性鲜明' },
]

const presetColors = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#374151', '#9f1239',
]
</script>

<template>
  <header class="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-6 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2 shrink-0">
      <span class="text-xl font-black text-blue-600">简</span>
      <span class="text-sm font-bold text-gray-800">简历工具</span>
    </div>

    <div class="h-6 w-px bg-gray-200" />

    <!-- Template Selector -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-500 shrink-0">模板</span>
      <div class="flex gap-1.5">
        <button v-for="t in templates" :key="t.id" @click="store.setTemplate(t.id)"
          class="px-3 py-1 text-xs rounded-lg border transition-all"
          :class="store.config.templateId === t.id
            ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
            : 'border-gray-200 text-gray-600 hover:border-gray-300'">
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="h-6 w-px bg-gray-200" />

    <!-- Color Picker -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-500 shrink-0">主题色</span>
      <div class="flex gap-1.5">
        <button v-for="color in presetColors" :key="color" @click="store.setThemeColor(color)"
          class="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
          :style="`background:${color}`"
          :class="store.config.themeColor === color ? 'border-gray-900 scale-110' : 'border-transparent'">
        </button>
      </div>
      <input type="color" :value="store.config.themeColor"
        @input="(e) => store.setThemeColor((e.target as HTMLInputElement).value)"
        class="w-6 h-6 rounded border border-gray-200 cursor-pointer"
        title="自定义颜色" />
    </div>

    <div class="flex-1" />

    <!-- Reset -->
    <button @click="store.resetToDefault()"
      class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
      重置示例
    </button>
  </header>
</template>
