<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  command: [string]
}>()

const query = ref('')
const selected = ref(0)
const inputRef = ref<HTMLInputElement>()

const groups = [
  {
    label: 'Quick actions',
    items: [
      { icon: '＋', label: 'New résumé', hint: 'N', command: 'new' },
      { icon: '§', label: 'Open editor', hint: 'E', command: 'editor' },
      { icon: '↧', label: 'Export current as PDF', hint: '⌘E', command: 'export' },
    ],
  },
  {
    label: 'Jump to',
    items: [
      { icon: '⌂', label: 'Workspace overview', hint: '↵', command: 'workspace' },
      { icon: '▦', label: 'Templates', hint: '↵', command: 'templates' },
      { icon: '✦', label: 'AI Studio', hint: '↵', command: 'assistant' },
      { icon: '▤', label: 'Pipeline', hint: '↵', command: 'pipeline' },
      { icon: '↺', label: 'History', hint: '↵', command: 'history' },
      { icon: '⌘', label: 'Settings', hint: '↵', command: 'settings' },
    ],
  },
]

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
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
          <input ref="inputRef" v-model="query" placeholder="Search résumés, run a command…" />
          <span class="esc">ESC</span>
        </div>

        <div class="cmdk__body">
          <div v-for="group in filteredGroups" :key="group.label" class="cmdk__group">
            <div class="label">{{ group.label }}</div>
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
          <div v-if="!flatItems.length" class="cmdk-empty">没有匹配的命令</div>
        </div>

        <div class="cmdk__foot">
          <div class="hints">
            <span><kbd>↑↓</kbd>navigate</span>
            <span><kbd>↵</kbd>select</span>
            <span><kbd>ESC</kbd>close</span>
          </div>
          <span>resume-studio</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
