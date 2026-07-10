import { computed } from 'vue'
import type { JobApplication, Locale, ResumeData, SyncOperation } from '../types/resume'
import { getApplicationFollowUpState, getLocalDateKey } from '../utils/pipeline'

export type NextBestActionKind = 'sync' | 'follow-up' | 'onboarding' | 'jd' | 'export'
export type NextBestActionSeverity = 'info' | 'warning' | 'critical'

export interface NextBestAction {
  kind: NextBestActionKind
  title: string
  detail: string
  primaryCommand: string
  severity: NextBestActionSeverity
  targetId?: string
}

export interface NextBestActionInput {
  locale: Locale
  data: ResumeData
  completeness: number
  showAI: boolean
  applications: JobApplication[]
  syncOperations: SyncOperation[]
  today?: string
}

function label(locale: Locale, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

function hasContact(data: ResumeData) {
  return Boolean(data.personal.email.trim() || data.personal.phone.trim())
}

function onboardingAction(input: NextBestActionInput): NextBestAction | null {
  const { data, locale } = input
  if (!data.personal.name.trim() || !hasContact(data)) {
    return {
      kind: 'onboarding',
      title: label(locale, '先补姓名和联系方式', 'Add name and contact first'),
      detail: label(locale, '这是导出和投递前最关键的信任信息。', 'This is the most important trust signal before export and applications.'),
      primaryCommand: 'onboarding:personal',
      severity: 'warning',
      targetId: 'personal',
    }
  }
  if (!data.personal.title.trim()) {
    return {
      kind: 'onboarding',
      title: label(locale, '明确目标岗位', 'Set the target role'),
      detail: label(locale, '目标岗位会影响预览、JD 定制和投递记录。', 'The target role shapes the preview, JD tailoring, and application records.'),
      primaryCommand: 'onboarding:title',
      severity: 'warning',
      targetId: 'title',
    }
  }
  if (data.personal.summary.trim().length <= 20) {
    return {
      kind: 'onboarding',
      title: label(locale, '写一段个人简介', 'Write a short summary'),
      detail: label(locale, '用 2-3 句说明岗位定位、技术栈和可验证成果。', 'Use 2-3 sentences for role focus, stack, and measurable impact.'),
      primaryCommand: 'onboarding:summary',
      severity: 'info',
      targetId: 'summary',
    }
  }
  if (!data.experience.length || !data.experience.some((item) => item.description.trim().length > 30)) {
    return {
      kind: 'onboarding',
      title: label(locale, '补最近一段经历', 'Add a recent role'),
      detail: label(locale, '至少写清公司、岗位和一条量化成果。', 'Add company, title, and at least one measurable result.'),
      primaryCommand: 'onboarding:experience',
      severity: 'info',
      targetId: 'experience',
    }
  }
  if (!data.skills.length || !data.skills.some((item) => item.items.trim())) {
    return {
      kind: 'onboarding',
      title: label(locale, '补核心技能关键词', 'Add core skills'),
      detail: label(locale, '列出和目标岗位相关的 5-8 个关键词。', 'List 5-8 keywords relevant to the target role.'),
      primaryCommand: 'onboarding:skills',
      severity: 'info',
      targetId: 'skills',
    }
  }
  return null
}

export function computeNextBestAction(input: NextBestActionInput): NextBestAction {
  const locale = input.locale
  const retryableSync = input.syncOperations.filter((item) => item.status === 'failed' || item.status === 'local-only')
  if (retryableSync.some((item) => item.status === 'failed')) {
    return {
      kind: 'sync',
      title: label(locale, '云端同步失败', 'Cloud sync failed'),
      detail: label(locale, `${retryableSync.length} 个操作待重试，本地数据仍保留。`, `${retryableSync.length} operation(s) need retry. Local data is still saved.`),
      primaryCommand: 'sync:retry',
      severity: 'critical',
    }
  }
  if (retryableSync.length) {
    return {
      kind: 'sync',
      title: label(locale, '本地更改待同步', 'Local changes need sync'),
      detail: label(locale, `${retryableSync.length} 个操作会在云端恢复后同步。`, `${retryableSync.length} operation(s) will sync when cloud sync is available.`),
      primaryCommand: 'sync:retry',
      severity: 'warning',
    }
  }

  const today = input.today ?? getLocalDateKey()
  const overdue = input.applications.find((app) => getApplicationFollowUpState(app, today) === 'overdue')
  if (overdue) {
    return {
      kind: 'follow-up',
      title: label(locale, `跟进 ${overdue.company}`, `Follow up with ${overdue.company}`),
      detail: label(locale, overdue.nextAction || '这条岗位记录已经逾期，建议先处理。', overdue.nextAction || 'This opportunity is overdue. Handle it first.'),
      primaryCommand: `application:${overdue.id}`,
      severity: 'warning',
      targetId: overdue.id,
    }
  }

  const onboarding = onboardingAction(input)
  if (onboarding) return onboarding

  if (input.data.experience.length && input.completeness >= 75) {
    return {
      kind: 'jd',
      title: label(locale, '根据 JD 定制这一版', 'Tailor this version to a JD'),
      detail: label(locale, '粘贴岗位描述，选择职业记忆，生成可逐段采纳的草稿。', 'Paste a job description, reference career memories, and review section-level drafts.'),
      primaryCommand: 'jd',
      severity: 'info',
    }
  }

  return {
    kind: 'export',
    title: label(locale, '运行导出预检', 'Run export precheck'),
    detail: label(locale, '检查联系方式、空章节和分页风险，再生成 PDF。', 'Check contact details, empty sections, and page-break risks before PDF export.'),
    primaryCommand: 'export',
    severity: input.completeness < 80 ? 'warning' : 'info',
    targetId: 'export',
  }
}

export function useNextBestAction(input: () => NextBestActionInput) {
  return computed(() => computeNextBestAction(input()))
}
