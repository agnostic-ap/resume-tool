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

function darkenColor(hex: string, amount = 30): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
</script>

<template>
  <div class="resume-paper bg-white flex" style="width: 794px; min-height: 1123px;">
    <!-- Sidebar -->
    <div class="shrink-0 text-white" :style="`width:230px;background:${config.themeColor};padding:40px 24px`">
      <!-- Name & Title -->
      <div class="mb-6 text-center">
        <div class="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold"
          :style="`background:${darkenColor(config.themeColor)}`">
          {{ data.personal.name.charAt(0) }}
        </div>
        <h1 class="font-bold text-white" style="font-size: 18px; letter-spacing: 1px;">{{ data.personal.name }}</h1>
        <p class="mt-1" style="font-size: 12px; opacity: 0.85;">{{ data.personal.title }}</p>
      </div>

      <!-- Contact -->
      <div class="mb-6">
        <h3 class="font-bold mb-2 pb-1" style="font-size: 11px; letter-spacing: 1.5px; border-bottom: 1px solid rgba(255,255,255,0.3);">
          联系方式
        </h3>
        <div style="font-size: 11px; opacity: 0.9; line-height: 2;">
          <div v-if="data.personal.phone">{{ data.personal.phone }}</div>
          <div v-if="data.personal.email">{{ data.personal.email }}</div>
          <div v-if="data.personal.location">{{ data.personal.location }}</div>
          <div v-if="data.personal.website">{{ data.personal.website }}</div>
        </div>
      </div>

      <!-- Skills -->
      <div v-if="data.skills.length" class="mb-6">
        <h3 class="font-bold mb-2 pb-1" style="font-size: 11px; letter-spacing: 1.5px; border-bottom: 1px solid rgba(255,255,255,0.3);">
          专业技能
        </h3>
        <div v-for="skill in data.skills" :key="skill.id" class="mb-2">
          <p class="font-semibold" style="font-size: 11px; margin-bottom: 2px;">{{ skill.category }}</p>
          <p style="font-size: 11px; opacity: 0.8; line-height: 1.5;">{{ skill.items }}</p>
        </div>
      </div>

      <!-- Education -->
      <div v-if="data.education.length" class="mb-6">
        <h3 class="font-bold mb-2 pb-1" style="font-size: 11px; letter-spacing: 1.5px; border-bottom: 1px solid rgba(255,255,255,0.3);">
          教育经历
        </h3>
        <div v-for="edu in data.education" :key="edu.id" class="mb-3">
          <p class="font-semibold" style="font-size: 12px;">{{ edu.school }}</p>
          <p style="font-size: 11px; opacity: 0.85;">{{ edu.major }} · {{ edu.degree }}</p>
          <p style="font-size: 10px; opacity: 0.7;">{{ dateRange(edu.startDate, edu.endDate, false) }}</p>
          <p v-if="edu.gpa" style="font-size: 10px; opacity: 0.7;">GPA: {{ edu.gpa }}</p>
        </div>
      </div>

      <!-- Awards -->
      <div v-if="data.awards.length">
        <h3 class="font-bold mb-2 pb-1" style="font-size: 11px; letter-spacing: 1.5px; border-bottom: 1px solid rgba(255,255,255,0.3);">
          荣誉奖项
        </h3>
        <div v-for="award in data.awards" :key="award.id" class="mb-2">
          <p class="font-medium" style="font-size: 11px;">{{ award.title }}</p>
          <p style="font-size: 10px; opacity: 0.7;">{{ award.issuer }} · {{ formatDate(award.date) }}</p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1" style="padding: 40px 36px;">
      <!-- Summary -->
      <section v-if="data.personal.summary" class="mb-6">
        <h2 class="font-bold mb-2 pb-1" :style="`font-size:13px;border-bottom:2px solid ${config.themeColor};color:${config.themeColor};display:inline-block`">
          个人简介
        </h2>
        <p class="text-gray-600 leading-relaxed" style="font-size: 12px;">{{ data.personal.summary }}</p>
      </section>

      <!-- Experience -->
      <section v-if="data.experience.length" class="mb-6">
        <h2 class="font-bold mb-3 pb-1" :style="`font-size:13px;border-bottom:2px solid ${config.themeColor};color:${config.themeColor};display:inline-block`">
          工作经历
        </h2>
        <div v-for="exp in data.experience" :key="exp.id" class="mb-4">
          <div class="flex justify-between items-baseline mb-0.5">
            <span class="font-bold text-gray-800" style="font-size: 13px;">{{ exp.company }}</span>
            <span class="text-gray-400 shrink-0 ml-3" style="font-size: 11px;">
              {{ dateRange(exp.startDate, exp.endDate, exp.current) }}
            </span>
          </div>
          <p class="font-medium mb-1" :style="`font-size:12px;color:${config.themeColor}`">
            {{ exp.position }}<span v-if="exp.location" class="text-gray-400"> · {{ exp.location }}</span>
          </p>
          <div v-if="exp.description" class="text-gray-600" style="font-size: 12px; line-height: 1.7;">
            <p v-for="(line, i) in descLines(exp.description)" :key="i">{{ line }}</p>
          </div>
        </div>
      </section>

      <!-- Projects -->
      <section v-if="data.projects.length" class="mb-6">
        <h2 class="font-bold mb-3 pb-1" :style="`font-size:13px;border-bottom:2px solid ${config.themeColor};color:${config.themeColor};display:inline-block`">
          项目经历
        </h2>
        <div v-for="proj in data.projects" :key="proj.id" class="mb-4">
          <div class="flex justify-between items-baseline mb-0.5">
            <span class="font-bold text-gray-800" style="font-size: 13px;">{{ proj.name }}</span>
            <span class="text-gray-400 shrink-0 ml-3" style="font-size: 11px;">
              {{ dateRange(proj.startDate, proj.endDate, false) }}
            </span>
          </div>
          <p v-if="proj.role" class="font-medium mb-0.5" :style="`font-size:12px;color:${config.themeColor}`">{{ proj.role }}</p>
          <p v-if="proj.tech" class="text-gray-400 mb-1" style="font-size: 11px;">{{ proj.tech }}</p>
          <div v-if="proj.description" class="text-gray-600" style="font-size: 12px; line-height: 1.7;">
            <p v-for="(line, i) in descLines(proj.description)" :key="i">{{ line }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
