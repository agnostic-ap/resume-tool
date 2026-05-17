<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { StudioTheme, TemplateId, TweakAccent, TweakDensity, TweakFont, TweakPaper } from '../types/resume'
import TemplateThumbnail from './TemplateThumbnail.vue'
import { showToast } from '../composables/toast'
import { useI18n } from '../i18n'

type AppView = 'workspace' | 'editor' | 'templates' | 'assistant' | 'pipeline' | 'history' | 'settings'

const props = withDefaults(defineProps<{ mode?: AppView }>(), { mode: 'workspace' })
const emit = defineEmits<{
  navigate: [AppView]
  command: [string]
}>()

const store = useResumeStore()
const { t, locale } = useI18n()
const pipelineFilter = ref('all')
const assistantPrompt = ref('')
const renameId = ref('')
const renameDraft = ref('')
const assistantSuggestions = ref<string[]>([
  '把个人简介改成“岗位定位 + 技术栈 + 量化结果”的三段式。',
  '工作经历每条 bullet 至少保留一个数字，弱相关职责移到项目里。',
])

const documents = computed(() => store.documents)

const careerUpdateDays = computed(() => store.daysUntilCareerUpdate())
const careerUpdateLabel = computed(() => {
  const days = careerUpdateDays.value
  if (locale.value === 'zh-CN') {
    if (days < 0) return `已逾期 ${Math.abs(days)} 天`
    if (days === 0) return '今天该更新'
    return `${days} 天后更新`
  }
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  return `Due in ${days} days`
})

const applications = ref([
  { co: 'Vercel', mono: 'V', loc: 'Remote · NA', role: 'Senior Frontend', dept: 'Web Platform', resume: '当前简历', stage: 'onsite', stageLabel: 'On-site', match: 92, when: 'Mar 12', ago: '2d ago' },
  { co: 'Stripe', mono: 'S', loc: 'Dublin · Hybrid', role: 'Full-Stack Engineer', dept: 'Payments API', resume: 'Full-Stack · Stripe', stage: 'screen', stageLabel: 'Recruiter', match: 84, when: 'Mar 10', ago: '4d ago' },
  { co: 'Linear', mono: 'L', loc: 'Remote · Global', role: 'Staff Engineer', dept: 'Sync Engine', resume: 'Staff · Linear', stage: 'offer', stageLabel: 'Offer', match: 96, when: 'Mar 04', ago: '10d ago' },
  { co: 'Figma', mono: 'F', loc: 'NYC · Hybrid', role: 'Software Engineer · UI', dept: 'Editor', resume: '当前简历', stage: 'onsite', stageLabel: 'On-site', match: 88, when: 'Feb 28', ago: '14d ago' },
  { co: 'Notion', mono: 'N', loc: 'SF · Remote-friendly', role: 'Software Engineer', dept: 'Databases', resume: '作品集版', stage: 'rejected', stageLabel: 'Closed', match: 64, when: 'Feb 22', ago: '20d ago' },
])

const filters = [
  { id: 'all', label: 'All' },
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Screening' },
  { id: 'onsite', label: 'On-site' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Closed' },
]

const filteredApplications = computed(() =>
  pipelineFilter.value === 'all'
    ? applications.value
    : applications.value.filter((item) => item.stage === pipelineFilter.value),
)

const commits = computed(() => [
  { type: 'ai', tag: 'AI', msg: '优化个人简介：突出 TypeScript、性能优化和组件体系', meta: 'auto-edit · accepted', hash: 'c4f2b1e', when: '4m' },
  { type: 'normal', tag: 'edit', msg: `更新 ${store.data.projects.length || 1} 个项目经历`, meta: 'projects.mdx · +14 / −2', hash: 'd9012a3', when: '1h' },
  { type: 'branch', tag: 'branch', msg: 'created stripe-tailor from main', meta: 'forked current resume', hash: '0f8d4cc', when: '6h' },
  { type: 'normal', tag: 'export', msg: 'PDF · A4 · one page check', meta: 'downloaded locally', hash: '7e3aa9f', when: '1d' },
])

const templates: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'classic', label: '经典', desc: '简洁·全页' },
  { id: 'modern', label: '现代', desc: '双栏·标题色块' },
  { id: 'sidebar', label: '侧边栏', desc: '色彩·个性' },
]

