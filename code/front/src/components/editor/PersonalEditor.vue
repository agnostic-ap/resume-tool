<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'
import { useLocaleText } from '../../composables/useLocaleText'

const store = useResumeStore()
const { l } = useLocaleText()
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('姓名', 'Name') }}</label>
        <input v-model="store.data.personal.name"
          data-guide-field="name"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
          :placeholder="l('张明', 'Alex Chen')" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('求职岗位', 'Target role') }}</label>
        <input v-model="store.data.personal.title"
          data-guide-field="title"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
          :placeholder="l('前端开发工程师', 'Frontend Engineer')" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('手机', 'Phone') }}</label>
        <input v-model="store.data.personal.phone"
          data-guide-field="phone"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
          placeholder="138-0000-0000" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('邮箱', 'Email') }}</label>
        <input v-model="store.data.personal.email" type="email"
          data-guide-field="email"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
          placeholder="your@email.com" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('所在城市', 'Location') }}</label>
        <input v-model="store.data.personal.location"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
          :placeholder="l('北京市', 'San Francisco')" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('个人网站 / GitHub', 'Website / GitHub') }}</label>
        <input v-model="store.data.personal.website"
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
          placeholder="github.com/xxx" />
      </div>
    </div>

    <p class="text-xs text-gray-400 pt-1">
      {{ l('提示：「个人简介」在下方「个人简介」模块中单独编辑', 'Tip: edit the summary in its own section below.') }}
    </p>
  </div>
</template>
