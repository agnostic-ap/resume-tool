<script setup lang="ts">
import { DEFAULT_STUDIO_THEME, useResumeStore } from '../stores/resume'
import type { StudioTheme, TweakAccent, TweakDensity, TweakFont, TweakPaper } from '../types/resume'
import { useI18n } from '../i18n'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useResumeStore()
const { locale } = useI18n()

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

const fonts: { id: TweakFont; name: string; meta: string; className: string }[] = [
  { id: 'serif', name: 'Serif', meta: 'editorial · warm', className: 'serif-stack' },
  { id: 'sans', name: 'Sans', meta: 'neutral · crisp', className: 'sans-stack' },
  { id: 'mono', name: 'Mono', meta: 'technical · compact', className: 'mono-stack' },
]

function label(zh: string, en: string) {
  return locale.value === 'zh-CN' ? zh : en
}

function setTheme<K extends keyof StudioTheme>(key: K, value: StudioTheme[K]) {
  store.setStudioTheme(key, value)
}

function reset() {
  Object.entries(DEFAULT_STUDIO_THEME).forEach(([key, value]) => {
    store.setStudioTheme(key as keyof StudioTheme, value as never)
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="tweaks-backdrop" @click="emit('close')"></div>
    <aside v-if="open" class="tweaks">
      <div class="tweaks__head">
        <h3>{{ label('页面主题', 'Page Theme') }}<small>{{ label('全局 · 实时', 'global · live') }}</small></h3>
        <button class="tweaks__close" @click="emit('close')">×</button>
      </div>

      <div class="tweaks__scroll">
        <div class="tweak-section">
          <div class="tweak-section__label">— {{ label('全局配色', 'Global palette') }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ label('强调色', 'Accent') }}<small>{{ label('导航、按钮、分数条', 'nav, buttons, meters') }}</small></div>
            <div class="swatches">
              <button v-for="accent in accents" :key="accent.id"
                class="sw"
                :class="{ on: store.config.studioTheme.accent === accent.id }"
                :style="{ background: accent.hex }"
                :title="accent.label"
                @click="setTheme('accent', accent.id)"></button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">{{ label('纸张', 'Paper') }}<small>{{ label('整站背景和面板底色', 'app background and panels') }}</small></div>
            <div class="swatches">
              <button v-for="paper in papers" :key="paper.id"
                class="sw"
                :class="{ on: store.config.studioTheme.paper === paper.id }"
                :style="{ background: paper.hex }"
                :title="paper.label"
                @click="setTheme('paper', paper.id)"></button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">{{ label('全局横线', 'Global rule lines') }}<small>{{ label('工作台背景辅助线', 'workspace background guides') }}</small></div>
            <button class="tgl" :class="{ on: store.config.studioTheme.ruleLines }"
              @click="setTheme('ruleLines', !store.config.studioTheme.ruleLines)"></button>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— {{ label('界面字体', 'Interface font') }}</div>
          <button v-for="font in fonts" :key="font.id"
            class="font-swatch"
            :class="[font.className, { on: store.config.studioTheme.font === font.id }]"
            @click="setTheme('font', font.id)">
            <div>
              <div class="name">{{ font.name }}</div>
              <div class="meta">{{ font.meta }}</div>
            </div>
            <div class="meta">Aa</div>
          </button>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— {{ label('页面密度', 'Page density') }}</div>
          <div class="tweak-row">
            <div class="lbl">{{ label('全局密度', 'Global density') }}</div>
            <div class="seg-radio">
              <button v-for="density in (['tight', 'cozy', 'loose'] as TweakDensity[])" :key="density"
                :class="{ on: store.config.studioTheme.density === density }"
                @click="setTheme('density', density)">{{ density }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="tweaks__foot">
        <span>{{ label('影响整个 Studio 页面', 'applies to the whole Studio') }}</span>
        <button @click="reset">{{ label('恢复默认', 'reset to defaults') }}</button>
      </div>
    </aside>
  </Teleport>
</template>
