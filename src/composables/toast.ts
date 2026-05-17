import { ref } from 'vue'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

// Module-level singleton — works inside and outside setup context
const items = ref<ToastItem[]>([])

export function showToast(message: string, type: ToastItem['type'] = 'success', duration = 2800) {
  const id = Date.now()
  items.value.push({ id, message, type })
  setTimeout(() => {
    items.value = items.value.filter((t) => t.id !== id)
  }, duration)
}

export function useToastItems() {
  return items
}
