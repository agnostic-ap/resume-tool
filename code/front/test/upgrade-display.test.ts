import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getJdQuotaLabel,
  getUnlimitedJdQuotaLabel,
  getUpgradeInterestActionLabel,
  getUpgradeInterestNote,
  getUpgradeInterestToast,
  getUpgradeReasonText,
  resolveUpgradeStartTarget,
} from '../src/utils/upgradeDisplay'

test('upgrade fallback copy avoids fake local activation wording', () => {
  const labels = [
    getUpgradeInterestActionLabel('zh-CN'),
    getUpgradeInterestActionLabel('en-US'),
    getUpgradeInterestNote('zh-CN'),
    getUpgradeInterestNote('en-US'),
    getUpgradeInterestToast('zh-CN'),
    getUpgradeInterestToast('en-US'),
  ]
  const combined = labels.join(' ')

  assert.deepEqual(labels, [
    '记录升级意向',
    'Request Pro access',
    '支付暂未开放。点击后会记录你的升级意向，当前套餐不会改变。',
    'Payment is not available yet. Click to note your interest; your current plan will not change.',
    '已记录升级意向，当前仍是免费版。',
    "Upgrade interest noted. You're still on Free.",
  ])
  assert.equal(/本地|演示|demo|local activation|activated|已开通/i.test(combined), false)
})

test('upgrade start target never auto-activates pro without checkout', () => {
  assert.deepEqual(resolveUpgradeStartTarget('https://checkout.example/pro'), {
    kind: 'checkout',
    checkoutUrl: 'https://checkout.example/pro',
  })
  assert.deepEqual(resolveUpgradeStartTarget(undefined), { kind: 'interest' })
  assert.deepEqual(resolveUpgradeStartTarget(''), { kind: 'interest' })
})

test('upgrade and quota copy use JD tailoring instead of old AI wording', () => {
  const labels = [
    getUpgradeReasonText('ai', 'zh-CN'),
    getUpgradeReasonText('ai', 'en-US'),
    getUpgradeReasonText('general', 'zh-CN'),
    getUpgradeReasonText('general', 'en-US'),
    getJdQuotaLabel(3, 'zh-CN'),
    getJdQuotaLabel(3, 'en-US'),
    getUnlimitedJdQuotaLabel('zh-CN'),
    getUnlimitedJdQuotaLabel('en-US'),
  ]
  const combined = labels.join(' ')

  assert.equal(/AI 定制|AI tailoring|AI drafts/i.test(combined), false)
  assert.equal(combined.includes('JD'), true)
})
