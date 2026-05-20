<script setup lang="ts">
import { computed } from 'vue'
import type { ResumeConfig, ResumeData, SectionId } from '../../types/resume'
import { useLocaleText } from '../../composables/useLocaleText'

const props = defineProps<{ data: ResumeData; config: ResumeConfig }>()
const { l } = useLocaleText()

const variant = computed(() => props.config.templateId)
const visibleSections = computed(() => {
  const sections = props.config.sectionOrder.filter((id) => props.config.sectionVisible[id])
  if (variant.value !== 'academic') return sections
  return ['summary', 'education', 'projects', 'experience', 'skills', 'awards', 'certifications', 'languages']
    .filter((id) => sections.includes(id as SectionId)) as SectionId[]
})

const sideSections = computed(() => visibleSections.value.filter((id) => ['skills', 'education', 'languages', 'certifications'].includes(id)))
const mainSections = computed(() => {
  if (!['executive', 'creative'].includes(variant.value)) return visibleSections.value
  return visibleSections.value.filter((id) => !sideSections.value.includes(id))
})

const metricItems = computed(() => [
  { label: l('工作经历', 'Roles'), value: props.data.experience.length },
  { label: l('项目', 'Projects'), value: props.data.projects.length },
  { label: l('技能组', 'Skills'), value: props.data.skills.length },
])

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m] = d.split('-')
  return m ? `${y}.${m}` : y
}

function dateRange(start: string, end: string, current = false) {
  const s = fmtDate(start)
  const e = current ? l('至今', 'Present') : fmtDate(end)
  return s && e ? `${s} - ${e}` : s || e
}

function lines(text: string) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
}

function sectionTitle(id: SectionId) {
  const titles: Record<SectionId, string> = {
    summary: l('个人简介', 'Summary'),
    experience: l('工作经历', 'Experience'),
    education: l('教育经历', 'Education'),
    skills: l('专业技能', 'Skills'),
    projects: l('项目经历', 'Projects'),
    awards: l('荣誉奖项', 'Awards'),
    languages: l('语言能力', 'Languages'),
    certifications: l('证书资质', 'Certifications'),
  }
  return titles[id]
}
</script>

