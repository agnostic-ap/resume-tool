<script setup lang="ts">
import { useResumeStore, DEFAULT_TWEAKS } from '../stores/resume'
import type {
  ResumeTweaks,
  TweakAccent,
  TweakPaper,
  TweakDensity,
  TweakFont,
  TweakMarginalia,
  TweakTone,
} from '../types/resume'
import { useI18n } from '../i18n'
import {
  getEditorSettingsCloseLabel,
  getEditorSettingsControlLabel,
  getEditorSettingsSubtitle,
  getEditorSettingsTitle,
  type EditorSettingsControlId,
} from '../utils/editorSettingsDisplay'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useResumeStore()
const { locale } = useI18n()
const densityOptions: { id: TweakDensity; zh: string; en: string }[] = [
  { id: 'tight', zh: '紧凑', en: 'Tight' },
  { id: 'cozy', zh: '适中', en: 'Cozy' },
  { id: 'loose', zh: '宽松', en: 'Loose' },
]
const marginaliaOptions: { id: TweakMarginalia; zh: string; en: string }[] = [
  { id: 'notes', zh: '批注', en: 'Notes' },
  { id: 'inline', zh: '行内', en: 'Inline' },
  { id: 'off', zh: '关闭', en: 'Off' },
]
const toneOptions: { id: TweakTone; zh: string; en: string }[] = [
  { id: 'editor', zh: '编辑', en: 'Editor' },
  { id: 'coach', zh: '教练', en: 'Coach' },
  { id: 'minimal', zh: '精简', en: 'Minimal' },
]

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

const fonts: { id: TweakFont; name: string; meta: string; className: string }[] = [
  { id: 'serif', name: 'Plex Serif', meta: 'print · editorial', className: 'serif-stack' },
  { id: 'sans', name: 'Plex Sans', meta: 'modern · neutral', className: 'sans-stack' },
  { id: 'mono', name: 'Plex Mono', meta: 'terminal · indie', className: 'mono-stack' },
]

function setTweak<K extends keyof ResumeTweaks>(key: K, value: ResumeTweaks[K]) {
  store.setTweak(key, value)
}

function reset() {
  Object.entries(DEFAULT_TWEAKS).forEach(([key, value]) => {
    store.setTweak(key as keyof ResumeTweaks, value as never)
  })
}

function text(zh: string, en: string) {
  return locale.value === 'zh-CN' ? zh : en
}

function settingsControl(id: EditorSettingsControlId) {
  return getEditorSettingsControlLabel(id, locale.value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="tweaks-backdrop" @click="emit('close')"></div>
    <aside v-if="open" class="tweaks" role="dialog" aria-modal="true" aria-labelledby="tweaks-dialog-title">
      <div class="tweaks__head">
        <h3 id="tweaks-dialog-title">{{ getEditorSettingsTitle(locale) }}<small>{{ getEditorSettingsSubtitle(locale) }}</small></h3>
        <button class="tweaks__close" :aria-label="getEditorSettingsCloseLabel(locale)" @click="emit('close')">×</button>
      </div>

      <div class="tweaks__scroll">
        <div class="tweak-section">
          <div class="tweak-section__label">— {{ locale === 'zh-CN' ? '编辑台配色' : 'Editor palette' }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '编辑强调色' : 'Editor accent' }}<small>{{ locale === 'zh-CN' ? '批注 / 标记，不改简历主题色' : 'annotations only, not resume color' }}</small></div>
            <div class="swatches">
              <button v-for="accent in accents" :key="accent.id"
                class="sw"
                :class="{ on: store.config.tweaks.accent === accent.id }"
                :style="{ background: accent.hex }"
                :title="accent.label"
                @click="setTweak('accent', accent.id)"></button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '纸张' : 'Paper' }}<small>{{ locale === 'zh-CN' ? '页面底色' : 'page surface' }}</small></div>
            <div class="swatches">
              <button v-for="paper in papers" :key="paper.id"
                class="sw"
                :class="{ on: store.config.tweaks.paper === paper.id }"
                :style="{ background: paper.hex }"
                :title="paper.label"
                @click="setTweak('paper', paper.id)"></button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">{{ settingsControl('ruleLines').label }}<small>{{ settingsControl('ruleLines').detail }}</small></div>
            <button class="tgl" :class="{ on: store.config.tweaks.ruleLines }"
              @click="setTweak('ruleLines', !store.config.tweaks.ruleLines)"></button>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— {{ locale === 'zh-CN' ? '字体' : 'Typography' }}</div>
          <button v-for="font in fonts" :key="font.id"
            class="font-swatch"
            :class="[font.className, { on: store.config.tweaks.font === font.id }]"
            @click="setTweak('font', font.id)">
            <div>
              <div class="name">{{ font.name }}</div>
              <div class="meta">{{ font.meta }}</div>
            </div>
            <div class="meta">Aa</div>
          </button>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— {{ locale === 'zh-CN' ? '密度' : 'Density' }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ settingsControl('density').label }}<small>{{ settingsControl('density').detail }}</small></div>
            <div class="seg-radio">
              <button v-for="density in densityOptions" :key="density.id"
                :class="{ on: store.config.tweaks.density === density.id }"
                @click="setTweak('density', density.id)">{{ text(density.zh, density.en) }}</button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '字号比例' : 'Font scale' }}<small>{{ locale === 'zh-CN' ? '编辑器 + 预览' : 'editor + preview' }}</small></div>
            <div class="slider-wrap">
              <input class="slider" type="range" min="80" max="130" step="5"
                :value="store.config.tweaks.fontScale"
                @input="(e) => setTweak('fontScale', Number((e.target as HTMLInputElement).value))" />
              <span class="val">{{ store.config.tweaks.fontScale }}%</span>
            </div>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— {{ locale === 'zh-CN' ? '布局' : 'Layout' }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ settingsControl('showTree').label }}<small>{{ settingsControl('showTree').detail }}</small></div>
            <button class="tgl" :class="{ on: store.config.tweaks.showTree }"
              @click="setTweak('showTree', !store.config.tweaks.showTree)"></button>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— {{ locale === 'zh-CN' ? 'JD 辅助' : 'JD assistance' }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '建议展示' : 'Suggestion display' }}<small>{{ locale === 'zh-CN' ? '定制建议如何出现' : 'how tailoring notes appear' }}</small></div>
            <div class="seg-radio">
              <button v-for="mode in marginaliaOptions" :key="mode.id"
                :class="{ on: store.config.tweaks.marginaliaMode === mode.id }"
                @click="setTweak('marginaliaMode', mode.id)">{{ text(mode.zh, mode.en) }}</button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '语气' : 'Tone' }}<small>{{ locale === 'zh-CN' ? '文案编辑口吻' : 'copy-editing voice' }}</small></div>
            <div class="seg-radio">
              <button v-for="tone in toneOptions" :key="tone.id"
                :class="{ on: store.config.tweaks.aiTone === tone.id }"
                @click="setTweak('aiTone', tone.id)">{{ text(tone.zh, tone.en) }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="tweaks__foot">
        <span>{{ locale === 'zh-CN' ? '修改实时生效' : 'changes apply live' }}</span>
        <button @click="reset">{{ locale === 'zh-CN' ? '恢复默认' : 'reset to defaults' }}</button>
      </div>
    </aside>
  </Teleport>
</template>
