import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildReferralUrl,
  buildShareUrl,
  decodeResumeShare,
  encodeResumeShare,
  getReferralCode,
  parseRefParam,
  parseShareToken,
  type ResumeSharePayload,
} from '../src/utils/share'

function samplePayload(): ResumeSharePayload {
  return {
    v: 1,
    title: '产品工程师简历',
    data: {
      personal: { name: '陈林', title: 'Product Engineer', summary: 'AI workflows', phone: '', email: '', location: '', website: '' },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      awards: [],
      languages: [],
      certifications: [],
    } as unknown as ResumeSharePayload['data'],
    config: { templateId: 'modern' } as unknown as ResumeSharePayload['config'],
    ref: 'rabc123',
  }
}

test('resume share survives an encode/decode round trip including unicode', () => {
  const payload = samplePayload()
  const token = encodeResumeShare(payload)
  assert.ok(!token.includes('+') && !token.includes('/') && !token.includes('='))
  const decoded = decodeResumeShare(token)
  assert.ok(decoded)
  assert.equal(decoded?.title, '产品工程师简历')
  assert.equal(decoded?.data.personal.name, '陈林')
  assert.equal(decoded?.ref, 'rabc123')
})

test('decodeResumeShare rejects malformed or wrong-version tokens', () => {
  assert.equal(decodeResumeShare('not-base64-!!'), null)
  assert.equal(decodeResumeShare(encodeResumeShare({ ...samplePayload(), v: 2 as unknown as 1 })), null)
})

test('referral code is deterministic for the same distinct id', () => {
  assert.equal(getReferralCode('anon-123'), getReferralCode('anon-123'))
  assert.notEqual(getReferralCode('anon-123'), getReferralCode('anon-456'))
})

test('share and referral urls and parsers are symmetric', () => {
  const shareUrl = buildShareUrl('https://app.example.com/', 'TOKEN123')
  assert.equal(shareUrl, 'https://app.example.com/#/r/TOKEN123')
  assert.equal(parseShareToken(new URL(shareUrl).hash), 'TOKEN123')

  const refUrl = buildReferralUrl('https://app.example.com', 'rabc123')
  assert.equal(parseRefParam(new URL(refUrl).search), 'rabc123')
  assert.equal(parseRefParam('?utm=x'), null)
})
