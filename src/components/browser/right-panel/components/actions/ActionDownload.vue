<template>
  <div class="action-download" :class="{ compact }">
    <div class="action-header bg-blue-600 text-white px-3 py-2 rounded-t-lg flex items-center gap-2">
      <span class="text-lg">📥</span>
      <span class="font-semibold text-sm">下载 / Download</span>
    </div>
    <div class="action-body border border-t-0 border-blue-200 rounded-b-lg p-3 space-y-3">
      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          下载地址 (URL) <span class="text-red-500">*</span>
        </label>
        <el-input
          v-model="localParams.url"
          placeholder="https://example.com/file.zip"
          :disabled="disabled"
          clearable
          size="small"
        >
          <template #prefix>
            <span class="text-gray-400 text-xs">🔗</span>
          </template>
        </el-input>
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">文件名</label>
        <el-input
          v-model="localParams.filename"
          placeholder="例如: report.pdf"
          :disabled="disabled"
          clearable
          size="small"
        >
          <template #prefix>
            <span class="text-gray-400 text-xs">📄</span>
          </template>
        </el-input>
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">保存路径</label>
        <el-input
          v-model="localParams.save_as"
          placeholder="例如: C:/Downloads/file.zip"
          :disabled="disabled"
          clearable
          size="small"
        >
          <template #prefix>
            <span class="text-gray-400 text-xs">📁</span>
          </template>
        </el-input>
      </div>

      <el-button
        type="primary"
        size="small"
        :loading="executing"
        :disabled="disabled || !localParams.url"
        @click="$emit('execute')"
        class="w-full !bg-blue-600 hover:!bg-blue-700"
      >
        {{ executing ? '下载中...' : '开始下载' }}
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
.action-download {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.action-download.compact .form-item {
  margin-bottom: 8px;
}
.action-download.compact .form-item:last-of-type {
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
