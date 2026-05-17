<script setup lang="ts">
import { computed } from 'vue'
import type { ResumeData, ResumeConfig, SectionId } from '../../types/resume'

const props = defineProps<{ data: ResumeData; config: ResumeConfig }>()

const sidebarSet: SectionId[] = ['skills', 'education', 'languages', 'certifications', 'awards']
const mainSet: SectionId[] = ['summary', 'experience', 'projects']

const visibleSidebar = computed(() =>
  props.config.sectionOrder.filter(
    (id) => sidebarSet.includes(id) && props.config.sectionVisible[id],
  ),
)
const visibleMain = computed(() =>
  props.config.sectionOrder.filter(
    (id) => mainSet.includes(id) && props.config.sectionVisible[id],
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

function darken(hex: string, amt = 35): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amt)
  const g = Math.max(0, ((n >> 8) & 0xff) - amt)
  const b = Math.max(0, (n & 0xff) - amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
</script>

<template>
  <div class="resume-paper bg-white flex" style="width:794px;min-height:1123px;">
    <!-- Sidebar -->
    <div class="shrink-0 text-white" :style="`width:235px;background:${config.themeColor};padding:36px 22px`">
      <!-- Avatar + Name -->
      <div class="mb-6 text-center">
        <div class="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-2xl"
          :style="`background:${darken(config.themeColor)}`">
          {{ data.personal.name?.charAt(0) ?? '?' }}
        </div>
        <h1 class="font-bold text-white mb-1" style="font-size:17px;letter-spacing:1px;">{{ data.personal.name }}</h1>
        <p style="font-size:11.5px;opacity:0.85;line-height:1.4;">{{ data.personal.title }}</p>
      </div>

      <!-- Contact -->
      <div class="mb-5">
        <h3 class="font-bold mb-2 pb-1" style="font-size:10.5px;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.3);">
          联系方式
        </h3>
        <div style="font-size:11px;opacity:0.9;line-height:2;">
          <div v-if="data.personal.phone">{{ data.personal.phone }}</div>
          <div v-if="data.personal.email" class="break-all">{{ data.personal.email }}</div>
          <div v-if="data.personal.location">{{ data.personal.location }}</div>
          <div v-if="data.personal.website" class="break-all">{{ data.personal.website }}</div>
        </div>
      </div>

      <!-- Dynamic Sidebar Sections -->
      <template v-for="sectionId in visibleSidebar" :key="sectionId">
        <!-- Skills -->
        <div v-if="sectionId === 'skills' && data.skills.length" class="mb-5">
          <h3 class="font-bold mb-2 pb-1" style="font-size:10.5px;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.3);">
            专业技能
          </h3>
          <div v-for="skill in data.skills" :key="skill.id" class="mb-2">
            <p class="font-semibold" style="font-size:11px;margin-bottom:2px;">{{ skill.category }}</p>
            <p style="font-size:11px;opacity:0.8;line-height:1.5;">{{ skill.items }}</p>
          </div>
        </div>

        <!-- Education -->
        <div v-else-if="sectionId === 'education' && data.education.length" class="mb-5">
          <h3 class="font-bold mb-2 pb-1" style="font-size:10.5px;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.3);">
            教育经历
          </h3>
          <div v-for="edu in data.education" :key="edu.id" class="mb-3">
            <p class="font-semibold" style="font-size:12px;">{{ edu.school }}</p>
            <p style="font-size:11px;opacity:0.85;">{{ edu.major }} · {{ edu.degree }}</p>
            <p style="font-size:10px;opacity:0.7;">{{ dateRange(edu.startDate, edu.endDate, false) }}</p>
            <p v-if="edu.gpa" style="font-size:10px;opacity:0.7;">GPA: {{ edu.gpa }}</p>
          </div>
        </div>

        <!-- Languages -->
        <div v-else-if="sectionId === 'languages' && data.languages.length" class="mb-5">
          <h3 class="font-bold mb-2 pb-1" style="font-size:10.5px;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.3);">
            语言能力
          </h3>
          <div v-for="lang in data.languages" :key="lang.id" class="mb-1">
            <span style="font-size:11px;font-weight:600;">{{ lang.language }}：</span>
            <span style="font-size:11px;opacity:0.85;">{{ lang.level }}</span>
          </div>
        </div>

        <!-- Certifications -->
        <div v-else-if="sectionId === 'certifications' && data.certifications.length" class="mb-5">
          <h3 class="font-bold mb-2 pb-1" style="font-size:10.5px;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.3);">
            证书资质
          </h3>
          <div v-for="cert in data.certifications" :key="cert.id" class="mb-2">
            <p style="font-size:11px;font-weight:600;">{{ cert.name }}</p>
            <p style="font-size:10px;opacity:0.7;">{{ cert.issuer }} · {{ fmtDate(cert.date) }}</p>
          </div>
        </div>

        <!-- Awards -->
        <div v-else-if="sectionId === 'awards' && data.awards.length" class="mb-5">
          <h3 class="font-bold mb-2 pb-1" style="font-size:10.5px;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.3);">
            荣誉奖项
          </h3>
          <div v-for="award in data.awards" :key="award.id" class="mb-2">
            <p style="font-size:11px;font-weight:600;">{{ award.title }}</p>
            <p style="font-size:10px;opacity:0.7;">{{ award.issuer }} · {{ fmtDate(award.date) }}</p>
          </div>
        </div>
      </template>
    </div>

    <!-- Main -->
    <div class="flex-1" style="padding:36px 32px;">
      <template v-for="sectionId in visibleMain" :key="sectionId">
        <!-- Summary -->
        <section v-if="sectionId === 'summary' && data.personal.summary" class="mb-5">
          <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};padding-bottom:4px;border-bottom:2px solid ${config.themeColor}`">
            个人简介
          </h2>
          <p class="text-gray-600 leading-relaxed" style="font-size:12px;">{{ data.personal.summary }}</p>
        </section>

        <!-- Experience -->
        <section v-else-if="sectionId === 'experience' && data.experience.length" class="mb-5">
          <h2 class="font-bold mb-3" :style="`font-size:12.5px;color:${config.themeColor};padding-bottom:4px;border-bottom:2px solid ${config.themeColor}`">
            工作经历
          </h2>
          <div v-for="exp in data.experience" :key="exp.id" class="mb-4">
            <div class="flex justify-between items-baseline mb-0.5">
              <span class="font-bold text-gray-800" style="font-size:13px;">{{ exp.company }}</span>
              <span class="text-gray-400 shrink-0 ml-3" style="font-size:11px;">
                {{ dateRange(exp.startDate, exp.endDate, exp.current) }}
              </span>
            </div>
            <p class="font-medium mb-1" :style="`font-size:12px;color:${config.themeColor}`">
              {{ exp.position }}<span v-if="exp.location" class="text-gray-400"> · {{ exp.location }}</span>
            </p>
            <div v-if="exp.description" class="text-gray-600" style="font-size:12px;line-height:1.75;">
              <p v-for="(line, i) in lines(exp.description)" :key="i">{{ line }}</p>
            </div>
          </div>
        </section>

        <!-- Projects -->
        <section v-else-if="sectionId === 'projects' && data.projects.length" class="mb-5">
          <h2 class="font-bold mb-3" :style="`font-size:12.5px;color:${config.themeColor};padding-bottom:4px;border-bottom:2px solid ${config.themeColor}`">
            项目经历
          </h2>
          <div v-for="proj in data.projects" :key="proj.id" class="mb-4">
            <div class="flex justify-between items-baseline mb-0.5">
              <span class="font-bold text-gray-800" style="font-size:13px;">{{ proj.name }}</span>
              <span class="text-gray-400 shrink-0 ml-3" style="font-size:11px;">
                {{ dateRange(proj.startDate, proj.endDate, false) }}
              </span>
            </div>
            <p v-if="proj.role" class="font-medium mb-0.5" :style="`font-size:12px;color:${config.themeColor}`">{{ proj.role }}</p>
            <p v-if="proj.tech" class="text-gray-400 mb-1" style="font-size:11px;">{{ proj.tech }}</p>
            <div v-if="proj.description" class="text-gray-600" style="font-size:12px;line-height:1.75;">
              <p v-for="(line, i) in lines(proj.description)" :key="i">{{ line }}</p>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
