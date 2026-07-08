import assert from 'node:assert/strict'
import test from 'node:test'
import { getMobileCommandFallback } from '../src/utils/mobileNavigation'

test('narrow screens route desktop-only commands back to the resume library', () => {
  for (const command of ['editor', 'jd', 'assistant', 'export', 'pipeline', 'application:app-1', 'growth:entry-1']) {
    assert.deepEqual(getMobileCommandFallback(command, true), {
      view: 'documents',
      reason: 'desktop-only',
    })
  }

  assert.equal(getMobileCommandFallback('export', false), null)
  assert.equal(getMobileCommandFallback('documents', true), null)
})

test('narrow screens keep resume selection inside the library', () => {
  assert.deepEqual(getMobileCommandFallback('resume:doc-1', true), {
    view: 'documents',
    reason: 'resume-selected',
  })
})
