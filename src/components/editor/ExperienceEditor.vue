<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'

const store = useResumeStore()

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'
</script>

<template>
  <div class="space-y-4">
    <div v-for="exp in store.data.experience" :key="exp.id"
      class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">公司名称</label>
          <input v-model="exp.company" :class="inputCls" placeholder="某科技有限公司" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">职位</label>
          <input v-model="exp.position" :class="inputCls" placeholder="前端开发工程师" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">开始时间</label>
          <input v-model="exp.startDate" type="month" :class="inputCls" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">结束时间</label>
          <input v-model="exp.endDate" type="month" :disabled="exp.current" :class="inputCls" />
        </div>
        <div class="flex items-end pb-1">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" v-model="exp.current" class="rounded" />
            <span class="text-xs text-gray-600">在职中</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">城市</label>
        <input v-model="exp.location" :class="inputCls" placeholder="北京" />
      </div>

      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs font-medium text-gray-600">工作描述（每行一条，支持• 开头）</label>
          <span class="text-xs" :class="exp.description.length < 50 ? 'text-amber-400' : 'text-gray-400'">
            {{ exp.description.length }} 字{{ exp.description.length < 50 ? '（建议超过50字）' : '' }}
          </span>
        </div>
        <textarea v-model="exp.description" rows="4" :class="inputCls" style="resize:vertical" placeholder="• 负责...&#10;• 优化..." />
      </div>

      <button @click="store.removeExperience(exp.id)"
        class="text-xs text-red-400 hover:text-red-600 transition-colors">
        删除此条
      </button>
    </div>

    <button @click="store.addExperience()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加工作经历
    </button>
  </div>
</template>
