<template>
  <div class="action-llm" :class="{ compact }">
    <div class="action-header bg-purple-600 text-white px-3 py-2 rounded-t-lg flex items-center gap-2">
      <span class="text-lg">🤖</span>
      <span class="font-semibold text-sm">LLM 调用 / LLM Call</span>
    </div>
    <div class="action-body border border-t-0 border-purple-200 rounded-b-lg p-3 space-y-3">
      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          Prompt <span class="text-red-500">*</span>
        </label>
        <el-input
          v-model="localParams.prompt"
          type="textarea"
          :rows="compact ? 2 : 4"
          placeholder="输入你的提示词..."
          :disabled="disabled"
          resize="vertical"
        />
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">模型选择</label>
        <el-select
          v-model="localParams.model"
          placeholder="选择模型"
          :disabled="disabled"
          size="small"
          class="w-full"
          filterable
          allow-create
        >
          <el-option label="gpt-4o" value="gpt-4o" />
          <el-option label="gpt-4o-mini" value="gpt-4o-mini" />
          <el-option label="gpt-4-turbo" value="gpt-4-turbo" />
          <el-option label="claude-3.5-sonnet" value="claude-3.5-sonnet" />
          <el-option label="claude-3-opus" value="claude-3-opus" />
          <el-option label="gemini-pro" value="gemini-pro" />
        </el-select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="form-item mb-0">
          <label class="block text-xs font-medium text-gray-600 mb-1">
            Temperature: {{ localParams.temperature ?? 0.7 }}
          </label>
          <el-slider
            v-model="localParams.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :disabled="disabled"
            :show-tooltip="true"
            size="small"
          />
        </div>
        <div class="form-item mb-0">
          <label class="block text-xs font-medium text-gray-600 mb-1">Max Tokens</label>
          <el-input-number
            v-model="localParams.max_tokens"
            :min="1"
            :max="128000"
            :step="100"
            :disabled="disabled"
            controls-position="right"
            size="small"
            class="w-full"
          />
        </div>
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          System Prompt (可选)
        </label>
        <el-input
          v-model="localParams.system_prompt"
          type="textarea"
          :rows="compact ? 2 : 3"
          placeholder="系统级指令，定义 AI 的角色和行为..."
          :disabled="disabled"
          resize="vertical"
        />
      </div>

      <el-button
        type="primary"
        size="small"
        :loading="executing"
        :disabled="disabled || !localParams.prompt"
        @click="$emit('execute')"
        class="w-full !bg-purple-600 hover:!bg-purple-700"
      >
        {{ executing ? '调用中...' : '调用 LLM' }}
      </el-button>

      <div v-if="executionResult" class="result-area mt-2 p-2 bg-purple-50 rounded text-xs">
        <div class="text-purple-600 font-medium mb-1">LLM 响应:</div>
        <pre class="text-gray-800 whitespace-pre-wrap break-all">{{ typeof executionResult === 'string' ? executionResult : JSON.stringify(executionResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElInput, ElSelect, ElOption, ElSlider, ElInputNumber, ElButton } from 'element-plus'

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
.action-llm {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.action-llm.compact .form-item {
  margin-bottom: 8px;
}
.action-llm.compact .form-item:last-of-type {
  margin-bottom: 0;
}
.form-item {
  margin-bottom: 12px;
}
.result-area {
  max-height: 200px;
  overflow-y: auto;
}
</style>
