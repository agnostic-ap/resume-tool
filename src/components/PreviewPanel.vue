<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useResumeStore } from '../stores/resume'
import { exportToPDF } from '../utils/pdf'
import { showToast } from '../composables/toast'
import TemplateClassic from './templates/TemplateClassic.vue'
import TemplateModern from './templates/TemplateModern.vue'
import TemplateSidebar from './templates/TemplateSidebar.vue'

const store = useResumeStore()
const panelRef = ref<HTMLElement>()
const autoScale = ref(0.88)
const userScale = ref<number | null>(null)
const exporting = ref(false)

const scale = computed(() => userScale.value ?? autoScale.value)

const templateComponents: Record<string, any> = {
  classic: TemplateClassic,
  modern: TemplateModern,
  sidebar: TemplateSidebar,
}

const currentTemplate = computed(() => templateComponents[store.config.templateId] ?? TemplateClassic)

async function calcScale() {
  await nextTick()
  if (!panelRef.value) return
  const available = panelRef.value.clientWidth - 80
  autoScale.value = Math.min(1, available / 794)
}

onMounted(() => {
  calcScale()
  window.addEventListener('resize', calcScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', calcScale)
})

async function handleExport() {
  if (exporting.value) return
  exporting.value = true
  showToast('正在生成 PDF，请稍候…', 'info', 10000)
  try {
    const name = store.data.personal.name || '我的简历'
    await exportToPDF('resume-preview', `${name}-简历.pdf`)
    showToast('PDF 导出成功', 'success')
  } catch {
    showToast('PDF 导出失败，请重试', 'error')
  } finally {
    exporting.value = false
  }
}

function onZoomInput(e: Event) {
  userScale.value = Number((e.target as HTMLInputElement).value) / 100
}

function resetZoom() {
  userScale.value = null
}
</script>

<template>
  <div ref="panelRef" class="flex-1 h-full overflow-y-auto bg-slate-100 flex flex-col items-center py-6 px-8 gap-4">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 self-stretch justify-center flex-wrap">
      <button @click="handleExport" :disabled="exporting"
        class="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg shadow transition-all"
        style="background:#2563eb; min-width:120px; justify-content:center;"
        :style="exporting ? 'opacity:0.65;cursor:not-allowed' : ''">
        {{ exporting ? '生成中…' : '下载 PDF' }}
      </button>

      <!-- Zoom Slider -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 whitespace-nowrap">缩放</span>
        <input type="range" min="40" max="100" step="2"
          :value="Math.round(scale * 100)"
          @input="onZoomInput"
          class="w-24 accent-blue-500" />
        <span class="text-xs text-gray-500 w-10 text-right">{{ Math.round(scale * 100) }}%</span>
        <button v-if="userScale !== null" @click="resetZoom"
          class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          重置
        </button>
      </div>
    </div>

    <!-- Paper Preview -->
    <div :style="`width:${794 * scale}px; height:${1123 * scale}px; position:relative; flex-shrink:0`">
      <div id="resume-preview"
        :style="`transform:scale(${scale}); transform-origin:top left; position:absolute; top:0; left:0;
                 box-shadow:0 4px 40px rgba(0,0,0,0.18);`">
        <component :is="currentTemplate" :data="store.data" :config="store.config" />
      </div>
    </div>

    <!-- Page hint -->
    <p class="text-xs text-gray-400">A4 纸张预览 · 内容过长会自动分页</p>
  </div>
</template>
