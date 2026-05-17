<script setup lang="ts">
import { ref } from 'vue'
import PersonalEditor from './editor/PersonalEditor.vue'
import ExperienceEditor from './editor/ExperienceEditor.vue'
import EducationEditor from './editor/EducationEditor.vue'
import SkillsEditor from './editor/SkillsEditor.vue'
import ProjectsEditor from './editor/ProjectsEditor.vue'
import AwardsEditor from './editor/AwardsEditor.vue'

const sections = [
  { id: 'personal', label: '个人信息', icon: '👤', component: PersonalEditor },
  { id: 'experience', label: '工作经历', icon: '💼', component: ExperienceEditor },
  { id: 'education', label: '教育经历', icon: '🎓', component: EducationEditor },
  { id: 'skills', label: '专业技能', icon: '⚡', component: SkillsEditor },
  { id: 'projects', label: '项目经历', icon: '🚀', component: ProjectsEditor },
  { id: 'awards', label: '荣誉奖项', icon: '🏆', component: AwardsEditor },
]

const expanded = ref<Set<string>>(new Set(['personal']))

function toggle(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-white border-r border-gray-200" style="width: 360px; min-width: 360px;">
    <div class="p-4 space-y-2">
      <div v-for="section in sections" :key="section.id"
        class="border border-gray-100 rounded-xl overflow-hidden">
        <!-- Section Header -->
        <button @click="toggle(section.id)"
          class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
          <div class="flex items-center gap-2">
            <span class="text-base">{{ section.icon }}</span>
            <span class="text-sm font-semibold text-gray-700">{{ section.label }}</span>
          </div>
          <span class="text-gray-400 text-sm transition-transform duration-200"
            :class="expanded.has(section.id) ? 'rotate-180' : ''">▾</span>
        </button>

        <!-- Section Content -->
        <Transition name="fade">
          <div v-if="expanded.has(section.id)" class="p-4 border-t border-gray-100">
            <component :is="section.component" />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
