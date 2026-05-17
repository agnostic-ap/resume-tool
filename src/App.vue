<script setup lang="ts">
import { ref } from 'vue'
import TopBar from './components/TopBar.vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ToastContainer from './components/ToastContainer.vue'
import WelcomeDialog from './components/WelcomeDialog.vue'

const showWelcome = ref(!localStorage.getItem('resume-visited'))
</script>

<template>
  <div class="flex flex-col" style="height: 100vh; overflow: hidden;">
    <TopBar />
    <div class="flex flex-1 overflow-hidden">
      <EditorPanel />
      <PreviewPanel />
    </div>
    <ToastContainer />
    <WelcomeDialog v-if="showWelcome" @close="showWelcome = false" />
  </div>
</template>
