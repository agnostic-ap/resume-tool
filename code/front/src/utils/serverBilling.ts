// Wave 3: account-backed billing. When a user is signed in, the backend is the
// source of truth for plan and quota state; these pure helpers translate the
// server summary into the same shapes the local (offline) entitlement UI uses,
// so components never need to know which mode they are in.

import type { ServerBillingQuota, ServerBillingSummary } from '../api/backend'

/** Remaining uses for a server quota; Infinity for unlimited plans. */
export function serverQuotaRemaining(quota: ServerBillingQuota | undefined): number {
  if (!quota) return 0
  if (quota.limit === null) return Number.POSITIVE_INFINITY
  if (quota.remaining === null) return Number.POSITIVE_INFINITY
  return Math.max(0, quota.remaining)
}

export function canConsumeServerQuota(quota: ServerBillingQuota | undefined): boolean {
  return serverQuotaRemaining(quota) > 0
}

export function isServerPro(summary: ServerBillingSummary | null | undefined): boolean {
  return summary?.plan === 'pro'
}

/**
 * True when the server summary should drive entitlement decisions: the user is
 * signed in and we actually managed to fetch it. Offline / signed-out sessions
 * keep using the local billing state.
 */
export function shouldUseServerBilling(
  authenticated: boolean,
  summary: ServerBillingSummary | null | undefined,
): summary is ServerBillingSummary {
  return authenticated && Boolean(summary)
}
