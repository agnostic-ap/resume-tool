import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { ResumeData, ResumeConfig, TemplateId, SectionId } from '../types/resume'
import { showToast } from '../composables/toast'

const DEFAULT_ORDER: SectionId[] = [
  'summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages', 'certifications',
]

const DEFAULT_VISIBLE: Record<SectionId, boolean> = {
  summary: true,
  experience: true,
  education: true,
  skills: true,
  projects: true,
  awards: true,
  languages: false,
  certifications: false,
}

const defaultResume: ResumeData = {
  personal: {
    name: '张明',
    title: '前端开发工程师',
    phone: '138-0000-0000',
    email: 'zhangming@example.com',
    location: '北京市',
    website: 'github.com/zhangming',
    summary: '3年前端开发经验，熟悉Vue3、React技术栈，擅长性能优化和组件化开发，具备良好的团队协作能力。',
  },
  experience: [
    {
      id: '1',
      company: '某科技有限公司',
      position: '高级前端工程师',
      location: '北京',
      startDate: '2022-07',
      endDate: '',
      current: true,
      description:
        '• 负责公司核心产品前端架构设计与开发，使用Vue3 + TypeScript技术栈\n• 优化首页加载速度，从4s降至1.2s，提升用户留存率20%\n• 主导前端组件库建设，沉淀30+可复用组件，提升团队开发效率30%',
    },
  ],
  education: [
    {
      id: '1',
      school: '北京大学',
      major: '计算机科学与技术',
      degree: '本科',
      startDate: '2018-09',
      endDate: '2022-06',
      gpa: '3.8/4.0',
      description: '',
    },
  ],
  skills: [
    { id: '1', category: '前端框架', items: 'Vue3, React, TypeScript, Vite, Webpack' },
    { id: '2', category: '工具与其他', items: 'Git, Docker, Node.js, MySQL, Linux' },
  ],
  projects: [
    {
      id: '1',
      name: '在线简历生成平台',
      role: '前端负责人',
      startDate: '2023-03',
      endDate: '2023-08',
      url: 'github.com/example/resume',
      tech: 'Vue3, TypeScript, Tailwind CSS, jsPDF',
      description:
        '• 开发多模板简历生成平台，支持实时预览和PDF导出\n• 实现拖拽排序、主题定制等特色功能\n• 上线后获得1000+用户使用，GitHub获得200+ Star',
    },
  ],
  awards: [
    {
      id: '1',
      title: '全国大学生计算机设计大赛 一等奖',
      issuer: '教育部高等教育司',
      date: '2021-08',
      description: '',
    },
  ],
  languages: [],
  certifications: [],
}

