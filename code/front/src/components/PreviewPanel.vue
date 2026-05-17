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
  window.addEventListener('resume-export-pdf', handleExport)
  await nextTick()
  attachObserver()
})

onUnmounted(() => {
  window.removeEventListener('resize', calcScale)
  window.removeEventListener('resume-export-pdf', handleExport)
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
  <section ref="panelRef" class="preview-panel">

    <div class="preview-toolbar">
      <button @click="handleExport" :disabled="exporting"
        class="export-button"
        :class="{ disabled: exporting }">
        <span>↧</span>
        {{ exporting ? '生成中…' : '下载 PDF' }}
      </button>

      <div class="zoom-control">
        <span>缩放</span>
        <input type="range" min="40" max="100" step="2"
          :value="Math.round(scale * 100)"
          @input="onZoomInput" />
        <strong>{{ Math.round(scale * 100) }}%</strong>
        <button v-if="userScale !== null" @click="resetZoom"
          class="ghost-action">
          重置
        </button>
      </div>

      <div class="page-count" :class="{ warn: pageCount > 1 }">
        <span>{{ pageCount }} 页</span>
        <span v-if="pageCount > 1" title="建议简历控制在1页以内">建议精简</span>
      </div>
    </div>

    <div class="paper-stage">
      <div :style="`width:${794 * scale}px; position:relative; flex-shrink:0;
                    height:${Math.max(1123, resumeHeight) * scale}px`">

        <div id="resume-preview"
          class="resume-preview-paper"
          :style="`transform:scale(${scale}); transform-origin:top left;
                   position:absolute; top:0; left:0;`"
          @vue:mounted="attachObserver">
          <component :is="currentTemplate" :data="store.data" :config="store.config" />
        </div>

        <div v-for="(y, i) in pageBreaks" :key="i"
          class="page-break"
          :style="`top:${y}px`">
          <div />
          <span>第{{ i + 1 }}页 / 第{{ i + 2 }}页</span>
          <div />
        </div>
      </div>
    </div>

    <p class="preview-note">A4 预览 · 分页线用于导出前检查</p>
  </section>

  <div id="print-resume" style="display:none;">
    <component :is="currentTemplate" :data="store.data" :config="store.config" />
  </div>
</template>
