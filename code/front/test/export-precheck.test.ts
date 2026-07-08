import assert from 'node:assert/strict'
import test from 'node:test'
import { buildExportPrecheckIssues, getExportPrecheckActionEffect } from '../src/utils/exportPrecheck'
import { DEFAULT_STUDIO_THEME, DEFAULT_TWEAKS } from '../src/stores/resume'
import type { ResumeConfig, ResumeData } from '../src/types/resume'

function baseData(): ResumeData {
  return {
    personal: {
      name: '',
      title: '',
      phone: '',
      email: '',
      location: '',
      website: '',
      summary: '',
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    awards: [],
    languages: [],
    certifications: [],
  }
}

function baseConfig(): ResumeConfig {
  return {
    locale: 'zh-CN',
    templateId: 'classic',
    themeColor: '#1677FF',
    fontSize: 14,
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages', 'certifications'],
    sectionVisible: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      awards: true,
      languages: false,
      certifications: false,
    },
    studioTheme: { ...DEFAULT_STUDIO_THEME },
    tweaks: { ...DEFAULT_TWEAKS },
  }
}

test('export precheck flags missing core visible sections with repair actions', () => {
  const issues = buildExportPrecheckIssues({
    data: baseData(),
    config: baseConfig(),
    pageCount: 1,
    resumeHeight: 1123,
  })

  assert.deepEqual(issues.map((issue) => issue.id), [
    'missing-name',
    'missing-contact',
    'missing-experience',
    'missing-skills',
  ])
  assert.equal(issues.find((issue) => issue.id === 'missing-experience')?.severity, 'blocking')
  assert.deepEqual(
    issues.find((issue) => issue.id === 'missing-experience')?.actions.map((action) => action.id),
    ['add-experience', 'hide-experience'],
  )
  assert.deepEqual(
    issues.find((issue) => issue.id === 'missing-skills')?.actions.map((action) => action.id),
    ['add-skills', 'hide-skills'],
  )
})

test('export precheck respects hidden sections and suggests page-risk fixes', () => {
  const data = baseData()
  data.personal.name = 'Ada Lovelace'
  data.personal.email = 'ada.lovelace.with.a.very.long.address@example.com'
  data.personal.website = 'https://portfolio.example.com/ada-lovelace-platform-engineering-case-studies'
  data.experience.push({
    id: 'exp-1',
    company: 'Analytical Engines',
    position: 'Platform Engineer',
    location: 'London',
    startDate: '2024-01',
    endDate: '',
    current: true,
    description: 'Built hiring workflow systems and improved review speed by 38%.',
  })
  data.skills.push({ id: 'skill-1', category: 'Platform', items: 'TypeScript, Node.js, Evaluation' })
  data.awards.push({ id: 'award-1', title: 'Impact Award', issuer: 'FutureHire', date: '2026-01', description: '' })

  const config = baseConfig()
  config.sectionVisible.experience = false

  const issues = buildExportPrecheckIssues({
    data,
    config,
    pageCount: 3,
    resumeHeight: 1123 * 2 + 1040,
  })

  assert.equal(issues.some((issue) => issue.id === 'missing-experience'), false)
  assert.equal(issues.some((issue) => issue.id === 'long-contact'), true)
  assert.equal(issues.some((issue) => issue.id === 'too-many-pages'), true)
  assert.deepEqual(
    issues.find((issue) => issue.id === 'too-many-pages')?.actions.map((action) => action.id),
    ['reduce-font', 'hide-awards'],
  )
})

test('export precheck add actions close the dialog and point to the matching editor field', () => {
  assert.deepEqual(getExportPrecheckActionEffect('add-experience'), {
    closeDialog: true,
    focusTarget: 'experience',
  })
  assert.deepEqual(getExportPrecheckActionEffect('add-skills'), {
    closeDialog: true,
    focusTarget: 'skills',
  })
  assert.deepEqual(getExportPrecheckActionEffect('reduce-font'), {
    closeDialog: false,
  })
})
