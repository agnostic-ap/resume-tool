import type { ProductEventName } from '../types/resume'

// Wave 0 instrumentation.
//
// The product already fires the activation/AI/retention funnel events designed in
// `执行路线图.md` section 4 through `store.trackProductEvent`. Until now those events
// only landed in the local activity log, so there was no real PMF data and no way to
// forward them to an analytics backend.
//
// This module adds a thin, dependency-free analytics client that:
//   - keeps a stable anonymous distinct id (the minimal "account"/identity for attribution),
//   - lets a real user id be attached later (Wave 2 accounts) via `identify`,
//   - buffers events locally so a funnel can be computed even with no external service,
//   - forwards events to PostHog when `VITE_POSTHOG_KEY` is configured.

export interface AnalyticsEvent {
  event: ProductEventName
  properties: Record<string, unknown>
  distinctId: string
  userId?: string
  timestamp: string
}

export interface FunnelSummary {
  distinctId: string
  userId?: string
  totalEvents: number
  firstEventAt?: string
  lastEventAt?: string
  counts: Record<ProductEventName, number>
  activation: {
    onboardingStarted: boolean
    coreFieldsCompleted: number
    reachedExportPrecheck: boolean
  }
  ai: {
    jdDraftRequested: number
    jdDraftGenerated: number
    jdSectionApplied: number
    applicationCreatedFromJd: number
    /** generated / requested */
    draftSuccessRate: number
    /** applicationsCreated / draftsGenerated */
    draftToApplicationRate: number
  }
  reliability: {
    syncFailures: number
  }
  monetization: {
    paywallViews: number
    upgradesStarted: number
    planChanges: number
    /** upgradesStarted / paywallViews */
    paywallConversionRate: number
  }
  growth: {
    resumesShared: number
    publicViews: number
    referralsCaptured: number
  }
}

const FUNNEL_EVENTS: ProductEventName[] = [
  'onboarding_choice_selected',
  'resume_core_field_completed',
  'jd_draft_requested',
  'jd_draft_generated',
  'jd_section_applied',
  'application_created_from_jd',
  'export_precheck_completed',
  'sync_operation_failed',
]

