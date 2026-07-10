import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getBackupFileTypeError,
  getBackupFormatError,
  getBackupImportMetaLabel,
  getLegacyBackupLabel,
} from '../src/utils/backupDisplay'

test('backup import errors avoid JSON file-format jargon', () => {
  const messages = [
    getBackupFileTypeError('zh-CN'),
    getBackupFileTypeError('en-US'),
    getBackupFormatError('zh-CN'),
    getBackupFormatError('en-US'),
  ]
  const combined = messages.join(' ')

  assert.deepEqual(messages, [
    '请选择从本工具导出的备份文件',
    'Choose a backup file exported from this tool',
    '导入失败：请确认这是有效的备份文件',
    'Import failed: check that this is a valid backup file',
  ])
  assert.equal(/JSON|\.json/i.test(combined), false)
})

test('backup preview labels avoid legacy data wording', () => {
  const labels = [
    getLegacyBackupLabel('zh-CN'),
    getLegacyBackupLabel('en-US'),
    getBackupImportMetaLabel('zh-CN'),
    getBackupImportMetaLabel('en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, ['包含旧版简历备份', 'includes an older resume backup', '备份文件', 'Backup file'])
  assert.equal(/legacy single-resume|JSON backup/i.test(combined), false)
})
