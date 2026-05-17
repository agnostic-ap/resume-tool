<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'

const store = useResumeStore()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'
</script>

<template>
  <div class="space-y-4">
    <div v-for="proj in store.data.projects" :key="proj.id"
      class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">项目名称</label>
          <input v-model="proj.name" :class="inputCls" placeholder="在线简历生成平台" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">担任角色</label>
          <input v-model="proj.role" :class="inputCls" placeholder="前端负责人" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">开始时间</label>
          <input v-model="proj.startDate" :class="inputCls" placeholder="2023-03" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">结束时间</label>
          <input v-model="proj.endDate" :class="inputCls" placeholder="2023-08" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">技术栈</label>
        <input v-model="proj.tech" :class="inputCls" placeholder="Vue3, TypeScript, Node.js" />
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">项目链接（选填）</label>
        <input v-model="proj.url" :class="inputCls" placeholder="github.com/xxx/project" />
      </div>

      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs font-medium text-gray-600">项目描述</label>
          <span class="text-xs" :class="proj.description.length < 50 ? 'text-amber-400' : 'text-gray-400'">
            {{ proj.description.length }} 字{{ proj.description.length < 50 ? '（建议超过50字）' : '' }}
          </span>
        </div>
        <textarea v-model="proj.description" rows="4" :class="inputCls" style="resize:vertical" placeholder="• 负责...&#10;• 实现..." />
      </div>

      <button @click="store.removeProject(proj.id)" class="text-xs text-red-400 hover:text-red-600 transition-colors">
        删除此条
      </button>
    </div>

    <button @click="store.addProject()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加项目经历
    </button>
  </div>
</template>
