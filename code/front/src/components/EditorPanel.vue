<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { SectionId } from '../types/resume'
import PersonalEditor from './editor/PersonalEditor.vue'
import SummaryEditor from './editor/SummaryEditor.vue'
import ExperienceEditor from './editor/ExperienceEditor.vue'
import EducationEditor from './editor/EducationEditor.vue'
import SkillsEditor from './editor/SkillsEditor.vue'
import ProjectsEditor from './editor/ProjectsEditor.vue'
import AwardsEditor from './editor/AwardsEditor.vue'
import LanguagesEditor from './editor/LanguagesEditor.vue'
import CertificationsEditor from './editor/CertificationsEditor.vue'
import { useI18n } from '../i18n'
import { useLocaleText } from '../composables/useLocaleText'
import { showToast } from '../composables/toast'

const store = useResumeStore()
defineProps<{ showTree?: boolean }>()
const { t } = useI18n()
const { l } = useLocaleText()
type EditorGuideTarget = 'personal' | 'title' | 'summary' | 'experience' | 'skills' | 'export'

const sectionMeta: Record<SectionId, { zh: string; en: string; icon: string; component: any }> = {
  summary: { zh: '个人简介', en: 'Summary', icon: '¶', component: SummaryEditor },
  experience: { zh: '工作经历', en: 'Experience', icon: '¶', component: ExperienceEditor },
  education: { zh: '教育经历', en: 'Education', icon: '§', component: EducationEditor },
  skills: { zh: '专业技能', en: 'Skills', icon: '◇', component: SkillsEditor },
  projects: { zh: '项目经历', en: 'Projects', icon: '◆', component: ProjectsEditor },
  awards: { zh: '荣誉奖项', en: 'Awards', icon: '☆', component: AwardsEditor },
  languages: { zh: '语言能力', en: 'Languages', icon: '⌁', component: LanguagesEditor },
  certifications: { zh: '证书资质', en: 'Certifications', icon: '□', component: CertificationsEditor },
}

function sectionLabel(id: SectionId) {
  return l(sectionMeta[id].zh, sectionMeta[id].en)
}

const sectionCount = computed<Record<SectionId, number>>(() => ({
  summary: store.data.personal.summary.trim() ? 1 : 0,
  experience: store.data.experience.length,
  education: store.data.education.length,
  skills: store.data.skills.length,
  projects: store.data.projects.length,
  awards: store.data.awards.length,
  languages: store.data.languages.length,
  certifications: store.data.certifications.length,
}))

const expanded = ref<Set<string>>(new Set(['personal', 'summary', 'experience']))
const editorMode = ref<'form' | 'source' | 'diff'>('form')
const panelRef = ref<HTMLElement | null>(null)
const guidePulseTarget = ref<EditorGuideTarget | ''>('')

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

const completenessColor = computed(() => {
  const s = store.completeness
  if (s < 40) return '#C65A3A'
  if (s < 70) return '#B58A44'
  return '#6F7F45'
})

const completenessLabel = computed(() => {
  const s = store.completeness
  if (s < 40) return l('待完善', 'Needs work')
  if (s < 70) return l('基本完整', 'Mostly filled')
  if (s < 100) return l('接近完成', 'Almost ready')
  return l('可以导出', 'Ready to export')
})

const sourceText = computed(() => JSON.stringify({
  personal: store.data.personal,
  sections: store.config.sectionOrder.map((id) => ({
    id,
    visible: store.config.sectionVisible[id],
    count: sectionCount.value[id],
  })),
  config: store.config,
}, null, 2))

const diffRows = computed(() =>
  store.config.sectionOrder.map((id, index) => ({
    id,
    label: sectionLabel(id),
    status: store.config.sectionVisible[id] ? l('显示', 'visible') : l('隐藏', 'hidden'),
    hidden: !store.config.sectionVisible[id],
    count: sectionCount.value[id],
    order: index + 1,
  })),
)

const guideItems = computed<Array<{ id: EditorGuideTarget; label: string; detail: string; done: boolean; action: string }>>(() => [
  {
    id: 'personal',
    label: l('姓名与联系方式', 'Name and contact'),
    detail: l('至少补姓名，以及邮箱或手机。', 'Add your name and either email or phone.'),
    done: Boolean(store.data.personal.name.trim() && (store.data.personal.email.trim() || store.data.personal.phone.trim())),
    action: l('填写', 'Fill'),
  },
  {
    id: 'title',
    label: l('求职标题', 'Target title'),
    detail: l('让预览和 JD 定制知道你投什么岗位。', 'Tell the preview and tailoring flow what role you target.'),
    done: Boolean(store.data.personal.title.trim()),
    action: l('定位', 'Set'),
  },
  {
    id: 'summary',
    label: l('个人简介', 'Summary'),
    detail: l('写 2-3 句岗位定位和优势。', 'Write 2-3 sentences about direction and strengths.'),
    done: store.data.personal.summary.trim().length > 20,
    action: l('补简介', 'Add'),
  },
  {
    id: 'experience',
    label: l('最近经历', 'Recent role'),
    detail: l('补公司、岗位和一条量化成果。', 'Add company, title, and one measurable impact.'),
    done: store.data.experience.length > 0 && store.data.experience.some((item) => item.description.trim().length > 30),
    action: l('加经历', 'Add'),
  },
  {
    id: 'skills',
    label: l('核心技能', 'Core skills'),
    detail: l('列出和目标岗位相关的关键词。', 'List keywords that match the target role.'),
    done: store.data.skills.length > 0 && store.data.skills.some((item) => item.items.trim()),
    action: l('加技能', 'Add'),
  },
  {
    id: 'export',
    label: l('导出检查', 'Export check'),
    detail: l('导出前检查空章节、联系方式和分页风险。', 'Check empty sections, contact length, and page-break risks.'),
    done: store.completeness >= 80,
    action: l('预检', 'Check'),
  },
])