const defaultConfig: ResumeConfig = {
  templateId: 'classic',
  themeColor: '#2563eb',
  fontSize: 14,
  sectionOrder: [...DEFAULT_ORDER],
  sectionVisible: { ...DEFAULT_VISIBLE },
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function mergeConfig(saved: Partial<ResumeConfig>): ResumeConfig {
  return {
    ...defaultConfig,
    ...saved,
    sectionOrder: saved.sectionOrder?.length ? saved.sectionOrder : [...DEFAULT_ORDER],
    sectionVisible: { ...DEFAULT_VISIBLE, ...(saved.sectionVisible ?? {}) },
  }
}

export const useResumeStore = defineStore('resume', () => {
  const data = ref<ResumeData>(
    loadFromStorage('resume-data', JSON.parse(JSON.stringify(defaultResume))),
  )
  const config = ref<ResumeConfig>(mergeConfig(loadFromStorage('resume-config', {})))

  // Ensure languages/certifications arrays exist (migration for old saved data)
  if (!data.value.languages) data.value.languages = []
  if (!data.value.certifications) data.value.certifications = []

  const persistData = useDebounceFn((v: ResumeData) => {
    try { localStorage.setItem('resume-data', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)
  const persistConfig = useDebounceFn((v: ResumeConfig) => {
    try { localStorage.setItem('resume-config', JSON.stringify(v)) } catch { /* quota exceeded */ }
  }, 400)

  watch(data, persistData, { deep: true })
  watch(config, persistConfig, { deep: true })

  // Completeness score 0-100
  const completeness = computed(() => {
    let score = 0
    const p = data.value.personal
    if (p.name) score += 10
    if (p.title) score += 5
    if (p.phone && p.email) score += 10
    if (p.summary && p.summary.length > 20) score += 10
    if (data.value.experience.length > 0) score += 15
    if (data.value.experience.some((e) => e.description.length > 30)) score += 10
    if (data.value.education.length > 0) score += 15
    if (data.value.skills.length > 0) score += 10
    if (data.value.projects.length > 0) score += 15
    return Math.min(100, score)
  })

  function setTemplate(id: TemplateId) {
    config.value.templateId = id
  }

  function setThemeColor(color: string) {
    config.value.themeColor = color
  }

  function moveSection(id: SectionId, direction: 'up' | 'down') {
    const arr = config.value.sectionOrder
    const idx = arr.indexOf(id)
    if (direction === 'up' && idx > 0) {
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    } else if (direction === 'down' && idx < arr.length - 1) {
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    }
  }

  function toggleSectionVisible(id: SectionId) {
    config.value.sectionVisible[id] = !config.value.sectionVisible[id]
  }

  function addExperience() {
    data.value.experience.push({
      id: Date.now().toString(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    })
  }
  function removeExperience(id: string) {
    data.value.experience = data.value.experience.filter((e) => e.id !== id)
  }

  function addEducation() {
    data.value.education.push({
      id: Date.now().toString(),
      school: '',
      major: '',
      degree: '本科',
      startDate: '',
      endDate: '',
      gpa: '',
      description: '',
    })
  }
  function removeEducation(id: string) {
    data.value.education = data.value.education.filter((e) => e.id !== id)
  }

  function addSkill() {
    data.value.skills.push({ id: Date.now().toString(), category: '', items: '' })
  }
  function removeSkill(id: string) {
    data.value.skills = data.value.skills.filter((s) => s.id !== id)
  }

  function addProject() {
    data.value.projects.push({
      id: Date.now().toString(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      url: '',
      tech: '',
      description: '',
    })
  }
  function removeProject(id: string) {
    data.value.projects = data.value.projects.filter((p) => p.id !== id)
  }

  function addAward() {
    data.value.awards.push({
      id: Date.now().toString(),
      title: '',
      issuer: '',
      date: '',
      description: '',
    })
  }
  function removeAward(id: string) {
    data.value.awards = data.value.awards.filter((a) => a.id !== id)
  }

  function addLanguage() {
    data.value.languages.push({ id: Date.now().toString(), language: '', level: '' })
  }
  function removeLanguage(id: string) {
    data.value.languages = data.value.languages.filter((l) => l.id !== id)
  }

  function addCertification() {
    data.value.certifications.push({
      id: Date.now().toString(),
      name: '',
      issuer: '',
      date: '',
    })
  }
  function removeCertification(id: string) {
    data.value.certifications = data.value.certifications.filter((c) => c.id !== id)
  }

  function resetToDefault() {
    data.value = JSON.parse(JSON.stringify(defaultResume))
    config.value = JSON.parse(JSON.stringify(defaultConfig))
  }

  function clearAll() {
    data.value = {
      personal: { name: '', title: '', phone: '', email: '', location: '', website: '', summary: '' },
      experience: [], education: [], skills: [], projects: [], awards: [], languages: [], certifications: [],
    }
    config.value = JSON.parse(JSON.stringify(defaultConfig))
  }

  function importData(json: string) {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid')
      let imported = false
      if (parsed.data && typeof parsed.data === 'object') {
        data.value = {
          ...JSON.parse(JSON.stringify(defaultResume)),
          ...parsed.data,
          languages: Array.isArray(parsed.data.languages) ? parsed.data.languages : [],
          certifications: Array.isArray(parsed.data.certifications) ? parsed.data.certifications : [],
        }
        imported = true
      }
      if (parsed.config && typeof parsed.config === 'object') {
        config.value = mergeConfig(parsed.config)
        imported = true
      }
      if (imported) showToast('数据导入成功', 'success')
      else showToast('导入失败：未识别的文件格式', 'error')
    } catch {
      showToast('导入失败：请确认 JSON 格式正确', 'error')
    }
  }

  function exportData() {
    return JSON.stringify({ data: data.value, config: config.value }, null, 2)
  }

  return {
    data,
    config,
    completeness,
    setTemplate,
    setThemeColor,
    clearAll,
    moveSection,
    toggleSectionVisible,
    addExperience, removeExperience,
    addEducation, removeEducation,
    addSkill, removeSkill,
    addProject, removeProject,
    addAward, removeAward,
    addLanguage, removeLanguage,
    addCertification, removeCertification,
    resetToDefault,
    importData,
    exportData,
  }
})
