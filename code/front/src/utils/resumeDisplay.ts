import type { Locale } from '../types/resume'

function text(locale: string, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

export function getActiveResumeVersionLabel(locale: string) {
  return text(locale, '当前版本', 'Active version')
}

export function getResumeLanguageLabel(resumeLocale: Locale | string, uiLocale: string) {
  if (resumeLocale === 'zh-CN') return text(uiLocale, '中文简历', 'Chinese resume')
  return text(uiLocale, '英文简历', 'English resume')
}
