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
    <div class="modal-backdrop">
      <div class="welcome-dialog">
        <div class="welcome-dialog__mark">R</div>
        <h1>{{ l('欢迎使用简历工具', 'Welcome to Resume Studio') }}</h1>
        <p>{{ l('请选择开始方式', 'Choose how to start') }}</p>

        <div class="welcome-dialog__choices">
          <button @click="choose('demo')" class="welcome-choice">
            <div>
              <div class="welcome-choice__title">{{ l('浏览示例', 'Browse demo') }}</div>
              <div class="welcome-choice__copy">{{ l('先看看效果，了解功能', 'Preview the workflow first') }}<br>{{ l('后再填自己的内容', 'Then add your own content') }}</div>
            </div>
          </button>

          <button @click="choose('blank')" class="welcome-choice welcome-choice--primary">
            <div>
              <div class="welcome-choice__title">{{ l('新建空白简历', 'Start blank') }}</div>
              <div class="welcome-choice__copy">{{ l('直接开始填写', 'Start filling in') }}<br>{{ l('我自己的简历', 'my own resume') }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
