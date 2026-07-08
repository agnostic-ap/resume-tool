import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSyncConnectedCopy,
  getSyncFailedActivityCopy,
  getSyncLocalModeCopy,
  getSyncRestoredCopy,
  getSyncStillUnavailableCopy,
  getSyncUnavailableCopy,
} from '../src/utils/syncCopy'

test('sync unavailable copy uses cloud wording instead of backend jargon', () => {
  const copy = getSyncUnavailableCopy('Network failed')
  const combined = `${copy.zh} ${copy.en}`

  assert.equal(copy.zh.includes('云端服务不可用'), true)
  assert.equal(copy.en.includes('Cloud sync unavailable'), true)
  assert.equal(combined.includes('后端'), false)
  assert.equal(combined.includes('Backend'), false)
})

test('sync status copy avoids backend wording across recovery states', () => {
  const copies = [
    getSyncConnectedCopy(),
    getSyncLocalModeCopy(),
    getSyncRestoredCopy(),
    getSyncStillUnavailableCopy(),
    getSyncFailedActivityCopy(),
  ]
  const combined = copies.map((copy) => `${copy.zh} ${copy.en}`).join(' ')

  assert.equal(combined.includes('后端'), false)
  assert.equal(combined.includes('Backend'), false)
  assert.equal(combined.includes('云端'), true)
  assert.equal(combined.includes('Cloud sync'), true)
})

test('sync connected copy does not expose technical service urls', () => {
  const copy = getSyncConnectedCopy()
  const combined = `${copy.zh} ${copy.en}`

  assert.equal(copy.zh, '云端同步已连接')
  assert.equal(copy.en, 'Cloud sync connected')
  assert.equal(combined.includes('http'), false)
  assert.equal(combined.includes('localhost'), false)
})
