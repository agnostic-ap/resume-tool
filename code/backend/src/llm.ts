import type { PlatformGenerateResumeInput } from './schemas.js'
import { generatePlatformResume } from './platform-generator.js'

// Wave 1: real AI wedge.
//
// `generatePlatformResume` stays as the deterministic rule-based core (and as the
// fallback / cost backstop). This module wraps it so that, when an LLM is configured
// via env, the summary and experience bullets are rewritten by a real model. Either
// way the response now carries a structured, field-level diff (before/after + rationale
// + confidence + source) so the product can honestly show what changed and why.

export type DiffSection = 'summary' | 'experience' | 'skills' | 'projects'

export interface DraftDiffOperation {
  section: DiffSection
  field: string
  targetId?: string
  before: string
  after: string
  rationale: string
  confidence: number
  source: 'llm' | 'rule-based'
}

type BaseDraft = ReturnType<typeof generatePlatformResume>

export interface GeneratedResumeDraft extends BaseDraft {
  diff: DraftDiffOperation[]
}

interface LlmConfig {
  apiKey: string
  baseUrl: string
  model: string
  timeoutMs: number
}

function readLlmConfig(): LlmConfig | null {
  const apiKey = process.env.RESUME_LLM_API_KEY?.trim()
  if (!apiKey) return null
  return {
    apiKey,
    baseUrl: (process.env.RESUME_LLM_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.RESUME_LLM_MODEL?.trim() || 'gpt-4o-mini',
    timeoutMs: Number(process.env.RESUME_LLM_TIMEOUT_MS) || 20_000,
  }
}

export function isLlmEnabled(): boolean {
  return readLlmConfig() !== null
}

/**
 * Generate a JD-tailored draft. Uses a real LLM when configured, otherwise the
 * deterministic rule-based generator. Always returns a structured diff.
 */
export async function generateResumeDraft(input: PlatformGenerateResumeInput): Promise<GeneratedResumeDraft> {
  const base = generatePlatformResume(input)
  const config = readLlmConfig()

  if (config) {
    try {
      const enhanced = await enhanceWithLlm(input, base, config)
      if (enhanced) {
        return {
          ...base,
          data: enhanced.data,
          generation: { ...base.generation, strategy: 'llm-jd-tailoring-v1' },
          diff: enhanced.diff,
        }
      }
    } catch {
      // Fall through to the rule-based result on any LLM/network failure.
    }
  }

  return { ...base, diff: buildRuleBasedDiff(input, base) }
}

interface LlmResult {
  data: BaseDraft['data']
  diff: DraftDiffOperation[]
}

async function enhanceWithLlm(
  input: PlatformGenerateResumeInput,
  base: BaseDraft,
  config: LlmConfig,
): Promise<LlmResult | null> {
  const matched = base.match.matchedKeywords.slice(0, 12)
  const prompt = buildLlmPrompt(input, base, matched)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  let payload: unknown
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a precise resume editor. Rewrite the candidate summary and experience bullets so they match the target job description. Keep every claim truthful and grounded in the provided content; never invent employers, titles, dates, or metrics. Be concise and use the requested locale. Respond with strict JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!response.ok) return null
    payload = await response.json()
  } finally {
    clearTimeout(timeout)
  }

  const content = extractMessageContent(payload)
  if (!content) return null

  const parsed = safeParseJson(content)
  if (!parsed) return null

  return applyLlmOutput(input, base, parsed, matched)
}

function buildLlmPrompt(input: PlatformGenerateResumeInput, base: BaseDraft, matched: string[]): string {
  const jd = input.jobDescription
  const experiences = base.data.experience.map((exp) => ({
    id: exp.id,
    company: exp.company,
    position: exp.position,
    currentBullets: exp.description,
    sourceDescription: input.workHistory.find((item) => item.id === exp.sourceId)?.description ?? '',
  }))

  return JSON.stringify({
    locale: input.locale ?? 'zh-CN',
    targetRole: jd.title,
    targetCompany: jd.company ?? '',
    jobDescription: jd.description ?? '',
    jobRequirements: jd.requirements ?? [],
    matchedKeywords: matched,
    candidateSummary: input.personal?.summary ?? '',
    experiences,
    responseShape: {
      summary: 'string - rewritten 2-4 sentence professional summary',
      experiences: '[{ id: string, bullets: string[] }] - 2-4 rewritten bullet points per experience id',
    },
  })
}

