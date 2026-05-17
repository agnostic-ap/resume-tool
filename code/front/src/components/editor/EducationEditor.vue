<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
import { useDeleteConfirm } from '../../composables/useDeleteConfirm'
import { useLocaleText } from '../../composables/useLocaleText'

const store = useResumeStore()
const { pending: deletePending, askDelete, cancelDelete } = useDeleteConfirm()
const { l } = useLocaleText()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'

const degreeOptions = [
  { zh: '专科', en: 'Associate' },
  { zh: '本科', en: 'Bachelor' },
  { zh: '硕士', en: 'Master' },
  { zh: '博士', en: 'Doctorate' },
  { zh: '其他', en: 'Other' },
]
</script>

<template>
  <div class="space-y-4">
    <div v-for="edu in store.data.education" :key="edu.id"
      class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('学校名称', 'School') }}</label>
          <input v-model="edu.school" :class="inputCls" :placeholder="l('北京大学', 'Peking University')" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('专业', 'Major') }}</label>
          <input v-model="edu.major" :class="inputCls" :placeholder="l('计算机科学与技术', 'Computer Science')" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('学历', 'Degree') }}</label>
          <select v-model="edu.degree" :class="inputCls">
            <option v-for="degree in degreeOptions" :key="degree.zh" :value="degree.zh">{{ l(degree.zh, degree.en) }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('开始时间', 'Start date') }}</label>
          <input v-model="edu.startDate" type="month" :class="inputCls" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('结束时间', 'End date') }}</label>
          <input v-model="edu.endDate" type="month" :class="inputCls" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('GPA（选填）', 'GPA (optional)') }}</label>
        <input v-model="edu.gpa" :class="inputCls" placeholder="3.8/4.0" />
      </div>

      <div class="flex items-center gap-2">
        <template v-if="deletePending === edu.id">
          <span class="text-xs text-red-500">{{ l('确认删除？', 'Delete this item?') }}</span>
          <button @click="store.removeEducation(edu.id)"
            class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">{{ l('删除', 'Delete') }}</button>
          <button @click="cancelDelete()"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors">{{ l('取消', 'Cancel') }}</button>
        </template>
        <button v-else @click="askDelete(edu.id)"
          class="text-xs text-red-400 hover:text-red-600 transition-colors">
          {{ l('删除此条', 'Delete item') }}
        </button>
      </div>
    </div>

    <button @click="store.addEducation()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      {{ l('+ 添加教育经历', '+ Add education') }}
    </button>
  </div>
</template>
