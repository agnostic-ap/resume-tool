import { ref } from 'vue'

export function useDeleteConfirm(autoResetMs = 3000) {
  const pending = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  function askDelete(id: string) {
    pending.value = id
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { pending.value = null }, autoResetMs)
  }

  function cancelDelete() {
    pending.value = null
    if (timer) clearTimeout(timer)
  }

  return { pending, askDelete, cancelDelete }
}