const guideDoneCount = computed(() => guideItems.value.filter((item) => item.done).length)
const guideVisible = computed(() => store.activeDocument.origin === 'blank' || guideDoneCount.value < guideItems.value.length)

function guideSection(target: EditorGuideTarget) {
  if (target === 'personal' || target === 'title') return 'personal'
  if (target === 'export') return ''
  return target
}

function guideFieldSelector(target: EditorGuideTarget) {
  const selectors: Record<EditorGuideTarget, string> = {
    personal: '[data-guide-field="name"]',
    title: '[data-guide-field="title"]',
    summary: '[data-guide-field="summary"]',
    experience: '[data-guide-field="experience-company"]',
    skills: '[data-guide-field="skill-category"]',
    export: '',
  }
  return selectors[target]
}

async function focusOnboardingTarget(target: EditorGuideTarget) {
  editorMode.value = 'form'
  const section = guideSection(target)
  if (section) expanded.value.add(section)
  await nextTick()
  const sectionEl = section
    ? panelRef.value?.querySelector<HTMLElement>(`[data-editor-section="${section}"]`)
    : panelRef.value
  guidePulseTarget.value = target
  sectionEl?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  window.setTimeout(() => {
    const selector = guideFieldSelector(target)
    const field = selector ? panelRef.value?.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector) : null
    field?.focus({ preventScroll: true })
  }, 140)
  window.setTimeout(() => {
    if (guidePulseTarget.value === target) guidePulseTarget.value = ''
  }, 1800)
}

async function runGuideAction(target: EditorGuideTarget) {
  if (target === 'experience' && !store.data.experience.length) store.addExperience()
  if (target === 'skills' && !store.data.skills.length) store.addSkill()
  if (target === 'export') {
    window.dispatchEvent(new CustomEvent('resume-export-pdf'))
    return
  }
  await focusOnboardingTarget(target)
  showToast(l('已定位到对应字段', 'Moved to the matching field'), 'info', 2400)
}

async function copySource() {
  try {
    await navigator.clipboard?.writeText(sourceText.value)
    showToast(l('源码已复制', 'Source copied'), 'success')
  } catch {
    showToast(l('复制失败，请手动选择源码', 'Copy failed. Select the source manually.'), 'error')
  }
}

defineExpose({ focusOnboardingTarget })
</script>

