import type { ResumeConfig, ResumeData } from '../types/resume'

// Wave 3: growth engine — public share links + referral.
//
// Share links are self-contained: the resume snapshot is encoded into the URL hash,
// so a recipient can view a read-only resume with no server-side storage of personal
// data. Each link also carries the sharer's referral code, which the landing CTA uses
// to attribute new signups (the viral loop).

export interface ResumeSharePayload {
  v: 1
  title: string
  data: ResumeData
  config: ResumeConfig
  ref?: string
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeResumeShare(payload: ResumeSharePayload): string {
  return toBase64Url(JSON.stringify(payload))
}

export function decodeResumeShare(token: string): ResumeSharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token))
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.v !== 1 || !parsed.data || !parsed.config) return null
    return parsed as ResumeSharePayload
  } catch {
    return null
  }
}

/** Deterministic, short referral code derived from the anonymous distinct id. */
export function getReferralCode(distinctId: string): string {
  let hash = 5381
  for (let i = 0; i < distinctId.length; i += 1) {
    hash = ((hash << 5) + hash + distinctId.charCodeAt(i)) >>> 0
  }
  return `r${hash.toString(36)}`
}

export function buildShareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/#/r/${token}`
}

export function buildReferralUrl(origin: string, refCode: string): string {
  return `${origin.replace(/\/$/, '')}/?ref=${encodeURIComponent(refCode)}`
}

/** Extract a share token from a location hash like `#/r/<token>`. Pure for testing. */
export function parseShareToken(hash: string): string | null {
  const match = hash.match(/^#\/r\/(.+)$/)
  return match ? match[1] : null
}

/** Extract a referral code from a location search string like `?ref=abc`. Pure for testing. */
export function parseRefParam(search: string): string | null {
  const match = search.match(/[?&]ref=([^&]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