const accents: { id: TweakAccent; hex: string; label: string }[] = [
  { id: 'vermillion', hex: '#B73E1B', label: 'Vermillion' },
  { id: 'moss', hex: '#4A5D2F', label: 'Moss' },
  { id: 'prussian', hex: '#1F4068', label: 'Prussian' },
  { id: 'ink-only', hex: '#0E0E0C', label: 'Ink only' },
]

const papers: { id: TweakPaper; hex: string; label: string }[] = [
  { id: 'cream', hex: '#FAF8F2', label: 'Cream' },
  { id: 'snow', hex: '#FFFFFF', label: 'Snow' },
  { id: 'newsprint', hex: '#F1ECDF', label: 'Newsprint' },
]

const interfaceFonts: { id: TweakFont; name: string; meta: string; className: string }[] = [
  { id: 'serif', name: 'Serif', meta: 'editorial · warm', className: 'serif-stack' },
  { id: 'sans', name: 'Sans', meta: 'neutral · crisp', className: 'sans-stack' },
  { id: 'mono', name: 'Mono', meta: 'technical · compact', className: 'mono-stack' },
]

const densities: TweakDensity[] = ['tight', 'cozy', 'loose']

function label(zh: string, en: string) {
  return locale.value === 'zh-CN' ? zh : en
}

function openEditor() {
  emit('navigate', 'editor')
}

function createBlank() {
  store.createResume(true)
  emit('navigate', 'editor')
  showToast(locale.value === 'zh-CN' ? '已创建新的空白简历' : 'Created a new blank resume', 'success')
}

function openDocument(id: string) {
  store.selectResume(id)
  emit('navigate', 'editor')
}

function startRename(id: string, title: string) {
  renameId.value = id
  renameDraft.value = title
}

function finishRename() {
  if (!renameId.value) return
  store.renameResume(renameId.value, renameDraft.value)
  renameId.value = ''
  renameDraft.value = ''
}

function duplicateDocument(id: string) {
  store.duplicateResume(id)
  showToast(locale.value === 'zh-CN' ? '已复制一份简历' : 'Resume duplicated', 'success')
}

function deleteDocument(id: string) {
  store.deleteResume(id)
}

function recordCareerUpdate() {
  store.markCareerUpdated()
  showToast(locale.value === 'zh-CN' ? '已记录本次职业经历更新，两周后再次提醒' : 'Career update recorded. Next reminder is in two weeks.', 'success', 4000)
}

function setTemplate(id: TemplateId) {
  store.setTemplate(id)
  showToast(locale.value === 'zh-CN' ? `已切换到${t(id)}模板` : `Switched to ${t(id)} template`, 'success')
}

function setStudioTheme<K extends keyof StudioTheme>(key: K, value: StudioTheme[K]) {
  store.setStudioTheme(key, value)
}

function resetStudioTheme() {
  store.resetStudioTheme()
  showToast(locale.value === 'zh-CN' ? '页面主题已恢复默认' : 'Page theme reset to defaults', 'success')
}

function runAssistant() {
  if (!assistantPrompt.value.trim()) {
    showToast(locale.value === 'zh-CN' ? '先输入想优化的方向' : 'Enter an optimization goal first', 'info', 3500)
    return
  }
  assistantSuggestions.value.unshift(locale.value === 'zh-CN'
    ? `根据“${assistantPrompt.value.trim()}”重写 Summary，并保留一页版式。`
    : `Rewrite the summary for "${assistantPrompt.value.trim()}" and keep the resume to one page.`)
  showToast(locale.value === 'zh-CN' ? '已生成优化建议，可直接采纳到个人简介' : 'Advice generated. You can apply it to the summary.', 'success', 3500)
  assistantPrompt.value = ''
}

