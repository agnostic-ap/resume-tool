import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildTailoringDisplayRows, getJobDescriptionSnapshotText, getJobDescriptionSnapshotTitle, getTailoringStrategyLabel } from '../src/utils/tailoringDisplay'
import type { JobDescriptionSnapshot, TailoringMetadata } from '../src/types/resume'

function tailoring(overrides: Partial<TailoringMetadata> = {}): TailoringMetadata {
  return {
    requestId: 'jd-run-debug-1',
    sourceResumeId: 'resume-1',
    draftTitle: 'Frontend Engineer JD Draft',
    matchScore: 91,
    matchedKeywords: ['TypeScript', 'Vue'],
    selectedExperienceIds: ['exp-1'],
    strategy: 'rule-based-jd-tailoring-v1',
    generatedAt: '2026-06-15T10:30:00.000Z',
    ...overrides,
  }
}

function jobSnapshot(overrides: Partial<JobDescriptionSnapshot> = {}): JobDescriptionSnapshot {
  return {
    company: 'FutureHire',
    title: 'Frontend Engineer',
    location: 'Shanghai',
    description: '',
    requirements: [],
    url: '',
    ...overrides,
  }
}

test('tailoring strategy labels hide implementation details behind user-facing states', () => {
  assert.equal(getTailoringStrategyLabel('llm-jd-tailoring-v1', 'zh-CN'), '智能定制')
  assert.equal(getTailoringStrategyLabel('llm-jd-tailoring-v1', 'en-US'), 'Smart tailoring')
  assert.equal(getTailoringStrategyLabel('rule-based-jd-tailoring-v1', 'zh-CN'), '基础定制')
  assert.equal(getTailoringStrategyLabel('rule-based-jd-tailoring-v1', 'en-US'), 'Basic tailoring')
  assert.equal(getTailoringStrategyLabel('test', 'zh-CN'), '标准定制')
})

test('tailoring display rows avoid request ids and raw strategy strings', () => {
  const rows = buildTailoringDisplayRows(tailoring(), 'zh-CN')
  const visibleText = rows.map((row) => `${row.label}:${row.value}`).join('|')

  assert.deepEqual(rows.map((row) => row.key), ['draft', 'strategy', 'generatedAt', 'keywords'])
  assert.equal(visibleText.includes('request id'), false)
  assert.equal(visibleText.includes('jd-run-debug-1'), false)
  assert.equal(visibleText.includes('rule-based-jd-tailoring-v1'), false)
  assert.equal(visibleText.includes('Frontend Engineer JD Draft'), true)
  assert.equal(visibleText.includes('定制方式:基础定制'), true)
  assert.equal(visibleText.includes('2026-06-15'), true)
  assert.equal(visibleText.includes('TypeScript · Vue'), true)
  assert.equal(/AI-rewritten|真实 AI|规则兜底|Rule-based|Generation mode|llm|rule-based/i.test(visibleText), false)
})

test('job description snapshot copy avoids developer metadata wording', () => {
  assert.equal(getJobDescriptionSnapshotTitle('zh-CN'), '岗位信息')
  assert.equal(getJobDescriptionSnapshotTitle('en-US'), 'Job details')
  assert.equal(
    getJobDescriptionSnapshotText(jobSnapshot({ requirements: ['TypeScript', '可独立负责前端模块'] }), 'zh-CN'),
    'TypeScript · 可独立负责前端模块',
  )

  const fallbackZh = getJobDescriptionSnapshotText(jobSnapshot(), 'zh-CN')
  const fallbackEn = getJobDescriptionSnapshotText(jobSnapshot(), 'en-US')

  assert.equal(fallbackZh, '已保存岗位信息')
  assert.equal(fallbackEn, 'Saved job details')
  assert.equal(`${fallbackZh} ${fallbackEn}`.toLowerCase().includes('metadata'), false)
})

test('editor JD result uses shared user-facing tailoring copy', () => {
  const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')

  assert.equal(/真实 AI|AI-rewritten|规则兜底|Rule-based fallback|生成方式', 'Mode'/.test(appSource), false)
  assert.equal(appSource.includes('getTailoringStrategyLabel'), true)
})