<template>
  <section ref="panelRef" class="editor-panel" :class="{ 'no-tree': showTree === false }">
    <aside v-if="showTree !== false" class="section-tree">
      <div class="tree-head">
        <span>{{ t('sectionsLabel') }}</span>
        <strong>{{ l('简历内容', 'Resume content') }}</strong>
      </div>

      <div class="tree-list">
        <div class="tree-group">
          <div class="tree-label">{{ l('核心信息', 'Core info') }}</div>
          <button class="tree-item" :class="{ on: expanded.has('personal') }" @click="toggle('personal')">
            <span class="ic">⌘</span>
            <span>{{ t('personalInfo') }}</span>
            <small>{{ store.data.personal.name ? t('filled') : t('todo') }}</small>
          </button>
        </div>

        <div class="tree-group">
          <div class="tree-label">{{ l('简历章节', 'Resume sections') }}</div>
          <button v-for="sectionId in store.config.sectionOrder" :key="sectionId"
            class="tree-item"
            :class="{ on: expanded.has(sectionId), muted: !store.config.sectionVisible[sectionId] }"
            @click="toggle(sectionId)">
            <span class="ic">{{ sectionMeta[sectionId].icon }}</span>
            <span>{{ sectionLabel(sectionId) }}</span>
            <small v-if="sectionCount[sectionId] > 0">{{ sectionId === 'summary' ? t('filled') : sectionCount[sectionId] }}</small>
            <small v-else-if="store.config.sectionVisible[sectionId]" class="warn">{{ t('todo') }}</small>
            <small v-else>{{ t('hidden') }}</small>
          </button>
        </div>
      </div>

      <div class="tree-foot">
        <div class="score-row">
          <span>{{ t('complete') }}</span>
          <strong :style="{ color: completenessColor }">{{ store.completeness }}<small>%</small></strong>
        </div>
        <div class="meter"><i :style="{ width: `${store.completeness}%`, background: completenessColor }" /></div>
        <p>{{ completenessLabel }}</p>
      </div>
    </aside>

    <div class="editor-workspace">
      <div class="editor-tabs">
        <span class="tab on">{{ l('内容', 'Content') }}</span>
        <span class="tab">{{ l('外观', 'Style') }}</span>
        <span class="tab">{{ l('导出', 'Export') }}</span>
        <div class="segmented">
          <button :class="{ on: editorMode === 'form' }" @click="editorMode = 'form'">{{ t('form') }}</button>
          <button :class="{ on: editorMode === 'source' }" @click="editorMode = 'source'">{{ t('source') }}</button>
          <button :class="{ on: editorMode === 'diff' }" @click="editorMode = 'diff'">{{ l('对比', 'Diff') }}</button>
        </div>
      </div>

      <div v-if="editorMode === 'source'" class="editor-scroll source-view">
        <div class="source-toolbar">
          <span>{{ l('当前简历数据', 'Current resume data') }}</span>
          <button @click="copySource">{{ t('copy') }}</button>
        </div>
        <pre>{{ sourceText }}</pre>
      </div>

      <div v-else-if="editorMode === 'diff'" class="editor-scroll diff-view">
        <div class="diff-row diff-row--head">
          <span>{{ t('section') }}</span>
          <span>{{ t('order') }}</span>
          <span>{{ t('items') }}</span>
          <span>{{ t('state') }}</span>
        </div>
        <div v-for="row in diffRows" :key="row.id" class="diff-row" :class="{ muted: row.hidden }">
          <span>{{ row.label }}</span>
          <span>#{{ row.order }}</span>
          <span>{{ row.count }}</span>
          <span>{{ row.status }}</span>
        </div>
      </div>

      <div v-else class="editor-scroll">
        <div v-if="guideVisible" class="editor-guide">
          <div class="editor-guide__head">
            <div>
              <span>{{ l('空白简历起步', 'Blank resume start') }}</span>
              <strong>{{ l('先补 5 个核心字段，再做导出检查。', 'Fill 5 core fields, then run the export check.') }}</strong>
            </div>
            <b>{{ guideDoneCount }}/{{ guideItems.length }}</b>
          </div>
          <div class="editor-guide__grid">
            <button
              v-for="item in guideItems"
              :key="item.id"
              :class="{ done: item.done, active: guidePulseTarget === item.id }"
              @click="runGuideAction(item.id)">
              <i>{{ item.done ? '✓' : '·' }}</i>
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.detail }}</small>
              </span>
              <b>{{ item.done ? l('完成', 'Done') : item.action }}</b>
            </button>
          </div>
        </div>

        <article
          class="editor-section"
          data-editor-section="personal"
          :class="{ open: expanded.has('personal'), 'is-guide-focus': guidePulseTarget === 'personal' || guidePulseTarget === 'title' }">
          <button class="section-toggle" @click="toggle('personal')">
            <span class="section-title">
              <i>⌘</i>
              <strong>{{ t('personalInfo') }}</strong>
              <small>{{ l('基础字段', 'Core fields') }}</small>
            </span>
            <span class="chevron">{{ expanded.has('personal') ? '−' : '+' }}</span>
          </button>
          <div v-if="expanded.has('personal')" class="section-body">
            <PersonalEditor />
          </div>
        </article>

        <article v-for="(sectionId, idx) in store.config.sectionOrder" :key="sectionId"
          class="editor-section"
          :data-editor-section="sectionId"
          :class="{ open: expanded.has(sectionId), disabled: !store.config.sectionVisible[sectionId], 'is-guide-focus': guidePulseTarget === sectionId }">
          <div class="section-toggle">
            <button @click="toggle(sectionId)" class="section-title">
              <i>{{ sectionMeta[sectionId].icon }}</i>
              <strong>{{ sectionLabel(sectionId) }}</strong>
              <small>{{ l('简历章节', 'Resume section') }}</small>
            </button>
            <div class="section-actions">
              <span v-if="sectionCount[sectionId] > 0" class="count-badge">
                {{ sectionId === 'summary' ? t('filled') : sectionCount[sectionId] }}
              </span>
              <span v-else-if="store.config.sectionVisible[sectionId]" class="count-badge warn">{{ t('todo') }}</span>
              <button @click="store.toggleSectionVisible(sectionId)"
                :title="store.config.sectionVisible[sectionId] ? l('在简历中隐藏', 'Hide from resume') : l('在简历中显示', 'Show in resume')">
                {{ store.config.sectionVisible[sectionId] ? l('隐藏', 'hide') : l('显示', 'show') }}
              </button>
              <button @click="store.moveSection(sectionId, 'up')" :disabled="idx === 0">↑</button>
              <button @click="store.moveSection(sectionId, 'down')"
                :disabled="idx === store.config.sectionOrder.length - 1">↓</button>
              <button @click="toggle(sectionId)">{{ expanded.has(sectionId) ? '−' : '+' }}</button>
            </div>
          </div>
          <div v-if="expanded.has(sectionId)" class="section-body">
            <component :is="sectionMeta[sectionId].component" />
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
