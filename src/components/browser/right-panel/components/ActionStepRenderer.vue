<template>
  <div class="action-step-renderer">
    <DynamicActionForm
      :key="actionId"
      :action-id="actionId"
      :params="modelValue"
      :parameters="actionParameters"
      :errors="validationErrors"
      :disabled="disabled"
      :compact="compact"
      :raw-action="currentAction"
      @update:params="$emit('update:modelValue', $event)"
      @validate="$emit('validate', $event)"
      @pick-selector="$emit('pick-selector', $event)"
    />

    <div v-if="executionResult" class="mt-3 p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs overflow-auto">
      <div v-if="isScreenshotResult" class="flex flex-col items-center gap-2">
        <el-image
          :src="screenshotDataUrl"
          :preview-src-list="[screenshotDataUrl]"
          :initial-index="0"
          fit="contain"
          class="rounded border border-gray-200 dark:border-gray-700 shadow-sm cursor-zoom-in max-w-full"
        />
        <div class="text-[10px] text-gray-500 text-center">
          {{ screenshotFormat?.toUpperCase() }} · {{ formatFileSize(screenshotSize) }} · {{ executionResult.duration }}ms
        </div>
      </div>
      <pre v-else class="whitespace-pre-wrap font-mono">{{ JSON.stringify(executionResult, null, 2) }}</pre>
    </div>

    <el-button
      type="primary"
      :loading="executing"
      :disabled="disabled"
      @click="$emit('execute')"
      class="w-full mt-3"
      size="default"
    >
      {{ executing ? '执行中...' : `执行 ${currentActionName}` }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import DynamicActionForm from './DynamicActionForm.vue'

const props = withDefaults(defineProps<{
  actionId: string
  modelValue: Record<string, any>
  disabled?: boolean
  compact?: boolean
  executionResult?: { success: boolean | null; error?: string; result?: any; duration: number } | null
  executing?: boolean
  validationErrors?: Record<string, string>
}>(), {
  disabled: false,
  compact: false,
  executionResult: null,
  executing: false,
  validationErrors: () => ({})
})

defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  execute: []
  validate: [name: string]
  'pick-selector': [name: string]
}>()

const registeredActions = inject<Ref<any[]>>('registeredActions', { value: [] })

const currentAction = computed(() => {
  return registeredActions.value.find((a: any) => a.action_id === props.actionId)
})

const currentActionName = computed(() => {
  return currentAction?.value?.name || props.actionId
})

const actionParameters = computed(() => {
  const params = currentAction?.value?.parameters
  if (!params || !Array.isArray(params) || params.length === 0) {
    return []
  }
  return params
})

const isScreenshotResult = computed(() => {
  return props.actionId === 'screenshot' && !!props.executionResult?.result?.base64
})

const screenshotDataUrl = computed(() => {
  const result = props.executionResult?.result
  if (!result?.base64) return ''
  const fmt = (result.format || 'png').toLowerCase()
  return `data:image/${fmt === 'jpeg' ? 'jpeg' : 'png'};base64,${result.base64}`
})

const screenshotFormat = computed(() => {
  return props.executionResult?.result?.format || 'png'
})

const screenshotSize = computed(() => {
  return props.executionResult?.result?.size || 0
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
</script>