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

export type TemplateId = 'classic' | 'modern' | 'sidebar'

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
  templateId: TemplateId
  themeColor: string
  fontSize: number
  sectionOrder: SectionId[]
  sectionVisible: Record<SectionId, boolean>
}
