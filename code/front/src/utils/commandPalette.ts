export function getCommandPaletteFooterLabel(locale: string) {
  return locale === 'zh-CN' ? '简历工作台' : 'Resume Studio'
}

export function getQuickActionLabel(locale: string) {
  return locale === 'zh-CN' ? '快捷入口' : 'Quick actions'
}

export function getQuickActionPlaceholder(locale: string) {
  return locale === 'zh-CN' ? '搜索简历、投递或操作' : 'Search resumes, applications, or actions'
}

export function getCommandPaletteEmptyLabel(locale: string) {
  return locale === 'zh-CN' ? '没有匹配的快捷入口' : 'No matching quick actions'
}
