import assert from 'node:assert/strict'
import test from 'node:test'
import { RESUME_COLOR_PRESETS, getResumeColorLabel } from '../src/utils/resumeTheme'

test('resume color presets use user-facing labels instead of design-system terms', () => {
  assert.equal(RESUME_COLOR_PRESETS.length, 7)
  const forbidden = /\b(Ant|Success|Warning|Error|Geek|Cyan|Purple)\b/i

  for (const preset of RESUME_COLOR_PRESETS) {
    assert.match(preset.hex, /^#[0-9A-F]{6}$/i)
    assert.ok(preset.labelZh.length >= 2)
    assert.ok(preset.labelEn.length >= 4)
    assert.equal(forbidden.test(preset.labelZh), false)
    assert.equal(forbidden.test(preset.labelEn), false)
  }
})

test('resume color labels are localized and fall back to English', () => {
  const first = RESUME_COLOR_PRESETS[0]

  assert.equal(getResumeColorLabel(first, 'zh-CN'), first.labelZh)
  assert.equal(getResumeColorLabel(first, 'en-US'), first.labelEn)
  assert.equal(getResumeColorLabel(first, 'fr-FR'), first.labelEn)
})
