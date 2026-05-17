<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '../i18n'
import { useLocaleText } from '../composables/useLocaleText'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  command: [string]
}>()

const query = ref('')
const selected = ref(0)
const inputRef = ref<HTMLInputElement>()
const { t } = useI18n()
const { l } = useLocaleText()

const groups = [
  {
    labelZh: '快捷动作',
    labelEn: 'Quick actions',
    items: [
      { icon: '＋', label: 'newResumeFull', hint: 'N', command: 'new' },
      { icon: '§', label: 'openEditor', hint: 'E', command: 'editor' },
      { icon: '↧', label: 'exportPdf', hint: '⌘E', command: 'export' },
    ],
  },
  {
    labelZh: '跳转',
    labelEn: 'Jump to',
    items: [
      { icon: '⌂', label: 'workspace', hint: '↵', command: 'workspace' },
      { icon: '▦', label: 'templates', hint: '↵', command: 'templates' },
      { icon: '✦', label: 'assistant', hint: '↵', command: 'assistant' },
      { icon: '▤', label: 'pipeline', hint: '↵', command: 'pipeline' },
      { icon: '↺', label: 'history', hint: '↵', command: 'history' },
      { icon: '⌘', label: 'settings', hint: '↵', command: 'settings' },
    ],
  },
]

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => t(item.label as never).toLowerCase().includes(q)),
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
          <input ref="inputRef" v-model="query" :placeholder="`${t('command')}…`" />
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
              <span>{{ t(item.label as never) }}</span>
              <span class="hint">{{ item.hint }}</span>
            </button>
          </div>
          <div v-if="!flatItems.length" class="cmdk-empty">{{ l('没有匹配的命令', 'No matching commands') }}</div>
        </div>

        <div class="cmdk__foot">
          <div class="hints">
            <span><kbd>↑↓</kbd>{{ l('导航', 'navigate') }}</span>
            <span><kbd>↵</kbd>{{ l('选择', 'select') }}</span>
            <span><kbd>ESC</kbd>{{ l('关闭', 'close') }}</span>
          </div>
          <span>resume-studio</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
