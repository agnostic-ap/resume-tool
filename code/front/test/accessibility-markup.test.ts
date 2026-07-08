import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const componentFiles = [
  'src/components/PreviewPanel.vue',
  'src/components/TweaksPanel.vue',
  'src/components/WorkspacePanel.vue',
]

const dialogSurfaces = [
  { file: 'src/components/ConfirmDialog.vue', className: 'confirm-dialog' },
  { file: 'src/components/PreviewPanel.vue', className: 'export-precheck-dialog' },
  { file: 'src/components/TweaksPanel.vue', className: 'tweaks' },
  { file: 'src/components/WorkspacePanel.vue', className: 'application-detail-drawer' },
  { file: 'src/components/WelcomeDialog.vue', className: 'welcome-dialog' },
  { file: 'src/components/UpgradeDialog.vue', className: 'upgrade-dialog' },
]

test('close icon buttons expose accessible labels', () => {
  const root = new URL('..', import.meta.url).pathname
  const unlabeled: string[] = []

  for (const file of componentFiles) {
    const source = readFileSync(join(root, file), 'utf8')
    const closeButtons = source.match(/<button\b[\s\S]*?>×<\/button>/g) ?? []
    for (const button of closeButtons) {
      if (!button.includes('aria-label')) unlabeled.push(`${file}: ${button}`)
    }
  }

  assert.deepEqual(unlabeled, [])
})

test('modal and drawer surfaces expose dialog semantics', () => {
  const root = new URL('..', import.meta.url).pathname
  const missing: string[] = []

  for (const surface of dialogSurfaces) {
    const source = readFileSync(join(root, surface.file), 'utf8')
    const tags = source.match(/<(?:div|aside)\b[^>]*>/g) ?? []
    const tag = tags.find((candidate) => {
      const classes = candidate.match(/class="([^"]*)"/)?.[1].split(/\s+/) ?? []
      return classes.includes(surface.className)
    }) ?? ''
    if (!tag) {
      missing.push(`${surface.file}: .${surface.className} not found`)
      continue
    }
    for (const attribute of ['role="dialog"', 'aria-modal="true"', 'aria-labelledby=']) {
      if (!tag.includes(attribute)) missing.push(`${surface.file}: .${surface.className} missing ${attribute}`)
    }
  }

  assert.deepEqual(missing, [])
})
