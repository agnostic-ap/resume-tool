<script setup lang="ts">
import { computed } from 'vue'
import type { ResumeData, ResumeConfig, SectionId } from '../../types/resume'

const props = defineProps<{ data: ResumeData; config: ResumeConfig }>()

const mainSections: SectionId[] = ['experience', 'projects', 'awards', 'certifications']
const sidebarSections: SectionId[] = ['summary', 'skills', 'education', 'languages']

const visibleMain = computed(() =>
  props.config.sectionOrder.filter(
    (id) => mainSections.includes(id) && props.config.sectionVisible[id],
  ),
)
const visibleSidebar = computed(() =>
  props.config.sectionOrder.filter(
    (id) => sidebarSections.includes(id) && props.config.sectionVisible[id],
  ),
)

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m] = d.split('-')
  return m ? `${y}.${m}` : y
}

function dateRange(start: string, end: string, current: boolean) {
  const s = fmtDate(start)
  const e = current ? '至今' : fmtDate(end)
  return s && e ? `${s} — ${e}` : s || e
}

function lines(text: string) {
  return text.split('\n').filter(Boolean)
}

</script>

<template>
  <div class="resume-paper bg-white" style="width:794px;min-height:1123px;">
    <!-- Header -->
    <div :style="`background:${config.themeColor}`" class="px-12 py-7">
      <h1 class="text-white font-bold mb-1" style="font-size:24px;letter-spacing:2px;">
        {{ data.personal.name }}
      </h1>
      <p class="mb-3" style="font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.5px;">
        {{ data.personal.title }}
      </p>
      <div class="flex flex-wrap gap-x-6 gap-y-0.5" style="font-size:11.5px;color:rgba(255,255,255,0.8);">
        <span v-if="data.personal.phone">{{ data.personal.phone }}</span>
        <span v-if="data.personal.email">{{ data.personal.email }}</span>
        <span v-if="data.personal.location">{{ data.personal.location }}</span>
        <span v-if="data.personal.website">{{ data.personal.website }}</span>
      </div>
    </div>

    <div class="flex">
      <!-- Sidebar -->
      <div class="shrink-0" style="width:210px;padding:24px 20px;background:#f8fafc;border-right:1px solid #e2e8f0;">
        <template v-for="sectionId in visibleSidebar" :key="sectionId">
          <!-- Summary -->
          <div v-if="sectionId === 'summary' && data.personal.summary" class="mb-5">
            <h3 class="font-bold mb-2" :style="`font-size:10.5px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
              个人简介
            </h3>
            <p class="text-gray-600 leading-relaxed" style="font-size:11px;">{{ data.personal.summary }}</p>
          </div>

          <!-- Skills -->
          <div v-else-if="sectionId === 'skills' && data.skills.length" class="mb-5">
            <h3 class="font-bold mb-2" :style="`font-size:10.5px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
              专业技能
            </h3>
            <div v-for="skill in data.skills" :key="skill.id" class="mb-2">
              <p class="font-semibold text-gray-700 mb-0.5" style="font-size:11px;">{{ skill.category }}</p>
              <p class="text-gray-500" style="font-size:11px;line-height:1.5;">{{ skill.items }}</p>
            </div>
          </div>

          <!-- Education -->
          <div v-else-if="sectionId === 'education' && data.education.length" class="mb-5">
            <h3 class="font-bold mb-2" :style="`font-size:10.5px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
              教育经历
            </h3>
            <div v-for="edu in data.education" :key="edu.id" class="mb-3">
              <p class="font-semibold text-gray-700" style="font-size:11px;">{{ edu.school }}</p>
              <p class="text-gray-500" style="font-size:11px;">{{ edu.major }}</p>
              <p class="text-gray-400" style="font-size:10px;">{{ edu.degree }} · {{ dateRange(edu.startDate, edu.endDate, false) }}</p>
              <p v-if="edu.gpa" class="text-gray-400" style="font-size:10px;">GPA {{ edu.gpa }}</p>
            </div>
          </div>

          <!-- Languages -->
          <div v-else-if="sectionId === 'languages' && data.languages.length" class="mb-5">
            <h3 class="font-bold mb-2" :style="`font-size:10.5px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
              语言能力
            </h3>
            <div v-for="lang in data.languages" :key="lang.id" class="mb-1">
              <span class="font-medium text-gray-700" style="font-size:11px;">{{ lang.language }}：</span>
              <span class="text-gray-500" style="font-size:11px;">{{ lang.level }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Main -->
      <div class="flex-1" style="padding:24px 32px;">
        <template v-for="sectionId in visibleMain" :key="sectionId">
          <!-- Experience -->
          <section v-if="sectionId === 'experience' && data.experience.length" class="mb-5">
            <h2 class="font-bold mb-2.5" :style="`font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor};border-bottom:2px solid ${config.themeColor};padding-bottom:5px`">
              工作经历
            </h2>
            <div v-for="exp in data.experience" :key="exp.id" class="mb-3.5 pl-3" :style="`border-left:3px solid ${config.themeColor}25`">
              <div class="flex justify-between items-baseline mb-0.5">
                <span class="font-bold text-gray-800" style="font-size:13px;">{{ exp.company }}</span>
                <span class="text-gray-400 shrink-0 ml-3" style="font-size:11px;">
                  {{ dateRange(exp.startDate, exp.endDate, exp.current) }}
                </span>
              </div>
              <p class="mb-1" :style="`font-size:12px;color:${config.themeColor}cc`">
                {{ exp.position }}<span v-if="exp.location" class="text-gray-400"> · {{ exp.location }}</span>
              </p>
              <div v-if="exp.description" class="text-gray-600" style="font-size:11.5px;line-height:1.75;">
                <p v-for="(line, i) in lines(exp.description)" :key="i">{{ line }}</p>
              </div>
            </div>
          </section>

          <!-- Projects -->
          <section v-else-if="sectionId === 'projects' && data.projects.length" class="mb-5">
            <h2 class="font-bold mb-2.5" :style="`font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor};border-bottom:2px solid ${config.themeColor};padding-bottom:5px`">
              项目经历
            </h2>
            <div v-for="proj in data.projects" :key="proj.id" class="mb-3.5 pl-3" :style="`border-left:3px solid ${config.themeColor}25`">
              <div class="flex justify-between items-baseline mb-0.5">
                <span class="font-bold text-gray-800" style="font-size:13px;">{{ proj.name }}</span>
                <span class="text-gray-400 shrink-0 ml-3" style="font-size:11px;">
                  {{ dateRange(proj.startDate, proj.endDate, false) }}
                </span>
              </div>
              <p v-if="proj.role" class="mb-0.5" :style="`font-size:12px;color:${config.themeColor}cc`">{{ proj.role }}</p>
              <p v-if="proj.tech" class="text-gray-400 mb-1" style="font-size:11px;">{{ proj.tech }}</p>
              <div v-if="proj.description" class="text-gray-600" style="font-size:11.5px;line-height:1.75;">
                <p v-for="(line, i) in lines(proj.description)" :key="i">{{ line }}</p>
              </div>
            </div>
          </section>

          <!-- Awards -->
          <section v-else-if="sectionId === 'awards' && data.awards.length" class="mb-5">
            <h2 class="font-bold mb-2.5" :style="`font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor};border-bottom:2px solid ${config.themeColor};padding-bottom:5px`">
              荣誉奖项
            </h2>
            <div v-for="award in data.awards" :key="award.id" class="mb-2">
              <div class="flex justify-between">
                <span class="font-medium text-gray-800" style="font-size:12px;">{{ award.title }}</span>
                <span class="text-gray-400 shrink-0 ml-3" style="font-size:11px;">{{ fmtDate(award.date) }}</span>
              </div>
              <p v-if="award.issuer" class="text-gray-500" style="font-size:11px;">{{ award.issuer }}</p>
            </div>
          </section>

          <!-- Certifications -->
          <section v-else-if="sectionId === 'certifications' && data.certifications.length" class="mb-5">
            <h2 class="font-bold mb-2.5" :style="`font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor};border-bottom:2px solid ${config.themeColor};padding-bottom:5px`">
              证书资质
            </h2>
            <div v-for="cert in data.certifications" :key="cert.id" class="mb-2">
              <div class="flex justify-between">
                <span class="font-medium text-gray-800" style="font-size:12px;">{{ cert.name }}</span>
                <span class="text-gray-400 shrink-0 ml-3" style="font-size:11px;">{{ fmtDate(cert.date) }}</span>
              </div>
              <p v-if="cert.issuer" class="text-gray-500" style="font-size:11px;">{{ cert.issuer }}</p>
            </div>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>
