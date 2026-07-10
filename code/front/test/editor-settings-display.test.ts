import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getEditorSettingsCloseLabel,
  getEditorSettingsControlLabel,
  getEditorSettingsLauncherLabel,
  getEditorSettingsSubtitle,
  getEditorSettingsTitle,
} from '../src/utils/editorSettingsDisplay'

test('editor settings labels avoid tweaks jargon', () => {
  const labels = [
    getEditorSettingsTitle('zh-CN'),
    getEditorSettingsTitle('en-US'),
    getEditorSettingsSubtitle('zh-CN'),
    getEditorSettingsSubtitle('en-US'),
    getEditorSettingsLauncherLabel('zh-CN'),
    getEditorSettingsLauncherLabel('en-US'),
    getEditorSettingsCloseLabel('zh-CN'),
    getEditorSettingsCloseLabel('en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, [
    '编辑设置',
    'Editor settings',
    '只影响编辑界面，不影响导出的 PDF',
    'Only affects the editor, not the exported PDF',
    '编辑设置',
    'Settings',
    '关闭编辑设置',
    'Close editor settings',
  ])
  assert.equal(/tweaks?|微调|Tune/i.test(combined), false)
})

test('editor settings control labels use user-facing wording', () => {
  const labels = [
    getEditorSettingsControlLabel('ruleLines', 'zh-CN').label,
    getEditorSettingsControlLabel('ruleLines', 'en-US').label,
    getEditorSettingsControlLabel('density', 'zh-CN').label,
    getEditorSettingsControlLabel('density', 'en-US').label,
    getEditorSettingsControlLabel('showTree', 'zh-CN').label,
    getEditorSettingsControlLabel('showTree', 'en-US').label,
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, ['辅助线', 'Page guides', '面板间距', 'Panel spacing', '章节目录', 'Section navigator'])
  assert.equal(/File tree|Rule lines|UI density/i.test(combined), false)
})
