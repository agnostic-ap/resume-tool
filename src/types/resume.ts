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

export interface ResumeData {
  personal: PersonalInfo
  experience: WorkExperience[]
  education: Education[]
  skills: SkillGroup[]
  projects: Project[]
  awards: Award[]
}

export type TemplateId = 'classic' | 'modern' | 'sidebar'

export interface ResumeConfig {
  templateId: TemplateId
  themeColor: string
  fontSize: number
}
