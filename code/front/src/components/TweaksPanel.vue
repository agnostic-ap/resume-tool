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

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useResumeStore()
const { locale } = useI18n()

const accents: { id: TweakAccent; hex: string; label: string }[] = [
  { id: 'vermillion', hex: '#C65A3A', label: 'Terracotta' },
  { id: 'moss', hex: '#6F7F45', label: 'Olive moss' },
  { id: 'prussian', hex: '#31566A', label: 'Deep teal' },
  { id: 'ink-only', hex: '#3A2A22', label: 'Walnut ink' },
]

const papers: { id: TweakPaper; hex: string; label: string }[] = [
  { id: 'cream', hex: '#FBF4EA', label: 'Warm cream' },
  { id: 'snow', hex: '#FFFAF4', label: 'Soft white' },
  { id: 'newsprint', hex: '#F3EADC', label: 'Newsprint' },
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
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="tweaks-backdrop" @click="emit('close')"></div>
    <aside v-if="open" class="tweaks">
      <div class="tweaks__head">
        <h3>{{ locale === 'zh-CN' ? '编辑器微调' : 'Editor Tweaks' }}<small>{{ locale === 'zh-CN' ? '编辑台 · 实时' : 'editor · live' }}</small></h3>
        <button class="tweaks__close" @click="emit('close')">×</button>
      </div>

      <div class="tweaks__scroll">
        <div class="tweak-section">
          <div class="tweak-section__label">— {{ locale === 'zh-CN' ? '配色' : 'Palette' }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '强调色' : 'Accent' }}<small>{{ locale === 'zh-CN' ? '批注 / 标记' : 'red-pen / annotations' }}</small></div>
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
            <div class="lbl">{{ locale === 'zh-CN' ? '横线' : 'Rule lines' }}<small>{{ locale === 'zh-CN' ? '纸张式辅助线' : 'paper-style horizontals' }}</small></div>
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
            <div class="lbl">{{ locale === 'zh-CN' ? '界面密度' : 'UI density' }}</div>
            <div class="seg-radio">
              <button v-for="density in (['tight', 'cozy', 'loose'] as TweakDensity[])" :key="density"
                :class="{ on: store.config.tweaks.density === density }"
                @click="setTweak('density', density)">{{ density }}</button>
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
            <div class="lbl">{{ locale === 'zh-CN' ? '文件树' : 'File tree' }}<small>{{ locale === 'zh-CN' ? '左侧章节面板' : 'left section panel' }}</small></div>
            <button class="tgl" :class="{ on: store.config.tweaks.showTree }"
              @click="setTweak('showTree', !store.config.tweaks.showTree)"></button>
          </div>
          <div class="tweak-row">
            <div class="lbl">AI dock<small>{{ locale === 'zh-CN' ? '右侧批注栏' : 'right marginalia' }}</small></div>
            <button class="tgl" :class="{ on: store.config.tweaks.showAI }"
              @click="setTweak('showAI', !store.config.tweaks.showAI)"></button>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— {{ locale === 'zh-CN' ? 'AI 行为' : 'AI behaviour' }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '批注方式' : 'Marginalia' }}<small>{{ locale === 'zh-CN' ? 'AI 如何展示修改' : 'how AI surfaces edits' }}</small></div>
            <div class="seg-radio">
              <button v-for="mode in ([{ id: 'notes', label: 'Notes' }, { id: 'inline', label: 'Inline' }, { id: 'off', label: 'Off' }] as { id: TweakMarginalia; label: string }[])" :key="mode.id"
                :class="{ on: store.config.tweaks.marginaliaMode === mode.id }"
                @click="setTweak('marginaliaMode', mode.id)">{{ mode.label }}</button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">{{ locale === 'zh-CN' ? '语气' : 'Tone' }}<small>{{ locale === 'zh-CN' ? '文案编辑口吻' : 'copy-editing voice' }}</small></div>
            <div class="seg-radio">
              <button v-for="tone in ([{ id: 'editor', label: 'Editor' }, { id: 'coach', label: 'Coach' }, { id: 'minimal', label: 'Minimal' }] as { id: TweakTone; label: string }[])" :key="tone.id"
                :class="{ on: store.config.tweaks.aiTone === tone.id }"
                @click="setTweak('aiTone', tone.id)">{{ tone.label }}</button>
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
