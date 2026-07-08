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
import { openPaywall } from '../composables/paywall'
import {
  buildExportPrecheckIssues,
  getExportPrecheckActionEffect,
  type ExportPrecheckActionId,
  type ExportPrecheckIssue,
} from '../utils/exportPrecheck'

const store = useResumeStore()
const { t, locale } = useI18n()
const { l } = useLocaleText()
const panelRef  = ref<HTMLElement>()
const autoScale = ref(0.88)
const userScale = ref<number | null>(null)
const exporting = ref(false)
const resumeHeight = ref(1123) // tracked via ResizeObserver
const precheckOpen = ref(false)
const precheckConfirmBlocking = ref(false)
const precheckIssues = ref<ExportPrecheckIssue[]>([])

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
function collectExportPrecheckIssues() {
  return buildExportPrecheckIssues({
    data: store.data,
    config: store.config,
    pageCount: pageCount.value,
    resumeHeight: resumeHeight.value,
  })
}

function runExportPrecheck(track = true) {
  const issues = collectExportPrecheckIssues()
  precheckConfirmBlocking.value = false
  precheckIssues.value = issues
  if (track) {
    store.logActivity({
      type: 'export',
      tag: 'precheck',
      message: 'Completed PDF export precheck',
      messageZh: '完成 PDF 导出预检',
      messageEn: 'Completed PDF export precheck',
      meta: `${issues.length} issues · ${issues.filter((issue) => issue.severity === 'blocking').length} blocking`,
    })
    store.trackProductEvent('export_precheck_completed', {
      issue_count: issues.length,
      blocking_count: issues.filter((issue) => issue.severity === 'blocking').length,
    })
  }
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
  store.refreshBilling()
  if (!store.canExport) {
    store.trackProductEvent('paywall_viewed', { reason: 'export' })
    openPaywall('export')
    return
  }
  exporting.value = true
  showToast(l('正在生成 PDF，请稍候…', 'Generating PDF, please wait...'), 'info', 10000)
  try {
    const { exportToPDF } = await import('../utils/pdf')
    await exportToPDF('resume-preview', `${store.data.personal.name || l('我的简历', 'My resume')}-${l('简历', 'resume')}.pdf`, {
      watermark: store.entitlements.watermark,
      watermarkText: l('由 Resume Tool 免费版生成', 'Made with Resume Tool — Free'),
    })
    store.recordExportUsage()
    store.logActivity({
      type: 'export',
      tag: 'PDF',
      message: 'Exported resume PDF',
      messageZh: '导出 PDF 简历',
      messageEn: 'Exported resume PDF',
      meta: `${store.config.templateId} · A4${store.entitlements.watermark ? ' · watermark' : ''}`,
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
  if (blockingPrecheckCount.value && !precheckConfirmBlocking.value) {
    precheckConfirmBlocking.value = true
    return
  }
  void handleExport(true)
}

function issueTitle(issue: ExportPrecheckIssue) {
  return l(issue.titleZh, issue.titleEn)
}

function issueFix(issue: ExportPrecheckIssue) {
  return l(issue.fixZh, issue.fixEn)
}

function actionLabel(action: ExportPrecheckIssue['actions'][number]) {
  return l(action.labelZh, action.labelEn)
}

function refreshPrecheckAfterFix(message: string) {
  precheckIssues.value = collectExportPrecheckIssues()
  precheckConfirmBlocking.value = false
  store.logActivity({
    type: 'export',
    tag: 'precheck-fix',
    message,
    messageZh: message,
    messageEn: message,
    meta: `${precheckIssues.value.length} issues remaining`,
  })
}

function applyPrecheckAction(actionId: ExportPrecheckActionId) {
  const issueCountBefore = precheckIssues.value.length
  const messages: Record<ExportPrecheckActionId, string> = {
    'add-experience': l('已添加一段工作经历，请补充公司、岗位和成果。', 'Added a role. Fill company, title, and impact.'),
    'hide-experience': l('已隐藏工作经历章节。', 'Experience section hidden.'),
    'add-skills': l('已添加技能分类，请补充关键词。', 'Added a skill group. Fill in keywords.'),
    'hide-skills': l('已隐藏技能章节。', 'Skills section hidden.'),
    'reduce-font': l('已减小简历字号。', 'Resume font size reduced.'),
    'hide-awards': l('已隐藏奖项章节。', 'Awards section hidden.'),
    'hide-certifications': l('已隐藏证书章节。', 'Certifications section hidden.'),
    'hide-languages': l('已隐藏语言章节。', 'Languages section hidden.'),
  }

  if (actionId === 'add-experience') store.addExperience()
  else if (actionId === 'hide-experience' && store.config.sectionVisible.experience) store.toggleSectionVisible('experience')
  else if (actionId === 'add-skills') store.addSkill()
  else if (actionId === 'hide-skills' && store.config.sectionVisible.skills) store.toggleSectionVisible('skills')
  else if (actionId === 'reduce-font') store.setResumeFontSize(store.config.fontSize - 1)
  else if (actionId === 'hide-awards' && store.config.sectionVisible.awards) store.toggleSectionVisible('awards')
  else if (actionId === 'hide-certifications' && store.config.sectionVisible.certifications) store.toggleSectionVisible('certifications')
  else if (actionId === 'hide-languages' && store.config.sectionVisible.languages) store.toggleSectionVisible('languages')

  const message = messages[actionId]
  showToast(message, 'success')
  refreshPrecheckAfterFix(message)
  store.trackProductEvent('export_precheck_action_applied', {
    action_id: actionId,
    issue_count_before: issueCountBefore,
    issue_count_after: precheckIssues.value.length,
  })

  const effect = getExportPrecheckActionEffect(actionId)
  if (effect.closeDialog) {
    precheckOpen.value = false
    precheckConfirmBlocking.value = false
  }
  if (effect.focusTarget) {
    window.dispatchEvent(new CustomEvent('resume-focus-onboarding-target', {
      detail: { target: effect.focusTarget },
    }))
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

  <Teleport to="body">
    <div v-if="precheckOpen" class="modal-backdrop">
      <div class="export-precheck-dialog" role="dialog" aria-modal="true" aria-labelledby="export-precheck-title">
        <div class="export-precheck-dialog__head">
          <div>
            <span>{{ locale === 'zh-CN' ? 'PDF 预检' : 'PDF precheck' }}</span>
            <h3 id="export-precheck-title">{{ blockingPrecheckCount ? l('导出前需要先处理', 'Fix issues before export') : l('发现导出风险', 'Export risks found') }}</h3>
          </div>
          <button :aria-label="l('关闭 PDF 预检', 'Close PDF precheck')" @click="precheckOpen = false">×</button>
        </div>
        <div class="export-issues">
          <article v-for="issue in precheckIssues" :key="issue.id" :class="`export-issue export-issue--${issue.severity}`">
            <b>{{ issue.severity === 'blocking' ? l('阻塞', 'Blocking') : l('提醒', 'Warning') }}</b>
            <div>
              <strong>{{ issueTitle(issue) }}</strong>
              <p>{{ issueFix(issue) }}</p>
              <div v-if="issue.actions.length" class="export-issue__actions">
                <button
                  v-for="action in issue.actions"
                  :key="`${issue.id}-${action.id}`"
                  @click="applyPrecheckAction(action.id)">
                  {{ actionLabel(action) }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <p v-if="precheckConfirmBlocking" class="export-precheck-confirm">
          {{ l('仍要导出这份有阻塞问题的 PDF？文件可能缺少关键信息。', 'Export this PDF with blocking issues? It may miss critical information.') }}
        </p>
        <div class="export-precheck-dialog__actions">
          <button class="btn btn--ghost" @click="precheckOpen = false; precheckConfirmBlocking = false">{{ l('返回修复', 'Back to edit') }}</button>
          <button class="btn btn--primary" @click="continueAfterPrecheck">
            {{
              blockingPrecheckCount
                ? precheckConfirmBlocking
                  ? l('确认继续导出', 'Confirm export')
                  : l('仍要导出', 'Export anyway')
                : l('继续导出', 'Continue export')
            }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
