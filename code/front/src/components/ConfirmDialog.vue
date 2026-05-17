<script setup lang="ts">
import { useLocaleText } from '../composables/useLocaleText'

defineProps<{ title: string; message: string; danger?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { l } = useLocaleText()
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('cancel')">
      <div class="confirm-dialog">
        <div class="confirm-dialog__body">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
        <div class="confirm-dialog__actions">
          <button @click="emit('cancel')" class="confirm-dialog__button">
            {{ l('取消', 'Cancel') }}
          </button>
          <button @click="emit('confirm')"
            class="confirm-dialog__button confirm-dialog__button--confirm"
            :class="{ 'is-danger': danger }">
            {{ l('确认', 'Confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
