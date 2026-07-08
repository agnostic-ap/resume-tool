export interface ResumeColorPreset {
  hex: string
  labelZh: string
  labelEn: string
}

export const RESUME_COLOR_PRESETS: ResumeColorPreset[] = [
  { hex: '#1677FF', labelZh: '清朗蓝', labelEn: 'Clear blue' },
  { hex: '#52C41A', labelZh: '松针绿', labelEn: 'Pine green' },
  { hex: '#FAAD14', labelZh: '暖金色', labelEn: 'Warm gold' },
  { hex: '#FF4D4F', labelZh: '赤陶红', labelEn: 'Terracotta red' },
  { hex: '#13C2C2', labelZh: '湖水青', labelEn: 'Lagoon teal' },
  { hex: '#2F54EB', labelZh: '深海蓝', labelEn: 'Deep sea blue' },
  { hex: '#722ED1', labelZh: '藤花紫', labelEn: 'Wisteria violet' },
]

export function getResumeColorLabel(preset: ResumeColorPreset, locale: string) {
  return locale === 'zh-CN' ? preset.labelZh : preset.labelEn
}
