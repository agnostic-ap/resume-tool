<script setup lang="ts">
import type { ResumeData, ResumeConfig } from '../../types/resume'

const props = defineProps<{ data: ResumeData; config: ResumeConfig }>()

function formatDate(d: string) {
  if (!d) return ''
  const [y, m] = d.split('-')
  return `${y}.${m}`
}

function dateRange(start: string, end: string, current: boolean) {
  const s = formatDate(start)
  const e = current ? '至今' : formatDate(end)
  return s && e ? `${s} — ${e}` : s || e
}

function descLines(text: string) {
  return text.split('\n').filter(Boolean)
}
</script>

<template>
  <div class="resume-paper bg-white" style="width: 794px; min-height: 1123px;">
    <!-- Colored Header -->
    <div :style="`background:${config.themeColor}`" class="px-12 py-8">
      <h1 class="text-white font-bold mb-1" style="font-size: 26px; letter-spacing: 2px;">
        {{ data.personal.name }}
      </h1>
      <p class="mb-4" style="font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 1px;">
        {{ data.personal.title }}
      </p>
      <div class="flex flex-wrap gap-x-6 gap-y-1" style="font-size: 12px; color: rgba(255,255,255,0.8);">
        <span v-if="data.personal.phone">{{ data.personal.phone }}</span>
        <span v-if="data.personal.email">{{ data.personal.email }}</span>
        <span v-if="data.personal.location">{{ data.personal.location }}</span>
        <span v-if="data.personal.website">{{ data.personal.website }}</span>
      </div>
    </div>

    <div class="flex" style="padding: 0 0 40px 0;">
      <!-- Left Column -->
      <div class="shrink-0" style="width: 220px; padding: 28px 24px; background: #f8fafc; border-right: 1px solid #e2e8f0;">
        <!-- Summary -->
        <div v-if="data.personal.summary" class="mb-6">
          <h3 class="font-bold mb-2" :style="`font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
            个人简介
          </h3>
          <p class="text-gray-600 leading-relaxed" style="font-size: 11px;">{{ data.personal.summary }}</p>
        </div>

        <!-- Skills -->
        <div v-if="data.skills.length" class="mb-6">
          <h3 class="font-bold mb-2" :style="`font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
            专业技能
          </h3>
          <div v-for="skill in data.skills" :key="skill.id" class="mb-2">
            <p class="font-semibold text-gray-700 mb-0.5" style="font-size: 11px;">{{ skill.category }}</p>
            <p class="text-gray-500" style="font-size: 11px; line-height: 1.5;">{{ skill.items }}</p>
          </div>
        </div>

        <!-- Education -->
        <div v-if="data.education.length" class="mb-6">
          <h3 class="font-bold mb-2" :style="`font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
            教育经历
          </h3>
          <div v-for="edu in data.education" :key="edu.id" class="mb-3">
            <p class="font-semibold text-gray-700" style="font-size: 11px;">{{ edu.school }}</p>
            <p class="text-gray-500" style="font-size: 11px;">{{ edu.major }}</p>
            <p class="text-gray-500" style="font-size: 11px;">{{ edu.degree }}</p>
            <p class="text-gray-400" style="font-size: 10px;">{{ dateRange(edu.startDate, edu.endDate, false) }}</p>
          </div>
        </div>

        <!-- Awards -->
        <div v-if="data.awards.length">
          <h3 class="font-bold mb-2" :style="`font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor}`">
            荣誉奖项
          </h3>
          <div v-for="award in data.awards" :key="award.id" class="mb-2">
            <p class="font-medium text-gray-700" style="font-size: 11px;">{{ award.title }}</p>
            <p class="text-gray-400" style="font-size: 10px;">{{ award.issuer }} {{ formatDate(award.date) }}</p>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="flex-1" style="padding: 28px 36px;">
        <!-- Experience -->
        <section v-if="data.experience.length" class="mb-6">
          <h2 class="font-bold mb-3" :style="`font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor};border-bottom:2px solid ${config.themeColor};padding-bottom:6px`">
            工作经历
          </h2>
          <div v-for="exp in data.experience" :key="exp.id" class="mb-4 pl-3" :style="`border-left:3px solid ${config.themeColor}20`">
            <div class="flex justify-between items-baseline mb-1">
              <span class="font-bold text-gray-800" style="font-size: 13px;">{{ exp.company }}</span>
              <span class="text-gray-400 shrink-0 ml-3" style="font-size: 11px;">
                {{ dateRange(exp.startDate, exp.endDate, exp.current) }}
              </span>
            </div>
            <p class="text-gray-500 mb-1" style="font-size: 12px;">{{ exp.position }}<span v-if="exp.location"> · {{ exp.location }}</span></p>
            <div v-if="exp.description" class="text-gray-600" style="font-size: 12px; line-height: 1.7;">
              <p v-for="(line, i) in descLines(exp.description)" :key="i">{{ line }}</p>
            </div>
          </div>
        </section>

        <!-- Projects -->
        <section v-if="data.projects.length">
          <h2 class="font-bold mb-3" :style="`font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${config.themeColor};border-bottom:2px solid ${config.themeColor};padding-bottom:6px`">
            项目经历
          </h2>
          <div v-for="proj in data.projects" :key="proj.id" class="mb-4 pl-3" :style="`border-left:3px solid ${config.themeColor}20`">
            <div class="flex justify-between items-baseline mb-1">
              <span class="font-bold text-gray-800" style="font-size: 13px;">{{ proj.name }}</span>
              <span class="text-gray-400 shrink-0 ml-3" style="font-size: 11px;">
                {{ dateRange(proj.startDate, proj.endDate, false) }}
              </span>
            </div>
            <p v-if="proj.role" class="text-gray-500 mb-0.5" style="font-size: 12px;">{{ proj.role }}</p>
            <p v-if="proj.tech" class="text-gray-400 mb-1" style="font-size: 11px;">{{ proj.tech }}</p>
            <div v-if="proj.description" class="text-gray-600" style="font-size: 12px; line-height: 1.7;">
              <p v-for="(line, i) in descLines(proj.description)" :key="i">{{ line }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
