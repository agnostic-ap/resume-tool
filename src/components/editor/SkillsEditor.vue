<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'

const store = useResumeStore()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'
</script>

<template>
  <div class="space-y-3">
    <div v-for="skill in store.data.skills" :key="skill.id"
      class="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">技能分类</label>
        <input v-model="skill.category" :class="inputCls" placeholder="前端框架" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">技能列表（逗号分隔）</label>
        <input v-model="skill.items" :class="inputCls" placeholder="Vue3, React, TypeScript, Webpack" />
      </div>
      <button @click="store.removeSkill(skill.id)" class="text-xs text-red-400 hover:text-red-600 transition-colors">
        删除此条
      </button>
    </div>

    <button @click="store.addSkill()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加技能分类
    </button>
  </div>
</template>
