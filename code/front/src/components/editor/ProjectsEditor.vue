<script setup lang="ts">
import { ref } from 'vue'
import { useResumeStore } from '../../stores/resume'
import { useDeleteConfirm } from '../../composables/useDeleteConfirm'
import { useLocaleText } from '../../composables/useLocaleText'

const store = useResumeStore()
const { pending: deletePending, askDelete, cancelDelete } = useDeleteConfirm()
const { l } = useLocaleText()
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
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('项目名称', 'Project name') }}</label>
          <input v-model="proj.name" :class="inputCls" :placeholder="l('在线简历生成平台', 'Online resume builder')" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('担任角色', 'Role') }}</label>
          <input v-model="proj.role" :class="inputCls" :placeholder="l('前端负责人', 'Frontend lead')" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('开始时间', 'Start date') }}</label>
          <input v-model="proj.startDate" type="month" :class="inputCls" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('结束时间', 'End date') }}</label>
          <input v-model="proj.endDate" type="month" :class="inputCls" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('技术栈', 'Tech stack') }}</label>
        <input v-model="proj.tech" :class="inputCls" placeholder="Vue3, TypeScript, Node.js" />
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ l('项目链接（选填）', 'Project link (optional)') }}</label>
        <input v-model="proj.url" :class="inputCls" placeholder="github.com/xxx/project" />
      </div>

      <!-- Description -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs font-medium text-gray-600">{{ l('项目描述', 'Description') }}</label>
          <div class="flex items-center gap-2">
            <button @click="toggleHint(proj.id)"
              class="text-xs text-blue-400 hover:text-blue-600 transition-colors">
              {{ l('写作建议', 'Writing tips') }}
            </button>
            <button @click="autoBullet(proj)"
              class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              :title="l('自动为每行加 • 前缀', 'Add bullet prefix to each line')">
              {{ l('一键加•', 'Add bullets') }}
            </button>
            <span class="text-xs" :class="proj.description.length < 50 ? 'text-amber-400' : 'text-gray-400'">
              {{ proj.description.length }}{{ l('字', ' chars') }}{{ proj.description.length < 50 ? l('（偏少）', ' (short)') : '' }}
            </span>
          </div>
        </div>

        <div v-if="showHint[proj.id]"
          class="mb-2 p-3 rounded-lg text-xs text-gray-500 leading-relaxed"
          style="background:#eff6ff;border:1px solid #dbeafe;">
          <p class="font-medium text-blue-600 mb-1">{{ l('参考格式：', 'Suggested format:') }}</p>
          <p>{{ l('• 独立完成[功能]，使用[技术]，解决了[问题]', '• Delivered [feature] with [technology] to solve [problem]') }}</p>
          <p>{{ l('• 实现[特性]，提升用户体验，上线后[数据结果]', '• Improved UX with [feature], resulting in [metric]') }}</p>
          <p>{{ l('• 项目获得[成果]：Star数/用户数/好评率等', '• Earned [result]: stars, users, conversion, or satisfaction') }}</p>
        </div>

        <textarea v-model="proj.description" rows="4" :class="inputCls" style="resize:vertical"
          :placeholder="l('• 独立设计并开发核心功能模块\n• 实现XX特性，用户体验显著提升\n• 上线后获得1000+用户使用，GitHub 200+ Star', '• Designed and built a core module\n• Shipped XX feature and improved user experience\n• Reached 1,000+ users and 200+ GitHub stars')" />
      </div>

      <div class="flex items-center gap-2">
        <template v-if="deletePending === proj.id">
          <span class="text-xs text-red-500">{{ l('确认删除？', 'Delete this item?') }}</span>
          <button @click="store.removeProject(proj.id)"
            class="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">{{ l('删除', 'Delete') }}</button>
          <button @click="cancelDelete()"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors">{{ l('取消', 'Cancel') }}</button>
        </template>
        <button v-else @click="askDelete(proj.id)"
          class="text-xs text-red-400 hover:text-red-600 transition-colors">
          {{ l('删除此条', 'Delete item') }}
        </button>
      </div>
    </div>

    <button @click="store.addProject()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      {{ l('+ 添加项目经历', '+ Add project') }}
    </button>
  </div>
</template>
