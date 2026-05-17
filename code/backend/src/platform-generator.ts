import type { PlatformGenerateResumeInput } from './schemas.js'

const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages', 'certifications']

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'with', 'for', 'from', 'that', 'this', 'your', 'you', 'are', 'our', 'will',
  '工作', '负责', '相关', '能力', '经验', '优先', '熟悉', '使用', '进行', '以及', '能够', '岗位',
])

export function generatePlatformResume(input: PlatformGenerateResumeInput) {
  const jobText = [
    input.jobDescription.title,
    input.jobDescription.company,
    input.jobDescription.description,
    ...(input.jobDescription.requirements ?? []),
    ...(input.jobDescription.keywords ?? []),
  ].filter(Boolean).join('\n')

  const keywords = unique([
    ...(input.jobDescription.keywords ?? []),
    ...extractKeywords(jobText),
  ]).slice(0, 18)

  const rankedWork = input.workHistory
    .map((item, index) => ({
      item,
      index,
      score: scoreText([
        item.company,
        item.title,
        item.description,
        ...(item.achievements ?? []),
        ...(item.skills ?? []),
      ].filter(Boolean).join('\n'), keywords),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const selectedWork = rankedWork.slice(0, 4)
  const matchedKeywords = keywords.filter((keyword) =>
    rankedWork.some(({ item }) => includesKeyword([
      item.title,
      item.description,
      ...(item.achievements ?? []),
      ...(item.skills ?? []),
    ].filter(Boolean).join('\n'), keyword)),
  )

  const locale = input.locale
  const targetTitle = input.jobDescription.title || input.personal.title || ''
  const targetCompany = input.jobDescription.company || ''
  const title = [
    input.personal.name || (locale === 'zh-CN' ? '未命名候选人' : 'Unnamed candidate'),
    targetTitle,
    targetCompany,
  ].filter(Boolean).join(' · ')

  const skillPool = unique([
    ...input.skills,
    ...selectedWork.flatMap(({ item }) => item.skills ?? []),
    ...matchedKeywords,
  ]).slice(0, 28)

  const data = {
    personal: {
      name: input.personal.name ?? '',
      title: targetTitle || input.personal.title || '',
      phone: input.personal.phone ?? '',
      email: input.personal.email ?? '',
      location: input.personal.location ?? input.jobDescription.location ?? '',
      website: input.personal.website ?? '',
      summary: buildSummary(input, matchedKeywords),
    },
    experience: selectedWork.map(({ item }, index) => ({
      id: `generated-exp-${index + 1}`,
      sourceId: item.id,
      company: item.company,
      position: item.title,
      location: item.location ?? '',
      startDate: item.startDate ?? '',
      endDate: item.current ? '' : item.endDate ?? '',
      current: Boolean(item.current),
      description: buildBullets(item, keywords, locale),
    })),
    education: input.education.slice(0, 3).map((item, index) => ({
      id: `generated-edu-${index + 1}`,
      school: item.school ?? '',
      major: item.major ?? '',
      degree: item.degree ?? '',
      startDate: item.startDate ?? '',
      endDate: item.endDate ?? '',
      gpa: item.gpa ?? '',
      description: item.description ?? '',
    })),
    skills: [
      {
        id: 'generated-skill-target',
        category: locale === 'zh-CN' ? '目标岗位关键词' : 'Target role keywords',
        items: matchedKeywords.slice(0, 12).join(', '),
      },
      {
        id: 'generated-skill-core',
        category: locale === 'zh-CN' ? '核心能力' : 'Core skills',
        items: skillPool.filter((skill) => !matchedKeywords.includes(skill)).slice(0, 12).join(', '),
      },
    ].filter((group) => group.items),
    projects: input.projects.slice(0, 3).map((item, index) => ({
      id: `generated-project-${index + 1}`,
      name: item.name ?? '',
      role: item.role ?? '',
      startDate: item.startDate ?? '',
      endDate: item.endDate ?? '',
      url: item.url ?? '',
      tech: item.tech ?? '',
      description: item.description ?? '',
    })),
    awards: [],
    languages: [],
    certifications: [],
  }

  const config = {
    locale,
    templateId: input.templateId,
    themeColor: '#B73E1B',
    fontSize: 14,
    sectionOrder: DEFAULT_SECTION_ORDER,
    sectionVisible: {
      summary: true,
      experience: true,
      education: data.education.length > 0,
      skills: data.skills.length > 0,
      projects: data.projects.length > 0,
      awards: false,
      languages: false,
      certifications: false,
    },
    studioTheme: {
      accent: 'vermillion',
      paper: 'cream',
      density: 'cozy',
      font: 'serif',
      ruleLines: false,
    },
    tweaks: {
      accent: 'vermillion',
      paper: 'cream',
      density: 'cozy',
      font: 'serif',
      fontScale: 100,
      showAI: true,
      showTree: true,
      ruleLines: false,
      marginaliaMode: 'notes',
      aiTone: 'editor',
    },
  }

  const score = Math.min(100, Math.round(45 + matchedKeywords.length * 3 + selectedWork.reduce((sum, item) => sum + Math.min(8, item.score), 0)))

  return {
    requestId: input.requestId,
    userId: input.userId,
    title,
    data,
    config,
    match: {
      score,
      keywords,
      matchedKeywords,
      selectedExperienceIds: selectedWork.map(({ item, index }) => item.id ?? String(index)),
      selectedExperienceIndexes: selectedWork.map(({ index }) => index),
    },
    generation: {
      strategy: 'rule-based-jd-tailoring-v1',
      generatedAt: new Date().toISOString(),
      persisted: false,
    },
  }
}

function buildSummary(input: PlatformGenerateResumeInput, matchedKeywords: string[]) {
  const locale = input.locale
  const target = input.jobDescription.title
  const company = input.jobDescription.company
  const base = input.personal.summary?.trim()
  const keywordText = matchedKeywords.slice(0, 6).join(locale === 'zh-CN' ? '、' : ', ')

  if (locale === 'zh-CN') {
    return [
      base || '具备多段相关项目与业务交付经验。',
      `当前简历面向${target}${company ? `（${company}）` : ''}岗位生成。`,
      keywordText ? `重点匹配能力：${keywordText}。` : '',
      '简历内容已按 JD 相关度优先排序，突出最近且最贴近岗位要求的经历。',
    ].filter(Boolean).join(' ')
  }

  return [
    base || 'Candidate with relevant delivery and product experience.',
    `This resume is tailored for ${target}${company ? ` at ${company}` : ''}.`,
    keywordText ? `Core match areas: ${keywordText}.` : '',
    'Experience is ordered by JD relevance, emphasizing recent and role-aligned work.',
  ].filter(Boolean).join(' ')
}

function buildBullets(item: PlatformGenerateResumeInput['workHistory'][number], keywords: string[], locale: 'zh-CN' | 'en-US') {
  const source = [
    ...(item.achievements ?? []),
    ...(item.description ? item.description.split('\n') : []),
  ]
    .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean)

  const sorted = source
    .map((line, index) => ({ line, index, score: scoreText(line, keywords) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .map(({ line }) => `• ${line}`)

  if (sorted.length) return sorted.join('\n')

  return locale === 'zh-CN'
    ? `• 负责与 ${item.title} 相关的核心工作，围绕目标岗位要求沉淀可复用经验\n• 与跨职能团队协作，推动需求分析、方案落地与结果复盘`
    : `• Owned core ${item.title} responsibilities aligned with the target role\n• Partnered with cross-functional teams from requirement analysis through delivery and review`
}

function extractKeywords(text: string) {
  const normalized = text.toLowerCase()
  const english = normalized.match(/[a-z][a-z0-9+#.-]{1,}/g) ?? []
  const cjk = normalized.match(/[\u4e00-\u9fa5]{2,}/g) ?? []
  return [...english, ...cjk]
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

function scoreText(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => score + (includesKeyword(text, keyword) ? 1 : 0), 0)
}

function includesKeyword(text: string, keyword: string) {
  return text.toLowerCase().includes(keyword.toLowerCase())
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}
