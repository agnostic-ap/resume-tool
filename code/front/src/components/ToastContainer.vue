<script setup lang="ts">
import { useToastItems } from '../composables/toast'
const toasts = useToastItems()
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id"
          class="toast-item"
          :class="`toast-item--${t.type}`">
          <span class="toast-item__icon">{{ t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i' }}</span>
          <span>{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
