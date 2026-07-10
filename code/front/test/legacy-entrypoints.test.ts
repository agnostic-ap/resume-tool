import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getMobileCommandFallback } from '../src/utils/mobileNavigation'

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('legacy assistant command is no longer a hidden JD entrypoint', () => {
  assert.equal(getMobileCommandFallback('assistant', true), null)

  const appVue = source('src/App.vue')
  const i18n = source('src/i18n.ts')
  const css = source('src/style.css')

  assert.equal(appVue.includes("command === 'assistant'"), false)
  assert.equal(i18n.includes('assistant:'), false)
  assert.equal(css.includes('workspace-main--assistant'), false)
})

test('document library actions avoid developer shorthand labels', () => {
  const workspacePanel = source('src/components/WorkspacePanel.vue')

  assert.equal(workspacePanel.includes("label('标签', 'Meta')"), false)
  assert.equal(workspacePanel.includes("label('编辑信息', 'Edit info')"), true)
})

test('workspace document cards avoid terse developer-style labels', () => {
  const workspacePanel = source('src/components/WorkspacePanel.vue')

  assert.equal(workspacePanel.includes("label('实时', 'live')"), false)
  assert.equal(workspacePanel.includes("label('经历', 'exp')"), false)
  assert.equal(workspacePanel.includes("locale === 'zh-CN' ? '更新' : 'due'"), false)
  assert.equal(workspacePanel.includes("label('实时预览', 'Live preview')"), true)
  assert.equal(workspacePanel.includes("label('段经历', 'roles')"), true)
  assert.equal(workspacePanel.includes("label('更新提醒', 'Review in')"), true)
})
