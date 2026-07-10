import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getEditorDataCopyFailure,
  getEditorDataCopySuccess,
  getEditorModeLabel,
} from '../src/utils/editorDisplay'

test('editor mode labels describe user tasks instead of source views', () => {
  const labels = [
    getEditorModeLabel('form', 'zh-CN'),
    getEditorModeLabel('source', 'zh-CN'),
    getEditorModeLabel('diff', 'zh-CN'),
    getEditorModeLabel('form', 'en-US'),
    getEditorModeLabel('source', 'en-US'),
    getEditorModeLabel('diff', 'en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, ['填写', '数据', '结构检查', 'Write', 'Data', 'Structure'])
  assert.equal(/Source|Diff|Form|源码/.test(combined), false)
})

test('editor data copy messages avoid source-code wording', () => {
  const messages = [
    getEditorDataCopySuccess('zh-CN'),
    getEditorDataCopySuccess('en-US'),
    getEditorDataCopyFailure('zh-CN'),
    getEditorDataCopyFailure('en-US'),
  ]
  const combined = messages.join(' ')

  assert.equal(messages[0], '简历数据已复制')
  assert.equal(messages[1], 'Resume data copied')
  assert.equal(combined.includes('源码'), false)
  assert.equal(/source/i.test(combined), false)
})
