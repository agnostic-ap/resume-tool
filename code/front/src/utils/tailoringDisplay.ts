import type { JobDescriptionSnapshot, TailoringMetadata } from '../types/resume'

export interface TailoringDisplayRow {
  key: 'draft' | 'strategy' | 'generatedAt' | 'keywords'
  label: string
  value: string
}

function text(locale: string, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

export function getTailoringStrategyLabel(strategy: string, locale: string) {
  if (strategy.startsWith('llm')) return text(locale, '智能定制', 'Smart tailoring')
  if (strategy.startsWith('rule-based')) return text(locale, '基础定制', 'Basic tailoring')
  return text(locale, '标准定制', 'Standard tailoring')
}

function generatedDateLabel(value: string, locale: string) {
  const dateKey = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    ? dateKey
    : text(locale, '未记录', 'Not recorded')
}

export function buildTailoringDisplayRows(tailoring: TailoringMetadata, locale: string): TailoringDisplayRow[] {
  return [
    {
      key: 'draft',
      label: text(locale, '草稿版本', 'Draft version'),
      value: tailoring.draftTitle || text(locale, '已保存草稿', 'Saved draft'),
    },
    {
      key: 'strategy',
      label: text(locale, '定制方式', 'Tailoring type'),
      value: getTailoringStrategyLabel(tailoring.strategy, locale),
    },
    {
      key: 'generatedAt',
      label: text(locale, '生成时间', 'Generated'),
      value: generatedDateLabel(tailoring.generatedAt, locale),
    },
    {
      key: 'keywords',
      label: text(locale, '命中关键词', 'Matched keywords'),
      value: tailoring.matchedKeywords.join(' · ') || text(locale, '暂无', 'None'),
    },
  ]
}

export function getJobDescriptionSnapshotTitle(locale: string) {
  return text(locale, '岗位信息', 'Job details')
}

export function getJobDescriptionSnapshotText(snapshot: JobDescriptionSnapshot, locale: string) {
  return snapshot.description
    || snapshot.requirements.join(' · ')
    || text(locale, '已保存岗位信息', 'Saved job details')
}
