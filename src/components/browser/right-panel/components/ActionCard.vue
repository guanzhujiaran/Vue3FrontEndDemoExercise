<template>
  <div class="action-card rounded-lg border border-[var(--el-border-color-lighter)] overflow-hidden transition-all"
    :class="cardClasses">

    <!-- 头部 -->
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-light)]">
      <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0" :class="categoryBgClass">
        <component :is="categoryIcon" :size="16" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-semibold truncate">{{ action.name }}</span>
          <el-tag size="small" type="info" effect="plain" class="shrink-0 !text-[12px]">{{ action.id }}</el-tag>
          <el-tag v-if="action.category" size="small" effect="plain" :class="categoryTagClass" class="!text-[10px]">{{ categoryLabel }}</el-tag>
        </div>
        <p v-if="action.description" class="text-[11px] text-[var(--el-text-color-secondary)] m-0 mt-0.5 truncate italic">{{ action.description }}</p>
      </div>

      <!-- 执行按钮（仅 compact=false 时显示） -->
      <el-button
        v-if="!compact && canExecute"
        type="primary"
        size="small"
        :loading="executing"
        :disabled="disabledExecute"
        @click="$emit('execute')"
      >
        <el-icon><VideoPlay /></el-icon> {{ executing ? '执行中...' : '执行' }}
      </el-button>

      <!-- 状态指示器 -->
      <div v-else-if="executionStatus" class="w-2 h-2 rounded-full shrink-0" :class="statusDotClass" />
    </div>

    <!-- 参数区域 -->
    <div v-if="hasParams" class="p-3 space-y-1">
      <div class="flex items-center justify-between mb-1">
        <label class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
          <el-icon :size="13"><Setting /></el-icon> 参数配置
          <el-tag v-if="requiredCount > 0" size="small" type="danger" effect="plain" class="!py-0 !px-1 !h-4 !text-[10px]">
            {{ requiredCount }} 必填
          </el-tag>
        </label>
        <el-button v-if="!compact && hasCustomValues" size="small" text @click="$emit('reset')">
          <el-icon><RefreshRight /></el-icon> 重置
        </el-button>
      </div>

      <el-form label-position="top" size="default" class="space-y-2">
        <ActionParamEditor
          v-for="param in action.parameters"
          :key="param.name"
          :param="param"
          :model-value="localParams[param.name]"
          :error="validationErrors[param.name]"
          @update:model-value="updateParam(param.name, $event)"
          @blur="(name: string) => $emit('validate', name)"
          @pick-selector="$emit('pick-selector', param.name)"
        />
      </el-form>
    </div>

    <!-- 无参数提示 -->
    <div v-else class="p-4 text-center text-xs text-[var(--el-text-color-placeholder)]">
      此操作无需参数
      <el-button v-if="!compact && canExecute" type="primary" size="small" class="ml-2 mt-1" :loading="executing" :disabled="disabledExecute" @click="$emit('execute')">
        <el-icon><VideoPlay /></el-icon> 直接执行
      </el-button>
    </div>

    <!-- 执行结果区域 (非紧凑模式) -->
    <div v-if="!compact && executionResult" class="mx-3 mb-3 mt-1 p-2.5 rounded-md border transition-colors" :class="resultBorderClass">
      <div class="flex items-center gap-2 mb-1.5">
        <div class="w-2 h-2 rounded-full shrink-0" :class="statusDotClass" />
        <span class="text-xs font-medium" :class="statusTextClass">{{ statusLabel }}</span>
        <span v-if="executionResult.duration > 0" class="ml-auto text-[10px] text-[var(--el-text-color-placeholder)] font-mono">
          {{ executionResult.duration }}ms
        </span>
      </div>

      <div v-if="executionResult.error" class="text-xs break-all" :class="statusTextClass === 'text-red-600' ? '' : 'text-red-500'" style="background: var(--el-color-danger-light-9, #fef0f0); padding: 4px 8px; border-radius: 4px;">
        {{ executionResult.error }}
      </div>

      <details v-if="executionResult.result !== undefined && executionResult.result !== null" class="group mt-1.5">
        <summary class="text-xs text-[var(--el-text-color-secondary)] cursor-pointer hover:text-primary select-none">
          返回数据
        </summary>
        <pre class="mt-1.5 text-[13px] bg-[var(--el-fill-color-light)] rounded p-2 overflow-x-auto max-h-36 overflow-y-auto whitespace-pre-wrap break-all font-mono">{{ JSON.stringify(executionResult.result, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  VideoPlay, Setting, RefreshRight,
  Aim, Pointer, Link, Position, EditPen, Mouse, Timer,
  Monitor, DocumentCopy, Switch, Download, ArrowLeft, MoreFilled
} from '@element-plus/icons-vue'
import ActionParamEditor from './ActionParamEditor.vue'
import type { ParamDef } from './ActionParamEditor.vue'

export interface ActionDef {
  id: string
  name: string
  description?: string
  category?: 'navigation' | 'interaction' | 'control_flow' | 'data' | 'utility'
  parameters?: ParamDef[]
}

export interface ExecutionResult {
  success: boolean | null
  error?: string
  result?: any
  duration: number
}

const props = withDefaults(defineProps<{
  action: ActionDef
  params?: Record<string, any>
  validationErrors?: Record<string, string>
  executing?: boolean
  disabledExecute?: boolean
  canExecute?: boolean
  executionResult?: ExecutionResult | null
  compact?: boolean
}>(), {
  params: () => ({}),
  validationErrors: () => ({}),
  executing: false,
  disabledExecute: false,
  canExecute: true,
  executionResult: null,
  compact: false
})

const emit = defineEmits<{
  'update:params': [params: Record<string, any>]
  execute: []
  reset: []
  validate: [name: string]
  'pick-selector': [name: string]
}>()

const localParams = reactive<Record<string, any>>({ ...props.params })

watch(() => props.params, (newVal) => {
  Object.keys(localParams).forEach(k => delete localParams[k])
  Object.assign(localParams, newVal)
}, { deep: true })

const actionParameters = computed(() => props.action.parameters || [])
const hasParams = computed(() => actionParameters.value.length > 0)
const requiredCount = computed(() => actionParameters.value.filter(p => p.required).length)

function updateParam(name: string, value: any): void {
  localParams[name] = value
  emit('update:params', { ...localParams })
}

const hasCustomValues = computed(() => {
  return actionParameters.value.some(p => {
    const val = localParams[p.name]
    const def = p.default
    return JSON.stringify(val) !== JSON.stringify(def ?? '')
  })
})

// ========== 分类图标/颜色 ==========
const categoryIconMap: Record<string, any> = {
  navigation: Position,
  interaction: Mouse,
  control_flow: Switch,
  data: DocumentCopy,
  utility: Monitor
}
const defaultIcon = MoreFilled

const categoryIcon = computed(() => categoryIconMap[props.action.category || ''] || defaultIcon)

const categoryColorMap: Record<string, { bg: string; tag: string; label: string }> = {
  navigation: { bg: 'bg-blue-100', tag: '!text-blue-600 !border-blue-200', label: '导航' },
  interaction: { bg: 'bg-green-100', tag: '!text-green-600 !border-green-200', label: '交互' },
  control_flow: { bg: 'bg-orange-100', tag: '!text-orange-600 !border-orange-200', label: '控制流' },
  data: { bg: 'bg-purple-100', tag: '!text-purple-600 !border-purple-200', label: '数据' },
  utility: { bg: 'bg-gray-100', tag: '!text-gray-600 !border-gray-200', label: '工具' }
}

const categoryInfo = computed(() => categoryColorMap[props.action.category || ''] || { bg: 'bg-gray-100', tag: '', label: '' })
const categoryBgClass = computed(() => categoryInfo.value.bg)
const categoryTagClass = computed(() => categoryInfo.value.tag)
const categoryLabel = computed(() => categoryInfo.value.label)

// ========== 卡片样式 ==========
const cardClasses = computed(() => {
  if (props.compact) return ''
  if (!props.executionResult) return ''
  if (props.executing) return 'ring-2 ring-blue-300 ring-offset-1'
  if (props.executionResult.success === true) return 'border-green-300'
  if (props.executionResult.success === false) return 'border-red-300'
  return ''
})

// ========== 状态展示 ==========
const executionStatus = computed(() => {
  if (props.executing) return 'running'
  if (!props.executionResult) return null
  if (props.executionResult.success === true) return 'success'
  if (props.executionResult.success === false) return 'failed'
  return null
})

const statusDotClass = computed(() => ({
  'bg-blue-500 animate-pulse': props.executing,
  'bg-green-500': props.executionResult?.success === true && !props.executing,
  'bg-red-500': props.executionResult?.success === false && !props.executing
}))

const statusTextClass = computed(() => ({
  'text-blue-600': props.executing,
  'text-green-600': props.executionResult?.success === true && !props.executing,
  'text-red-600': props.executionResult?.success === false && !props.executing
}))

const resultBorderClass = computed(() => {
  if (props.executionResult?.success === true) return 'border-green-200 bg-green-50/40'
  if (props.executionResult?.success === false) return 'border-red-200 bg-red-50/40'
  return 'border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-light)]'
})

const statusLabel = computed(() => {
  if (props.executing) return '执行中...'
  if (props.executionResult?.success === true) return '执行成功'
  if (props.executionResult?.success === false) return '执行失败'
  return ''
})
</script>

<style scoped>
.action-card {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
