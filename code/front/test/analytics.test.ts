import assert from 'node:assert/strict'
import test from 'node:test'
import { appendToBuffer, buildFunnelSummary } from '../src/utils/analytics'
import type { AnalyticsEvent } from '../src/utils/analytics'
import type { ProductEventName } from '../src/types/resume'

function event(name: ProductEventName, properties: Record<string, unknown> = {}, timestamp = '2026-06-29T00:00:00.000Z'): AnalyticsEvent {
  return { event: name, properties, distinctId: 'anon-test', timestamp }
}

test('appendToBuffer keeps the buffer bounded to the most recent events', () => {
  let buffer: AnalyticsEvent[] = []
  for (let i = 0; i < 5; i += 1) {
    buffer = appendToBuffer(buffer, event('jd_draft_requested', { i }), 3)
  }
  assert.equal(buffer.length, 3)
  assert.deepEqual(buffer.map((item) => item.properties.i), [2, 3, 4])
})

test('buildFunnelSummary derives activation, AI and reliability metrics', () => {
  const events: AnalyticsEvent[] = [
    event('onboarding_choice_selected', { choice: 'blank' }, '2026-06-29T00:00:00.000Z'),
    event('resume_core_field_completed', { field: 'personal' }, '2026-06-29T00:01:00.000Z'),
    event('resume_core_field_completed', { field: 'personal' }, '2026-06-29T00:01:30.000Z'),
    event('resume_core_field_completed', { field: 'skills' }, '2026-06-29T00:02:00.000Z'),
    event('jd_draft_requested', {}, '2026-06-29T00:03:00.000Z'),
    event('jd_draft_requested', {}, '2026-06-29T00:03:30.000Z'),
    event('jd_draft_generated', { score: 70 }, '2026-06-29T00:04:00.000Z'),
    event('application_created_from_jd', {}, '2026-06-29T00:05:00.000Z'),
    event('export_precheck_completed', { issue_count: 0 }, '2026-06-29T00:06:00.000Z'),
    event('sync_operation_failed', { entity_type: 'resume' }, '2026-06-29T00:07:00.000Z'),
  ]

  const summary = buildFunnelSummary(events)

  assert.equal(summary.totalEvents, 10)
  assert.equal(summary.firstEventAt, '2026-06-29T00:00:00.000Z')
  assert.equal(summary.lastEventAt, '2026-06-29T00:07:00.000Z')

  // Activation: distinct core fields are de-duplicated.
  assert.equal(summary.activation.onboardingStarted, true)
  assert.equal(summary.activation.coreFieldsCompleted, 2)
  assert.equal(summary.activation.reachedExportPrecheck, true)

  // AI adoption rates.
  assert.equal(summary.ai.jdDraftRequested, 2)
  assert.equal(summary.ai.jdDraftGenerated, 1)
  assert.equal(summary.ai.draftSuccessRate, 0.5)
  assert.equal(summary.ai.draftToApplicationRate, 1)

  assert.equal(summary.reliability.syncFailures, 1)
})

test('buildFunnelSummary handles an empty buffer without dividing by zero', () => {
  const summary = buildFunnelSummary([])
  assert.equal(summary.totalEvents, 0)
  assert.equal(summary.ai.draftSuccessRate, 0)
  assert.equal(summary.ai.draftToApplicationRate, 0)
  assert.equal(summary.activation.onboardingStarted, false)
})
