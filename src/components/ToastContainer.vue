<script setup lang="ts">
import { useToastItems } from '../composables/toast'
const toasts = useToastItems()
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none" style="min-width:220px;max-width:320px;">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id"
          class="flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm shadow-xl pointer-events-auto"
          :class="{
            'bg-green-500': t.type === 'success',
            'bg-red-500':   t.type === 'error',
            'bg-blue-500':  t.type === 'info',
          }">
          <span>{{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ' }}</span>
          <span>{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(16px); }
.toast-leave-to     { opacity: 0; transform: translateX(16px); }
</style>