function applySuggestion(text: string) {
  const current = store.data.personal.summary.trim()
  const prefix = current || '前端开发工程师，熟悉 Vue3、TypeScript 与工程化体系。'
  store.data.personal.summary = `${prefix} ${text.replace(/^把|^根据.+重写 Summary，并/, '').replace(/。$/, '')}。`
  emit('navigate', 'editor')
  showToast(locale.value === 'zh-CN' ? '建议已写入个人简介' : 'Advice applied to the summary', 'success')
}

function logApplication() {
  const n = applications.value.length + 1
  applications.value.unshift({
    co: `新公司 ${n}`,
    mono: 'N',
    loc: 'Remote · Draft',
    role: store.data.personal.title || '目标岗位',
    dept: '待补充部门',
    resume: '当前简历',
    stage: 'applied',
    stageLabel: 'Applied',
    match: Math.max(62, store.completeness),
    when: 'Today',
    ago: 'just now',
  })
  pipelineFilter.value = 'all'
  showToast(locale.value === 'zh-CN' ? '投递记录已添加到列表顶部' : 'Application added to the top of the list', 'success')
}

function matchClass(score: number) {
  if (score >= 85) return 'bar--match-hi'
  if (score >= 70) return 'bar--match-md'
  return 'bar--match-lo'
}
</script>

