<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '../i18n'
import { useLocaleText } from '../composables/useLocaleText'
import { useResumeStore } from '../stores/resume'
import { getApplicationStageLabel } from '../utils/applicationStage'
import { getCommandPaletteEmptyLabel, getCommandPaletteFooterLabel, getQuickActionPlaceholder } from '../utils/commandPalette'
import type { TemplateId } from '../types/resume'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  command: [string]
}>()

type CommandItem = {
  icon: string
  label: string
  hint: string
  command: string
  keywords?: string
}

type CommandGroup = {
  labelZh: string
  labelEn: string
  items: CommandItem[]
}

const query = ref('')
const selected = ref(0)
const inputRef = ref<HTMLInputElement>()
const store = useResumeStore()
const { t } = useI18n()
const { l } = useLocaleText()

const templateIds: TemplateId[] = ['classic', 'modern', 'sidebar', 'compact', 'executive', 'creative', 'academic', 'technical', 'product', 'minimal']

const groups = computed<CommandGroup[]>(() => [
  {
    labelZh: '快捷动作',
    labelEn: 'Quick actions',
    items: [
      { icon: '＋', label: t('newResumeFull'), hint: 'N', command: 'new', keywords: 'create blank resume 新建 空白 简历' },
      { icon: '§', label: t('openEditor'), hint: 'E', command: 'editor', keywords: 'edit resume 编辑器' },
      { icon: 'JD', label: l('开始 JD 定制', 'Start JD tailoring'), hint: 'JD', command: 'jd', keywords: 'jd tailor 定制 岗位' },
      { icon: '↧', label: t('exportPdf'), hint: '⌘E', command: 'export', keywords: 'pdf export 导出' },
    ],
  },
  {
    labelZh: '跳转',
    labelEn: 'Jump to',
    items: [
      { icon: '⌂', label: t('workspace'), hint: '↵', command: 'workspace' },
      { icon: '▣', label: t('documentsPage'), hint: '↵', command: 'documents' },
      { icon: '▦', label: t('templates'), hint: '↵', command: 'templates' },
      { icon: '◇', label: t('growth'), hint: '↵', command: 'growth' },
      { icon: '▤', label: t('pipeline'), hint: '↵', command: 'pipeline' },
      { icon: '↺', label: t('history'), hint: '↵', command: 'history' },
      { icon: '⌘', label: t('settings'), hint: '↵', command: 'settings' },
    ],
  },
  {
    labelZh: '简历',
    labelEn: 'Resumes',
    items: store.documents
      .filter((doc) => !doc.archived)
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map((doc) => ({
        icon: doc.favorite ? '★' : 'R',
        label: doc.title,
        hint: l('打开', 'Open'),
        command: `resume:${doc.id}`,
        keywords: [doc.folder, doc.targetCompany, doc.targetRole, doc.data.personal.name, doc.tags.join(' ')].join(' '),
      })),
  },
  {
    labelZh: '投递',
    labelEn: 'Applications',
    items: store.applications
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map((app) => ({
        icon: '▤',
        label: `${app.company} · ${app.role}`,
        hint: getApplicationStageLabel(app.stage, store.config.locale),
        command: `application:${app.id}`,
        keywords: [app.resumeTitle, app.nextAction, app.contactName, app.jobDescription?.title ?? ''].join(' '),
      })),
  },
  {
    labelZh: '职业记忆',
    labelEn: 'Career memories',
    items: store.growthEntries
      .filter((entry) => !entry.archived)
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map((entry) => ({
        icon: '◇',
        label: entry.title,
        hint: l('用于 JD', 'Use in JD'),
        command: `growth:${entry.id}`,
        keywords: [entry.company, entry.project, entry.content, entry.metrics, entry.skills.join(' ')].join(' '),
      })),
  },
  {
    labelZh: '模板',
    labelEn: 'Templates',
    items: templateIds.map((id) => ({
      icon: store.config.templateId === id ? '✓' : '▦',
      label: t(id),
      hint: l('切换', 'Switch'),
      command: `template:${id}`,
      keywords: `${id} ${t(`${id}Desc` as never)}`,
    })),
  },
])

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return groups.value.filter((group) => group.items.length)
  return groups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.label} ${item.keywords ?? ''} ${item.command}`.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.items.length)
})

const flatItems = computed(() => filteredGroups.value.flatMap((group) => group.items))

watch(() => props.open, async (open) => {
  if (!open) return
  query.value = ''
  selected.value = 0
  await nextTick()
  inputRef.value?.focus()
})

watch(flatItems, () => {
  selected.value = Math.min(selected.value, Math.max(0, flatItems.value.length - 1))
})

function choose(command?: string) {
  const item = command ? flatItems.value.find((it) => it.command === command) : flatItems.value[selected.value]
  if (!item) return
  emit('command', item.command)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowDown') {
    e.preventDefault()
    selected.value = (selected.value + 1) % Math.max(1, flatItems.value.length)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selected.value = (selected.value - 1 + Math.max(1, flatItems.value.length)) % Math.max(1, flatItems.value.length)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    choose()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cmdk-backdrop" @click="emit('close')">
      <div class="cmdk" @click.stop @keydown="onKeydown">
        <div class="cmdk__head">
          <span class="prompt">›</span>
          <input ref="inputRef" v-model="query" :placeholder="getQuickActionPlaceholder(store.config.locale)" />
          <span class="esc">ESC</span>
        </div>

        <div class="cmdk__body">
          <div v-for="group in filteredGroups" :key="group.labelEn" class="cmdk__group">
            <div class="label">{{ l(group.labelZh, group.labelEn) }}</div>
            <button v-for="item in group.items" :key="item.command"
              class="cmdk__item"
              :class="{ on: flatItems[selected]?.command === item.command }"
              @mouseenter="selected = flatItems.findIndex((it) => it.command === item.command)"
              @click="choose(item.command)">
              <span class="icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
              <span class="hint">{{ item.hint }}</span>
            </button>
          </div>
          <div v-if="!flatItems.length" class="cmdk-empty">{{ getCommandPaletteEmptyLabel(store.config.locale) }}</div>
        </div>

        <div class="cmdk__foot">
          <div class="hints">
            <span><kbd>↑↓</kbd>{{ l('导航', 'navigate') }}</span>
            <span><kbd>↵</kbd>{{ l('选择', 'select') }}</span>
            <span><kbd>ESC</kbd>{{ l('关闭', 'close') }}</span>
          </div>
          <span>{{ getCommandPaletteFooterLabel(store.config.locale) }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
