function text(locale: string, zh: string, en: string) {
  return locale === 'zh-CN' ? zh : en
}

export function getApplicationDeleteMessage(applicationLabel: string, progressEventCount: number, locale: string) {
  return text(
    locale,
    `“${applicationLabel}”会从投递管线移除，岗位信息、跟进计划和 ${progressEventCount} 条时间线事件也会删除；关联简历会保留。`,
    `"${applicationLabel}" will be removed from the pipeline, including its job details, follow-up plan, and ${progressEventCount} timeline events. The linked resume stays untouched.`,
  )
}
