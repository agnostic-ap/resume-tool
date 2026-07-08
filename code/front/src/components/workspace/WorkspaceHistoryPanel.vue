<script setup lang="ts">
import { useI18n } from '../../i18n'
import type { ActivityEvent } from '../../types/resume'
import {
  getActivityTypeLabel,
  getHistoryActionLabel,
  getHistoryHeadingLabel,
} from '../../utils/historyDisplay'

defineProps<{
  activeTitle: string
  activities: ActivityEvent[]
}>()

const emit = defineEmits<{
  navigate: []
}>()

const { locale } = useI18n()

function label(zh: string, en: string) {
  return locale.value === 'zh-CN' ? zh : en
}

function activityMessage(event: ActivityEvent) {
  return locale.value === 'zh-CN'
    ? event.messageZh || event.message
    : event.messageEn || event.message
}

function activityWhen(date: string) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return label('刚刚', 'now')
  if (minutes < 60) return label(`${minutes} 分钟前`, `${minutes}m`)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return label(`${hours} 小时前`, `${hours}h`)
  const days = Math.floor(hours / 24)
  return label(`${days} 天前`, `${days}d`)
}

function historyHeading() {
  return getHistoryHeadingLabel(locale.value)
}

function historyAction() {
  return getHistoryActionLabel(locale.value)
}

function activityTypeLabel(event: ActivityEvent) {
  return getActivityTypeLabel(event.type, event.tag, locale.value)
}
</script>

<template>
  <section class="section">
    <div class="lower">
      <div class="panel">
        <div class="panel__head">
          <div class="ttl">{{ historyHeading() }} · <em>{{ activeTitle }}</em></div>
          <button @click="emit('navigate')">{{ historyAction() }} →</button>
        </div>
        <div class="timeline">
          <div v-for="event in activities" :key="event.id" class="activity-row" :class="`activity-row--${event.type}`">
            <div class="commit__graph"><span class="commit__dot"></span></div>
            <div class="commit__body">
              <div class="commit__msg"><span class="tag" :class="`tag--${event.type}`">{{ activityTypeLabel(event) }}</span>{{ activityMessage(event) }}</div>
              <div class="commit__meta">{{ event.meta }}</div>
            </div>
            <div class="activity-time">{{ activityWhen(event.createdAt) }}</div>
          </div>
          <div v-if="!activities.length" class="empty-row">
            {{ label('还没有历史记录。编辑简历、导出或记录投递后会自动出现。', 'No history yet. Edits, exports, and applications will appear here.') }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
