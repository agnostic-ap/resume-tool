<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
import { useLocaleText } from '../../composables/useLocaleText'
const store = useResumeStore()
const { l } = useLocaleText()
</script>

<template>
  <div>
    <textarea v-model="store.data.personal.summary" rows="4"
      data-guide-field="summary"
      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
      style="resize:vertical"
      :placeholder="l('简短介绍自己的核心优势、技术方向和职业目标...', 'Briefly describe your strengths, technical focus, and career goal...')" />
    <p class="mt-1 text-xs text-gray-400">{{ l('建议 50-150 字，突出核心竞争力和目标方向', 'Recommended: 50-150 words focused on your core strengths and direction.') }}</p>
  </div>
</template>
