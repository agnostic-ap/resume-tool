import type { ApplicationStage } from '../types/resume'

export type ApplicationFollowUpState = 'none' | 'today' | 'overdue' | 'future'

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getApplicationFollowUpState(
  app: { followUpAt: string; stage: ApplicationStage },
  today = getLocalDateKey(),
): ApplicationFollowUpState {
  if (!app.followUpAt || app.stage === 'offer' || app.stage === 'rejected') return 'none'
  if (app.followUpAt < today) return 'overdue'
  if (app.followUpAt === today) return 'today'
  return 'future'
}
