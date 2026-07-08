<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResumeStore } from '../stores/resume'
import { showToast } from '../composables/toast'
import ConfirmDialog from './ConfirmDialog.vue'
import { useI18n } from '../i18n'
import { useLocaleText } from '../composables/useLocaleText'
import type { ImportDataPreview, SyncOperation } from '../types/resume'
import {
  getSyncConnectedCopy,
  getSyncLocalModeCopy,
  getSyncPendingCopy,
  getSyncQueuedCopy,
  getSyncRestoredCopy,
  getSyncStillUnavailableCopy,
  getSyncUnavailableCopy,
  type LocalizedSyncCopy,
} from '../utils/syncCopy'
import { getActiveResumeVersionLabel } from '../utils/resumeDisplay'

const props = defineProps<{ currentView: string }>()
const emit = defineEmits<{
  navigate: ['workspace' | 'editor' | 'documents' | 'templates' | 'growth' | 'pipeline' | 'history' | 'settings']
  openCommand: []
}>()

const store = useResumeStore()
const { t } = useI18n()
const { l } = useLocaleText()
const fileInput = ref<HTMLInputElement>()
const pendingImportJson = ref('')
const pendingImportPreview = ref<ImportDataPreview | null>(null)
const syncOpen = ref(false)

// ── Auto-save indicator ──────────────────────────────────────
const saved = ref(true)
watch(() => store.data, () => { saved.value = false }, { deep: true })
watch(saved, (v) => { if (!v) setTimeout(() => (saved.value = true), 600) })

const hasFailedSync = computed(() => store.syncOperations.some((item) => item.status === 'failed'))
const hasQueuedSync = computed(() => store.syncOperations.some((item) => item.status === 'local-only'))
const hasPendingSync = computed(() => store.syncOperations.some((item) => item.status === 'pending'))
const visibleSyncOperations = computed(() => store.syncOperations.slice(0, 6))
const retryableSyncOperations = computed(() =>
  store.syncOperations.filter((item) => item.status === 'failed' || item.status === 'local-only'),
)
const lc = (copy: LocalizedSyncCopy) => l(copy.zh, copy.en)
const activeVersionLabel = computed(() => getActiveResumeVersionLabel(store.config.locale))

const saveLabel = computed(() => {
  if (!saved.value) return t('saving')
  if (hasFailedSync.value || hasQueuedSync.value) return l('本地已保存', 'Saved locally')
  return t('saved')
})

const saveTitle = computed(() => {
  if (hasFailedSync.value) return l('本地已保存，但云端同步失败。点击右侧同步状态重试。', 'Saved locally, but cloud sync failed. Click the sync status to retry.')
  if (hasQueuedSync.value) return lc(getSyncQueuedCopy())
  return l('本地更改已保存', 'Local changes are saved.')
})

const syncLabel = computed(() => {
  if (store.backendStatus.connecting) return l('连接中', 'Connecting')
  if (hasFailedSync.value) return l('同步失败', 'Sync failed')
  if (hasQueuedSync.value) return l('本地待同步', 'Local queue')
  if (hasPendingSync.value) return l('同步中', 'Syncing')
  if (store.backendStatus.online) return l('云端同步', 'Synced')
  return l('本地模式', 'Local')
})

const syncTitle = computed(() => {
  const failed = store.syncOperations.filter((item) => item.status === 'failed' || item.status === 'local-only')
  if (failed.length) {
    return l(
      `${failed.length} 个操作待重试，点击重新连接并同步。`,
      `${failed.length} operations need retry. Click to reconnect and sync.`,
    )
  }
  if (hasPendingSync.value) return lc(getSyncPendingCopy())
  if (store.backendStatus.online) return lc(getSyncConnectedCopy())
  return store.backendStatus.error
    ? lc(getSyncUnavailableCopy(store.backendStatus.error))
    : lc(getSyncLocalModeCopy())
})

async function reconnectBackend() {
  const hasQueue = store.syncOperations.some((item) => item.status === 'failed' || item.status === 'local-only')
  const ok = hasQueue ? await store.retryFailedSyncs() : await store.connectBackend()
  showToast(
    ok ? lc(getSyncRestoredCopy()) : lc(getSyncStillUnavailableCopy()),
    ok ? 'success' : 'info',
    3200,
  )
  if (ok) syncOpen.value = false
}

function viewLabel(view: string) {
  const labels: Record<string, { zh: string; en: string }> = {
    workspace: { zh: '工作台', en: 'Workspace' },
    editor: { zh: '编辑器', en: 'Editor' },
    documents: { zh: '简历库', en: 'Library' },
    templates: { zh: '模板', en: 'Templates' },
    growth: { zh: '职业记忆', en: 'Career memory' },
    pipeline: { zh: '投递', en: 'Applications' },
    history: { zh: '历史', en: 'History' },
    settings: { zh: '设置', en: 'Settings' },
  }
  const label = labels[view]
  return label ? l(label.zh, label.en) : view
}

