import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appVue = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')

function editorInspectorTemplate() {
  const start = appVue.indexOf('<aside class="inspector-panel">')
  const end = appVue.indexOf('</aside>', start)
  assert.ok(start >= 0, 'editor inspector aside should exist')
  assert.ok(end > start, 'editor inspector aside should close')
  return appVue.slice(start, end)
}

function position(template: string, marker: string) {
  const index = template.indexOf(marker)
  assert.ok(index >= 0, `${marker} should exist in editor inspector`)
  return index
}

test('editor inspector prioritizes next action, JD tailoring, and export readiness', () => {
  const template = editorInspectorTemplate()
  const nextAction = position(template, 'next-action-card')
  const jdTailoring = position(template, 'editor-jd-card')
  const exportReadiness = position(template, 'export-status-card')
  const plan = position(template, 'plan-card')
  const templates = position(template, 'resume-template-card')
  const style = position(template, 'resume-style-card')

  assert.ok(nextAction < jdTailoring, 'next action should stay first')
  assert.ok(jdTailoring < exportReadiness, 'JD tailoring should appear before export readiness')
  assert.ok(exportReadiness < plan, 'export readiness should appear before plan and quota noise')
  assert.ok(plan < templates, 'plan details should be below the main path')
  assert.ok(templates < style, 'template and style controls should remain secondary')
})
