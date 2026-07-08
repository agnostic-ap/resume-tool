<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '../stores/resume'
import { useLocaleText } from '../composables/useLocaleText'
import { showToast } from '../composables/toast'
import { closePaywall, usePaywallState } from '../composables/paywall'
import { PLAN_ENTITLEMENTS } from '../utils/entitlements'

const store = useResumeStore()
const { l } = useLocaleText()
const paywall = usePaywallState()

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
const checkoutUrl = viteEnv?.VITE_STRIPE_CHECKOUT_URL
const priceLabel = viteEnv?.VITE_PRO_PRICE_LABEL || l('¥39 / 月', '$6 / mo')

const reasonText = computed(() => {
  switch (paywall.value.reason) {
    case 'export':
      return l('本月免费导出额度已用完。升级 Pro 可无限导出且去除水印。', "You've used this month's free exports. Pro unlocks unlimited, watermark-free exports.")
    case 'ai':
      return l('今日免费 AI 定制额度已用完。升级 Pro 可无限生成 JD 定制草稿。', "You've used today's free AI tailoring. Pro unlocks unlimited JD-tailored drafts.")
    case 'resumes':
      return l('免费版最多保留 3 份在用简历。升级 Pro 可创建无限岗位版本。', 'Free keeps up to 3 active resumes. Pro unlocks unlimited role versions.')
    default:
      return l('升级 Pro，解锁无限导出、无限 AI 定制和去水印。', 'Upgrade to Pro for unlimited exports, unlimited AI tailoring, and no watermark.')
  }
})

const free = PLAN_ENTITLEMENTS.free

function startUpgrade() {
  store.trackProductEvent('upgrade_started', { reason: paywall.value.reason, has_checkout: Boolean(checkoutUrl) })
  if (checkoutUrl) {
    // Real payment path: hand off to the configured Stripe Checkout session.
    window.location.assign(checkoutUrl)
    return
  }
  // No payment provider configured: activate Pro locally so the entitlement loop
  // is fully exercisable in development.
  store.setPlan('pro', { reason: paywall.value.reason })
  showToast(l('已开通 Pro（本地激活，未接入真实支付）', 'Pro activated (local activation, no real payment configured)'), 'success', 4200)
  closePaywall()
}

function dismiss() {
  closePaywall()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="paywall.open" class="modal-backdrop" @click.self="dismiss">
      <div class="upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="upgrade-dialog-title">
        <div class="upgrade-dialog__head">
          <span id="upgrade-dialog-title" class="upgrade-dialog__eyebrow">{{ l('升级到 Pro', 'Upgrade to Pro') }}</span>
          <strong>{{ priceLabel }}</strong>
        </div>
        <p class="upgrade-dialog__reason">{{ reasonText }}</p>

        <div class="upgrade-dialog__plans">
          <div class="upgrade-plan">
            <b>{{ l('免费版', 'Free') }}</b>
            <ul>
              <li>{{ l(`每月 ${free.monthlyExports} 次导出`, `${free.monthlyExports} exports / month`) }}</li>
              <li>{{ l(`每日 ${free.dailyAiDrafts} 次 AI 定制`, `${free.dailyAiDrafts} AI drafts / day`) }}</li>
              <li>{{ l(`最多 ${free.maxActiveResumes} 份在用简历`, `Up to ${free.maxActiveResumes} active resumes`) }}</li>
              <li>{{ l('导出含水印', 'Exports include a watermark') }}</li>
            </ul>
          </div>
          <div class="upgrade-plan upgrade-plan--pro">
            <b>{{ l('Pro', 'Pro') }}</b>
            <ul>
              <li>{{ l('无限导出', 'Unlimited exports') }}</li>
              <li>{{ l('无限 AI 定制', 'Unlimited AI tailoring') }}</li>
              <li>{{ l('无限简历版本', 'Unlimited resume versions') }}</li>
              <li>{{ l('去除水印', 'No watermark') }}</li>
            </ul>
          </div>
        </div>

        <div class="upgrade-dialog__actions">
          <button class="btn btn--ghost" @click="dismiss">{{ l('暂不升级', 'Not now') }}</button>
          <button class="btn btn--primary" @click="startUpgrade">
            {{ checkoutUrl ? l('去支付', 'Continue to payment') : l('升级到 Pro', 'Upgrade to Pro') }}
          </button>
        </div>
        <p v-if="!checkoutUrl" class="upgrade-dialog__note">
          {{ l('未配置支付通道，升级将本地激活用于演示。', 'No payment provider configured; upgrade activates locally for demo.') }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
