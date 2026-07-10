<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '../stores/resume'
import { useLocaleText } from '../composables/useLocaleText'
import { showToast } from '../composables/toast'
import { closePaywall, usePaywallState } from '../composables/paywall'
import { PLAN_ENTITLEMENTS } from '../utils/entitlements'
import {
  getJdQuotaLabel,
  getUnlimitedJdQuotaLabel,
  getUpgradeInterestActionLabel,
  getUpgradeInterestNote,
  getUpgradeInterestToast,
  getUpgradeReasonText,
  resolveUpgradeStartTarget,
} from '../utils/upgradeDisplay'

const store = useResumeStore()
const { l } = useLocaleText()
const paywall = usePaywallState()

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
const checkoutUrl = viteEnv?.VITE_STRIPE_CHECKOUT_URL
const priceLabel = viteEnv?.VITE_PRO_PRICE_LABEL || l('¥39 / 月', '$6 / mo')

const reasonText = computed(() => getUpgradeReasonText(paywall.value.reason, store.config.locale))

const free = PLAN_ENTITLEMENTS.free

function startUpgrade() {
  const target = resolveUpgradeStartTarget(checkoutUrl)
  store.trackProductEvent('upgrade_started', {
    reason: paywall.value.reason,
    has_checkout: target.kind === 'checkout',
    outcome: target.kind,
  })
  if (target.kind === 'checkout') {
    window.location.assign(target.checkoutUrl)
    return
  }
  showToast(getUpgradeInterestToast(store.config.locale), 'info', 4200)
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
              <li>{{ getJdQuotaLabel(free.dailyAiDrafts, store.config.locale) }}</li>
              <li>{{ l(`最多 ${free.maxActiveResumes} 份在用简历`, `Up to ${free.maxActiveResumes} active resumes`) }}</li>
              <li>{{ l('导出含水印', 'Exports include a watermark') }}</li>
            </ul>
          </div>
          <div class="upgrade-plan upgrade-plan--pro">
            <b>{{ l('Pro', 'Pro') }}</b>
            <ul>
              <li>{{ l('无限导出', 'Unlimited exports') }}</li>
              <li>{{ getUnlimitedJdQuotaLabel(store.config.locale) }}</li>
              <li>{{ l('无限简历版本', 'Unlimited resume versions') }}</li>
              <li>{{ l('去除水印', 'No watermark') }}</li>
            </ul>
          </div>
        </div>

        <div class="upgrade-dialog__actions">
          <button class="btn btn--ghost" @click="dismiss">{{ l('暂不升级', 'Not now') }}</button>
          <button class="btn btn--primary" @click="startUpgrade">
            {{ checkoutUrl ? l('去支付', 'Continue to payment') : getUpgradeInterestActionLabel(store.config.locale) }}
          </button>
        </div>
        <p v-if="!checkoutUrl" class="upgrade-dialog__note">
          {{ getUpgradeInterestNote(store.config.locale) }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
