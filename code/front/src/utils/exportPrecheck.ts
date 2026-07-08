import type { ResumeConfig, ResumeData, SectionId } from '../types/resume'

export type ExportPrecheckSeverity = 'blocking' | 'warning'
export type ExportPrecheckActionId =
  | 'add-experience'
  | 'hide-experience'
  | 'add-skills'
  | 'hide-skills'
  | 'reduce-font'
  | 'hide-awards'
  | 'hide-certifications'
  | 'hide-languages'

export interface ExportPrecheckAction {
  id: ExportPrecheckActionId
  labelZh: string
  labelEn: string
}

export type ExportPrecheckFocusTarget = 'experience' | 'skills'

export interface ExportPrecheckActionEffect {
  closeDialog: boolean
  focusTarget?: ExportPrecheckFocusTarget
}

export interface ExportPrecheckIssue {
  id: string
  severity: ExportPrecheckSeverity
  titleZh: string
  titleEn: string
  fixZh: string
  fixEn: string
  actions: ExportPrecheckAction[]
}

export interface ExportPrecheckInput {
  data: ResumeData
  config: ResumeConfig
  pageCount: number
  resumeHeight: number
}

const reduceFontAction: ExportPrecheckAction = {
  id: 'reduce-font',
  labelZh: '减小字号',
  labelEn: 'Reduce font',
}

function visible(config: ResumeConfig, section: SectionId) {
  return config.sectionVisible[section]
}

function hasSkillItems(data: ResumeData) {
  return data.skills.some((item) => item.items.trim())
}

export function getExportPrecheckActionEffect(actionId: ExportPrecheckActionId): ExportPrecheckActionEffect {
  if (actionId === 'add-experience') return { closeDialog: true, focusTarget: 'experience' }
  if (actionId === 'add-skills') return { closeDialog: true, focusTarget: 'skills' }
  return { closeDialog: false }
}

function optionalHideActions(input: ExportPrecheckInput): ExportPrecheckAction[] {
  const actions: ExportPrecheckAction[] = []
  if (visible(input.config, 'awards') && input.data.awards.length) {
    actions.push({ id: 'hide-awards', labelZh: '隐藏奖项', labelEn: 'Hide awards' })
  }
  if (visible(input.config, 'certifications') && input.data.certifications.length) {
    actions.push({ id: 'hide-certifications', labelZh: '隐藏证书', labelEn: 'Hide certifications' })
  }
  if (visible(input.config, 'languages') && input.data.languages.length) {
    actions.push({ id: 'hide-languages', labelZh: '隐藏语言', labelEn: 'Hide languages' })
  }
  return actions
}

export function buildExportPrecheckIssues(input: ExportPrecheckInput): ExportPrecheckIssue[] {
  const { data, config, pageCount, resumeHeight } = input
  const issues: ExportPrecheckIssue[] = []
  const personal = data.personal
  const contactLength = [personal.phone, personal.email, personal.website, personal.location].join(' · ').length

  if (!personal.name.trim()) {
    issues.push({
      id: 'missing-name',
      severity: 'blocking',
      titleZh: '缺少姓名',
      titleEn: 'Missing name',
      fixZh: '先在个人信息中补齐姓名。',
      fixEn: 'Add your name in personal info first.',
      actions: [],
    })
  }

  if (!personal.email.trim() && !personal.phone.trim()) {
    issues.push({
      id: 'missing-contact',
      severity: 'blocking',
      titleZh: '缺少联系方式',
      titleEn: 'Missing contact',
      fixZh: '至少填写邮箱或手机号。',
      fixEn: 'Add at least an email or phone number.',
      actions: [],
    })
  }

  if (visible(config, 'summary') && personal.summary.trim().length > 0 && personal.summary.trim().length < 24) {
    issues.push({
      id: 'short-summary',
      severity: 'warning',
      titleZh: '个人简介偏短',
      titleEn: 'Summary is short',
      fixZh: '建议补 2-3 句岗位定位和优势，避免导出后显得空。',
      fixEn: 'Add 2-3 sentences about your target role and strengths before exporting.',
      actions: [],
    })
  }

  if (visible(config, 'experience') && !data.experience.length) {
    issues.push({
      id: 'missing-experience',
      severity: 'blocking',
      titleZh: '没有工作经历',
      titleEn: 'No experience',
      fixZh: '补充最近一段工作经历，或隐藏该章节后再导出。',
      fixEn: 'Add a recent role, or hide the section before exporting.',
      actions: [
        { id: 'add-experience', labelZh: '添加经历', labelEn: 'Add role' },
        { id: 'hide-experience', labelZh: '隐藏章节', labelEn: 'Hide section' },
      ],
    })
  }

  if (visible(config, 'skills') && (!data.skills.length || !hasSkillItems(data))) {
    issues.push({
      id: 'missing-skills',
      severity: 'warning',
      titleZh: '技能关键词为空',
      titleEn: 'Skills are empty',
      fixZh: '补 5-8 个岗位关键词可提升筛选通过率。',
      fixEn: 'Add 5-8 role keywords to improve screening.',
      actions: [
        { id: 'add-skills', labelZh: '添加技能', labelEn: 'Add skills' },
        { id: 'hide-skills', labelZh: '隐藏章节', labelEn: 'Hide section' },
      ],
    })
  }

  if (contactLength > 92) {
    issues.push({
      id: 'long-contact',
      severity: 'warning',
      titleZh: '联系方式过长',
      titleEn: 'Contact line is long',
      fixZh: '缩短链接或移动低优先级联系方式，避免页眉溢出。',
      fixEn: 'Shorten links or move lower-priority contact details to avoid header overflow.',
      actions: [reduceFontAction],
    })
  }

  if (pageCount > 2) {
    issues.push({
      id: 'too-many-pages',
      severity: pageCount > 3 ? 'blocking' : 'warning',
      titleZh: `当前约 ${pageCount} 页`,
      titleEn: `About ${pageCount} pages`,
      fixZh: '建议减小字号或隐藏低价值章节，优先保留经历、项目和技能。',
      fixEn: 'Reduce font size or hide lower-value sections while keeping experience, projects, and skills.',
      actions: [reduceFontAction, ...optionalHideActions(input)],
    })
  }

  if (resumeHeight > 1123 && resumeHeight % 1123 > 980) {
    issues.push({
      id: 'section-near-break',
      severity: 'warning',
      titleZh: '内容靠近分页线',
      titleEn: 'Content is close to a page break',
      fixZh: '检查分页线附近的章节，必要时压缩描述或调整顺序。',
      fixEn: 'Review sections near the page break and trim or reorder if needed.',
      actions: [reduceFontAction, ...optionalHideActions(input)],
    })
  }

  return issues
}
