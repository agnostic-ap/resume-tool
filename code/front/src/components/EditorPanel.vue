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

const store = useResumeStore()
defineProps<{ showTree?: boolean }>()

const sectionMeta: Record<SectionId, { label: string; icon: string; component: any }> = {
  summary: { label: '个人简介', icon: '¶', component: SummaryEditor },
  experience: { label: '工作经历', icon: '¶', component: ExperienceEditor },
  education: { label: '教育经历', icon: '§', component: EducationEditor },
  skills: { label: '专业技能', icon: '◇', component: SkillsEditor },
  projects: { label: '项目经历', icon: '◆', component: ProjectsEditor },
  awards: { label: '荣誉奖项', icon: '☆', component: AwardsEditor },
  languages: { label: '语言能力', icon: '⌁', component: LanguagesEditor },
  certifications: { label: '证书资质', icon: '□', component: CertificationsEditor },
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
  if (s < 40) return '#b73e1b'
  if (s < 70) return '#9c7a29'
  return '#4a5d2f'
})

const completenessLabel = computed(() => {
  const s = store.completeness
  if (s < 40) return '待完善'
  if (s < 70) return '基本完整'
  if (s < 100) return '接近完成'
  return '可以导出'
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
    label: sectionMeta[id].label,
    status: store.config.sectionVisible[id] ? 'visible' : 'hidden',
    count: sectionCount.value[id],
    order: index + 1,
  })),
)

async function copySource() {
  await navigator.clipboard?.writeText(sourceText.value)
}
</script>

<template>
  <section class="editor-panel" :class="{ 'no-tree': showTree === false }">
    <aside v-if="showTree !== false" class="section-tree">
      <div class="tree-head">
        <span>Sections</span>
        <strong>resume-main</strong>
      </div>

      <div class="tree-list">
        <div class="tree-group">
          <div class="tree-label">Frontmatter</div>
          <button class="tree-item" :class="{ on: expanded.has('personal') }" @click="toggle('personal')">
            <span class="ic">⌘</span>
            <span>personal.yaml</span>
            <small>{{ store.data.personal.name ? 'filled' : 'empty' }}</small>
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
            <small v-else-if="store.config.sectionVisible[sectionId]" class="warn">todo</small>
            <small v-else>hidden</small>
          </button>
        </div>
      </div>

      <div class="tree-foot">
        <div class="score-row">
          <span>完整度</span>
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
          <button :class="{ on: editorMode === 'form' }" @click="editorMode = 'form'">表单</button>
          <button :class="{ on: editorMode === 'source' }" @click="editorMode = 'source'">源码</button>
          <button :class="{ on: editorMode === 'diff' }" @click="editorMode = 'diff'">Diff</button>
        </div>
      </div>

      <div v-if="editorMode === 'source'" class="editor-scroll source-view">
        <div class="source-toolbar">
          <span>resume-data.json</span>
          <button @click="copySource">copy</button>
        </div>
        <pre>{{ sourceText }}</pre>
      </div>

      <div v-else-if="editorMode === 'diff'" class="editor-scroll diff-view">
        <div class="diff-row diff-row--head">
          <span>section</span>
          <span>order</span>
          <span>items</span>
          <span>state</span>
        </div>
        <div v-for="row in diffRows" :key="row.id" class="diff-row" :class="{ muted: row.status === 'hidden' }">
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
              <strong>个人信息</strong>
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
              <strong>{{ sectionMeta[sectionId].label }}</strong>
              <small>{{ sectionId }}.mdx</small>
            </button>
            <div class="section-actions">
              <span v-if="sectionCount[sectionId] > 0" class="count-badge">
                {{ sectionId === 'summary' ? '已填' : sectionCount[sectionId] }}
              </span>
              <span v-else-if="store.config.sectionVisible[sectionId]" class="count-badge warn">未填</span>
              <button @click="store.toggleSectionVisible(sectionId)"
                :title="store.config.sectionVisible[sectionId] ? '在简历中隐藏' : '在简历中显示'">
                {{ store.config.sectionVisible[sectionId] ? 'show' : 'hide' }}
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