const DISTINCT_ID_KEY = 'resume-analytics-distinct-id'
const IDENTITY_KEY = 'resume-analytics-user-id'
const BUFFER_KEY = 'resume-analytics-buffer'
const BUFFER_LIMIT = 500

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
const POSTHOG_KEY = viteEnv?.VITE_POSTHOG_KEY
const POSTHOG_HOST = (viteEnv?.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '')

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function randomId(prefix: string): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined
  if (globalCrypto?.randomUUID) return `${prefix}-${globalCrypto.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getDistinctId(): string {
  if (!hasStorage()) return 'anonymous'
  let id = window.localStorage.getItem(DISTINCT_ID_KEY)
  if (!id) {
    id = randomId('anon')
    window.localStorage.setItem(DISTINCT_ID_KEY, id)
  }
  return id
}

export function getUserId(): string | undefined {
  if (!hasStorage()) return undefined
  return window.localStorage.getItem(IDENTITY_KEY) || undefined
}

/**
 * Attach a real user id to the current anonymous identity. Wave 2 accounts call this
 * after sign-in so historical anonymous events stay linked to the same person.
 */
export function identify(userId: string): void {
  if (!hasStorage() || !userId) return
  window.localStorage.setItem(IDENTITY_KEY, userId)
  if (POSTHOG_KEY) {
    void sendToPostHog('$identify', { $anon_distinct_id: getDistinctId() }, userId)
  }
}

export function resetIdentity(): void {
  if (!hasStorage()) return
  window.localStorage.removeItem(IDENTITY_KEY)
}

function readBuffer(): AnalyticsEvent[] {
  if (!hasStorage()) return []
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}

/** Pure helper so the ring-buffer behaviour stays unit-testable without a browser. */
export function appendToBuffer(buffer: AnalyticsEvent[], next: AnalyticsEvent, limit = BUFFER_LIMIT): AnalyticsEvent[] {
  return [...buffer, next].slice(-limit)
}

function writeBuffer(buffer: AnalyticsEvent[]): void {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer))
  } catch {
    // ignore quota / serialization issues; analytics must never break the app
  }
}

export function getBufferedEvents(): AnalyticsEvent[] {
  return readBuffer()
}

export function clearBufferedEvents(): void {
  if (!hasStorage()) return
  window.localStorage.removeItem(BUFFER_KEY)
}

async function sendToPostHog(event: string, properties: Record<string, unknown>, userId?: string): Promise<void> {
  if (!POSTHOG_KEY || typeof fetch !== 'function') return
  try {
    await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: userId || getDistinctId(),
        properties: { ...properties, $lib: 'resume-tool-web' },
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // network/analytics failures are non-fatal
  }
}

/**
 * Capture a product funnel event. Always buffers locally; forwards to PostHog when configured.
 */
export function captureProductEvent(event: ProductEventName, properties: Record<string, unknown> = {}): AnalyticsEvent {
  const record: AnalyticsEvent = {
    event,
    properties,
    distinctId: getDistinctId(),
    userId: getUserId(),
    timestamp: new Date().toISOString(),
  }
  writeBuffer(appendToBuffer(readBuffer(), record))
  if (POSTHOG_KEY) void sendToPostHog(event, properties, record.userId)
  return record
}

function emptyCounts(): Record<ProductEventName, number> {
  return FUNNEL_EVENTS.reduce((acc, name) => {
    acc[name] = 0
    return acc
  }, {} as Record<ProductEventName, number>)
}

/**
 * Pure funnel aggregation over a list of events. This is the minimal PMF readout
 * (activation / AI adoption / reliability) the plan asks Wave 0 to start collecting.
 */
export function buildFunnelSummary(events: AnalyticsEvent[]): FunnelSummary {
  const counts = emptyCounts()
  const coreFields = new Set<string>()
  let firstEventAt: string | undefined
  let lastEventAt: string | undefined

  for (const item of events) {
    if (item.event in counts) counts[item.event] += 1
    if (item.event === 'resume_core_field_completed') {
      const field = item.properties.field
      if (typeof field === 'string') coreFields.add(field)
    }
    if (!firstEventAt || item.timestamp < firstEventAt) firstEventAt = item.timestamp
    if (!lastEventAt || item.timestamp > lastEventAt) lastEventAt = item.timestamp
  }

  const jdDraftRequested = counts.jd_draft_requested
  const jdDraftGenerated = counts.jd_draft_generated
  const applicationCreatedFromJd = counts.application_created_from_jd

  const paywallViews = events.filter((item) => item.event === 'paywall_viewed').length
  const upgradesStarted = events.filter((item) => item.event === 'upgrade_started').length
  const planChanges = events.filter((item) => item.event === 'plan_changed').length
  const resumesShared = events.filter((item) => item.event === 'resume_shared').length
  const publicViews = events.filter((item) => item.event === 'public_resume_viewed').length
  const referralsCaptured = events.filter((item) => item.event === 'referral_captured').length

  return {
    distinctId: getDistinctId(),
    userId: getUserId(),
    totalEvents: events.length,
    firstEventAt,
    lastEventAt,
    counts,
    activation: {
      onboardingStarted: counts.onboarding_choice_selected > 0,
      coreFieldsCompleted: coreFields.size,
      reachedExportPrecheck: counts.export_precheck_completed > 0,
    },
    ai: {
      jdDraftRequested,
      jdDraftGenerated,
      jdSectionApplied: counts.jd_section_applied,
      applicationCreatedFromJd,
      draftSuccessRate: jdDraftRequested ? round(jdDraftGenerated / jdDraftRequested) : 0,
      draftToApplicationRate: jdDraftGenerated ? round(applicationCreatedFromJd / jdDraftGenerated) : 0,
    },
    reliability: {
      syncFailures: counts.sync_operation_failed,
    },
    monetization: {
      paywallViews,
      upgradesStarted,
      planChanges,
      paywallConversionRate: paywallViews ? round(upgradesStarted / paywallViews) : 0,
    },
    growth: {
      resumesShared,
      publicViews,
      referralsCaptured,
    },
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function getFunnelSummary(): FunnelSummary {
  return buildFunnelSummary(readBuffer())
}

export const analyticsConfig = {
  get enabled() {
    return Boolean(POSTHOG_KEY)
  },
  host: POSTHOG_HOST,
}
