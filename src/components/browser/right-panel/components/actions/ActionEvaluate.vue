<template>
  <div class="action-evaluate" :class="{ compact }">
    <div class="action-header bg-gray-700 text-white px-3 py-2 rounded-t-lg flex items-center gap-2">
      <span class="text-lg">💻</span>
      <span class="font-semibold text-sm">执行JS / Evaluate</span>
    </div>
    <div class="action-body border border-t-0 border-gray-300 rounded-b-lg p-3 space-y-3">
      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          JavaScript 代码 <span class="text-red-500">*</span>
        </label>
        <el-input
          v-model="localParams.code"
          type="textarea"
          :rows="compact ? 3 : 5"
          placeholder="// 在此输入要执行的 JavaScript 代码&#10;document.title = 'Hello';&#10;return document.title;"
          :disabled="disabled"
          resize="vertical"
          class="code-editor"
        />
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          表达式 (可选)
        </label>
        <el-input
          v-model="localParams.expression"
          placeholder="例如: document.querySelector('#app')?.innerText"
          :disabled="disabled"
          clearable
          size="small"
        />
      </div>

      <el-button
        type="primary"
        size="small"
        :loading="executing"
        :disabled="disabled || !localParams.code"
        @click="$emit('execute')"
        class="w-full !bg-gray-700 hover:!bg-gray-800"
      >
        {{ executing ? '执行中...' : '执行代码' }}
      </el-button>

      <div v-if="executionResult" class="result-area mt-2 p-2 bg-gray-900 rounded text-xs">
        <div class="text-gray-400 font-medium mb-1">返回值预览:</div>
        <pre class="text-green-400 whitespace-pre-wrap break-all font-mono">{{ JSON.stringify(executionResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElInput, ElButton } from 'element-plus'

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
</script>

<style scoped>
.action-evaluate {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.action-evaluate.compact .form-item {
  margin-bottom: 8px;
}
.action-evaluate.compact .form-item:last-of-type {
  margin-bottom: 0;
}
.form-item {
  margin-bottom: 12px;
}
.code-editor :deep(textarea) {
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  tab-size: 2;
}
.result-area {
  max-height: 150px;
  overflow-y: auto;
}
</style>
