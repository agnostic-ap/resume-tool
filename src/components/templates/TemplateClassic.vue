<script setup lang="ts">
import { computed } from 'vue'
import type { ResumeData, ResumeConfig } from '../../types/resume'

const props = defineProps<{ data: ResumeData; config: ResumeConfig }>()

const visibleSections = computed(() =>
  props.config.sectionOrder.filter((id) => props.config.sectionVisible[id]),
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
  <div class="resume-paper bg-white" style="width:794px;min-height:1123px;padding:44px 52px 44px;">
    <!-- Header -->
    <div class="mb-4">
      <div class="flex items-end justify-between">
        <div>
          <h1 class="font-bold text-gray-900 mb-0.5" style="font-size:26px;letter-spacing:2px;">
            {{ data.personal.name }}
          </h1>
          <p class="text-gray-500" style="font-size:13px;letter-spacing:0.5px;">{{ data.personal.title }}</p>
        </div>
        <div class="text-right text-gray-500" style="font-size:11.5px;line-height:1.9;">
          <div v-if="data.personal.phone">{{ data.personal.phone }}</div>
          <div v-if="data.personal.email">{{ data.personal.email }}</div>
          <div v-if="data.personal.location">{{ data.personal.location }}</div>
          <div v-if="data.personal.website">{{ data.personal.website }}</div>
        </div>
      </div>
      <div class="mt-3" :style="`border-bottom:2.5px solid ${config.themeColor}`" />
    </div>

    <!-- Dynamic Sections -->
    <template v-for="sectionId in visibleSections" :key="sectionId">
      <!-- Summary -->
      <section v-if="sectionId === 'summary' && data.personal.summary" class="mb-4">
        <h2 class="font-bold mb-1.5" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          个人简介
        </h2>
        <p class="text-gray-600 leading-relaxed" style="font-size:12px;">{{ data.personal.summary }}</p>
      </section>

      <!-- Experience -->
      <section v-else-if="sectionId === 'experience' && data.experience.length" class="mb-4">
        <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          工作经历
        </h2>
        <div v-for="exp in data.experience" :key="exp.id" class="mb-3">
          <div class="flex justify-between items-baseline mb-0.5">
            <div class="flex items-baseline gap-2">
              <span class="font-bold text-gray-800" style="font-size:13px;">{{ exp.company }}</span>
              <span v-if="exp.position" class="text-gray-500" style="font-size:12px;">{{ exp.position }}</span>
              <span v-if="exp.location" class="text-gray-400" style="font-size:11px;">· {{ exp.location }}</span>
            </div>
            <span class="text-gray-400 shrink-0 ml-4" style="font-size:11px;">
              {{ dateRange(exp.startDate, exp.endDate, exp.current) }}
            </span>
          </div>
          <div v-if="exp.description" class="text-gray-600" style="font-size:12px;line-height:1.75;">
            <p v-for="(line, i) in lines(exp.description)" :key="i">{{ line }}</p>
          </div>
        </div>
      </section>

      <!-- Projects -->
      <section v-else-if="sectionId === 'projects' && data.projects.length" class="mb-4">
        <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          项目经历
        </h2>
        <div v-for="proj in data.projects" :key="proj.id" class="mb-3">
          <div class="flex justify-between items-baseline mb-0.5">
            <div class="flex items-baseline gap-2">
              <span class="font-bold text-gray-800" style="font-size:13px;">{{ proj.name }}</span>
              <span v-if="proj.role" class="text-gray-500" style="font-size:12px;">{{ proj.role }}</span>
            </div>
            <span class="text-gray-400 shrink-0 ml-4" style="font-size:11px;">
              {{ dateRange(proj.startDate, proj.endDate, false) }}
            </span>
          </div>
          <p v-if="proj.tech" class="text-gray-400 mb-0.5" style="font-size:11px;">技术栈：{{ proj.tech }}</p>
          <div v-if="proj.description" class="text-gray-600" style="font-size:12px;line-height:1.75;">
            <p v-for="(line, i) in lines(proj.description)" :key="i">{{ line }}</p>
          </div>
        </div>
      </section>

      <!-- Education -->
      <section v-else-if="sectionId === 'education' && data.education.length" class="mb-4">
        <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          教育经历
        </h2>
        <div v-for="edu in data.education" :key="edu.id" class="mb-2">
          <div class="flex justify-between items-baseline">
            <div class="flex items-baseline gap-2">
              <span class="font-bold text-gray-800" style="font-size:13px;">{{ edu.school }}</span>
              <span v-if="edu.major" class="text-gray-600" style="font-size:12px;">{{ edu.major }}</span>
              <span v-if="edu.degree" class="text-gray-400" style="font-size:11px;">· {{ edu.degree }}</span>
            </div>
            <span class="text-gray-400 shrink-0 ml-4" style="font-size:11px;">
              {{ dateRange(edu.startDate, edu.endDate, false) }}
            </span>
          </div>
          <p v-if="edu.gpa" class="text-gray-400 mt-0.5" style="font-size:11px;">GPA: {{ edu.gpa }}</p>
        </div>
      </section>

      <!-- Skills -->
      <section v-else-if="sectionId === 'skills' && data.skills.length" class="mb-4">
        <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          专业技能
        </h2>
        <div v-for="skill in data.skills" :key="skill.id" class="mb-1 flex" style="font-size:12px;">
          <span class="font-medium text-gray-700 shrink-0" style="min-width:80px;">{{ skill.category }}：</span>
          <span class="text-gray-600">{{ skill.items }}</span>
        </div>
      </section>

      <!-- Awards -->
      <section v-else-if="sectionId === 'awards' && data.awards.length" class="mb-4">
        <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          荣誉奖项
        </h2>
        <div v-for="award in data.awards" :key="award.id" class="mb-1.5">
          <div class="flex justify-between items-baseline">
            <span class="font-medium text-gray-800" style="font-size:12px;">{{ award.title }}</span>
            <span class="text-gray-400 shrink-0 ml-4" style="font-size:11px;">{{ fmtDate(award.date) }}</span>
          </div>
          <p v-if="award.issuer" class="text-gray-500" style="font-size:11px;">{{ award.issuer }}</p>
        </div>
      </section>

      <!-- Languages -->
      <section v-else-if="sectionId === 'languages' && data.languages.length" class="mb-4">
        <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          语言能力
        </h2>
        <div class="flex flex-wrap gap-x-8 gap-y-1" style="font-size:12px;">
          <div v-for="lang in data.languages" :key="lang.id" class="flex gap-2">
            <span class="font-medium text-gray-700">{{ lang.language }}</span>
            <span class="text-gray-500">{{ lang.level }}</span>
          </div>
        </div>
      </section>

      <!-- Certifications -->
      <section v-else-if="sectionId === 'certifications' && data.certifications.length" class="mb-4">
        <h2 class="font-bold mb-2" :style="`font-size:12.5px;color:${config.themeColor};border-bottom:1px solid #e5e7eb;padding-bottom:4px`">
          证书资质
        </h2>
        <div v-for="cert in data.certifications" :key="cert.id" class="mb-1.5">
          <div class="flex justify-between items-baseline">
            <span class="font-medium text-gray-800" style="font-size:12px;">{{ cert.name }}</span>
            <span class="text-gray-400 shrink-0 ml-4" style="font-size:11px;">{{ fmtDate(cert.date) }}</span>
          </div>
          <p v-if="cert.issuer" class="text-gray-500" style="font-size:11px;">{{ cert.issuer }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
