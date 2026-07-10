<script setup lang="ts">
import { useResumeStore } from '../stores/resume'
import { useLocaleText } from '../composables/useLocaleText'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useResumeStore()
const { l } = useLocaleText()
const zh = () => store.config.locale === 'zh-CN'
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <div class="privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-dialog-title">
        <div class="auth-dialog__head">
          <span id="privacy-dialog-title" class="auth-dialog__title">{{ l('隐私政策与用户协议', 'Privacy Policy & Terms') }}</span>
          <button class="auth-dialog__close" :aria-label="l('关闭', 'Close')" @click="emit('close')">×</button>
        </div>

        <div class="privacy-dialog__body">
          <template v-if="zh()">
            <h4>我们收集什么</h4>
            <p>简历内容、投递记录、成长记录由你主动填写。注册账户时我们收集邮箱和密码（密码仅以加盐哈希存储，任何人无法查看原文）。</p>
            <h4>数据存在哪里</h4>
            <p>未登录时，全部数据仅保存在你的浏览器本地（localStorage），不会上传。登录后，数据同步到我们的服务器以支持多设备访问，并按账户严格隔离。</p>
            <h4>数据如何使用</h4>
            <p>你的简历数据仅用于向你提供服务（编辑、导出、JD 定制、投递管理）。<b>我们不会将你的简历内容用于训练 AI 模型</b>，不会向第三方出售你的个人信息。使用 AI 定制功能时，相关内容会发送给模型服务方用于生成当次草稿。</p>
            <h4>公开分享</h4>
            <p>只有你主动创建分享链接时，对应简历快照才会公开可见。链接可随时撤销，撤销后立即失效。</p>
            <h4>你的权利</h4>
            <p>登录用户可随时在「设置」中一键导出全部数据副本，或永久删除账户及全部数据（不可恢复）。</p>
            <h4>用户协议要点</h4>
            <p>请勿上传违法内容或冒用他人身份信息；服务按现状提供，重要数据请定期导出备份。</p>
          </template>
          <template v-else>
            <h4>What we collect</h4>
            <p>Resume content, applications, and career memory entries are provided by you. Registering an account collects your email and password (stored only as a salted hash).</p>
            <h4>Where data lives</h4>
            <p>Signed out, everything stays in your browser's local storage and is never uploaded. Signed in, data syncs to our servers for multi-device access, strictly isolated per account.</p>
            <h4>How data is used</h4>
            <p>Your resume data is used only to provide the service. <b>We never use your resume content to train AI models</b> and never sell your personal information. When you use AI tailoring, the relevant content is sent to the model provider to generate that draft.</p>
            <h4>Public sharing</h4>
            <p>A resume snapshot becomes publicly visible only when you create a share link. Links can be revoked at any time and stop working immediately.</p>
            <h4>Your rights</h4>
            <p>Signed-in users can export a full copy of their data or permanently delete their account and all data from Settings at any time.</p>
            <h4>Terms highlights</h4>
            <p>Do not upload unlawful content or impersonate others. The service is provided as-is; export backups of important data regularly.</p>
          </template>
        </div>

        <div class="upgrade-dialog__actions">
          <button class="btn btn--primary" @click="emit('close')">{{ l('我知道了', 'Got it') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
