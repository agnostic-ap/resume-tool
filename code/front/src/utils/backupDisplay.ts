function text(locale: string, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

export function getBackupFileTypeError(locale: string) {
  return text(locale, '请选择从本工具导出的备份文件', 'Choose a backup file exported from this tool')
}

export function getBackupFormatError(locale: string) {
  return text(locale, '导入失败：请确认这是有效的备份文件', 'Import failed: check that this is a valid backup file')
}

export function getLegacyBackupLabel(locale: string) {
  return text(locale, '包含旧版简历备份', 'includes an older resume backup')
}

export function getBackupImportMetaLabel(locale: string) {
  return text(locale, '备份文件', 'Backup file')
}