<template>
  <main class="workspace-main" :class="`workspace-main--${props.mode}`">
    <div class="workspace-inner">
      <section v-if="props.mode === 'workspace' || props.mode === 'editor'" class="section">
        <div class="section__head">
          <div>
            <div class="num">01 · {{ t('nowEditing') }}</div>
            <h2>{{ t('pickUp') }}</h2>
          </div>
          <div class="meta">
            <span>{{ t('lastSession') }}</span>
            <button @click="openEditor">{{ t('openEditor') }} →</button>
          </div>
        </div>

        <div class="hero">
          <div class="hero__left">
            <div class="hero__eyebrow">
              <span class="dot"></span>
              <span>{{ t('nowEditing') }}</span>
            <span class="version">{{ store.activeDocument.title }} · v1.0</span>
            </div>
            <h1 class="hero__title">
              {{ store.data.personal.title || 'Frontend' }} <em>{{ store.data.personal.name || 'Resume' }}</em>
            </h1>
            <div class="hero__sub">
              <span class="pill">zh-CN</span>
              <span>{{ store.config.templateId }} template</span>
              <span>·</span>
                <span>{{ label('完整度', 'Complete') }} {{ store.completeness }}%</span>
            </div>

            <div class="hero__stats">
              <div class="hero__stat">
                <div class="k">Sections</div>
                <div class="v">{{ store.config.sectionOrder.length }}<small>files</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">Projects</div>
                <div class="v">{{ store.data.projects.length }}<small>items</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">Experience</div>
                <div class="v">{{ store.data.experience.length }}<small>roles</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">Match</div>
                <div class="v">{{ store.completeness }}<small>/100</small></div>
              </div>
              <div class="hero__stat">
                <div class="k">{{ locale === 'zh-CN' ? '双周更新' : 'Biweekly' }}</div>
                <div class="v career-due">{{ careerUpdateDays < 0 ? '!' : Math.max(0, careerUpdateDays) }}<small>{{ locale === 'zh-CN' ? '天' : 'days' }}</small></div>
              </div>
            </div>

            <div class="hero__actions">
              <button class="btn btn--primary" @click="openEditor">{{ t('openEditor') }} <kbd>E</kbd></button>
              <button class="btn" @click="emit('navigate', 'assistant')">{{ t('tailorWithAI') }}</button>
              <button class="btn btn--ghost" @click="emit('command', 'export')">{{ t('exportPdf') }}</button>
              <button class="btn btn--ghost" @click="emit('navigate', 'history')">{{ t('viewHistory') }}</button>
              <button class="btn btn--ghost" @click="recordCareerUpdate">{{ locale === 'zh-CN' ? '记录本次更新' : 'Record update' }}</button>
            </div>
          </div>

          <div class="hero__right">
            <div class="preview__bar">
              <div class="tabs">
                <span class="on">preview.pdf</span>
                <span>header.mdx</span>
                <span>experience.mdx</span>
              </div>
              <span>A4 · live</span>
            </div>
            <div class="preview">
              <div class="preview__paper">
                <h1>{{ store.data.personal.name || label('你的姓名', 'Your Name') }}</h1>
                <div class="role">{{ store.data.personal.title || label('目标岗位', 'Target Role') }} · {{ store.data.personal.location || label('城市', 'Location') }}</div>
                <div class="rule"></div>
                <h3>Summary</h3>
                <p>{{ store.data.personal.summary || label('这里会显示你的个人简介。', 'Your summary will appear here.') }}</p>
                <h3>Experience</h3>
                <div v-for="item in store.data.experience.slice(0, 2)" :key="item.id">
                  <div class="row"><strong>{{ item.company || label('公司名称', 'Company') }} · {{ item.position || label('岗位', 'Role') }}</strong><span>{{ item.startDate }} — {{ item.current ? label('至今', 'Now') : item.endDate }}</span></div>
                  <p>{{ item.description.split('\n')[0] }}</p>
                </div>
                <h3>Skills</h3>
                <p>{{ store.data.skills.map((s) => s.items).join(' · ') }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="props.mode === 'workspace' || props.mode === 'templates'" class="section">
        <div class="section__head">
          <div>
            <div class="num">{{ props.mode === 'templates' ? '01' : '02' }} · {{ t('templates') }}</div>
            <h2>{{ t('chooseLayout') }}</h2>
          </div>
          <div class="meta">
            <span>Current · {{ store.config.templateId }}</span>
            <button @click="emit('navigate', 'editor')">{{ t('previewInEditor') }} →</button>
          </div>
        </div>
        <div class="template-grid">
          <button v-for="template in templates" :key="template.id"
            class="template-card"
            :class="{ active: store.config.templateId === template.id }"
            @click="setTemplate(template.id)">
            <TemplateThumbnail :type="template.id" :color="store.config.themeColor" />
            <strong>{{ t(template.id) }}</strong>
            <span>{{ t(`${template.id}Desc` as 'classicDesc' | 'modernDesc' | 'sidebarDesc') }}</span>
          </button>
        </div>
      </section>

      <section v-if="props.mode === 'workspace'" class="section">
        <div class="section__head">
          <div>
            <div class="num">03 · {{ t('documents') }}</div>
            <h2>{{ t('documents') }}</h2>
          </div>
          <div class="meta">
            <button @click="openEditor">{{ t('openCurrent') }} →</button>
            <button @click="createBlank">{{ t('newResumeFull') }}</button>
          </div>
        </div>
        <div class="career-reminder" :class="{ due: careerUpdateDays <= 0 }">
          <div>
            <span>{{ locale === 'zh-CN' ? '职业经历双周更新' : 'Biweekly career update' }}</span>
            <strong>{{ careerUpdateLabel }}</strong>
            <p>{{ locale === 'zh-CN' ? '建议每两周补充一次新项目、职责变化、成果数字或面试反馈。' : 'Every two weeks, add new projects, responsibility changes, measurable outcomes, or interview feedback.' }}</p>
          </div>
          <button @click="recordCareerUpdate">{{ locale === 'zh-CN' ? '我已更新' : 'I updated it' }}</button>
        </div>
        <div class="docs">
          <article v-for="doc in documents" :key="doc.id" class="doc" :class="{ active: doc.id === store.activeResumeId }" @click="openDocument(doc.id)">
            <div class="doc__head">
              <span class="lang">{{ doc.config.locale === 'zh-CN' ? 'ZH' : 'EN' }}</span>
              <span class="menu">{{ doc.id === store.activeResumeId ? 'LIVE' : '···' }}</span>
            </div>
            <div>
              <input v-if="renameId === doc.id" v-model="renameDraft" class="doc-rename" @click.stop @keydown.enter="finishRename" @blur="finishRename" />
              <div v-else class="doc__title">{{ doc.title }}</div>
              <div class="doc__role">{{ doc.config.templateId }} · {{ doc.data.personal.title || doc.data.personal.name || 'Untitled' }}</div>
            </div>
            <div class="doc__sig">{{ (doc.data.personal.name || doc.title || 'R').slice(0, 1) }}</div>
            <div class="doc__meta">
              <span class="dot" :class="{ live: doc.id === store.activeResumeId }"></span>
              <span>{{ doc.data.experience.length }} exp</span>
              <span>·</span>
              <span>{{ doc.data.projects.length }} projects</span>
              <span class="push">{{ locale === 'zh-CN' ? '更新' : 'due' }} {{ Math.max(0, store.daysUntilCareerUpdate(doc.id)) }}d</span>
            </div>
            <div class="doc-actions" @click.stop>
              <button @click="startRename(doc.id, doc.title)">{{ locale === 'zh-CN' ? '重命名' : 'Rename' }}</button>
              <button @click="duplicateDocument(doc.id)">{{ locale === 'zh-CN' ? '复制' : 'Copy' }}</button>
              <button @click="deleteDocument(doc.id)">{{ locale === 'zh-CN' ? '删除' : 'Delete' }}</button>
            </div>
          </article>
          <article class="doc doc--new" @click="createBlank">
            <div class="plus">＋</div>
            <strong>{{ t('newResumeFull') }}</strong>
              <span>{{ label('空白 · 导入 · 编辑', 'blank · import · edit') }}</span>
          </article>
        </div>
      </section>

      <section v-if="props.mode === 'workspace' || props.mode === 'pipeline'" class="section">
        <div class="section__head section__head--double">
          <div>
            <div class="num">{{ props.mode === 'pipeline' ? '01' : '04' }} · {{ t('pipeline') }}</div>
            <h2>{{ t('pipelineTitle') }}</h2>
          </div>
          <div class="meta">
            <span>1 offer · 4 active · 1 closed</span>
            <button @click="logApplication">+ {{ t('logApplication') }}</button>
          </div>
        </div>
        <div class="apps">
          <div class="apps__toolbar">
            <div class="apps__filters">
              <button v-for="filter in filters" :key="filter.id"
                :class="{ on: pipelineFilter === filter.id }"
                @click="pipelineFilter = filter.id">
                {{ filter.label }}<span class="count">{{ filter.id === 'all' ? applications.length : applications.filter((a) => a.stage === filter.id).length }}</span>
              </button>
            </div>
            <span class="toolbar-note">sorted by · most recent</span>
          </div>
          <table class="apps__table">
            <thead>
              <tr>
                <th>{{ t('company') }}</th>
                <th>{{ t('role') }}</th>
                <th>{{ t('resumeUsed') }}</th>
                <th>{{ t('stage') }}</th>
                <th>{{ t('match') }}</th>
                <th>{{ t('applied') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="app in filteredApplications" :key="`${app.co}-${app.role}`">
                <td>
                  <div class="co">
                    <div class="co__logo">{{ app.mono }}</div>
                    <div>
                      <div class="co__name">{{ app.co }}</div>
                      <div class="co__loc">{{ app.loc }}</div>
                    </div>
                  </div>
                </td>
                <td><div class="role-cell">{{ app.role }}<small>{{ app.dept }}</small></div></td>
                <td><span class="mono">{{ app.resume }}</span></td>
                <td><span class="stage" :class="`stage--${app.stage}`">{{ app.stageLabel }}</span></td>
                <td>
                  <div class="match-cell">
                    <div class="bar" :class="matchClass(app.match)"><i :style="{ width: `${app.match}%` }"></i></div>
                    <span>{{ app.match }}</span>
                  </div>
                </td>
                <td><div class="applied-when">{{ app.when }}<small>{{ app.ago }}</small></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="props.mode === 'workspace' || props.mode === 'history' || props.mode === 'assistant'" class="section">
        <div class="lower">
          <div v-if="props.mode !== 'assistant'" class="panel">
            <div class="panel__head">
              <div class="ttl">{{ t('commits') }} · <em>main</em></div>
              <button @click="emit('navigate', 'history')">{{ t('fullLog') }} →</button>
            </div>
            <div class="timeline">
              <div v-for="commit in commits" :key="commit.hash" class="commit" :class="`commit--${commit.type}`">
                <div class="commit__graph"><span class="commit__dot"></span></div>
                <div class="commit__body">
                  <div class="commit__msg"><span class="tag" :class="`tag--${commit.type}`">{{ commit.tag }}</span>{{ commit.msg }}</div>
                  <div class="commit__meta">{{ commit.meta }}</div>
                </div>
                <div class="commit__sha"><div class="hash">{{ commit.hash }}</div><div>{{ commit.when }}</div></div>
              </div>
            </div>
          </div>

          <div class="panel ai-panel">
            <div class="panel__head">
              <div class="ttl">AI · <em>{{ t('coEditor') }}</em></div>
              <div class="live">SESSION · {{ t('ready') }}</div>
            </div>
            <div class="ai">
              <div class="ai__convo">
                <div class="ai__msg ai__msg--user">
                  <div class="gut">›</div>
                  <div class="body">{{ label('针对目标岗位优化这份简历，保持一页，优先强化最近经历。', 'Tailor this resume for the target role, keep it to one page, and prioritize recent experience.') }}</div>
                </div>
                <div class="ai__msg ai__msg--ai">
                  <div class="gut">∗</div>
                  <div class="body">
                    {{ label('我会检查摘要、经历和项目三块。当前完整度', 'I will review the summary, experience, and projects. Current completeness') }} <strong>{{ store.completeness }}</strong>{{ label('，建议先补量化结果，再压缩弱相关内容。', '. Add measurable outcomes first, then trim weaker details.') }}
                    <div class="ai__tool">
                      <div class="ai__tool__head"><span class="name">read_resume</span><span class="status">DONE</span></div>
                      <div class="ai__tool__body">
                        <div class="row"><span class="k">sections</span><span class="v">{{ store.config.sectionOrder.length }} blocks</span></div>
                        <div class="row"><span class="k">template</span><span class="v">{{ store.config.templateId }}</span></div>
                      </div>
                    </div>
                    <div class="ai-suggestions">
                      <button v-for="suggestion in assistantSuggestions" :key="suggestion" @click="applySuggestion(suggestion)">
                        <span>{{ suggestion }}</span>
                        <b>{{ t('apply') }}</b>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="ai__compose">
                <input v-model="assistantPrompt" :placeholder="t('aiPlaceholder')" @keydown.enter="runAssistant" />
                <button class="btn btn--primary" @click="runAssistant">{{ t('generateAdvice') }}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="props.mode === 'settings'" class="section">
        <div class="section__head">
          <div>
            <div class="num">01 · {{ t('settings') }}</div>
            <h2>{{ t('studioPrefs') }}</h2>
          </div>
        </div>
        <div class="settings-panel">
          <section class="settings-card settings-card--wide">
            <div class="settings-card__head">
              <div>
                <span>{{ label('页面主题', 'Page theme') }}</span>
                <strong>{{ label('控制整个工作台，不影响简历内容排版', 'Controls the whole workspace, not resume content layout') }}</strong>
              </div>
              <button class="btn btn--ghost" @click="resetStudioTheme">{{ label('恢复默认', 'Reset') }}</button>
            </div>

            <div class="settings-rows">
              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('强调色', 'Accent') }}</span>
                  <small>{{ label('导航、按钮、分数条', 'Navigation, buttons, meters') }}</small>
                </div>
                <div class="settings-swatches">
                  <button v-for="accent in accents" :key="accent.id"
                    class="settings-swatch"
                    :class="{ on: store.config.studioTheme.accent === accent.id }"
                    :style="{ background: accent.hex }"
                    :title="accent.label"
                    @click="setStudioTheme('accent', accent.id)"></button>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('纸张', 'Paper') }}</span>
                  <small>{{ label('整站背景和面板底色', 'App background and panels') }}</small>
                </div>
                <div class="settings-swatches">
                  <button v-for="paper in papers" :key="paper.id"
                    class="settings-swatch"
                    :class="{ on: store.config.studioTheme.paper === paper.id }"
                    :style="{ background: paper.hex }"
                    :title="paper.label"
                    @click="setStudioTheme('paper', paper.id)"></button>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('全局辅助线', 'Global rule lines') }}</span>
                  <small>{{ label('工作台背景参考线', 'Workspace background guides') }}</small>
                </div>
                <button class="tgl" :class="{ on: store.config.studioTheme.ruleLines }"
                  @click="setStudioTheme('ruleLines', !store.config.studioTheme.ruleLines)"></button>
              </div>

              <div class="settings-row settings-row--fonts">
                <div class="settings-row__copy">
                  <span>{{ label('界面字体', 'Interface font') }}</span>
                  <small>{{ label('仅影响工作台界面', 'Workspace UI only') }}</small>
                </div>
                <div class="settings-fonts">
                  <button v-for="font in interfaceFonts" :key="font.id"
                    class="font-swatch"
                    :class="[font.className, { on: store.config.studioTheme.font === font.id }]"
                    @click="setStudioTheme('font', font.id)">
                    <div>
                      <div class="name">{{ font.name }}</div>
                      <div class="meta">{{ font.meta }}</div>
                    </div>
                    <div class="meta">Aa</div>
                  </button>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row__copy">
                  <span>{{ label('页面密度', 'Page density') }}</span>
                  <small>{{ label('控制工作台间距', 'Controls workspace spacing') }}</small>
                </div>
                <div class="seg-radio">
                  <button v-for="density in densities" :key="density"
                    :class="{ on: store.config.studioTheme.density === density }"
                    @click="setStudioTheme('density', density)">{{ density }}</button>
                </div>
              </div>
            </div>
          </section>

          <section class="settings-card">
            <div class="settings-card__head">
              <div>
                <span>{{ label('简历导出外观', 'Resume export appearance') }}</span>
                <strong>{{ label('这些设置会影响当前简历模板', 'These settings affect the active resume template') }}</strong>
              </div>
            </div>
            <label class="settings-field">
              <span>{{ t('themeColor') }}</span>
              <input type="color" :value="store.config.themeColor" @input="(e) => store.setThemeColor((e.target as HTMLInputElement).value)" />
            </label>
            <label class="settings-field">
              <span>{{ t('fontSize') }}</span>
              <input type="range" min="12" max="18" :value="store.config.fontSize"
                @input="(e) => store.config.fontSize = Number((e.target as HTMLInputElement).value)" />
              <small>{{ store.config.fontSize }}px</small>
            </label>
          </section>

          <section class="settings-card">
            <div class="settings-card__head">
              <div>
                <span>{{ label('数据', 'Data') }}</span>
                <strong>{{ label('恢复示例会覆盖当前简历内容', 'Restoring demo content overwrites the current resume') }}</strong>
              </div>
            </div>
            <button class="btn btn--ghost settings-danger" @click="store.resetToDefault()">{{ t('restoreDemo') }}</button>
          </section>
        </div>
      </section>
    </div>
  </main>
</template>
