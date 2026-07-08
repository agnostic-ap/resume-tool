import type { ActivityType } from '../types/resume'

function text(locale: string, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

export function getHistoryHeadingLabel(locale: string) {
  return text(locale, '最近动态', 'Recent activity')
}

export function getHistoryActionLabel(locale: string) {
  return text(locale, '查看全部', 'View all')
}

export function getActivityTypeLabel(type: ActivityType, tag: string, locale: string) {
  if (type === 'ai') return text(locale, 'JD 定制', 'JD tailoring')
  if (type === 'application') return text(locale, '投递记录', 'Application')
  if (type === 'resume') return text(locale, '简历版本', 'Resume version')
  if (type === 'export') return text(locale, '导出', 'Export')
  if (type === 'edit') return text(locale, '内容更新', 'Edit')
  if (tag === 'sync' || tag === 'event:sync_operation_failed') return text(locale, '同步', 'Sync')
  if (tag === 'billing') return text(locale, '套餐', 'Plan')
  if (tag === 'import') return text(locale, '数据导入', 'Import')
  return text(locale, '系统记录', 'System')
}
