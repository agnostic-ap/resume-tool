<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResumeStore } from '../stores/resume'
import { useLocaleText } from '../composables/useLocaleText'
import { showToast } from '../composables/toast'
import type { ImportDataPreview } from '../types/resume'
import { getBackupFileTypeError, getBackupFormatError, getLegacyBackupLabel } from '../utils/backupDisplay'
const store = useResumeStore()
const emit = defineEmits<{ close: [action?: 'demo' | 'blank' | 'import'] }>()
const { l } = useLocaleText()
const importInput = ref<HTMLInputElement>()
const importJson = ref('')
const importPreview = ref<ImportDataPreview | null>(null)

const importSummary = computed(() => {
  if (!importPreview.value) return ''
  const parts = [
    l(`${importPreview.value.documents} 份简历`, `${importPreview.value.documents} resumes`),
    l(`${importPreview.value.applications} 条投递`, `${importPreview.value.applications} applications`),
    l(`${importPreview.value.growthEntries} 条职业记忆`, `${importPreview.value.growthEntries} career memories`),
  ]
  if (importPreview.value.hasLegacyResume) parts.push(getLegacyBackupLabel(store.config.locale))
  if (importPreview.value.hasConfig) parts.push(l('包含设置', 'includes settings'))
  return parts.join(' · ')
})

function finishStart(action?: 'demo' | 'blank' | 'import') {
  localStorage.setItem('resume-visited', '1')
  emit('close', action)
}

function choose(action: 'demo' | 'blank') {
  store.trackProductEvent('onboarding_choice_selected', { choice: action })
  if (action === 'blank') store.clearAll()
  finishStart(action)
}

function chooseImport() {
  importInput.value?.click()
}

function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.name.endsWith('.json')) {
    showToast(getBackupFileTypeError(store.config.locale), 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = String(ev.target?.result || '')
    try {
      importJson.value = text
      importPreview.value = store.previewImportData(text)
    } catch (error) {
      importJson.value = ''
      importPreview.value = null
      const unrecognized = error instanceof Error && error.message === 'unrecognized'
      showToast(
        unrecognized
          ? l('导入失败：未识别的文件格式', 'Import failed: unrecognized file format')
          : getBackupFormatError(store.config.locale),
        'error',
      )
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}

function confirmImport() {
  if (!importJson.value) return
  store.trackProductEvent('onboarding_choice_selected', { choice: 'import' })
  store.importData(importJson.value)
  finishStart('import')
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop">
      <div class="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-dialog-title">
        <div class="welcome-dialog__mark">R</div>
        <h1 id="welcome-dialog-title">{{ l('欢迎使用简历工具', 'Welcome to Resume Studio') }}</h1>
        <p>{{ l('请选择开始方式', 'Choose how to start') }}</p>

        <div class="welcome-dialog__choices">
          <button @click="choose('blank')" class="welcome-choice welcome-choice--primary">
            <div>
              <div class="welcome-choice__title">{{ l('新建空白简历', 'Start blank') }}</div>
              <div class="welcome-choice__copy">{{ l('带字段清单进入编辑器', 'Open the editor with a field checklist') }}<br>{{ l('适合从零开始', 'best for starting from scratch') }}</div>
            </div>
          </button>

          <button @click="chooseImport" class="welcome-choice">
            <div>
              <div class="welcome-choice__title">{{ l('导入备份', 'Import backup') }}</div>
              <div class="welcome-choice__copy">{{ l('先预览文件内容', 'Preview the file first') }}<br>{{ l('确认后再写入工作台', 'then confirm before applying') }}</div>
            </div>
          </button>

          <button @click="choose('demo')" class="welcome-choice">
            <div>
              <div class="welcome-choice__title">{{ l('浏览示例', 'Browse demo') }}</div>
              <div class="welcome-choice__copy">{{ l('先看看效果，了解功能', 'Preview the workflow first') }}<br>{{ l('后再填自己的内容', 'Then add your own content') }}</div>
            </div>
          </button>
        </div>

        <div v-if="importPreview" class="welcome-import-preview">
          <strong>{{ l('导入预览', 'Import preview') }}</strong>
          <span>{{ importSummary }}</span>
          <div>
            <button @click="confirmImport">{{ l('确认导入', 'Confirm import') }}</button>
            <button @click="importPreview = null; importJson = ''">{{ l('取消', 'Cancel') }}</button>
          </div>
        </div>
        <input ref="importInput" type="file" accept=".json" class="hidden" @change="handleImportFile" />
      </div>
    </div>
  </Teleport>
</template>
