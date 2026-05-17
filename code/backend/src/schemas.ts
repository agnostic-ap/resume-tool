import { z } from 'zod'

export const stateSchema = z.object({
  activeResumeId: z.string().optional(),
  documents: z.array(z.unknown()).optional(),
  applications: z.array(z.unknown()).optional(),
  activityLog: z.array(z.unknown()).optional(),
}).passthrough()

export const createResumeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  blank: z.boolean().optional(),
  sourceId: z.string().optional(),
})

export const updateResumeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  location: z.string().optional(),
  department: z.string().optional(),
  resumeId: z.string().optional(),
  stage: z.enum(['applied', 'screen', 'onsite', 'offer', 'rejected']).optional(),
  match: z.coerce.number().min(0).max(100).optional(),
  appliedAt: z.string().optional(),
  notes: z.string().optional(),
})

export const updateApplicationSchema = createApplicationSchema.partial()

export const assistantSuggestionSchema = z.object({
  prompt: z.string().trim().min(1),
})

export type CreateResumeInput = z.infer<typeof createResumeSchema>
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
