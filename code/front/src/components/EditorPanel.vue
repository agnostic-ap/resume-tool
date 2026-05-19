<script setup lang="ts">
import { computed, ref } from 'vue'
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

async function copySource() {
  try {
    await navigator.clipboard?.writeText(sourceText.value)
    showToast(l('源码已复制', 'Source copied'), 'success')
  } catch {
    showToast(l('复制失败，请手动选择源码', 'Copy failed. Select the source manually.'), 'error')
  }
}
</script>

<template>
  <section class="editor-panel" :class="{ 'no-tree': showTree === false }">
    <aside v-if="showTree !== false" class="section-tree">
      <div class="tree-head">
        <span>{{ t('sectionsLabel') }}</span>
        <strong>resume-main</strong>
      </div>

      <div class="tree-list">
        <div class="tree-group">
          <div class="tree-label">Frontmatter</div>
          <button class="tree-item" :class="{ on: expanded.has('personal') }" @click="toggle('personal')">
            <span class="ic">⌘</span>
            <span>personal.yaml</span>
            <small>{{ store.data.personal.name ? t('filled') : t('todo') }}</small>
          </button>
        </div>

        <div class="tree-group">
          <div class="tree-label">Body</div>
          <button v-for="sectionId in store.config.sectionOrder" :key="sectionId"
            class="tree-item"
            :class="{ on: expanded.has(sectionId), muted: !store.config.sectionVisible[sectionId] }"
            @click="toggle(sectionId)">
            <span class="ic">{{ sectionMeta[sectionId].icon }}</span>
            <span>{{ sectionId }}.mdx</span>
            <small v-if="sectionCount[sectionId] > 0">{{ sectionId === 'summary' ? 'ok' : sectionCount[sectionId] }}</small>
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
        <span class="tab on">content.mdx</span>
        <span class="tab">theme.css</span>
        <span class="tab">export.config</span>
        <div class="segmented">
          <button :class="{ on: editorMode === 'form' }" @click="editorMode = 'form'">{{ t('form') }}</button>
          <button :class="{ on: editorMode === 'source' }" @click="editorMode = 'source'">{{ t('source') }}</button>
          <button :class="{ on: editorMode === 'diff' }" @click="editorMode = 'diff'">Diff</button>
        </div>
      </div>

      <div v-if="editorMode === 'source'" class="editor-scroll source-view">
        <div class="source-toolbar">
          <span>resume-data.json</span>
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
        <article class="editor-section" :class="{ open: expanded.has('personal') }">
          <button class="section-toggle" @click="toggle('personal')">
            <span class="section-title">
              <i>⌘</i>
              <strong>{{ t('personalInfo') }}</strong>
              <small>personal.yaml</small>
            </span>
            <span class="chevron">{{ expanded.has('personal') ? '−' : '+' }}</span>
          </button>
          <div v-if="expanded.has('personal')" class="section-body">
            <PersonalEditor />
          </div>
        </article>

        <article v-for="(sectionId, idx) in store.config.sectionOrder" :key="sectionId"
          class="editor-section"
          :class="{ open: expanded.has(sectionId), disabled: !store.config.sectionVisible[sectionId] }">
          <div class="section-toggle">
            <button @click="toggle(sectionId)" class="section-title">
              <i>{{ sectionMeta[sectionId].icon }}</i>
              <strong>{{ sectionLabel(sectionId) }}</strong>
              <small>{{ sectionId }}.mdx</small>
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
