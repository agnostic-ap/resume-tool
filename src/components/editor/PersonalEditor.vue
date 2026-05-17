<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'

const store = useResumeStore()
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">姓名</label>
        <input v-model="store.data.personal.name" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="张明" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">求职岗位</label>
        <input v-model="store.data.personal.title" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="前端开发工程师" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">手机</label>
        <input v-model="store.data.personal.phone" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="138-0000-0000" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">邮箱</label>
        <input v-model="store.data.personal.email" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="your@email.com" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">所在城市</label>
        <input v-model="store.data.personal.location" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="北京市" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">个人网站 / GitHub</label>
        <input v-model="store.data.personal.website" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="github.com/xxx" />
      </div>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">个人简介</label>
      <textarea v-model="store.data.personal.summary" rows="3" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" placeholder="简短介绍自己的核心优势和职业经历..." />
    </div>
  </div>
</template>
