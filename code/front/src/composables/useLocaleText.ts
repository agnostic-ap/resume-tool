import { useI18n } from '../i18n'

export function useLocaleText() {
  const { locale } = useI18n()

  function l(zh: string, en: string) {
    return locale.value === 'zh-CN' ? zh : en
  }

  return { locale, l }
}
