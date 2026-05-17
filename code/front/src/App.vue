<script setup lang="ts">
import { computed, ref } from 'vue'
import TopBar from './components/TopBar.vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ToastContainer from './components/ToastContainer.vue'
import WelcomeDialog from './components/WelcomeDialog.vue'
import { useResumeStore } from './stores/resume'

const store = useResumeStore()
const showWelcome = ref(!localStorage.getItem('resume-visited'))

const activeSections = computed(() =>
  store.config.sectionOrder.filter((id) => store.config.sectionVisible[id]).length,
)

const primaryAdvice = computed(() => {
  if (!store.data.personal.summary.trim()) return '先补一段 2-3 句的个人简介，预览页会立刻更完整。'
  if (!store.data.experience.length) return '加入最近一段工作经历，让简历主体更可信。'
  if (!store.data.projects.length) return '补充一个能体现结果的项目，建议写清技术栈和量化成果。'
  if (store.completeness < 90) return '继续补齐隐藏或空白章节，导出前建议把完整度推到 90 以上。'
  return '内容结构已经很稳，导出前只需要检查分页线和主题色。'
})
</script>

<template>
  <div class="studio-shell">
    <aside class="studio-rail" aria-label="主导航">
      <div class="rail-mark">R</div>
      <button class="rail-action is-active" title="文档">
        <span>§</span>
      </button>
      <button class="rail-action" title="模板">
        <span>▦</span>
      </button>
      <button class="rail-action" title="优化">
        <span>✦</span>
      </button>
      <button class="rail-action" title="历史">
        <span>↺</span>
      </button>
      <div class="rail-spacer" />
      <button class="rail-action" title="设置">
        <span>⌘</span>
      </button>
    </aside>

    <TopBar />

    <main class="studio-main">
      <EditorPanel />
      <PreviewPanel />
      <aside class="inspector-panel">
        <div class="inspector-card score-card">
          <span class="inspector-eyebrow">Match score</span>
          <strong>{{ store.completeness }}<small>/100</small></strong>
          <div class="score-track">
            <i :style="{ width: `${store.completeness}%` }" />
          </div>
          <p>{{ primaryAdvice }}</p>
        </div>

        <div class="inspector-card">
          <span class="inspector-eyebrow">Workspace</span>
          <dl class="compact-list">
            <div>
              <dt>模板</dt>
              <dd>{{ store.config.templateId }}</dd>
            </div>
            <div>
              <dt>可见章节</dt>
              <dd>{{ activeSections }}</dd>
            </div>
            <div>
              <dt>主题色</dt>
              <dd>
                <span class="color-dot" :style="{ background: store.config.themeColor }" />
                {{ store.config.themeColor }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="inspector-card note-card">
          <span class="inspector-eyebrow">Before export</span>
          <ul>
            <li>每条经历使用动词开头</li>
            <li>优先保留有数字结果的项目</li>
            <li>控制在 1 页时投递转化更稳定</li>
          </ul>
        </div>
      </aside>
    </main>

    <ToastContainer />
    <WelcomeDialog v-if="showWelcome" @close="showWelcome = false" />
  </div>
</template>
