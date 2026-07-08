import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getActivityTypeLabel,
  getHistoryActionLabel,
  getHistoryHeadingLabel,
} from '../src/utils/historyDisplay'

test('history labels use activity wording instead of code repository jargon', () => {
  const labels = [
    getHistoryHeadingLabel('zh-CN'),
    getHistoryHeadingLabel('en-US'),
    getHistoryActionLabel('zh-CN'),
    getHistoryActionLabel('en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, ['最近动态', 'Recent activity', '查看全部', 'View all'])
  assert.equal(/commit|hash|sha|log/i.test(combined), false)
})

test('activity type labels are readable for job-seeker history', () => {
  const labels = [
    getActivityTypeLabel('edit', 'summary', 'zh-CN'),
    getActivityTypeLabel('ai', 'JD', 'zh-CN'),
    getActivityTypeLabel('application', 'apply', 'zh-CN'),
    getActivityTypeLabel('resume', 'rename', 'en-US'),
    getActivityTypeLabel('export', 'PDF', 'en-US'),
    getActivityTypeLabel('system', 'sync', 'en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, ['内容更新', 'JD 定制', '投递记录', 'Resume version', 'Export', 'Sync'])
  assert.equal(/commit|hash|sha|event:/i.test(combined), false)
})
