<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResumeStore } from '../stores/resume'
import { useLocaleText } from '../composables/useLocaleText'
import { showToast } from '../composables/toast'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; openPrivacy: [] }>()

const store = useResumeStore()
const { l } = useLocaleText()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const submitting = ref(false)
const errorMessage = ref('')

watch(() => props.open, (open) => {
  if (open) {
    errorMessage.value = ''
    password.value = ''
  }
})

const title = computed(() => mode.value === 'login'
  ? l('登录账户', 'Sign in')
  : l('创建账户', 'Create account'))

const switchLabel = computed(() => mode.value === 'login'
  ? l('还没有账户？注册', 'No account yet? Register')
  : l('已有账户？登录', 'Already registered? Sign in'))

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMessage.value = ''
}

async function submit() {
  const trimmedEmail = email.value.trim()
  if (!trimmedEmail || !password.value) {
    errorMessage.value = l('请填写邮箱和密码。', 'Enter your email and password.')
    return
  }
  if (mode.value === 'register' && password.value.length < 8) {
    errorMessage.value = l('密码至少 8 位。', 'Password must be at least 8 characters.')
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    if (mode.value === 'login') {
      await store.loginAccount(trimmedEmail, password.value)
      showToast(l('登录成功，云端数据已同步', 'Signed in. Cloud data synced.'), 'success')
    } else {
      await store.registerAccount(trimmedEmail, password.value, displayName.value.trim() || undefined)
      showToast(l('注册成功，已开启云端同步', 'Account created. Cloud sync is on.'), 'success')
    }
    emit('close')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <div class="auth-dialog__head">
          <span id="auth-dialog-title" class="auth-dialog__title">{{ title }}</span>
          <button class="auth-dialog__close" :aria-label="l('关闭', 'Close')" @click="emit('close')">×</button>
        </div>
        <p class="auth-dialog__hint">
          {{ l('登录后简历、投递和成长记录会同步到云端，多设备可用；不登录也可以继续在本设备使用全部功能。', 'Sign in to sync resumes, applications, and career memory across devices. Everything still works locally without an account.') }}
        </p>

        <form class="auth-dialog__form" @submit.prevent="submit">
          <label class="auth-field">
            <span>{{ l('邮箱', 'Email') }}</span>
            <input v-model="email" type="email" autocomplete="email" :placeholder="l('you@example.com', 'you@example.com')" />
          </label>
          <label v-if="mode === 'register'" class="auth-field">
            <span>{{ l('昵称（可选）', 'Display name (optional)') }}</span>
            <input v-model="displayName" type="text" autocomplete="nickname" />
          </label>
          <label class="auth-field">
            <span>{{ l('密码', 'Password') }}</span>
            <input v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :placeholder="mode === 'register' ? l('至少 8 位', 'At least 8 characters') : ''" />
          </label>

          <p v-if="errorMessage" class="auth-dialog__error" role="alert">{{ errorMessage }}</p>

          <button class="btn btn--primary auth-dialog__submit" type="submit" :disabled="submitting">
            {{ submitting ? l('请稍候…', 'Please wait…') : title }}
          </button>
        </form>

        <div class="auth-dialog__footer">
          <button class="auth-dialog__switch" type="button" @click="switchMode">{{ switchLabel }}</button>
          <p v-if="mode === 'register'" class="auth-dialog__terms">
            {{ l('注册即表示同意', 'By registering you agree to the') }}
            <button type="button" class="auth-dialog__link" @click="emit('openPrivacy')">{{ l('隐私政策与用户协议', 'privacy policy & terms') }}</button>
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
