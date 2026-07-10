export type EditorSettingsControlId =
  | 'ruleLines'
  | 'density'
  | 'showTree'

export interface EditorSettingsControlLabel {
  label: string
  detail: string
}

function text(locale: string, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

export function getEditorSettingsTitle(locale: string) {
  return text(locale, '编辑设置', 'Editor settings')
}

export function getEditorSettingsSubtitle(locale: string) {
  return text(locale, '只影响编辑界面，不影响导出的 PDF', 'Only affects the editor, not the exported PDF')
}

export function getEditorSettingsLauncherLabel(locale: string) {
  return text(locale, '编辑设置', 'Settings')
}

export function getEditorSettingsCloseLabel(locale: string) {
  return text(locale, '关闭编辑设置', 'Close editor settings')
}

export function getEditorSettingsControlLabel(id: EditorSettingsControlId, locale: string): EditorSettingsControlLabel {
  if (id === 'ruleLines') {
    return {
      label: text(locale, '辅助线', 'Page guides'),
      detail: text(locale, '方便对齐和阅读，不影响 PDF', 'Helps alignment and reading, not the PDF'),
    }
  }
  if (id === 'density') {
    return {
      label: text(locale, '面板间距', 'Panel spacing'),
      detail: text(locale, '调整编辑台信息密度', 'Adjusts the editor information density'),
    }
  }
  return {
    label: text(locale, '章节目录', 'Section navigator'),
    detail: text(locale, '左侧快速定位简历章节', 'Left panel for jumping between resume sections'),
  }
}
