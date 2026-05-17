<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
const store = useResumeStore()
</script>

<template>
  <div>
    <textarea v-model="store.data.personal.summary" rows="4"
      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
      style="resize:vertical"
      placeholder="简短介绍自己的核心优势、技术方向和职业目标..." />
    <p class="mt-1 text-xs text-gray-400">建议 50–150 字，突出核心竞争力和目标方向</p>
  </div>
</template>
