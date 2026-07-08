export type MobileCommandFallbackReason = 'desktop-only' | 'resume-selected'

export interface MobileCommandFallback {
  view: 'documents'
  reason: MobileCommandFallbackReason
}

const desktopOnlyCommands = new Set(['editor', 'jd', 'assistant', 'export', 'pipeline'])
const desktopOnlyPrefixes = ['application:', 'growth:']

export function getMobileCommandFallback(command: string, isNarrowViewport: boolean): MobileCommandFallback | null {
  if (!isNarrowViewport) return null
  if (command.startsWith('resume:')) return { view: 'documents', reason: 'resume-selected' }
  if (desktopOnlyCommands.has(command) || desktopOnlyPrefixes.some((prefix) => command.startsWith(prefix))) {
    return { view: 'documents', reason: 'desktop-only' }
  }
  return null
}
