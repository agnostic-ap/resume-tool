import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ResumeData, ResumeConfig, TemplateId } from '../types/resume'

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
}

const defaultConfig: ResumeConfig = {
  templateId: 'classic',
  themeColor: '#2563eb',
  fontSize: 14,
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export const useResumeStore = defineStore('resume', () => {
  const data = ref<ResumeData>(loadFromStorage('resume-data', JSON.parse(JSON.stringify(defaultResume))))
  const config = ref<ResumeConfig>(loadFromStorage('resume-config', { ...defaultConfig }))

  watch(data, (v) => localStorage.setItem('resume-data', JSON.stringify(v)), { deep: true })
  watch(config, (v) => localStorage.setItem('resume-config', JSON.stringify(v)), { deep: true })

  function setTemplate(id: TemplateId) {
    config.value.templateId = id
  }

  function setThemeColor(color: string) {
    config.value.themeColor = color
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

  function resetToDefault() {
    data.value = JSON.parse(JSON.stringify(defaultResume))
    config.value = { ...defaultConfig }
  }

  return {
    data,
    config,
    setTemplate,
    setThemeColor,
    addExperience,
    removeExperience,
    addEducation,
    removeEducation,
    addSkill,
    removeSkill,
    addProject,
    removeProject,
    addAward,
    removeAward,
    resetToDefault,
  }
})
