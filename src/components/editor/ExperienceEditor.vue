<script setup lang="ts">
import { ref } from 'vue'
import { useResumeStore } from '../../stores/resume'

const store = useResumeStore()
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400'

// Hint toggle per item (keyed by id)
const showHint = ref<Record<string, boolean>>({})

function toggleHint(id: string) {
  showHint.value[id] = !showHint.value[id]
}

// Auto-prefix each non-empty line with "•" if not already
function autoBullet(exp: { description: string }) {
  exp.description = exp.description
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
    <div v-for="exp in store.data.experience" :key="exp.id"
      class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">公司名称</label>
          <input v-model="exp.company" :class="inputCls" placeholder="某科技有限公司" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">职位</label>
          <input v-model="exp.position" :class="inputCls" placeholder="前端开发工程师" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">开始时间</label>
          <input v-model="exp.startDate" type="month" :class="inputCls" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">结束时间</label>
          <input v-model="exp.endDate" type="month" :disabled="exp.current" :class="inputCls" />
        </div>
        <div class="flex items-end pb-1">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" v-model="exp.current" class="rounded" />
            <span class="text-xs text-gray-600">在职中</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">城市</label>
        <input v-model="exp.location" :class="inputCls" placeholder="北京" />
      </div>

      <!-- Description -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs font-medium text-gray-600">工作描述</label>
          <div class="flex items-center gap-2">
            <button @click="toggleHint(exp.id)"
              class="text-xs text-blue-400 hover:text-blue-600 transition-colors">
              💡 写作建议
            </button>
            <button @click="autoBullet(exp)"
              class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="自动为每行加 • 前缀">
              一键加•
            </button>
            <span class="text-xs" :class="exp.description.length < 50 ? 'text-amber-400' : 'text-gray-400'">
              {{ exp.description.length }}字{{ exp.description.length < 50 ? '（偏少）' : '' }}
            </span>
          </div>
        </div>

        <!-- Writing hint -->
        <div v-if="showHint[exp.id]"
          class="mb-2 p-3 rounded-lg text-xs text-gray-500 leading-relaxed"
          style="background:#eff6ff;border:1px solid #dbeafe;">
          <p class="font-medium text-blue-600 mb-1">参考格式（量化成果更有说服力）：</p>
          <p>• 负责[系统/功能]的开发，使用[技术]，实现[目标]</p>
          <p>• 优化[问题]，将[指标]从X提升至Y，提升率Z%</p>
          <p>• 主导[项目]，协调N人团队，X周内按时交付</p>
        </div>

        <textarea v-model="exp.description" rows="4" :class="inputCls" style="resize:vertical"
          placeholder="• 负责核心模块的设计与开发&#10;• 优化性能，将加载时间从Xs降至Ys&#10;• 主导推进XX项目，按时交付并获得好评" />
      </div>

      <button @click="store.removeExperience(exp.id)"
        class="text-xs text-red-400 hover:text-red-600 transition-colors">
        删除此条
      </button>
    </div>

    <button @click="store.addExperience()"
      class="w-full py-2 text-sm text-blue-500 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
      + 添加工作经历
    </button>
  </div>
</template>