<template>
  <div
    class="adaptive-paper"
    :class="`adaptive-${variant}`"
    :style="{ '--accent': config.themeColor, '--base-size': `${config.fontSize}px` }">
    <div class="adaptive-accent" />

    <header class="adaptive-header">
      <div>
        <p class="adaptive-kicker">
          {{ data.personal.title || l('目标岗位', 'Target role') }}
        </p>
        <h1>{{ data.personal.name || l('您的姓名', 'Your Name') }}</h1>
      </div>
      <div class="adaptive-contact">
        <span v-if="data.personal.phone">{{ data.personal.phone }}</span>
        <span v-if="data.personal.email">{{ data.personal.email }}</span>
        <span v-if="data.personal.location">{{ data.personal.location }}</span>
        <span v-if="data.personal.website">{{ data.personal.website }}</span>
      </div>
    </header>

    <div v-if="variant === 'technical' || variant === 'product'" class="adaptive-metrics">
      <div v-for="metric in metricItems" :key="metric.label">
        <b>{{ metric.value }}</b>
        <span>{{ metric.label }}</span>
      </div>
    </div>

    <div class="adaptive-body" :class="{ 'has-side': variant === 'executive' || variant === 'creative' }">
      <aside v-if="variant === 'executive' || variant === 'creative'" class="adaptive-side">
        <section v-for="sectionId in sideSections" :key="sectionId" class="adaptive-section">
          <h2>{{ sectionTitle(sectionId) }}</h2>

          <div v-if="sectionId === 'skills'" class="adaptive-tags">
            <template v-for="skill in data.skills" :key="skill.id">
              <b>{{ skill.category }}</b>
              <span v-for="item in skill.items.split(/[,，、]/).map((x) => x.trim()).filter(Boolean)" :key="`${skill.id}-${item}`">{{ item }}</span>
            </template>
          </div>

          <div v-else-if="sectionId === 'education'" class="adaptive-mini-list">
            <div v-for="edu in data.education" :key="edu.id">
              <b>{{ edu.school }}</b>
              <span>{{ edu.major }} · {{ edu.degree }}</span>
              <small>{{ dateRange(edu.startDate, edu.endDate) }}</small>
            </div>
          </div>

          <div v-else-if="sectionId === 'languages'" class="adaptive-mini-list">
            <div v-for="item in data.languages" :key="item.id">
              <b>{{ item.language }}</b>
              <span>{{ item.level }}</span>
            </div>
          </div>

          <div v-else-if="sectionId === 'certifications'" class="adaptive-mini-list">
            <div v-for="item in data.certifications" :key="item.id">
              <b>{{ item.name }}</b>
              <span>{{ item.issuer }}</span>
            </div>
          </div>
        </section>
      </aside>

      <main class="adaptive-main">
        <section v-for="(sectionId, index) in mainSections" :key="sectionId" class="adaptive-section">
          <h2><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ sectionTitle(sectionId) }}</h2>

          <p v-if="sectionId === 'summary' && data.personal.summary" class="adaptive-summary">
            {{ data.personal.summary }}
          </p>

          <div v-else-if="sectionId === 'experience'" class="adaptive-list">
            <article v-for="exp in data.experience" :key="exp.id">
              <div class="adaptive-row">
                <b>{{ exp.company }}</b>
                <span>{{ dateRange(exp.startDate, exp.endDate, exp.current) }}</span>
              </div>
              <strong>{{ exp.position }}<small v-if="exp.location"> · {{ exp.location }}</small></strong>
              <p v-for="(line, i) in lines(exp.description)" :key="i">{{ line }}</p>
            </article>
          </div>

          <div v-else-if="sectionId === 'projects'" class="adaptive-list adaptive-projects">
            <article v-for="project in data.projects" :key="project.id">
              <div class="adaptive-row">
                <b>{{ project.name }}</b>
                <span>{{ dateRange(project.startDate, project.endDate) }}</span>
              </div>
              <strong>{{ project.role }}</strong>
              <em v-if="project.tech">{{ project.tech }}</em>
              <p v-for="(line, i) in lines(project.description)" :key="i">{{ line }}</p>
            </article>
          </div>

          <div v-else-if="sectionId === 'education'" class="adaptive-list">
            <article v-for="edu in data.education" :key="edu.id">
              <div class="adaptive-row">
                <b>{{ edu.school }}</b>
                <span>{{ dateRange(edu.startDate, edu.endDate) }}</span>
              </div>
              <strong>{{ edu.major }} · {{ edu.degree }}</strong>
              <p v-if="edu.gpa">{{ edu.gpa }}</p>
              <p v-if="edu.description">{{ edu.description }}</p>
            </article>
          </div>

          <div v-else-if="sectionId === 'skills'" class="adaptive-skill-grid">
            <div v-for="skill in data.skills" :key="skill.id">
              <b>{{ skill.category }}</b>
              <span>{{ skill.items }}</span>
            </div>
          </div>

          <div v-else-if="sectionId === 'awards'" class="adaptive-mini-list">
            <div v-for="award in data.awards" :key="award.id">
              <b>{{ award.title }}</b>
              <span>{{ award.issuer }} · {{ fmtDate(award.date) }}</span>
              <small v-if="award.description">{{ award.description }}</small>
            </div>
          </div>

          <div v-else-if="sectionId === 'languages'" class="adaptive-mini-list">
            <div v-for="item in data.languages" :key="item.id">
              <b>{{ item.language }}</b>
              <span>{{ item.level }}</span>
            </div>
          </div>

          <div v-else-if="sectionId === 'certifications'" class="adaptive-mini-list">
            <div v-for="item in data.certifications" :key="item.id">
              <b>{{ item.name }}</b>
              <span>{{ item.issuer }} · {{ fmtDate(item.date) }}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.adaptive-paper {
  --accent: #c65a3a;
  --base-size: 14px;
  position: relative;
  width: 794px;
  min-height: 1123px;
  padding: 46px 56px;
  overflow: hidden;
  background: #fff;
  color: #24211d;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
  font-size: var(--base-size);
}

.adaptive-accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 9px;
  background: var(--accent);
}

.adaptive-header {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--accent);
}

.adaptive-kicker {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.adaptive-header h1 {
  margin: 0;
  color: #15120f;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 34px;
  font-weight: 600;
  line-height: 1;
}

.adaptive-contact {
  display: grid;
  gap: 5px;
  align-content: start;
  color: #696158;
  font-size: 11px;
  text-align: right;
}

.adaptive-body {
  display: block;
  margin-top: 22px;
}

.adaptive-body.has-side {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 28px;
}

.adaptive-side {
  padding-right: 18px;
  border-right: 1px solid #e6dfd7;
}

.adaptive-section {
  margin-bottom: 18px;
}

.adaptive-section h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 9px;
  color: #1d1a17;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.adaptive-section h2 span {
  color: var(--accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 500;
}

.adaptive-summary {
  margin: 0;
  color: #4d4842;
  font-size: 12.5px;
  line-height: 1.75;
}

.adaptive-list {
  display: grid;
  gap: 12px;
}

.adaptive-list article {
  break-inside: avoid;
}

.adaptive-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 3px;
}

