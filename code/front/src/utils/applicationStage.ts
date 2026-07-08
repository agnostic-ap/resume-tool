import type { ApplicationStage } from '../types/resume'

export interface ApplicationStageOption {
  id: ApplicationStage
  zh: string
  en: string
}

export const APPLICATION_STAGE_OPTIONS: ApplicationStageOption[] = [
  { id: 'saved', zh: '待投递', en: 'Saved' },
  { id: 'applied', zh: '已投递', en: 'Applied' },
  { id: 'screen', zh: '初筛', en: 'Screening' },
  { id: 'onsite', zh: '面试', en: 'Interview' },
  { id: 'offer', zh: 'Offer', en: 'Offer' },
  { id: 'rejected', zh: '已关闭', en: 'Closed' },
]

export function getApplicationStageLabel(stage: ApplicationStage, locale: string) {
  const option = APPLICATION_STAGE_OPTIONS.find((item) => item.id === stage)
  if (!option) return stage
  return locale === 'zh-CN' ? option.zh : option.en
}
