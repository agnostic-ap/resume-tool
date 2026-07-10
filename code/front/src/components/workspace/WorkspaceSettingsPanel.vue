<script setup lang="ts">
import { ref } from 'vue'
import { useResumeStore } from '../../stores/resume'
import { useI18n } from '../../i18n'
import { showToast } from '../../composables/toast'
import type { StudioTheme, TweakAccent, TweakDensity, TweakFont, TweakPaper } from '../../types/resume'

const emit = defineEmits<{ 'reset-demo': [] }>()

const store = useResumeStore()
const { t, locale } = useI18n()

function label(zh: string, en: string) {
  return locale.value === 'zh-CN' ? zh : en
}

const exportingAccount = ref(false)
const deleteConfirmText = ref('')
const deletingAccount = ref(false)

async function handleAccountExport() {
  exportingAccount.value = true
  try {
    await store.downloadAccountExport()
    showToast(label('已导出全部账户数据', 'Account data exported'), 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), 'error')
  } finally {
    exportingAccount.value = false
  }
}

async function handleAccountDelete() {
  if (deleteConfirmText.value !== 'DELETE') {
    showToast(label('请输入 DELETE 以确认删除', 'Type DELETE to confirm'), 'error')
    return
  }
  deletingAccount.value = true
  try {
    await store.deleteAccountPermanently()
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), 'error')
    deletingAccount.value = false
  }
}

const accents: { id: TweakAccent; hex: string; label: string }[] = [
  { id: 'ocean', hex: '#3E7891', label: 'Clear ocean' },
  { id: 'sage', hex: '#7D8F73', label: 'Soft sage' },
  { id: 'prussian', hex: '#31566A', label: 'Deep teal' },
  { id: 'amber', hex: '#B9812F', label: 'Amber' },
  { id: 'coral', hex: '#D96B5C', label: 'Warm coral' },
  { id: 'rosewood', hex: '#9B4D5C', label: 'Rosewood' },
  { id: 'moss', hex: '#6F7F45', label: 'Olive moss' },
  { id: 'vermillion', hex: '#C65A3A', label: 'Terracotta' },
  { id: 'lilac', hex: '#7B6A9B', label: 'Dusty lilac' },
  { id: 'ink-only', hex: '#3A2A22', label: 'Walnut ink' },
]

const papers: { id: TweakPaper; hex: string; label: string }[] = [
  { id: 'mist', hex: '#EEF3EF', label: 'Sage mist' },
  { id: 'snow', hex: '#FFFAF4', label: 'Soft white' },
  { id: 'stone', hex: '#F2F0EC', label: 'Warm stone' },
  { id: 'cream', hex: '#FBF4EA', label: 'Warm cream' },
  { id: 'newsprint', hex: '#F3EADC', label: 'Newsprint' },
  { id: 'blush', hex: '#FBEDEA', label: 'Blush paper' },
]

const interfaceFonts: { id: TweakFont; name: string; meta: string; className: string }[] = [
  { id: 'serif', name: 'Serif', meta: 'editorial · warm', className: 'serif-stack' },
  { id: 'sans', name: 'Sans', meta: 'neutral · crisp', className: 'sans-stack' },
  { id: 'mono', name: 'Mono', meta: 'technical · compact', className: 'mono-stack' },
]

const densities: TweakDensity[] = ['tight', 'cozy', 'loose']

function setStudioTheme<K extends keyof StudioTheme>(key: K, value: StudioTheme[K]) {
  store.setStudioTheme(key, value)
}

function resetStudioTheme() {
  store.resetStudioTheme()
  showToast(locale.value === 'zh-CN' ? '页面主题已恢复默认' : 'Page theme reset to defaults', 'success')
}
</script>

<template>
  <section class="section">
    <div class="section__head">
      <div>
        <div class="num">01 · {{ t('settings') }}</div>
        <h2>{{ t('studioPrefs') }}</h2>
      </div>
    </div>
    <div class="settings-panel">
      <section class="settings-card settings-card--wide settings-card--app">
        <div class="settings-card__head">
          <div>
            <em>{{ label('网站应用风格', 'Website style') }}</em>
            <span>{{ label('工作台外观', 'Workspace appearance') }}</span>
            <strong>{{ label('只影响导航、页面、表单和面板，不会改变导出的简历', 'Only affects navigation, pages, forms, and panels. It will not change exported resumes.') }}</strong>
          </div>
          <button class="btn btn--ghost" @click="resetStudioTheme">{{ label('恢复默认', 'Reset') }}</button>
        </div>

        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row__copy">
              <span>{{ label('强调色', 'Accent') }}</span>
              <small>{{ label('网站导航、按钮、提示和分数条', 'Website navigation, buttons, toasts, and meters') }}</small>
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
            <span>{{ label('数据', 'Data') }}</span>
            <strong>{{ label('恢复示例会覆盖当前简历内容', 'Restoring demo content overwrites the current resume') }}</strong>
          </div>
        </div>
        <button class="btn btn--ghost settings-danger" @click="emit('reset-demo')">{{ t('restoreDemo') }}</button>
      </section>

      <section v-if="store.isAuthenticated" class="settings-card">
        <div class="settings-card__head">
          <div>
            <span>{{ label('账户', 'Account') }}</span>
            <strong>{{ store.authSession?.user.email }} · {{ store.isPro ? 'Pro' : label('免费版', 'Free') }}</strong>
          </div>
        </div>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row__copy">
              <span>{{ label('导出账户数据', 'Export account data') }}</span>
              <small>{{ label('下载云端保存的全部简历、投递与成长记录（JSON）', 'Download every resume, application, and career memory stored in the cloud (JSON)') }}</small>
            </div>
            <button class="btn btn--ghost" :disabled="exportingAccount" @click="handleAccountExport">
              {{ exportingAccount ? label('导出中…', 'Exporting…') : label('导出', 'Export') }}
            </button>
          </div>
          <div class="settings-row">
            <div class="settings-row__copy">
              <span>{{ label('永久删除账户', 'Delete account permanently') }}</span>
              <small>{{ label('删除云端全部数据且不可恢复。输入 DELETE 确认。', 'Erases all cloud data. This cannot be undone. Type DELETE to confirm.') }}</small>
            </div>
            <div class="settings-delete-account">
              <input v-model="deleteConfirmText" type="text" placeholder="DELETE" class="settings-delete-input" />
              <button class="btn btn--ghost settings-danger" :disabled="deletingAccount" @click="handleAccountDelete">
                {{ deletingAccount ? label('删除中…', 'Deleting…') : label('删除账户', 'Delete') }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
