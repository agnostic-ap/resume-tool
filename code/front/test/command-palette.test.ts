import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCommandPaletteEmptyLabel,
  getCommandPaletteFooterLabel,
  getQuickActionLabel,
  getQuickActionPlaceholder,
} from '../src/utils/commandPalette'

test('command palette footer uses user-facing localized product copy', () => {
  assert.equal(getCommandPaletteFooterLabel('zh-CN'), '简历工作台')
  assert.equal(getCommandPaletteFooterLabel('en-US'), 'Resume Studio')
  assert.equal(getCommandPaletteFooterLabel('fr-FR'), 'Resume Studio')
})

test('command palette footer avoids slug-style developer labels', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const label = getCommandPaletteFooterLabel(locale)
    assert.equal(label.includes('-'), false)
    assert.notEqual(label, 'resume-studio', 'footer label should not be a raw product slug')
  }
})

test('quick action labels avoid command-line wording', () => {
  const labels = [
    getQuickActionLabel('zh-CN'),
    getQuickActionLabel('en-US'),
    getQuickActionPlaceholder('zh-CN'),
    getQuickActionPlaceholder('en-US'),
    getCommandPaletteEmptyLabel('zh-CN'),
    getCommandPaletteEmptyLabel('en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, [
    '快捷入口',
    'Quick actions',
    '搜索简历、投递或操作',
    'Search resumes, applications, or actions',
    '没有匹配的快捷入口',
    'No matching quick actions',
  ])
  assert.equal(/Command|命令/i.test(combined), false)
})
