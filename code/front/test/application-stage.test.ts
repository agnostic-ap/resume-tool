import assert from 'node:assert/strict'
import test from 'node:test'
import { APPLICATION_STAGE_OPTIONS, getApplicationStageLabel } from '../src/utils/applicationStage'
import type { ApplicationStage } from '../src/types/resume'

test('application stage labels are localized for user-facing surfaces', () => {
  const expectedZh: Record<ApplicationStage, string> = {
    saved: '待投递',
    applied: '已投递',
    screen: '初筛',
    onsite: '面试',
    offer: 'Offer',
    rejected: '已关闭',
  }
  const expectedEn: Record<ApplicationStage, string> = {
    saved: 'Saved',
    applied: 'Applied',
    screen: 'Screening',
    onsite: 'Interview',
    offer: 'Offer',
    rejected: 'Closed',
  }

  assert.deepEqual(APPLICATION_STAGE_OPTIONS.map((option) => option.id), Object.keys(expectedZh))
  for (const stage of Object.keys(expectedZh) as ApplicationStage[]) {
    assert.equal(getApplicationStageLabel(stage, 'zh-CN'), expectedZh[stage])
    assert.equal(getApplicationStageLabel(stage, 'en-US'), expectedEn[stage])
    assert.equal(getApplicationStageLabel(stage, 'fr-FR'), expectedEn[stage])
  }
})

test('application stage labels avoid raw internal enum values except established offer copy', () => {
  for (const stage of ['saved', 'applied', 'screen', 'onsite', 'rejected'] as ApplicationStage[]) {
    assert.notEqual(getApplicationStageLabel(stage, 'en-US'), stage)
    assert.notEqual(getApplicationStageLabel(stage, 'zh-CN'), stage)
  }
})