function applyLlmOutput(
  input: PlatformGenerateResumeInput,
  base: BaseDraft,
  parsed: Record<string, unknown>,
  matched: string[],
): LlmResult | null {
  const diff: DraftDiffOperation[] = []
  const data: BaseDraft['data'] = {
    ...base.data,
    personal: { ...base.data.personal },
    experience: base.data.experience.map((exp) => ({ ...exp })),
  }

  const rationale = matched.length
    ? `Rewritten to emphasize ${matched.slice(0, 5).join(', ')} for the target role.`
    : 'Rewritten to align with the target job description.'

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  if (summary && summary !== data.personal.summary) {
    const before = input.personal?.summary?.trim() ?? ''
    data.personal.summary = summary
    diff.push({
      section: 'summary',
      field: 'personal.summary',
      before,
      after: summary,
      rationale,
      confidence: 0.72,
      source: 'llm',
    })
  }

  const llmExperiences = Array.isArray(parsed.experiences) ? parsed.experiences : []
  for (const raw of llmExperiences) {
    if (!raw || typeof raw !== 'object') continue
    const id = String((raw as Record<string, unknown>).id ?? '')
    const bullets = (raw as Record<string, unknown>).bullets
    if (!id || !Array.isArray(bullets)) continue
    const lines = bullets.map((line) => String(line).replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
    if (!lines.length) continue
    const target = data.experience.find((exp) => exp.id === id)
    if (!target) continue
    const after = lines.map((line) => `• ${line}`).join('\n')
    if (after === target.description) continue
    const sourceDescription = input.workHistory.find((item) => item.id === target.sourceId)?.description ?? ''
    diff.push({
      section: 'experience',
      field: `experience.${id}.description`,
      targetId: id,
      before: sourceDescription || target.description,
      after,
      rationale: `Reordered and rephrased ${target.position || 'role'} impact toward the target JD.`,
      confidence: 0.68,
      source: 'llm',
    })
    target.description = after
  }

  if (!diff.length) return null
  return { data, diff }
}

function extractMessageContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const choices = (payload as Record<string, unknown>).choices
  if (!Array.isArray(choices) || !choices.length) return null
  const message = (choices[0] as Record<string, unknown>).message
  if (!message || typeof message !== 'object') return null
  const content = (message as Record<string, unknown>).content
  return typeof content === 'string' ? content : null
}

function safeParseJson(content: string): Record<string, unknown> | null {
  try {
    const trimmed = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Build a structured diff for the deterministic path so the response shape is identical
 * whether or not an LLM ran. Compares the candidate's current content with what the
 * rule-based generator produced.
 */
export function buildRuleBasedDiff(input: PlatformGenerateResumeInput, base: BaseDraft): DraftDiffOperation[] {
  const diff: DraftDiffOperation[] = []
  const matched = base.match.matchedKeywords.slice(0, 6)
  const rationale = matched.length
    ? `Prioritized content matching ${matched.join(', ')}.`
    : 'Prioritized content by JD relevance.'

  const summaryBefore = input.personal?.summary?.trim() ?? ''
  const summaryAfter = base.data.personal.summary.trim()
  if (summaryAfter && summaryAfter !== summaryBefore) {
    diff.push({
      section: 'summary',
      field: 'personal.summary',
      before: summaryBefore,
      after: summaryAfter,
      rationale,
      confidence: 0.5,
      source: 'rule-based',
    })
  }

  for (const exp of base.data.experience) {
    const sourceDescription = input.workHistory.find((item) => item.id === exp.sourceId)?.description?.trim() ?? ''
    const after = exp.description.trim()
    if (after && after !== sourceDescription) {
      diff.push({
        section: 'experience',
        field: `experience.${exp.id}.description`,
        targetId: exp.id,
        before: sourceDescription,
        after,
        rationale: 'Reordered bullets by keyword relevance to the JD.',
        confidence: 0.5,
        source: 'rule-based',
      })
    }
  }

  const skillsBefore = (input.skills ?? []).join(', ')
  const skillsAfter = base.data.skills.map((group) => group.items).filter(Boolean).join(' | ')
  if (skillsAfter && skillsAfter !== skillsBefore) {
    diff.push({
      section: 'skills',
      field: 'skills',
      before: skillsBefore,
      after: skillsAfter,
      rationale: 'Surfaced JD-matched keywords as a dedicated skill group.',
      confidence: 0.5,
      source: 'rule-based',
    })
  }

  return diff
}
