<script setup lang="ts">
import { ref } from 'vue'
import { useResumeStore } from '../../stores/resume'
import { useDeleteConfirm } from '../../composables/useDeleteConfirm'

const store = useResumeStore()
const { pending: deletePending, askDelete, cancelDelete } = useDeleteConfirm()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'

const showHint = ref<Record<string, boolean>>({})
function toggleHint(id: string) { showHint.value[id] = !showHint.value[id] }

function autoBullet(proj: { description: string }) {
  proj.description = proj.description
    .split('\n')
    .map(line => {
      const t = line.trim()
      if (!t) return ''
      return /^[•\-\*]/.test(t) ? line : `• ${t}`
    })
    .join('\n')
}
</script>

<template>
  <div class="space-y-4">
    <div v-for="proj in store.data.projects" :key="proj.id"
      class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">项目名称</label>
          <input v-model="proj.name" :class="inputCls" placeholder="在线简历生成平台" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">担任角色</label>
          <input v-model="proj.role" :class="inputCls" placeholder="前端负责人" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">开始时间</label>
          <input v-model="proj.startDate" type="month" :class="inputCls" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">结束时间</label>
          <input v-model="proj.endDate" type="month" :class="inputCls" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">技术栈</label>
        <input v-model="proj.tech" :class="inputCls" placeholder="Vue3, TypeScript, Node.js" />
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">项目链接（选填）</label>
        <input v-model="proj.url" :class="inputCls" placeholder="github.com/xxx/project" />
      </div>

      <!-- Description -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs font-medium text-gray-600">项目描述</label>
          <div class="flex items-center gap-2">
            <button @click="toggleHint(proj.id)"
              class="text-xs text-blue-400 hover:text-blue-600 transition-colors">
              💡 写作建议
            </button>
            <button @click="autoBullet(proj)"
              class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="自动为每行加 • 前缀">
              一键加•
            </button>
            <span class="text-xs" :class="proj.description.length < 50 ? 'text-amber-400' : 'text-gray-400'">
              {{ proj.description.length }}字{{ proj.description.length < 50 ? '（偏少）' : '' }}
            </span>
          </div>
        </div>

        <div v-if="showHint[proj.id]"
          class="mb-2 p-3 rounded-lg text-xs text-gray-500 leading-relaxed"
          style="background:#eff6ff;border:1px solid #dbeafe;">
          <p class="font-medium text-blue-600 mb-1">参考格式：</p>
          <p>• 独立完成[功能]，使用[技术]，解决了[问题]</p>
          <p>• 实现[特性]，提升用户体验，上线后[数据结果]</p>
          <p>• 项目获得[成果]：Star数/用户数/好评率等</p>
        </div>

        <textarea v-model="proj.description" rows="4" :class="inputCls" style="resize:vertical"
          placeholder="• 独立设计并开发核心功能模块&#10;• 实现XX特性，用户体验显著提升&#10;• 上线后获得1000+用户使用，GitHub 200+ Star" />
      </div>

      <div class="flex items-center gap-2">
        <template v-if="deletePending === proj.id">
          <span class="text-xs text-red-500">确认删除？</span>
          <button @click="store.removeProject(proj.id)"
            class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">删除</button>
          <button @click="cancelDelete()"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors">取消</button>
        </template>
        <button v-else @click="askDelete(proj.id)"
          class="text-xs text-red-400 hover:text-red-600 transition-colors">
          删除此条
        </button>
      </div>
    </div>

    <button @click="store.addProject()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加项目经历
    </button>
  </div>
</template>
