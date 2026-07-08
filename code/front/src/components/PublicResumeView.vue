<script setup lang="ts">
import { computed } from 'vue'
import TemplateClassic from './templates/TemplateClassic.vue'
import TemplateModern from './templates/TemplateModern.vue'
import TemplateSidebar from './templates/TemplateSidebar.vue'
import TemplateAdaptive from './templates/TemplateAdaptive.vue'
import { useLocaleText } from '../composables/useLocaleText'
import { buildReferralUrl } from '../utils/share'
import type { ResumeSharePayload } from '../utils/share'

const props = defineProps<{ payload: ResumeSharePayload }>()
const { l } = useLocaleText()

const templateComponents: Record<string, unknown> = {
  classic: TemplateClassic,
  modern: TemplateModern,
  sidebar: TemplateSidebar,
  compact: TemplateAdaptive,
  executive: TemplateAdaptive,
  creative: TemplateAdaptive,
  academic: TemplateAdaptive,
  technical: TemplateAdaptive,
  product: TemplateAdaptive,
  minimal: TemplateAdaptive,
}

const currentTemplate = computed(() => templateComponents[props.payload.config.templateId] ?? TemplateClassic)

const ctaUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return props.payload.ref ? buildReferralUrl(origin, props.payload.ref) : `${origin}/`
})
</script>

<template>
  <div class="public-resume">
    <header class="public-resume__bar">
      <span class="public-resume__brand">Resume Tool</span>
      <a class="btn btn--primary" :href="ctaUrl">{{ l('免费做一份我的简历', 'Build my own resume — free') }}</a>
    </header>
    <main class="public-resume__paper">
      <component :is="currentTemplate" :data="payload.data" :config="payload.config" />
    </main>
    <footer class="public-resume__foot">
      {{ l('本页由 Resume Tool 分享链接生成，内容只读。', 'Shared via a Resume Tool link. Read-only.') }}
    </footer>
  </div>
</template>

<style scoped>
.public-resume {
  min-height: 100vh;
  background: #f4f5f6;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.public-resume__bar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e3e3e3;
  position: sticky;
  top: 0;
  z-index: 1;
}

.public-resume__brand {
  font-weight: 600;
}

.public-resume__paper {
  width: 794px;
  max-width: 100%;
  margin: 24px auto;
  background: #fff;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.public-resume__foot {
  padding: 16px;
  color: #888;
  font-size: 12px;
}
</style>
