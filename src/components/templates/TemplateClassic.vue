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
  <div class="resume-paper bg-white" style="width: 794px; min-height: 1123px; padding: 48px 52px;">
    <!-- Header -->
    <div class="text-center mb-5">
      <h1 class="font-bold text-gray-900 mb-1" style="font-size: 28px; letter-spacing: 2px;">
        {{ data.personal.name }}
      </h1>
      <p class="text-gray-500 mb-3" style="font-size: 13px; letter-spacing: 1px;">
        {{ data.personal.title }}
      </p>
      <div class="flex justify-center flex-wrap gap-x-5 gap-y-1 text-gray-500" style="font-size: 12px;">
        <span v-if="data.personal.phone">{{ data.personal.phone }}</span>
        <span v-if="data.personal.email">{{ data.personal.email }}</span>
        <span v-if="data.personal.location">{{ data.personal.location }}</span>
        <span v-if="data.personal.website">{{ data.personal.website }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="mb-4" :style="{ borderTop: `2px solid ${config.themeColor}` }"></div>

    <!-- Summary -->
    <section v-if="data.personal.summary" class="mb-5">
      <h2 class="font-bold text-gray-800 mb-2 pb-1" :style="`font-size:13px;border-bottom:1px solid #e5e7eb;color:${config.themeColor}`">
        个人简介
      </h2>
      <p class="text-gray-600 leading-relaxed" style="font-size: 12px;">{{ data.personal.summary }}</p>
    </section>

    <!-- Experience -->
    <section v-if="data.experience.length" class="mb-5">
      <h2 class="font-bold mb-2 pb-1" :style="`font-size:13px;border-bottom:1px solid #e5e7eb;color:${config.themeColor}`">
        工作经历
      </h2>
      <div v-for="exp in data.experience" :key="exp.id" class="mb-4">
        <div class="flex justify-between items-baseline mb-1">
          <div>
            <span class="font-semibold text-gray-800" style="font-size: 13px;">{{ exp.company }}</span>
            <span v-if="exp.position" class="text-gray-500 ml-2" style="font-size: 12px;">{{ exp.position }}</span>
          </div>
          <span class="text-gray-400 shrink-0 ml-4" style="font-size: 11px;">
            {{ dateRange(exp.startDate, exp.endDate, exp.current) }}
            <span v-if="exp.location"> · {{ exp.location }}</span>
          </span>
        </div>
        <div v-if="exp.description" class="text-gray-600" style="font-size: 12px; line-height: 1.7;">
          <p v-for="(line, i) in descLines(exp.description)" :key="i">{{ line }}</p>
        </div>
      </div>
    </section>

    <!-- Projects -->
    <section v-if="data.projects.length" class="mb-5">
      <h2 class="font-bold mb-2 pb-1" :style="`font-size:13px;border-bottom:1px solid #e5e7eb;color:${config.themeColor}`">
        项目经历
      </h2>
      <div v-for="proj in data.projects" :key="proj.id" class="mb-4">
        <div class="flex justify-between items-baseline mb-1">
          <div>
            <span class="font-semibold text-gray-800" style="font-size: 13px;">{{ proj.name }}</span>
            <span v-if="proj.role" class="text-gray-500 ml-2" style="font-size: 12px;">{{ proj.role }}</span>
          </div>
          <span class="text-gray-400 shrink-0 ml-4" style="font-size: 11px;">
            {{ dateRange(proj.startDate, proj.endDate, false) }}
          </span>
        </div>
        <p v-if="proj.tech" class="text-gray-500 mb-1" style="font-size: 11px;">技术栈：{{ proj.tech }}</p>
        <div v-if="proj.description" class="text-gray-600" style="font-size: 12px; line-height: 1.7;">
          <p v-for="(line, i) in descLines(proj.description)" :key="i">{{ line }}</p>
        </div>
      </div>
    </section>

    <!-- Education -->
    <section v-if="data.education.length" class="mb-5">
      <h2 class="font-bold mb-2 pb-1" :style="`font-size:13px;border-bottom:1px solid #e5e7eb;color:${config.themeColor}`">
        教育经历
      </h2>
      <div v-for="edu in data.education" :key="edu.id" class="mb-3">
        <div class="flex justify-between items-baseline">
          <div>
            <span class="font-semibold text-gray-800" style="font-size: 13px;">{{ edu.school }}</span>
            <span v-if="edu.major" class="text-gray-600 ml-2" style="font-size: 12px;">{{ edu.major }}</span>
            <span v-if="edu.degree" class="text-gray-500 ml-2" style="font-size: 12px;">· {{ edu.degree }}</span>
          </div>
          <span class="text-gray-400 shrink-0 ml-4" style="font-size: 11px;">
            {{ dateRange(edu.startDate, edu.endDate, false) }}
          </span>
        </div>
        <p v-if="edu.gpa" class="text-gray-500 mt-0.5" style="font-size: 11px;">GPA: {{ edu.gpa }}</p>
      </div>
    </section>

    <!-- Skills -->
    <section v-if="data.skills.length" class="mb-5">
      <h2 class="font-bold mb-2 pb-1" :style="`font-size:13px;border-bottom:1px solid #e5e7eb;color:${config.themeColor}`">
        专业技能
      </h2>
      <div v-for="skill in data.skills" :key="skill.id" class="mb-1.5 flex" style="font-size: 12px;">
        <span class="font-medium text-gray-700 shrink-0 w-20">{{ skill.category }}：</span>
        <span class="text-gray-600">{{ skill.items }}</span>
      </div>
    </section>

    <!-- Awards -->
    <section v-if="data.awards.length" class="mb-5">
      <h2 class="font-bold mb-2 pb-1" :style="`font-size:13px;border-bottom:1px solid #e5e7eb;color:${config.themeColor}`">
        荣誉奖项
      </h2>
      <div v-for="award in data.awards" :key="award.id" class="mb-2">
        <div class="flex justify-between items-baseline">
          <span class="font-medium text-gray-800" style="font-size: 12px;">{{ award.title }}</span>
          <span class="text-gray-400 shrink-0 ml-4" style="font-size: 11px;">{{ formatDate(award.date) }}</span>
        </div>
        <p v-if="award.issuer" class="text-gray-500" style="font-size: 11px;">{{ award.issuer }}</p>
      </div>
    </section>
  </div>
</template>
