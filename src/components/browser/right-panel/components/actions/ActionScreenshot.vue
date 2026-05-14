<template>
  <div class="action-screenshot" :class="{ compact }">
    <div class="action-header bg-pink-600 text-white px-3 py-2 rounded-t-lg flex items-center gap-2">
      <span class="text-lg">📸</span>
      <span class="font-semibold text-sm">截图 / Screenshot</span>
    </div>
    <div class="action-body border border-t-0 border-pink-200 rounded-b-lg p-3 space-y-3">
      <div class="form-item flex items-center justify-between">
        <label class="text-xs font-medium text-gray-600">全页截图</label>
        <el-switch
          v-model="localParams.full_page"
          :disabled="disabled"
          size="small"
        />
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          元素选择器（可选）
        </label>
        <el-input
          v-model="localParams.selector"
          placeholder="例如: #app, .main-content，留空则全页截图"
          :disabled="disabled"
          clearable
          size="small"
        />
      </div>

      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">图片格式</label>
        <el-radio-group
          v-model="localParams.type"
          :disabled="disabled"
          size="small"
        >
          <el-radio-button value="png">PNG</el-radio-button>
          <el-radio-button value="jpeg">JPEG</el-radio-button>
        </el-radio-group>
      </div>

      <div class="form-item" v-if="localParams.type === 'jpeg' || localParams.type === 'jpg'">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          图片质量: {{ localParams.quality ?? 80 }}%
        </label>
        <div class="flex items-center gap-3">
          <el-slider
            v-model="localParams.quality"
            :min="0"
            :max="100"
            :step="5"
            :disabled="disabled"
            class="flex-1"
          />
          <el-input-number
            v-model="localParams.quality"
            :min="0"
            :max="100"
            :step="5"
            :disabled="disabled"
            size="small"
            :controls="false"
            class="w-[70px]"
          />
        </div>
      </div>

      <el-button
        type="danger"
        size="small"
        :loading="executing"
        :disabled="disabled"
        @click="$emit('execute')"
        class="w-full !bg-pink-600 hover:!bg-pink-700"
      >
        {{ executing ? '截图中...' : '执行截图' }}
      </el-button>

      <div v-if="executionResult && screenshotDataUrl" class="result-area mt-2 p-2 bg-gray-50 rounded border border-gray-200">
        <div class="text-gray-500 font-medium mb-1.5 flex items-center justify-between text-xs">
          <span>执行结果</span>
          <span class="font-normal">{{ screenshotFormat?.toUpperCase() }} · {{ formatFileSize(screenshotSize) }}</span>
        </div>
        <el-image
          :src="screenshotDataUrl"
          :preview-src-list="[screenshotDataUrl]"
          :initial-index="0"
          fit="contain"
          class="w-full rounded border border-gray-300 shadow-sm cursor-zoom-in"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElSwitch, ElInput, ElRadioGroup, ElRadioButton, ElSlider, ElInputNumber, ElButton } from 'element-plus'

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

const resultData = computed(() => {
  if (!props.executionResult) return null
  return (props.executionResult as any)?.result ?? props.executionResult
})

const screenshotDataUrl = computed(() => {
  const data = resultData.value
  if (!data?.base64) return ''
  const fmt = (data.format || 'png').toLowerCase()
  return `data:image/${fmt === 'jpeg' ? 'jpeg' : 'png'};base64,${data.base64}`
})

const screenshotFormat = computed(() => {
  return resultData.value?.format || 'png'
})

const screenshotSize = computed(() => {
  return resultData.value?.size || 0
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
</script>

<style scoped>
.action-screenshot {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.action-screenshot.compact .form-item {
  margin-bottom: 8px;
}
.action-screenshot.compact .form-item:last-of-type {
  margin-bottom: 0;
}
.form-item {
  margin-bottom: 12px;
}
.result-area {
  overflow-y: auto;
}
</style>
