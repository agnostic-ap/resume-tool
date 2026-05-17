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

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useResumeStore()

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
        <h3>Tweaks<small>workspace · live</small></h3>
        <button class="tweaks__close" @click="emit('close')">×</button>
      </div>

      <div class="tweaks__scroll">
        <div class="tweak-section">
          <div class="tweak-section__label">— Palette</div>
          <div class="tweak-row">
            <div class="lbl">Accent<small>red-pen / annotations</small></div>
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
            <div class="lbl">Paper<small>page surface</small></div>
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
            <div class="lbl">Rule lines<small>paper-style horizontals</small></div>
            <button class="tgl" :class="{ on: store.config.tweaks.ruleLines }"
              @click="setTweak('ruleLines', !store.config.tweaks.ruleLines)"></button>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— Typography</div>
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
          <div class="tweak-section__label">— Density</div>
          <div class="tweak-row">
            <div class="lbl">UI density</div>
            <div class="seg-radio">
              <button v-for="density in (['tight', 'cozy', 'loose'] as TweakDensity[])" :key="density"
                :class="{ on: store.config.tweaks.density === density }"
                @click="setTweak('density', density)">{{ density }}</button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">Font scale<small>editor + preview</small></div>
            <div class="slider-wrap">
              <input class="slider" type="range" min="80" max="130" step="5"
                :value="store.config.tweaks.fontScale"
                @input="(e) => setTweak('fontScale', Number((e.target as HTMLInputElement).value))" />
              <span class="val">{{ store.config.tweaks.fontScale }}%</span>
            </div>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— Layout</div>
          <div class="tweak-row">
            <div class="lbl">File tree<small>left section panel</small></div>
            <button class="tgl" :class="{ on: store.config.tweaks.showTree }"
              @click="setTweak('showTree', !store.config.tweaks.showTree)"></button>
          </div>
          <div class="tweak-row">
            <div class="lbl">AI dock<small>right marginalia</small></div>
            <button class="tgl" :class="{ on: store.config.tweaks.showAI }"
              @click="setTweak('showAI', !store.config.tweaks.showAI)"></button>
          </div>
        </div>

        <div class="tweak-section">
          <div class="tweak-section__label">— AI behaviour</div>
          <div class="tweak-row">
            <div class="lbl">Marginalia<small>how AI surfaces edits</small></div>
            <div class="seg-radio">
              <button v-for="mode in ([{ id: 'notes', label: 'Notes' }, { id: 'inline', label: 'Inline' }, { id: 'off', label: 'Off' }] as { id: TweakMarginalia; label: string }[])" :key="mode.id"
                :class="{ on: store.config.tweaks.marginaliaMode === mode.id }"
                @click="setTweak('marginaliaMode', mode.id)">{{ mode.label }}</button>
            </div>
          </div>
          <div class="tweak-row">
            <div class="lbl">Tone<small>copy-editing voice</small></div>
            <div class="seg-radio">
              <button v-for="tone in ([{ id: 'editor', label: 'Editor' }, { id: 'coach', label: 'Coach' }, { id: 'minimal', label: 'Minimal' }] as { id: TweakTone; label: string }[])" :key="tone.id"
                :class="{ on: store.config.tweaks.aiTone === tone.id }"
                @click="setTweak('aiTone', tone.id)">{{ tone.label }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="tweaks__foot">
        <span>changes apply live</span>
        <button @click="reset">reset to defaults</button>
      </div>
    </aside>
  </Teleport>
</template>
