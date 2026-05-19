export const DEFAULT_ORDER = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'awards',
  'languages',
  'certifications',
]

export const DEFAULT_VISIBLE = {
  summary: true,
  experience: true,
  education: true,
  skills: true,
  projects: true,
  awards: true,
  languages: false,
  certifications: false,
}

export const DEFAULT_TWEAKS = {
  accent: 'vermillion',
  paper: 'cream',
  density: 'cozy',
  font: 'serif',
  fontScale: 100,
  showAI: true,
  showTree: true,
  ruleLines: false,
  marginaliaMode: 'notes',
  aiTone: 'editor',
}

export const DEFAULT_STUDIO_THEME = {
  accent: 'vermillion',
  paper: 'cream',
  density: 'cozy',
  font: 'serif',
  ruleLines: false,
}

export const DEFAULT_CONFIG = {
  locale: 'zh-CN',
  templateId: 'classic',
  themeColor: '#C65A3A',
  fontSize: 14,
  sectionOrder: [...DEFAULT_ORDER],
  sectionVisible: { ...DEFAULT_VISIBLE },
  studioTheme: { ...DEFAULT_STUDIO_THEME },
  tweaks: { ...DEFAULT_TWEAKS },
}

export const BLANK_RESUME_DATA = {
  personal: {
    name: '',
    title: '',
    phone: '',
    email: '',
    location: '',
    website: '',
    summary: '',
  },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  awards: [],
  languages: [],
  certifications: [],
}

export const DEMO_RESUME_DATA = {
  personal: {
    name: 'Zhang Ming',
    title: 'Frontend Engineer',
    phone: '138-0000-0000',
    email: 'zhangming@example.com',
    location: 'Beijing',
    website: 'github.com/zhangming',
    summary: 'Frontend engineer with 3 years of experience in Vue, React, performance tuning, and component systems.',
  },
  experience: [
    {
      id: 'exp-demo',
      company: 'Northstar Digital',
      position: 'Senior Frontend Engineer',
      location: 'Beijing',
      startDate: '2022-07',
      endDate: '',
      current: true,
      description: '• Led Vue 3 and TypeScript architecture for the core product\n• Reduced home page load time from 4.0s to 1.2s\n• Built 30+ reusable components for the frontend team',
    },
  ],
  education: [
    {
      id: 'edu-demo',
      school: 'Peking University',
      major: 'Computer Science',
      degree: 'Bachelor',
      startDate: '2018-09',
      endDate: '2022-06',
      gpa: '3.8/4.0',
      description: '',
    },
  ],
  skills: [
    { id: 'skill-frontend', category: 'Frontend', items: 'Vue 3, React, TypeScript, Vite' },
    { id: 'skill-tooling', category: 'Tooling', items: 'Git, Docker, Node.js, Linux' },
  ],
  projects: [
    {
      id: 'project-demo',
      name: 'Resume Studio',
      role: 'Frontend Lead',
      startDate: '2023-03',
      endDate: '2023-08',
      url: 'github.com/example/resume',
      tech: 'Vue 3, TypeScript, Tailwind CSS, jsPDF',
      description: '• Built a multi-template resume editor with live preview and PDF export\n• Added section ordering, theme controls, and local backup\n• Reached 1,000+ trial users after launch',
    },
  ],
  awards: [],
  languages: [],
  certifications: [],
}

export function initialState(now = new Date()) {
  const resume = {
    id: 'resume-main',
    title: 'Frontend Engineer',
    data: structuredClone(DEMO_RESUME_DATA),
    config: structuredClone(DEFAULT_CONFIG),
    folder: 'General',
    targetRole: DEMO_RESUME_DATA.personal.title,
    targetCompany: '',
    tags: [],
    favorite: false,
    archived: false,
    careerUpdateChecklist: {
      projects: false,
      metrics: false,
      roleChanges: false,
      interviewFeedback: false,
      skills: false,
      notes: '',
      updatedAt: now.toISOString(),
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastCareerUpdateAt: now.toISOString(),
    nextCareerUpdateAt: addDays(now, 14).toISOString(),
  }

  return {
    activeResumeId: resume.id,
    documents: [resume],
    applications: [],
    platformRequests: [],
    activityLog: [
      {
        id: 'activity-init',
        type: 'system',
        tag: 'init',
        message: 'Backend workspace initialized',
        messageZh: '后端工作台已初始化',
        messageEn: 'Backend workspace initialized',
        meta: resume.title,
        resumeId: resume.id,
        createdAt: now.toISOString(),
      },
    ],
  }
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
