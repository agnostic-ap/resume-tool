<script setup lang="ts">
import { useResumeStore } from '../../stores/resume'

const store = useResumeStore()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'
</script>

<template>
  <div class="space-y-3">
    <div v-for="cert in store.data.certifications" :key="cert.id"
      class="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">证书 / 资质名称</label>
        <input v-model="cert.name" :class="inputCls" placeholder="PMP项目管理认证" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">颁发机构</label>
          <input v-model="cert.issuer" :class="inputCls" placeholder="PMI" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">获取时间</label>
          <input v-model="cert.date" type="month" :class="inputCls" />
        </div>
      </div>
      <button @click="store.removeCertification(cert.id)" class="text-xs text-red-400 hover:text-red-600 transition-colors">
        删除此条
      </button>
    </div>

    <button @click="store.addCertification()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加证书资质
    </button>
  </div>
</template>
