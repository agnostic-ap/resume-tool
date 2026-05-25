export interface PersonalInfo {
  name: string
  title: string
  phone: string
  email: string
  location: string
  website: string
  summary: string
}

export interface WorkExperience {
  id: string
  company: string
  position: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

export interface Education {
  id: string
  school: string
  major: string
  degree: string
  startDate: string
  endDate: string
  gpa: string
  description: string
}

export interface SkillGroup {
  id: string
  category: string
  items: string
}

export interface Project {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  url: string
  tech: string
  description: string
}

export interface Award {
  id: string
  title: string
  issuer: string
  date: string
  description: string
}

export interface Language {
  id: string
  language: string
  level: string
}

export interface Certification {
  id: string
  name: string
  issuer: string
  date: string
}

export interface ResumeData {
  personal: PersonalInfo
  experience: WorkExperience[]
  education: Education[]
  skills: SkillGroup[]
  projects: Project[]
  awards: Award[]
  languages: Language[]
  certifications: Certification[]
}

export type CareerUpdateKey = 'projects' | 'metrics' | 'roleChanges' | 'interviewFeedback' | 'skills'

export interface CareerUpdateChecklist {
  projects: boolean
  metrics: boolean
  roleChanges: boolean
  interviewFeedback: boolean
  skills: boolean
  notes: string
  updatedAt?: string
}

export type GrowthEntryType = 'project' | 'metric' | 'role' | 'feedback' | 'skill' | 'achievement'

export interface GrowthEntry {
  id: string
  date: string
  type: GrowthEntryType
  company: string
  project: string
  title: string
  content: string
  metrics: string
  skills: string[]
  evidenceUrl: string
  private: boolean
  archived: boolean
  sourceResumeId: string
  sourceResumeTitle: string
  usedByResumeIds: string[]
  usedByApplicationIds: string[]
  createdAt: string
  updatedAt: string
}

export type ResumeOrigin = 'sample' | 'blank' | 'import' | 'copy' | 'jd-draft' | 'platform'

export interface ResumeDocument {
  id: string
  title: string
  data: ResumeData
  config: ResumeConfig
  folder: string
  targetRole: string
  targetCompany: string
  tags: string[]
  origin: ResumeOrigin
  sourceResumeId?: string
  sourceResumeTitle?: string
  favorite: boolean
  archived: boolean
  careerUpdateChecklist: CareerUpdateChecklist
  createdAt: string
  updatedAt: string
  lastCareerUpdateAt: string
  nextCareerUpdateAt: string
}

export type ApplicationStage = 'saved' | 'applied' | 'screen' | 'onsite' | 'offer' | 'rejected'

export interface JobDescriptionSnapshot {
  company: string
  title: string
  location: string
  description: string
  requirements: string[]
  url: string
  archivedAt?: string
}

export interface TailoringMetadata {
  requestId: string
  sourceResumeId: string
  draftTitle: string
  matchScore: number
  matchedKeywords: string[]
  selectedExperienceIds: string[]
  strategy: string
  generatedAt: string
  appliedAt?: string
}

export interface ApplicationProgressEvent {
  id: string
  stage: ApplicationStage
  title: string
  note: string
  happenedAt: string
  createdAt: string
}

export interface JobApplication {
  id: string
  company: string
  companyMono: string
  location: string
  role: string
  department: string
  resumeId: string
  resumeTitle: string
  stage: ApplicationStage
  match: number
  appliedAt: string
  nextAction: string
  followUpAt: string
  contactName: string
  contactEmail: string
  jobPostUrl: string
  notes: string
  jobDescription?: JobDescriptionSnapshot
  tailoring?: TailoringMetadata
  progressLog: ApplicationProgressEvent[]
  createdAt: string
  updatedAt: string
}

export type ActivityType = 'edit' | 'ai' | 'application' | 'resume' | 'export' | 'system'

export interface ActivityEvent {
  id: string
  type: ActivityType
  tag: string
  message: string
  messageZh?: string
  messageEn?: string
  meta: string
  resumeId?: string
  createdAt: string
}

export type ProductEventName =
  | 'onboarding_choice_selected'
  | 'resume_core_field_completed'
  | 'jd_draft_requested'
  | 'jd_draft_generated'
  | 'jd_section_applied'
  | 'application_created_from_jd'
  | 'export_precheck_completed'
  | 'sync_operation_failed'

export type SyncOperationStatus = 'pending' | 'synced' | 'failed' | 'local-only'

export interface SyncOperation {
  id: string
  entityType: 'resume' | 'application' | 'growth' | 'activity' | 'settings' | 'import' | 'system'
  operation: string
  entityId: string
  status: SyncOperationStatus
  error: string
  updatedAt: string
}

export type TemplateId =
  | 'classic'
  | 'modern'
  | 'sidebar'
  | 'compact'
  | 'executive'
  | 'creative'
  | 'academic'
  | 'technical'
  | 'product'
  | 'minimal'
export type Locale = 'zh-CN' | 'en-US'

export type SectionId =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'awards'
  | 'languages'
  | 'certifications'

export interface ResumeConfig {
  locale: Locale
  templateId: TemplateId
  themeColor: string
  fontSize: number
  sectionOrder: SectionId[]
  sectionVisible: Record<SectionId, boolean>
  studioTheme: StudioTheme
  tweaks: ResumeTweaks
}

export type TweakAccent =
  | 'vermillion'
  | 'coral'
  | 'rosewood'
  | 'amber'
  | 'moss'
  | 'sage'
  | 'prussian'
  | 'ocean'
  | 'lilac'
  | 'ink-only'
export type TweakPaper = 'cream' | 'snow' | 'newsprint' | 'blush' | 'mist' | 'stone'
export type TweakDensity = 'tight' | 'cozy' | 'loose'
export type TweakFont = 'serif' | 'sans' | 'mono'
export type TweakMarginalia = 'notes' | 'inline' | 'off'
export type TweakTone = 'editor' | 'coach' | 'minimal'

export interface ResumeTweaks {
  accent: TweakAccent
  paper: TweakPaper
  density: TweakDensity
  font: TweakFont
  fontScale: number
  showAI: boolean
  showTree: boolean
  ruleLines: boolean
  marginaliaMode: TweakMarginalia
  aiTone: TweakTone
}

export interface StudioTheme {
  accent: TweakAccent
  paper: TweakPaper
  density: TweakDensity
  font: TweakFont
  ruleLines: boolean
}
