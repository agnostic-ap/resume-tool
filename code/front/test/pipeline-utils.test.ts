import assert from 'node:assert/strict'
import test from 'node:test'
import { getApplicationFollowUpState, getLocalDateKey } from '../src/utils/pipeline'
import type { ApplicationStage } from '../src/types/resume'

function application(followUpAt: string, stage: ApplicationStage = 'applied') {
  return { followUpAt, stage }
}

test('pipeline follow-up state is stable against a supplied today key', () => {
  assert.equal(getApplicationFollowUpState(application(''), '2026-06-16'), 'none')
  assert.equal(getApplicationFollowUpState(application('2026-06-15'), '2026-06-16'), 'overdue')
  assert.equal(getApplicationFollowUpState(application('2026-06-16'), '2026-06-16'), 'today')
  assert.equal(getApplicationFollowUpState(application('2026-06-17'), '2026-06-16'), 'future')
})

test('pipeline follow-up state ignores closed terminal stages', () => {
  assert.equal(getApplicationFollowUpState(application('2026-06-01', 'offer'), '2026-06-16'), 'none')
  assert.equal(getApplicationFollowUpState(application('2026-06-01', 'rejected'), '2026-06-16'), 'none')
})

test('local date key uses calendar values expected by date inputs', () => {
  assert.equal(getLocalDateKey(new Date(2026, 5, 16)), '2026-06-16')
})
