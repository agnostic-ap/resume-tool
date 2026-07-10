export type EditorDisplayMode = 'form' | 'source' | 'diff'

function text(locale: string, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

export function getEditorModeLabel(mode: EditorDisplayMode, locale: string) {
  if (mode === 'form') return text(locale, '填写', 'Write')
  if (mode === 'source') return text(locale, '数据', 'Data')
  return text(locale, '结构检查', 'Structure')
}

export function getEditorDataCopySuccess(locale: string) {
  return text(locale, '简历数据已复制', 'Resume data copied')
}

export function getEditorDataCopyFailure(locale: string) {
  return text(locale, '复制失败，请手动选择简历数据', 'Copy failed. Select the resume data manually.')
}
