<script setup lang="ts">
import { ref, computed } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { SectionId } from '../types/resume'
import PersonalEditor from './editor/PersonalEditor.vue'
import ExperienceEditor from './editor/ExperienceEditor.vue'
import EducationEditor from './editor/EducationEditor.vue'
import SkillsEditor from './editor/SkillsEditor.vue'
import ProjectsEditor from './editor/ProjectsEditor.vue'
import AwardsEditor from './editor/AwardsEditor.vue'
import LanguagesEditor from './editor/LanguagesEditor.vue'
import CertificationsEditor from './editor/CertificationsEditor.vue'

const store = useResumeStore()

const sectionMeta: Record<SectionId, { label: string; icon: string; component: any }> = {
  summary: { label: '个人简介', icon: '📝', component: null },
  experience: { label: '工作经历', icon: '💼', component: ExperienceEditor },
  education: { label: '教育经历', icon: '🎓', component: EducationEditor },
  skills: { label: '专业技能', icon: '⚡', component: SkillsEditor },
  projects: { label: '项目经历', icon: '🚀', component: ProjectsEditor },
  awards: { label: '荣誉奖项', icon: '🏆', component: AwardsEditor },
  languages: { label: '语言能力', icon: '🌐', component: LanguagesEditor },
  certifications: { label: '证书资质', icon: '📜', component: CertificationsEditor },
}

// section content count badges
const sectionCount = computed<Record<SectionId, number>>(() => ({
  summary:        store.data.personal.summary.trim() ? 1 : 0,
  experience:     store.data.experience.length,
  education:      store.data.education.length,
  skills:         store.data.skills.length,
  projects:       store.data.projects.length,
  awards:         store.data.awards.length,
  languages:      store.data.languages.length,
  certifications: store.data.certifications.length,
}))

const expanded = ref<Set<string>>(new Set(['personal']))

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

const completenessColor = computed(() => {
  const s = store.completeness
  if (s < 40) return '#ef4444'
  if (s < 70) return '#f59e0b'
  return '#22c55e'
})

const completenessLabel = computed(() => {
  const s = store.completeness
  if (s < 40) return '待完善'
  if (s < 70) return '基本完整'
  if (s < 100) return '接近完美'
  return '完美简历'
})
</script>

<template>
  <div class="h-full overflow-y-auto bg-white border-r border-gray-200 flex flex-col" style="width: 360px; min-width: 360px;">
    <!-- Completeness Bar -->
    <div class="px-4 pt-4 pb-3 border-b border-gray-100">
      <div class="flex justify-between items-center mb-1.5">
        <span class="text-xs font-semibold text-gray-600">简历完整度</span>
        <span class="text-xs font-bold" :style="`color:${completenessColor}`">
          {{ store.completeness }}% · {{ completenessLabel }}
        </span>
      </div>
      <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
          :style="`width:${store.completeness}%;background:${completenessColor}`" />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
      <!-- Personal Info (always first, fixed) -->
      <div class="border border-gray-100 rounded-xl overflow-hidden">
        <button @click="toggle('personal')"
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
          <div class="flex items-center gap-2">
            <span>👤</span>
            <span class="text-sm font-semibold text-gray-700">个人信息</span>
          </div>
          <span class="text-gray-400 text-sm transition-transform duration-200"
            :class="expanded.has('personal') ? 'rotate-180' : 'rotate-0'"
            style="display:inline-block">▾</span>
        </button>
        <Transition name="fade">
          <div v-if="expanded.has('personal')" class="p-4 border-t border-gray-100">
            <PersonalEditor />
          </div>
        </Transition>
      </div>

      <!-- Dynamic Sections (from config.sectionOrder) -->
      <div v-for="(sectionId, idx) in store.config.sectionOrder" :key="sectionId"
        class="border rounded-xl overflow-hidden transition-all"
        :class="store.config.sectionVisible[sectionId] ? 'border-gray-100' : 'border-gray-100 opacity-60'">

        <div class="flex items-center bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-2.5 gap-1">
          <!-- Expand Toggle -->
          <button @click="toggle(sectionId)" class="flex-1 flex items-center gap-2 text-left min-w-0">
            <span class="text-base">{{ sectionMeta[sectionId].icon }}</span>
            <span class="text-sm font-semibold text-gray-700 truncate">{{ sectionMeta[sectionId].label }}</span>
            <!-- count badge -->
            <span v-if="sectionCount[sectionId] > 0"
              class="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
              style="background:#dbeafe;color:#2563eb;font-size:10px;">
              {{ sectionId === 'summary' ? '已填' : sectionCount[sectionId] }}
            </span>
            <span v-else-if="store.config.sectionVisible[sectionId]"
              class="text-xs shrink-0" style="color:#f59e0b;font-size:10px;">未填</span>
            <span v-if="!store.config.sectionVisible[sectionId]" class="text-xs text-gray-400 shrink-0">已隐藏</span>
          </button>

          <!-- Controls -->
          <div class="flex items-center gap-1 shrink-0">
            <!-- Visibility Toggle -->
            <button @click="store.toggleSectionVisible(sectionId)"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-sm"
              :title="store.config.sectionVisible[sectionId] ? '在简历中隐藏' : '在简历中显示'">
              {{ store.config.sectionVisible[sectionId] ? '👁' : '🙈' }}
            </button>

            <!-- Move Up -->
            <button @click="store.moveSection(sectionId, 'up')" :disabled="idx === 0"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs">
              ↑
            </button>

            <!-- Move Down -->
            <button @click="store.moveSection(sectionId, 'down')"
              :disabled="idx === store.config.sectionOrder.length - 1"
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs">
              ↓
            </button>

            <!-- Expand Arrow -->
            <button @click="toggle(sectionId)" class="w-7 h-7 flex items-center justify-center text-gray-400 text-sm">
              <span class="transition-transform duration-200 inline-block"
                :class="expanded.has(sectionId) ? 'rotate-180' : 'rotate-0'">▾</span>
            </button>
          </div>
        </div>

        <Transition name="fade">
          <div v-if="expanded.has(sectionId) && sectionMeta[sectionId].component"
            class="p-4 border-t border-gray-100">
            <component :is="sectionMeta[sectionId].component" />
          </div>
          <div v-else-if="expanded.has(sectionId) && sectionId === 'summary'"
            class="p-4 border-t border-gray-100">
            <label class="block text-xs font-medium text-gray-600 mb-1">个人简介</label>
            <textarea v-model="store.data.personal.summary" rows="4"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              style="resize:vertical"
              placeholder="简短介绍自己的核心优势、技术方向和职业目标..." />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
