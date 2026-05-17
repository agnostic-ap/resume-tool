<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
import { useDeleteConfirm } from '../../composables/useDeleteConfirm'

const store = useResumeStore()
const { pending: deletePending, askDelete, cancelDelete } = useDeleteConfirm()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'
</script>

<template>
  <div class="space-y-3">
    <div v-for="award in store.data.awards" :key="award.id"
      class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">荣誉 / 证书名称</label>
        <input v-model="award.title" :class="inputCls" placeholder="全国大学生计算机设计大赛 一等奖" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">颁发机构</label>
          <input v-model="award.issuer" :class="inputCls" placeholder="教育部高等教育司" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">获奖时间</label>
          <input v-model="award.date" type="month" :class="inputCls" />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <template v-if="deletePending === award.id">
          <span class="text-xs text-red-500">确认删除？</span>
          <button @click="store.removeAward(award.id)"
            class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">删除</button>
          <button @click="cancelDelete()"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors">取消</button>
        </template>
        <button v-else @click="askDelete(award.id)"
          class="text-xs text-red-400 hover:text-red-600 transition-colors">
          删除此条
        </button>
      </div>
    </div>

    <button @click="store.addAward()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加荣誉奖项
    </button>
  </div>
</template>
