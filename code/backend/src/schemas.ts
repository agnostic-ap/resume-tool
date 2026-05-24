import { z } from 'zod'

export const createResumeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  blank: z.boolean().optional(),
  sourceId: z.string().optional(),
  folder: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
  tags: z.array(z.string()).optional(),
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
})

export const updateResumeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  folder: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sourceResumeId: z.string().optional(),
  sourceResumeTitle: z.string().optional(),
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
  careerUpdateChecklist: z.object({
    projects: z.boolean().optional(),
    metrics: z.boolean().optional(),
    roleChanges: z.boolean().optional(),
    interviewFeedback: z.boolean().optional(),
    skills: z.boolean().optional(),
    notes: z.string().optional(),
    updatedAt: z.string().optional(),
  }).optional(),
})

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  location: z.string().optional(),
  department: z.string().optional(),
  resumeId: z.string().optional(),
  stage: z.enum(['saved', 'applied', 'screen', 'onsite', 'offer', 'rejected']).optional(),
  match: z.coerce.number().min(0).max(100).optional(),
  appliedAt: z.string().optional(),
  nextAction: z.string().optional(),
  followUpAt: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  jobPostUrl: z.string().optional(),
  notes: z.string().optional(),
  jobDescription: z.object({
    company: z.string().optional(),
    title: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    url: z.string().optional(),
    archivedAt: z.string().optional(),
  }).optional(),
  tailoring: z.object({
    requestId: z.string().optional(),
    sourceResumeId: z.string().optional(),
    draftTitle: z.string().optional(),
    matchScore: z.coerce.number().min(0).max(100).optional(),
    matchedKeywords: z.array(z.string()).optional(),
    selectedExperienceIds: z.array(z.string()).optional(),
    strategy: z.string().optional(),
    generatedAt: z.string().optional(),
    appliedAt: z.string().optional(),
  }).optional(),
  progressLog: z.array(z.object({
    id: z.string().optional(),
    stage: z.enum(['saved', 'applied', 'screen', 'onsite', 'offer', 'rejected']).optional(),
    title: z.string().optional(),
    note: z.string().optional(),
    happenedAt: z.string().optional(),
    createdAt: z.string().optional(),
  })).optional(),
})

export const updateApplicationSchema = createApplicationSchema.partial()

export const growthEntrySchema = z.object({
  date: z.string().optional(),
  type: z.enum(['project', 'metric', 'role', 'feedback', 'skill', 'achievement']).optional(),
  company: z.string().optional(),
  project: z.string().optional(),
  title: z.string().trim().min(1),
  content: z.string().optional(),
  metrics: z.string().optional(),
  skills: z.array(z.string()).optional(),
  evidenceUrl: z.string().optional(),
  private: z.boolean().optional(),
  archived: z.boolean().optional(),
  sourceResumeId: z.string().optional(),
  sourceResumeTitle: z.string().optional(),
  usedByResumeIds: z.array(z.string()).optional(),
  usedByApplicationIds: z.array(z.string()).optional(),
})

export const updateGrowthEntrySchema = growthEntrySchema.partial()

export const assistantSuggestionSchema = z.object({
  prompt: z.string().trim().min(1),
})

const platformPersonalSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  summary: z.string().optional(),
})

const platformWorkItemSchema = z.object({
  id: z.string().optional(),
  company: z.string().trim().min(1),
  title: z.string().trim().min(1),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
})

const platformEducationSchema = z.object({
  school: z.string().optional(),
  major: z.string().optional(),
  degree: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  description: z.string().optional(),
})

const platformProjectSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  url: z.string().optional(),
  tech: z.string().optional(),
  description: z.string().optional(),
})

const platformGrowthEntrySchema = z.object({
  id: z.string().optional(),
  date: z.string().optional(),
  type: z.enum(['project', 'metric', 'role', 'feedback', 'skill', 'achievement']).optional(),
  company: z.string().optional(),
  project: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  metrics: z.string().optional(),
  skills: z.array(z.string()).optional(),
  evidenceUrl: z.string().optional(),
  private: z.boolean().optional(),
})

export const platformGenerateResumeSchema = z.object({
  requestId: z.string().optional(),
  userId: z.string().optional(),
  persist: z.boolean().optional().default(false),
  locale: z.enum(['zh-CN', 'en-US']).optional().default('zh-CN'),
  templateId: z.enum(['classic', 'modern', 'sidebar', 'compact', 'executive', 'creative', 'academic', 'technical', 'product', 'minimal']).optional().default('classic'),
  personal: platformPersonalSchema.optional().default({}),
  workHistory: z.array(platformWorkItemSchema).min(1),
  education: z.array(platformEducationSchema).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  projects: z.array(platformProjectSchema).optional().default([]),
  growthEntries: z.array(platformGrowthEntrySchema).optional().default([]),
  jobDescription: z.object({
    company: z.string().optional(),
    title: z.string().trim().min(1),
    location: z.string().optional(),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional().default([]),
    keywords: z.array(z.string()).optional().default([]),
  }),
})

export type CreateResumeInput = z.infer<typeof createResumeSchema>
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>
export type GrowthEntryInput = z.infer<typeof growthEntrySchema>
export type UpdateGrowthEntryInput = z.infer<typeof updateGrowthEntrySchema>
export type PlatformGenerateResumeInput = z.infer<typeof platformGenerateResumeSchema>
