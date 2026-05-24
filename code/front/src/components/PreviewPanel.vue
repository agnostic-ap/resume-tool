<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useResumeStore } from '../stores/resume'
import { showToast } from '../composables/toast'
import TemplateClassic from './templates/TemplateClassic.vue'
import TemplateModern from './templates/TemplateModern.vue'
import TemplateSidebar from './templates/TemplateSidebar.vue'
import TemplateAdaptive from './templates/TemplateAdaptive.vue'
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
const precheckOpen = ref(false)
type ExportIssue = { id: string; severity: 'blocking' | 'warning'; title: string; fix: string }
const precheckIssues = ref<ExportIssue[]>([])

const scale = computed(() => userScale.value ?? autoScale.value)

const pageCount = computed(() => Math.max(1, Math.ceil(resumeHeight.value / 1123)))
const blockingPrecheckCount = computed(() => precheckIssues.value.filter((issue) => issue.severity === 'blocking').length)

// page break Y positions (in scaled px, relative to paper top)
const pageBreaks = computed(() =>
  Array.from({ length: pageCount.value - 1 }, (_, i) => 1123 * (i + 1) * scale.value),
)

const templateComponents: Record<string, any> = {
  classic: TemplateClassic,
  modern:  TemplateModern,
  sidebar: TemplateSidebar,
  compact: TemplateAdaptive,
  executive: TemplateAdaptive,
  creative: TemplateAdaptive,
  academic: TemplateAdaptive,
  technical: TemplateAdaptive,
  product: TemplateAdaptive,
  minimal: TemplateAdaptive,
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
function runExportPrecheck() {
  const issues: ExportIssue[] = []
  const personal = store.data.personal
  const contactLength = [personal.phone, personal.email, personal.website, personal.location].join(' · ').length
  if (!personal.name.trim()) {
    issues.push({
      id: 'missing-name',
      severity: 'blocking',
      title: l('缺少姓名', 'Missing name'),
      fix: l('先在个人信息中补齐姓名。', 'Add your name in personal info first.'),
    })
  }
  if (!personal.email.trim() && !personal.phone.trim()) {
    issues.push({
      id: 'missing-contact',
      severity: 'blocking',
      title: l('缺少联系方式', 'Missing contact'),
      fix: l('至少填写邮箱或手机号。', 'Add at least an email or phone number.'),
    })
  }
  if (!store.data.experience.length) {
    issues.push({
      id: 'missing-experience',
      severity: 'blocking',
      title: l('没有工作经历', 'No experience'),
      fix: l('补充最近一段工作经历，或隐藏该章节后再导出。', 'Add a recent role, or hide the section before exporting.'),
    })
  }
  if (!store.data.skills.length || !store.data.skills.some((item) => item.items.trim())) {
    issues.push({
      id: 'missing-skills',
      severity: 'warning',
      title: l('技能关键词为空', 'Skills are empty'),
      fix: l('补 5-8 个岗位关键词可提升筛选通过率。', 'Add 5-8 role keywords to improve screening.'),
    })
  }
  if (contactLength > 92) {
    issues.push({
      id: 'long-contact',
      severity: 'warning',
      title: l('联系方式过长', 'Contact line is long'),
      fix: l('缩短链接或移动低优先级联系方式，避免页眉溢出。', 'Shorten links or move lower-priority contact details to avoid header overflow.'),
    })
  }
  if (pageCount.value > 2) {
    issues.push({
      id: 'too-many-pages',
      severity: pageCount.value > 3 ? 'blocking' : 'warning',
      title: l(`当前约 ${pageCount.value} 页`, `About ${pageCount.value} pages`),
      fix: l('建议切换紧凑密度、减小字号或隐藏低价值章节。', 'Try compact density, smaller font, or hide lower-value sections.'),
    })
  }
  if (resumeHeight.value > 1123 && resumeHeight.value % 1123 > 980) {
    issues.push({
      id: 'section-near-break',
      severity: 'warning',
      title: l('内容靠近分页线', 'Content is close to a page break'),
      fix: l('检查分页线附近的章节，必要时压缩描述或调整顺序。', 'Review sections near the page break and trim or reorder if needed.'),
    })
  }
  precheckIssues.value = issues
  store.logActivity({
    type: 'export',
    tag: 'precheck',
    message: 'Completed PDF export precheck',
    messageZh: '完成 PDF 导出预检',
    messageEn: 'Completed PDF export precheck',
    meta: `${issues.length} issues · ${issues.filter((issue) => issue.severity === 'blocking').length} blocking`,
  })
  return issues
}

async function handleExport(eventOrForce: Event | boolean = false) {
  const force = eventOrForce === true
  if (exporting.value) return
  if (!force) {
    const issues = runExportPrecheck()
    if (issues.length) {
      precheckOpen.value = true
      if (issues.some((issue) => issue.severity === 'blocking')) return
    }
  }
  precheckOpen.value = false
  exporting.value = true
  showToast(l('正在生成 PDF，请稍候…', 'Generating PDF, please wait...'), 'info', 10000)
  try {
    const { exportToPDF } = await import('../utils/pdf')
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
    store.logActivity({
      type: 'export',
      tag: 'PDF',
      message: 'PDF export failed',
      messageZh: 'PDF 导出失败',
      messageEn: 'PDF export failed',
      meta: `${store.config.templateId} · A4`,
    })
    showToast(l('PDF 导出失败，请重试', 'PDF export failed. Please try again.'), 'error')
  } finally {
    exporting.value = false
  }
}

function continueAfterPrecheck() {
  void handleExport(true)
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

  <Teleport to="body">
    <div v-if="precheckOpen" class="modal-backdrop">
      <div class="export-precheck-dialog">
        <div class="export-precheck-dialog__head">
          <div>
            <span>{{ locale === 'zh-CN' ? 'PDF 预检' : 'PDF precheck' }}</span>
            <h3>{{ blockingPrecheckCount ? l('导出前需要先处理', 'Fix issues before export') : l('发现导出风险', 'Export risks found') }}</h3>
          </div>
          <button @click="precheckOpen = false">×</button>
        </div>
        <div class="export-issues">
          <article v-for="issue in precheckIssues" :key="issue.id" :class="`export-issue export-issue--${issue.severity}`">
            <b>{{ issue.severity === 'blocking' ? l('阻塞', 'Blocking') : l('提醒', 'Warning') }}</b>
            <div>
              <strong>{{ issue.title }}</strong>
              <p>{{ issue.fix }}</p>
            </div>
          </article>
        </div>
        <div class="export-precheck-dialog__actions">
          <button class="btn btn--ghost" @click="precheckOpen = false">{{ l('返回修复', 'Back to edit') }}</button>
          <button class="btn btn--primary" :disabled="blockingPrecheckCount > 0" @click="continueAfterPrecheck">
            {{ blockingPrecheckCount ? l('修复后再导出', 'Fix before export') : l('继续导出', 'Continue export') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
