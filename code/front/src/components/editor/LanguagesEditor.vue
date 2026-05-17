<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
import { useDeleteConfirm } from '../../composables/useDeleteConfirm'
import { useLocaleText } from '../../composables/useLocaleText'

const store = useResumeStore()
const { pending: deletePending, askDelete, cancelDelete } = useDeleteConfirm()
const { l } = useLocaleText()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'

const levelOptions = [
  { zh: '入门', en: 'Beginner' },
  { zh: '初级', en: 'Elementary' },
  { zh: '中级', en: 'Intermediate' },
  { zh: '良好', en: 'Working proficiency' },
  { zh: '流利', en: 'Fluent' },
  { zh: '母语', en: 'Native' },
]
</script>

<template>
  <div class="space-y-3">
    <div v-for="lang in store.data.languages" :key="lang.id"
      class="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('语言', 'Language') }}</label>
          <input v-model="lang.language" :class="inputCls" :placeholder="l('英语、日语...', 'English, Japanese...')" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('掌握程度', 'Level') }}</label>
          <input v-model="lang.level" list="level-options" :class="inputCls" :placeholder="l('CET-6 / 流利', 'C1 / Fluent')" />
          <datalist id="level-options">
            <option v-for="o in levelOptions" :key="o.zh" :value="l(o.zh, o.en)" />
          </datalist>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="deletePending === lang.id">
          <span class="text-xs text-red-500">{{ l('确认删除？', 'Delete this item?') }}</span>
          <button @click="store.removeLanguage(lang.id)"
            class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">{{ l('删除', 'Delete') }}</button>
          <button @click="cancelDelete()"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors">{{ l('取消', 'Cancel') }}</button>
        </template>
        <button v-else @click="askDelete(lang.id)"
          class="text-xs text-red-400 hover:text-red-600 transition-colors">
          {{ l('删除此条', 'Delete item') }}
        </button>
      </div>
    </div>

    <button @click="store.addLanguage()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      {{ l('+ 添加语言能力', '+ Add language') }}
    </button>
  </div>
</template>
