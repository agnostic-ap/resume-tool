<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useResumeStore } from '../stores/resume'
import { exportToPDF } from '../utils/pdf'
import TemplateClassic from './templates/TemplateClassic.vue'
import TemplateModern from './templates/TemplateModern.vue'
import TemplateSidebar from './templates/TemplateSidebar.vue'

const store = useResumeStore()
const panelRef = ref<HTMLElement>()
const scale = ref(0.88)
const exporting = ref(false)

const templateComponents: Record<string, any> = {
  classic: TemplateClassic,
  modern: TemplateModern,
  sidebar: TemplateSidebar,
}

const currentTemplate = computed(() => templateComponents[store.config.templateId] || TemplateClassic)

function calcScale() {
  if (!panelRef.value) return
  const available = panelRef.value.clientWidth - 64
  scale.value = Math.min(1, available / 794)
}

onMounted(() => {
  calcScale()
  window.addEventListener('resize', calcScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', calcScale)
})

async function handleExport() {
  exporting.value = true
  try {
    const name = store.data.personal.name || '我的简历'
    await exportToPDF('resume-preview', `${name}-简历.pdf`)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div ref="panelRef" class="flex-1 h-full overflow-y-auto bg-slate-100 flex flex-col items-center py-8 px-8 gap-4">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 mb-2 self-stretch justify-center">
      <button @click="handleExport" :disabled="exporting"
        class="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-all"
        style="background: #2563eb; min-width: 120px; justify-content: center;"
        :style="exporting ? 'opacity:0.7;cursor:not-allowed' : 'opacity:1'">
        <span v-if="!exporting">下载 PDF</span>
        <span v-else>导出中...</span>
      </button>
      <span class="text-xs text-gray-400">缩放 {{ Math.round(scale * 100) }}%</span>
    </div>

    <!-- Paper Preview -->
    <div :style="`width:${794 * scale}px; height:${1123 * scale}px; position:relative; flex-shrink:0`">
      <div id="resume-preview"
        :style="`transform: scale(${scale}); transform-origin: top left; position:absolute; top:0; left:0; box-shadow: 0 4px 32px rgba(0,0,0,0.15);`">
        <component :is="currentTemplate" :data="store.data" :config="store.config" />
      </div>
    </div>
  </div>
</template>
