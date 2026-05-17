<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useResumeStore } from '../stores/resume'
import { exportToPDF } from '../utils/pdf'
import { showToast } from '../composables/toast'
import TemplateClassic from './templates/TemplateClassic.vue'
import TemplateModern from './templates/TemplateModern.vue'
import TemplateSidebar from './templates/TemplateSidebar.vue'

const store = useResumeStore()
const panelRef  = ref<HTMLElement>()
const autoScale = ref(0.88)
const userScale = ref<number | null>(null)
const exporting = ref(false)
const resumeHeight = ref(1123) // tracked via ResizeObserver

const scale = computed(() => userScale.value ?? autoScale.value)

const pageCount = computed(() => Math.max(1, Math.ceil(resumeHeight.value / 1123)))

// page break Y positions (in scaled px, relative to paper top)
const pageBreaks = computed(() =>
  Array.from({ length: pageCount.value - 1 }, (_, i) => 1123 * (i + 1) * scale.value),
)

const templateComponents: Record<string, any> = {
  classic: TemplateClassic,
  modern:  TemplateModern,
  sidebar: TemplateSidebar,
}
const currentTemplate = computed(() => templateComponents[store.config.templateId] ?? TemplateClassic)

// ── Scale ─────────────────────────────────────────────────────
async function calcScale() {
  await nextTick()
  if (!panelRef.value) return
  autoScale.value = Math.min(1, (panelRef.value.clientWidth - 80) / 794)
}

// ── Resize observer on the live resume element ────────────────
let resizeObs: ResizeObserver | null = null
function attachObserver() {
  const el = document.getElementById('resume-preview')
  if (!el || resizeObs) return
  resizeObs = new ResizeObserver((entries) => {
    resumeHeight.value = entries[0].contentRect.height
  })
  resizeObs.observe(el)
}

onMounted(async () => {
  calcScale()
  window.addEventListener('resize', calcScale)
  await nextTick()
  attachObserver()
})

onUnmounted(() => {
  window.removeEventListener('resize', calcScale)
  resizeObs?.disconnect()
  resizeObs = null
})

// ── PDF export ────────────────────────────────────────────────
async function handleExport() {
  if (exporting.value) return
  exporting.value = true
  showToast('正在生成 PDF，请稍候…', 'info', 10000)
  try {
    await exportToPDF('resume-preview', `${store.data.personal.name || '我的简历'}-简历.pdf`)
    showToast('PDF 导出成功', 'success')
  } catch {
    showToast('PDF 导出失败，请重试', 'error')
  } finally {
    exporting.value = false
  }
}

// ── Zoom ─────────────────────────────────────────────────────
function onZoomInput(e: Event) {
  userScale.value = Number((e.target as HTMLInputElement).value) / 100
}
function resetZoom() { userScale.value = null }
</script>

<template>
  <div ref="panelRef" class="flex-1 h-full overflow-y-auto bg-slate-100 flex flex-col items-center py-6 px-8 gap-4">

    <!-- Toolbar -->
    <div class="flex items-center gap-4 self-stretch justify-center flex-wrap">
      <button @click="handleExport" :disabled="exporting"
        class="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg shadow transition-all"
        style="background:#2563eb;min-width:120px;justify-content:center;"
        :style="exporting ? 'opacity:0.65;cursor:not-allowed' : ''">
        {{ exporting ? '生成中…' : '下载 PDF' }}
      </button>

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

      <!-- Page count -->
      <div class="flex items-center gap-1.5 text-xs"
        :class="pageCount > 1 ? 'text-amber-500 font-medium' : 'text-gray-400'">
        <span>{{ pageCount }} 页</span>
        <span v-if="pageCount > 1" title="建议简历控制在1页以内">⚠️ 建议精简至1页</span>
      </div>
    </div>

    <!-- Paper wrapper (relative so page-break lines can be absolutely positioned) -->
    <div :style="`width:${794 * scale}px; position:relative; flex-shrink:0;
                  height:${Math.max(1123, resumeHeight) * scale}px`">

      <!-- Actual resume (scaled) -->
      <div id="resume-preview"
        :style="`transform:scale(${scale}); transform-origin:top left;
                 position:absolute; top:0; left:0;
                 box-shadow:0 4px 40px rgba(0,0,0,0.18);`"
        @vue:mounted="attachObserver">
        <component :is="currentTemplate" :data="store.data" :config="store.config" />
      </div>

      <!-- A4 page break indicators -->
      <div v-for="(y, i) in pageBreaks" :key="i"
        class="absolute left-0 right-0 z-20 pointer-events-none flex items-center gap-2"
        :style="`top:${y}px`">
        <div class="flex-1 border-t-2 border-dashed border-red-300 opacity-70" />
        <span class="text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap"
          style="background:#fef2f2;color:#f87171;">
          ↑ 第{{ i + 1 }}页 / 第{{ i + 2 }}页 ↓
        </span>
        <div class="flex-1 border-t-2 border-dashed border-red-300 opacity-70" />
      </div>
    </div>

    <p class="text-xs text-gray-400 pb-4">A4 预览 · 红色虚线为分页位置</p>
  </div>

  <!-- Hidden print target (rendered at full A4 size, only visible when printing) -->
  <div id="print-resume" style="display:none;">
    <component :is="currentTemplate" :data="store.data" :config="store.config" />
  </div>
</template>
