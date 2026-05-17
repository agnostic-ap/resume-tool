<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResumeStore } from '../stores/resume'
import type { TemplateId } from '../types/resume'
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
const assistantSuggestions = ref<string[]>([
  '把个人简介改成“岗位定位 + 技术栈 + 量化结果”的三段式。',
  '工作经历每条 bullet 至少保留一个数字，弱相关职责移到项目里。',
])

const documents = computed(() => [
  {
    id: 'current',
    title: store.data.personal.title || '未命名岗位',
    role: `${store.config.templateId} · zh-CN`,
    lang: 'ZH',
    updated: 'just now',
    versions: Math.max(1, store.data.experience.length + store.data.projects.length + 2),
    views: store.completeness + 17,
    sig: (store.data.personal.name || 'R').slice(0, 1),
    live: true,
  },
  { id: 'stripe', title: 'Full-Stack · Stripe', role: 'Tailored · Payments API', lang: 'EN', updated: 'yesterday', versions: 8, views: 31, sig: 'S' },
  { id: 'portfolio', title: '独立开发者 · 中文版', role: 'Long-form · 个人作品集', lang: 'ZH', updated: '3 days ago', versions: 12, views: 88, sig: '独' },
  { id: 'linear', title: 'Staff Engineer · Linear', role: 'Tailored · Sync Engine', lang: 'EN', updated: '1 week ago', versions: 5, views: 19, sig: 'L' },
  { id: 'saas', title: 'SaaS 前端负责人', role: 'Resume · management track', lang: 'ZH', updated: '2 weeks ago', versions: 3, views: 12, sig: 'M' },
])

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

function openEditor() {
  emit('navigate', 'editor')
}

function createBlank() {
  emit('command', 'new')
}

function setTemplate(id: TemplateId) {
  store.setTemplate(id)
  showToast(locale.value === 'zh-CN' ? `已切换到${t(id)}模板` : `Switched to ${t(id)} template`, 'success')
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
              <span class="version">main · v1.0</span>
            </div>
            <h1 class="hero__title">
              {{ store.data.personal.title || 'Frontend' }} <em>{{ store.data.personal.name || 'Resume' }}</em>
            </h1>
            <div class="hero__sub">
              <span class="pill">zh-CN</span>
              <span>{{ store.config.templateId }} template</span>
              <span>·</span>
              <span>完整度 {{ store.completeness }}%</span>
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
            </div>

            <div class="hero__actions">
              <button class="btn btn--primary" @click="openEditor">{{ t('openEditor') }} <kbd>E</kbd></button>
              <button class="btn" @click="emit('navigate', 'assistant')">{{ t('tailorWithAI') }}</button>
              <button class="btn btn--ghost" @click="emit('command', 'export')">{{ t('exportPdf') }}</button>
              <button class="btn btn--ghost" @click="emit('navigate', 'history')">{{ t('viewHistory') }}</button>
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
                <h1>{{ store.data.personal.name || '你的姓名' }}</h1>
                <div class="role">{{ store.data.personal.title || '目标岗位' }} · {{ store.data.personal.location || '城市' }}</div>
                <div class="rule"></div>
                <h3>Summary</h3>
                <p>{{ store.data.personal.summary || '这里会显示你的个人简介。' }}</p>
                <h3>Experience</h3>
                <div v-for="item in store.data.experience.slice(0, 2)" :key="item.id">
                  <div class="row"><strong>{{ item.company || '公司名称' }} · {{ item.position || '岗位' }}</strong><span>{{ item.startDate }} — {{ item.current ? 'Now' : item.endDate }}</span></div>
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
        <div class="docs">
          <article v-for="doc in documents" :key="doc.id" class="doc" @click="openEditor">
            <div class="doc__head">
              <span class="lang">{{ doc.lang }}</span>
              <span class="menu">···</span>
            </div>
            <div>
              <div class="doc__title">{{ doc.title }}</div>
              <div class="doc__role">{{ doc.role }}</div>
            </div>
            <div class="doc__sig">{{ doc.sig }}</div>
            <div class="doc__meta">
              <span class="dot" :class="{ live: doc.live }"></span>
              <span>{{ doc.versions }} commits</span>
              <span>·</span>
              <span>{{ doc.views }} views</span>
              <span class="push">{{ doc.updated }}</span>
            </div>
          </article>
          <article class="doc doc--new" @click="createBlank">
            <div class="plus">＋</div>
            <strong>{{ t('newResumeFull') }}</strong>
            <span>blank · import · edit</span>
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
                  <div class="body">针对目标岗位优化这份简历，保持一页，优先强化最近经历。</div>
                </div>
                <div class="ai__msg ai__msg--ai">
                  <div class="gut">∗</div>
                  <div class="body">
                    我会检查摘要、经历和项目三块。当前完整度 <strong>{{ store.completeness }}</strong>，建议先补量化结果，再压缩弱相关内容。
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
        <div class="settings-grid">
          <label>
            <span>{{ t('themeColor') }}</span>
            <input type="color" :value="store.config.themeColor" @input="(e) => store.setThemeColor((e.target as HTMLInputElement).value)" />
          </label>
          <label>
            <span>{{ t('fontSize') }}</span>
            <input type="range" min="12" max="18" :value="store.config.fontSize"
              @input="(e) => store.config.fontSize = Number((e.target as HTMLInputElement).value)" />
            <small>{{ store.config.fontSize }}px</small>
          </label>
          <button class="btn btn--ghost" @click="store.resetToDefault()">{{ t('restoreDemo') }}</button>
        </div>
      </section>
    </div>
  </main>
</template>
