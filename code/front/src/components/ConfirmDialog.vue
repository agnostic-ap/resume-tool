<script setup lang="ts">
defineProps<{ title: string; message: string; danger?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center"
      style="background:rgba(0,0,0,0.45);" @click.self="emit('cancel')">
      <div class="bg-white rounded-2xl shadow-2xl w-80 mx-4 overflow-hidden">
        <div class="px-6 pt-6 pb-4">
          <h3 class="font-semibold text-gray-900 mb-2">{{ title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed">{{ message }}</p>
        </div>
        <div class="flex border-t border-gray-100">
          <button @click="emit('cancel')"
            class="flex-1 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            取消
          </button>
          <div class="w-px bg-gray-100" />
          <button @click="emit('confirm')"
            class="flex-1 py-3 text-sm font-semibold transition-colors"
            :class="danger ? 'text-red-500 hover:bg-red-50' : 'text-blue-500 hover:bg-blue-50'">
            确认
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
