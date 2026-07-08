import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getActiveResumeVersionLabel,
  getResumeLanguageLabel,
} from '../src/utils/resumeDisplay'

test('active resume version label avoids raw version numbers', () => {
  const zh = getActiveResumeVersionLabel('zh-CN')
  const en = getActiveResumeVersionLabel('en-US')
  const combined = `${zh} ${en}`

  assert.equal(zh, '当前版本')
  assert.equal(en, 'Active version')
  assert.equal(combined.includes('v1.0'), false)
})

test('resume language label avoids locale codes in user-facing badges', () => {
  const labels = [
    getResumeLanguageLabel('zh-CN', 'zh-CN'),
    getResumeLanguageLabel('zh-CN', 'en-US'),
    getResumeLanguageLabel('en-US', 'zh-CN'),
    getResumeLanguageLabel('en-US', 'en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, ['中文简历', 'Chinese resume', '英文简历', 'English resume'])
  assert.equal(combined.includes('zh-CN'), false)
  assert.equal(combined.includes('en-US'), false)
  assert.equal(combined.includes('ZH'), false)
})
