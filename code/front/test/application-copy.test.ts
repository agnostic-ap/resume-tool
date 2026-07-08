import assert from 'node:assert/strict'
import test from 'node:test'
import { getApplicationDeleteMessage } from '../src/utils/applicationCopy'

test('application delete confirmation describes saved job details without snapshot jargon', () => {
  const zh = getApplicationDeleteMessage('FutureHire · Frontend Engineer', 2, 'zh-CN')
  const en = getApplicationDeleteMessage('FutureHire · Frontend Engineer', 2, 'en-US')

  assert.equal(zh.includes('岗位信息'), true)
  assert.equal(en.includes('job details'), true)
  assert.equal(`${zh} ${en}`.includes('JD 快照'), false)
  assert.equal(`${zh} ${en}`.includes('JD snapshot'), false)
  assert.equal(zh.includes('2 条时间线事件'), true)
  assert.equal(en.includes('2 timeline events'), true)
})
