import type { Locale } from '../types/resume'

export type UpgradeStartTarget =
  | { kind: 'checkout'; checkoutUrl: string }
  | { kind: 'interest' }

export type UpgradeReason = 'export' | 'ai' | 'resumes' | 'general'

function isZh(locale: Locale | string) {
  return locale === 'zh-CN'
}

export function getUpgradeReasonText(reason: UpgradeReason, locale: Locale | string) {
  if (reason === 'export') {
    return isZh(locale)
      ? '本月免费导出额度已用完。升级 Pro 可无限导出且去除水印。'
      : "You've used this month's free exports. Pro unlocks unlimited, watermark-free exports."
  }
  if (reason === 'ai') {
    return isZh(locale)
      ? '今日免费 JD 定制额度已用完。升级 Pro 可无限生成 JD 定制草稿。'
      : "You've used today's free JD tailoring. Pro unlocks unlimited JD-tailored drafts."
  }
  if (reason === 'resumes') {
    return isZh(locale)
      ? '免费版最多保留 3 份在用简历。升级 Pro 可创建无限岗位版本。'
      : 'Free keeps up to 3 active resumes. Pro unlocks unlimited role versions.'
  }
  return isZh(locale)
    ? '升级 Pro，解锁无限导出、无限 JD 定制和去水印。'
    : 'Upgrade to Pro for unlimited exports, unlimited JD tailoring, and no watermark.'
}

export function getJdQuotaLabel(count: number, locale: Locale | string) {
  return isZh(locale) ? `每日 ${count} 次 JD 定制` : `${count} JD drafts / day`
}

export function getUnlimitedJdQuotaLabel(locale: Locale | string) {
  return isZh(locale) ? '无限 JD 定制' : 'Unlimited JD tailoring'
}

export function getUpgradeInterestActionLabel(locale: Locale | string) {
  return isZh(locale) ? '记录升级意向' : 'Request Pro access'
}

export function getUpgradeInterestNote(locale: Locale | string) {
  return isZh(locale)
    ? '支付暂未开放。点击后会记录你的升级意向，当前套餐不会改变。'
    : 'Payment is not available yet. Click to note your interest; your current plan will not change.'
}

export function getUpgradeInterestToast(locale: Locale | string) {
  return isZh(locale) ? '已记录升级意向，当前仍是免费版。' : "Upgrade interest noted. You're still on Free."
}

export function resolveUpgradeStartTarget(checkoutUrl?: string): UpgradeStartTarget {
  const trimmed = checkoutUrl?.trim()
  return trimmed ? { kind: 'checkout', checkoutUrl: trimmed } : { kind: 'interest' }
}
