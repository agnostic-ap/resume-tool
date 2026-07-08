import { ref } from 'vue'

export type PaywallReason = 'export' | 'ai' | 'resumes' | 'general'

interface PaywallState {
  open: boolean
  reason: PaywallReason
}

// Module-level singleton so any component (PreviewPanel, editor, library) can open
// the upgrade flow when a free-plan limit is hit.
const state = ref<PaywallState>({ open: false, reason: 'general' })

export function openPaywall(reason: PaywallReason = 'general') {
  state.value = { open: true, reason }
}

export function closePaywall() {
  state.value = { ...state.value, open: false }
}

export function usePaywallState() {
  return state
}
