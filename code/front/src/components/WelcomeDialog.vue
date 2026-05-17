<script setup lang="ts">
import { useResumeStore } from '../stores/resume'
import { useLocaleText } from '../composables/useLocaleText'
const store = useResumeStore()
const emit = defineEmits<{ close: [] }>()
const { l } = useLocaleText()

function choose(action: 'demo' | 'blank') {
  localStorage.setItem('resume-visited', '1')
  if (action === 'blank') store.clearAll()
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.5);">
      <div class="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center" style="width:440px;max-width:90vw;">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-4"
          style="background:#2563eb;">R</div>
        <h1 class="text-xl font-bold text-gray-800 mb-1">{{ l('欢迎使用简历工具', 'Welcome to Resume Studio') }}</h1>
        <p class="text-sm text-gray-400 mb-7">{{ l('请选择开始方式', 'Choose how to start') }}</p>

        <div class="grid grid-cols-2 gap-4 w-full">
          <button @click="choose('demo')"
            class="flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-left">
            <div>
              <div class="text-sm font-semibold text-gray-800 mb-1">{{ l('浏览示例', 'Browse demo') }}</div>
              <div class="text-xs text-gray-400 leading-relaxed">{{ l('先看看效果，了解功能', 'Preview the workflow first') }}<br>{{ l('后再填自己的内容', 'Then add your own content') }}</div>
            </div>
          </button>

          <button @click="choose('blank')"
            class="flex flex-col items-start gap-3 p-5 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-all text-left">
            <div>
              <div class="text-sm font-semibold text-blue-700 mb-1">{{ l('新建空白简历', 'Start blank') }}</div>
              <div class="text-xs text-blue-400 leading-relaxed">{{ l('直接开始填写', 'Start filling in') }}<br>{{ l('我自己的简历', 'my own resume') }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
