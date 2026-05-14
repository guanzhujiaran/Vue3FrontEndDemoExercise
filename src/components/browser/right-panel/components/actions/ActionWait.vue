<template>
  <div class="action-wait" :class="{ compact }">
    <div class="action-header bg-orange-500 text-white px-3 py-2 rounded-t-lg flex items-center gap-2">
      <span class="text-lg">⏱️</span>
      <span class="font-semibold text-sm">等待 / Wait</span>
    </div>
    <div class="action-body border border-t-0 border-orange-200 rounded-b-lg p-3 space-y-3">
      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          等待时间 (ms) <span class="text-red-500">*</span>
        </label>
        <div class="flex items-center gap-2 flex-wrap">
          <el-input-number
            v-model="localParams.time"
            :min="0"
            :step="100"
            :disabled="disabled"
            :controls="true"
            size="small"
            class="flex-1 min-w-[120px]"
          />
          <div v-if="!compact" class="flex gap-1">
            <el-button size="small" @click="setTime(500)">500ms</el-button>
            <el-button size="small" @click="setTime(1000)">1s</el-button>
            <el-button size="small" @click="setTime(2000)">2s</el-button>
            <el-button size="small" @click="setTime(5000)">5s</el-button>
          </div>
        </div>
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          条件表达式 (可选)
        </label>
        <el-input
          v-model="localParams.condition"
          placeholder="例如: document.readyState === 'complete'"
          :disabled="disabled"
          clearable
          size="small"
        />
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          等待直到条件 (可选)
        </label>
        <el-input
          v-model="localParams.wait_until"
          placeholder="例如: load, domcontentloaded, networkidle"
          :disabled="disabled"
          clearable
          size="small"
        />
      </div>

      <el-button
        type="primary"
        size="small"
        :loading="executing"
        :disabled="disabled || !localParams.time"
        @click="$emit('execute')"
        class="w-full"
      >
        {{ executing ? '等待中...' : '执行等待' }}
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
import { ElInputNumber, ElInput, ElButton } from 'element-plus'

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

function setTime(ms: number) {
  emit('update:params', { ...props.params, time: ms })
}
</script>

<style scoped>
.action-wait {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.action-wait.compact .form-item {
  margin-bottom: 8px;
}
.action-wait.compact .form-item:last-of-type {
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
