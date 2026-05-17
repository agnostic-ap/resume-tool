<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
import { useDeleteConfirm } from '../../composables/useDeleteConfirm'

const store = useResumeStore()
const { pending: deletePending, askDelete, cancelDelete } = useDeleteConfirm()
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
      <div class="flex items-center gap-2">
        <template v-if="deletePending === skill.id">
          <span class="text-xs text-red-500">确认删除？</span>
          <button @click="store.removeSkill(skill.id)"
            class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">删除</button>
          <button @click="cancelDelete()"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors">取消</button>
        </template>
        <button v-else @click="askDelete(skill.id)"
          class="text-xs text-red-400 hover:text-red-600 transition-colors">
          删除此条
        </button>
      </div>
    </div>

    <button @click="store.addSkill()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加技能分类
    </button>
  </div>
</template>
