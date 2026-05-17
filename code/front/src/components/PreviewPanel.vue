<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useResumeStore } from '../stores/resume'
import { exportToPDF } from '../utils/pdf'
import { showToast } from '../composables/toast'
import TemplateClassic from './templates/TemplateClassic.vue'
import TemplateModern from './templates/TemplateModern.vue'
import TemplateSidebar from './templates/TemplateSidebar.vue'
import { useI18n } from '../i18n'
import { useLocaleText } from '../composables/useLocaleText'

const store = useResumeStore()
const { t, locale } = useI18n()
const { l } = useLocaleText()
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
  showToast(l('正在生成 PDF，请稍候…', 'Generating PDF, please wait...'), 'info', 10000)
  try {
    await exportToPDF('resume-preview', `${store.data.personal.name || l('我的简历', 'My resume')}-${l('简历', 'resume')}.pdf`)
    store.logActivity({
      type: 'export',
      tag: 'PDF',
      message: 'Exported resume PDF',
      messageZh: '导出 PDF 简历',
      messageEn: 'Exported resume PDF',
      meta: `${store.config.templateId} · A4`,
    })
    showToast(l('PDF 导出成功', 'PDF exported'), 'success')
  } catch {
    showToast(l('PDF 导出失败，请重试', 'PDF export failed. Please try again.'), 'error')
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
        {{ exporting ? (locale === 'zh-CN' ? '生成中…' : 'Generating…') : t('exportPdf') }}
      </button>

      <div class="zoom-control">
        <span>{{ locale === 'zh-CN' ? '缩放' : 'Zoom' }}</span>
        <input type="range" min="40" max="100" step="2"
          :value="Math.round(scale * 100)"
          @input="onZoomInput" />
        <strong>{{ Math.round(scale * 100) }}%</strong>
        <button v-if="userScale !== null" @click="resetZoom"
          class="ghost-action">
          {{ locale === 'zh-CN' ? '重置' : 'Reset' }}
        </button>
      </div>

      <div class="page-count" :class="{ warn: pageCount > 1 }">
        <span>{{ pageCount }} {{ locale === 'zh-CN' ? '页' : pageCount === 1 ? 'page' : 'pages' }}</span>
        <span v-if="pageCount > 1" :title="locale === 'zh-CN' ? '建议简历控制在1页以内' : 'Keep the resume within one page'">{{ locale === 'zh-CN' ? '建议精简' : 'Trim' }}</span>
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
          <span>{{ locale === 'zh-CN' ? `第${i + 1}页 / 第${i + 2}页` : `Page ${i + 1} / ${i + 2}` }}</span>
          <div />
        </div>
      </div>
    </div>

    <p class="preview-note">{{ locale === 'zh-CN' ? 'A4 预览 · 分页线用于导出前检查' : 'A4 preview · page breaks are shown before export' }}</p>
  </section>

  <div id="print-resume" style="display:none;">
    <component :is="currentTemplate" :data="store.data" :config="store.config" />
  </div>
</template>
