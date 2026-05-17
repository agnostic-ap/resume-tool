<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
import { useDeleteConfirm } from '../../composables/useDeleteConfirm'

const store = useResumeStore()
const { pending: deletePending, askDelete, cancelDelete } = useDeleteConfirm()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'

const levelOptions = ['入门', '初级', '中级', '良好', '流利', '母语']
</script>

<template>
  <div class="space-y-3">
    <div v-for="lang in store.data.languages" :key="lang.id"
      class="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">语言</label>
          <input v-model="lang.language" :class="inputCls" placeholder="英语、日语..." />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">掌握程度</label>
          <input v-model="lang.level" list="level-options" :class="inputCls" placeholder="CET-6 / 流利" />
          <datalist id="level-options">
            <option v-for="o in levelOptions" :key="o" :value="o" />
          </datalist>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="deletePending === lang.id">
          <span class="text-xs text-red-500">确认删除？</span>
          <button @click="store.removeLanguage(lang.id)"
            class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">删除</button>
          <button @click="cancelDelete()"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors">取消</button>
        </template>
        <button v-else @click="askDelete(lang.id)"
          class="text-xs text-red-400 hover:text-red-600 transition-colors">
          删除此条
        </button>
      </div>
    </div>

    <button @click="store.addLanguage()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加语言能力
    </button>
  </div>
</template>
