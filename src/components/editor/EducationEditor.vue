<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'

const store = useResumeStore()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'
</script>

<template>
  <div class="space-y-4">
    <div v-for="edu in store.data.education" :key="edu.id"
      class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">学校名称</label>
          <input v-model="edu.school" :class="inputCls" placeholder="北京大学" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">专业</label>
          <input v-model="edu.major" :class="inputCls" placeholder="计算机科学与技术" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">学历</label>
          <select v-model="edu.degree" :class="inputCls">
            <option>专科</option>
            <option>本科</option>
            <option>硕士</option>
            <option>博士</option>
            <option>其他</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">开始时间</label>
          <input v-model="edu.startDate" type="month" :class="inputCls" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">结束时间</label>
          <input v-model="edu.endDate" type="month" :class="inputCls" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">GPA（选填）</label>
        <input v-model="edu.gpa" :class="inputCls" placeholder="3.8/4.0" />
      </div>

      <button @click="store.removeEducation(edu.id)" class="text-xs text-red-400 hover:text-red-600 transition-colors">
        删除此条
      </button>
    </div>

    <button @click="store.addEducation()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加教育经历
    </button>
  </div>
</template>