function operationLabel(operation: SyncOperation) {
  const typeLabels: Record<string, { zh: string; en: string }> = {
    resume: { zh: '简历', en: 'Resume' },
    application: { zh: '投递', en: 'Application' },
    growth: { zh: '职业记忆', en: 'Career memory' },
  }
  const actionLabels: Record<string, { zh: string; en: string }> = {
    create: { zh: '新建', en: 'Create' },
    update: { zh: '更新', en: 'Update' },
    delete: { zh: '删除', en: 'Delete' },
  }
  const type = typeLabels[operation.entityType]
  const action = actionLabels[operation.operation]
  return `${type ? l(type.zh, type.en) : operation.entityType} · ${action ? l(action.zh, action.en) : operation.operation}`
}

function operationStatusLabel(status: SyncOperation['status']) {
  const labels: Record<SyncOperation['status'], { zh: string; en: string }> = {
    pending: { zh: '同步中', en: 'Syncing' },
    synced: { zh: '已同步', en: 'Synced' },
    failed: { zh: '失败', en: 'Failed' },
    'local-only': { zh: '待同步', en: 'Queued' },
  }
  return l(labels[status].zh, labels[status].en)
}

// ── Confirm dialog ────────────────────────────────────────────
type ConfirmAction = 'clearAll' | 'resetDemo' | 'importBackup'
const confirmVisible = ref(false)
const confirmAction = ref<ConfirmAction>('clearAll')
const importPreviewSummary = computed(() => {
  if (!pendingImportPreview.value) return l('未读取到可导入内容', 'No importable content was found')
  const preview = pendingImportPreview.value
  const parts = [
    l(`${preview.documents} 份简历`, `${preview.documents} resumes`),
    l(`${preview.applications} 条投递`, `${preview.applications} applications`),
    l(`${preview.growthEntries} 条职业记忆`, `${preview.growthEntries} career memories`),
    l(`${preview.activityEvents} 条历史记录`, `${preview.activityEvents} history events`),
  ]
  if (preview.hasLegacyResume) parts.push(l('包含旧版单简历数据', 'includes legacy single-resume data'))
  if (preview.hasConfig) parts.push(l('包含外观和语言设置', 'includes appearance and language settings'))
  return parts.join(' · ')
})
const confirmMeta = computed(() => ({
  clearAll: {
    title: l('新建空白简历', 'Create blank resume'),
    message: l('会创建一份新的空白简历，当前简历会保留在列表里。', 'This creates a new blank resume and keeps the current one in your document list.'),
    danger: false,
  },
  resetDemo: {
    title: l('重置为示例数据', 'Reset to demo data'),
    message: l('当前内容将被示例数据覆盖，无法撤销。确认继续？', 'The current content will be overwritten with demo data and cannot be undone. Continue?'),
    danger: true,
  },
  importBackup: {
    title: l('导入这份备份？', 'Import this backup?'),
    message: l(
      `将写入工作台：${importPreviewSummary.value}。备份里的同类列表会替换当前数据，确认后再导入。`,
      `This will write to the workspace: ${importPreviewSummary.value}. Matching lists in the backup replace current data. Confirm before importing.`,
    ),
    danger: true,
  },
}))

function askConfirm(action: ConfirmAction) {
  confirmAction.value = action
  confirmVisible.value = true
}

function onConfirm() {
  confirmVisible.value = false
  if (confirmAction.value === 'clearAll') {
    store.createResume(true)
    showToast(l('已新建空白简历，请从个人信息开始填写', 'Created a blank resume. Start with personal info.'), 'info', 3500)
    emit('navigate', 'editor')
  } else if (confirmAction.value === 'importBackup') {
    if (pendingImportJson.value) store.importData(pendingImportJson.value)
    pendingImportJson.value = ''
    pendingImportPreview.value = null
  } else {
    store.resetToDefault()
  }
}

function closeConfirm() {
  if (confirmAction.value === 'importBackup') {
    pendingImportJson.value = ''
    pendingImportPreview.value = null
  }
  confirmVisible.value = false
}

// ── Data import/export ────────────────────────────────────────
function handleExportJSON() {
  const json = store.exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.data.personal.name || l('我的简历', 'my-resume')}-backup.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast(l('数据已备份到本地', 'Backup saved locally'), 'success')
}

function handleImportClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.name.endsWith('.json')) {
    showToast(l('请选择 .json 格式的备份文件', 'Choose a .json backup file'), 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = String(ev.target?.result || '')
    try {
      pendingImportPreview.value = store.previewImportData(text)
      pendingImportJson.value = text
      askConfirm('importBackup')
    } catch (error) {
      const unrecognized = error instanceof Error && error.message === 'unrecognized'
      showToast(
        unrecognized
          ? l('导入失败：未识别的文件格式', 'Import failed: unrecognized file format')
          : l('导入失败：请确认 JSON 格式正确', 'Import failed: check that the JSON is valid'),
        'error',
      )
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <header class="studio-topbar">
    <div class="topbar-brand">
      <div class="brand-logo">R</div>
      <div class="brand-copy">
        <strong>Resume</strong>
        <span>STUDIO</span>
      </div>
    </div>

    <div class="locale-switch">
      <button :class="{ on: store.config.locale === 'zh-CN' }" @click="store.setLocale('zh-CN')">中</button>
      <button :class="{ on: store.config.locale === 'en-US' }" @click="store.setLocale('en-US')">EN</button>
    </div>

    <nav class="topbar-crumbs" :aria-label="l('当前位置', 'Current location')">
      <button class="crumb-link" @click="emit('navigate', 'workspace')">{{ t('workspace') }}</button>
      <span class="sep">/</span>
      <strong>{{ store.data.personal.name || l('未命名简历', 'Untitled resume') }}</strong>
      <span class="status-badge">{{ t(store.config.templateId) }}</span>
      <span class="status-badge">{{ viewLabel(props.currentView) }}</span>
      <span class="status-badge">{{ activeVersionLabel }}</span>
    </nav>

    <button class="topbar-button command-trigger" @click="emit('openCommand')">
      <span>⌕</span>
      {{ t('command') }}
      <kbd>⌘K</kbd>
    </button>

    <button @click="askConfirm('clearAll')"
      class="topbar-button">
      <span>＋</span>
      {{ t('newResume') }}
    </button>

    <div class="save-state"
      :class="{ pending: !saved, queued: saved && hasQueuedSync, failed: saved && hasFailedSync }"
      :title="saveTitle">
      <i />
      <span>{{ saveLabel }}</span>
    </div>

    <div class="sync-wrap">
      <button class="sync-state"
        :class="{
          online: store.backendStatus.online && !store.syncOperations.length,
          pending: store.backendStatus.connecting || hasPendingSync,
          failed: hasFailedSync,
          queued: hasQueuedSync
        }"
        :title="syncTitle"
        :aria-expanded="syncOpen"
        @click="syncOpen = !syncOpen">
        <i />
        <span>{{ syncLabel }}</span>
        <b v-if="store.syncOperations.length">{{ store.syncOperations.length }}</b>
      </button>

      <div v-if="syncOpen" class="sync-popover">
        <div class="sync-popover__head">
          <span>{{ l('同步状态', 'Sync status') }}</span>
          <button @click="syncOpen = false">{{ l('关闭', 'Close') }}</button>
        </div>
        <strong>{{ syncLabel }}</strong>
        <p>{{ syncTitle }}</p>

        <div v-if="visibleSyncOperations.length" class="sync-operation-list">
          <div v-for="operation in visibleSyncOperations" :key="operation.id" class="sync-operation">
            <span>{{ operationLabel(operation) }}</span>
            <b :class="`sync-operation__status sync-operation__status--${operation.status}`">
              {{ operationStatusLabel(operation.status) }}
            </b>
            <small>{{ operation.error || operation.updatedAt }}</small>
          </div>
        </div>
        <p v-else class="sync-empty">{{ l('没有待处理的同步操作。', 'No pending sync operations.') }}</p>

        <button
          class="sync-retry"
          :disabled="store.backendStatus.connecting"
          @click="reconnectBackend">
          {{ retryableSyncOperations.length || !store.backendStatus.online ? l('重试同步', 'Retry sync') : l('重新检查连接', 'Check connection') }}
        </button>
      </div>
    </div>

    <div class="topbar-actions">
      <button @click="handleImportClick"
        class="topbar-button">
        <span>↥</span>
        {{ t('import') }}
      </button>
      <button @click="handleExportJSON"
        class="topbar-button">
        <span>↧</span>
        {{ t('backup') }}
      </button>
      <button @click="askConfirm('resetDemo')"
        class="topbar-link">
        {{ t('resetDemo') }}
      </button>
    </div>

    <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileChange" />
  </header>

  <!-- Confirm Dialog -->
  <ConfirmDialog v-if="confirmVisible"
    :title="confirmMeta[confirmAction].title"
    :message="confirmMeta[confirmAction].message"
    :danger="confirmMeta[confirmAction].danger"
    @confirm="onConfirm"
    @cancel="closeConfirm" />
</template>
