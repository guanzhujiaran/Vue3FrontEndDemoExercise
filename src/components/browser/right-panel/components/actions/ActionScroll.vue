<template>
  <div class="action-scroll" :class="{ compact }">
    <div class="action-header bg-cyan-600 text-white px-3 py-2 rounded-t-lg flex items-center gap-2">
      <span class="text-lg">↕️</span>
      <span class="font-semibold text-sm">滚动 / Scroll</span>
    </div>
    <div class="action-body border border-t-0 border-cyan-200 rounded-b-lg p-3 space-y-3">
      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">滚动方向</label>
        <div class="grid grid-cols-4 gap-1">
          <el-button
            size="small"
            :type="localParams.direction === 'up' ? 'primary' : ''"
            @click="setDirection('up')"
            :disabled="disabled"
            class="!m-0"
          >↑ 上</el-button>
          <el-button
            size="small"
            :type="localParams.direction === 'down' ? 'primary' : ''"
            @click="setDirection('down')"
            :disabled="disabled"
            class="!m-0"
          >↓ 下</el-button>
          <el-button
            size="small"
            :type="localParams.direction === 'left' ? 'primary' : ''"
            @click="setDirection('left')"
            :disabled="disabled"
            class="!m-0"
          >← 左</el-button>
          <el-button
            size="small"
            :type="localParams.direction === 'right' ? 'primary' : ''"
            @click="setDirection('right')"
            :disabled="disabled"
            class="!m-0"
          >→ 右</el-button>
        </div>
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          滚动距离 (px)
        </label>
        <el-input-number
          v-model="localParams.distance"
          :min="0"
          :step="50"
          :disabled="disabled"
          controls-position="right"
          size="small"
          class="w-full"
        />
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">元素选择器</label>
        <el-input
          v-model="localParams.selector"
          placeholder="例如: #scroll-container"
          :disabled="disabled"
          clearable
          size="small"
        />
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          精确坐标滚动 (可选)
        </label>
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="block text-[10px] text-gray-400 mb-0.5">X</label>
            <el-input-number
              v-model="localParams.x"
              :disabled="disabled"
              controls-position="right"
              size="small"
              placeholder="X"
              class="w-full"
            />
          </div>
          <div class="flex-1">
            <label class="block text-[10px] text-gray-400 mb-0.5">Y</label>
            <el-input-number
              v-model="localParams.y"
              :disabled="disabled"
              controls-position="right"
              size="small"
              placeholder="Y"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <el-button
        type="primary"
        size="small"
        :loading="executing"
        :disabled="disabled || !localParams.direction"
        @click="$emit('execute')"
        class="w-full !bg-cyan-600 hover:!bg-cyan-700"
      >
        {{ executing ? '滚动中...' : '执行滚动' }}
      </el-button>

      <div v-if="executionResult" class="result-area mt-2 p-2 bg-gray-50 rounded text-xs">
        <div class="text-gray-500 font-medium mb-1">执行结果:</div>
        <pre class="text-green-700 whitespace-pre-wrap break-all">{{ JSON.stringify(executionResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElInputNumber, ElInput } from 'element-plus'

const props = defineProps<{
  params: Record<string, any>
  disabled?: boolean
  compact?: boolean
  executionResult?: object | null
  executing?: boolean
}>()

const emit = defineEmits<{
  'update:params': [value: Record<string, any>]
  execute: []
}>()

const localParams = computed({
  get: () => props.params,
  set: (val) => emit('update:params', val)
})

function setDirection(dir: string) {
  emit('update:params', { ...props.params, direction: dir })
}
</script>

<style scoped>
.action-scroll {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.action-scroll.compact .form-item {
  margin-bottom: 8px;
}
.action-scroll.compact .form-item:last-of-type {
  margin-bottom: 0;
}
.form-item {
  margin-bottom: 12px;
}
.result-area {
  max-height: 120px;
  overflow-y: auto;
}
</style>