.adaptive-row b {
  color: #191613;
  font-size: 13px;
}

.adaptive-row span {
  flex-shrink: 0;
  color: #8a8177;
  font-size: 10.5px;
}

.adaptive-list strong {
  display: block;
  margin-bottom: 4px;
  color: #5b544c;
  font-size: 11.5px;
  font-weight: 600;
}

.adaptive-list small {
  color: #8a8177;
  font-weight: 400;
}

.adaptive-list p {
  margin: 0 0 2px;
  color: #4b4640;
  font-size: 11.5px;
  line-height: 1.55;
}

.adaptive-list em {
  display: block;
  margin-bottom: 4px;
  color: var(--accent);
  font-size: 10.5px;
  font-style: normal;
}

.adaptive-skill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.adaptive-skill-grid div,
.adaptive-mini-list div {
  padding: 8px;
  border: 1px solid #ece5de;
  background: #fbf8f4;
}

.adaptive-skill-grid b,
.adaptive-mini-list b,
.adaptive-tags b {
  display: block;
  margin-bottom: 3px;
  color: #211d19;
  font-size: 11px;
}

.adaptive-skill-grid span,
.adaptive-mini-list span,
.adaptive-mini-list small {
  display: block;
  color: #635c54;
  font-size: 10.5px;
  line-height: 1.45;
}

.adaptive-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.adaptive-tags b {
  width: 100%;
}

.adaptive-tags span {
  padding: 3px 6px;
  border: 1px solid color-mix(in srgb, var(--accent) 36%, #fff);
  color: #3b342e;
  font-size: 10px;
}

.adaptive-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0 20px;
}

.adaptive-metrics div {
  padding: 10px;
  border: 1px solid #e5ded6;
  background: #fbf7f1;
}

.adaptive-metrics b {
  display: block;
  color: var(--accent);
  font-size: 22px;
  line-height: 1;
}

.adaptive-metrics span {
  color: #6a6259;
  font-size: 10px;
  text-transform: uppercase;
}

.adaptive-compact {
  padding: 34px 42px;
  font-size: calc(var(--base-size) - 1px);
}

.adaptive-compact .adaptive-section {
  margin-bottom: 12px;
}

.adaptive-executive {
  padding-left: 74px;
}

.adaptive-executive .adaptive-accent {
  width: 46px;
  background: #2f2923;
}

.adaptive-executive .adaptive-header h1 {
  font-size: 36px;
}

.adaptive-creative {
  padding-top: 76px;
}

.adaptive-creative .adaptive-accent {
  inset: 0 0 auto 0;
  width: auto;
  height: 48px;
  background: var(--accent);
}

.adaptive-creative .adaptive-header {
  border-bottom-style: dashed;
}

.adaptive-academic {
  font-family: Georgia, "Times New Roman", serif;
}

.adaptive-academic .adaptive-accent {
  width: 0;
}

.adaptive-academic .adaptive-header {
  justify-content: center;
  text-align: center;
}

.adaptive-academic .adaptive-contact {
  text-align: center;
}

.adaptive-technical {
  background: #fbfcfc;
}

.adaptive-technical .adaptive-header {
  margin: -46px -56px 0;
  padding: 34px 56px 22px;
  background: #182027;
  border-bottom: 0;
}

.adaptive-technical .adaptive-header h1,
.adaptive-technical .adaptive-kicker {
  color: #fff;
}

.adaptive-technical .adaptive-contact {
  color: #cbd5df;
}

.adaptive-product .adaptive-section h2 {
  border-left: 4px solid var(--accent);
  padding-left: 8px;
}

.adaptive-product .adaptive-list article {
  padding: 10px;
  border: 1px solid #e8e0d8;
  background: #fbf8f4;
}

.adaptive-minimal {
  padding: 64px 74px;
}

.adaptive-minimal .adaptive-accent {
  width: 0;
}

.adaptive-minimal .adaptive-header {
  border-bottom: 1px solid #ddd6ce;
}

.adaptive-minimal .adaptive-section h2 span,
.adaptive-minimal .adaptive-kicker {
  color: #8a8177;
}
</style>
