<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\workflow\ExecutionLogsPanel.vue
 * @Description: 执行日志面板 - 实时展示 logs、时间线、错误信息
-->
<template>
  <div class="text-primary">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">执行日志</span>
        <el-tag v-if="totalSteps > 0" size="small" :type="allSuccess ? 'success' : hasErrors ? 'danger' : 'info'" effect="plain">
          {{ successCount }}/{{ totalSteps }} 成功
        </el-tag>
      </div>
      <div class="flex gap-1">
        <el-button size="small" text :icon="Top" :disabled="!hasPrev" @click="$emit('prev')" />
        <el-button size="small" text :icon="Bottom" :disabled="!hasNext" @click="$emit('next')" />
        <el-button size="small" text :icon="Delete" @click="clearLogs" />
      </div>
    </div>

    <div v-if="results.length === 0" class="flex flex-col items-center justify-center py-12 text-[var(--el-text-color-placeholder)]">
      <el-icon :size="36"><List /></el-icon>
      <p class="mt-2 text-xs">暂无执行日志</p>
      <p class="text-[10px]">执行工作流后将显示详细日志</p>
    </div>

    <div v-else class="space-y-3 max-h-96 overflow-y-auto pr-1">
      <div
        v-for="(result, index) in results"
        :key="index"
        :class="[
          'rounded-lg border p-3 transition-all',
          result.success
            ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10'
            : 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10'
        ]"
      >
        <div class="flex items-center gap-2 mb-2">
          <el-icon :size="16" :class="result.success ? 'text-green-500' : 'text-red-500'">
            <component :is="result.success ? 'CircleCheck' : 'CircleClose'" />
          </el-icon>
          <span class="text-sm font-medium">{{ result.action_name || result.action_id || `步骤 ${index + 1}` }}</span>
          <el-tag v-if="result.action_id" size="small" type="info" effect="plain" class="shrink-0">
            {{ result.action_id }}
          </el-tag>

          <!-- 控制流执行信息标签 -->
          <template v-if="hasControlFlowInfo(result)">
            <el-tag
              v-if="result.loop_index != null && result.loop_total != null"
              size="small"
              type="warning"
              effect="plain"
              round
              class="shrink-0 !text-[10px]"
            >
              🔄 {{ result.loop_index }}/{{ result.loop_total }}
            </el-tag>
            <el-tag
              v-if="result.condition_result !== undefined"
              size="small"
              :type="result.condition_result ? 'success' : 'danger'"
              effect="plain"
              round
              class="shrink-0 !text-[10px]"
            >
              {{ result.condition_result ? '✓ 条件成立' : '✗ 条件不成立' }}
            </el-tag>
            <el-tag
              v-if="result.retry_count != null && result.retry_max != null"
              size="small"
              :type="result.retry_count > 0 ? 'warning' : 'info'"
              effect="plain"
              round
              class="shrink-0 !text-[10px]"
            >
              ↻ 重试 {{ result.retry_count }}/{{ result.retry_max }}
            </el-tag>
          </template>

          <span v-if="result.execution_time" class="ml-auto text-xs text-[var(--el-text-color-secondary)]">
            {{ result.execution_time.toFixed(2) }}s
          </span>
        </div>

        <div v-if="result.logs && result.logs.length > 0" class="rounded p-2">
          <div class="text-[10px] text-[var(--el-text-color-secondary)] mb-1.5 flex items-center gap-1">
            <el-icon><Timer /></el-icon>
            <span>执行轨迹</span>
          </div>
          <div class="space-y-0.5">
            <div
              v-for="(log, logIndex) in result.logs"
              :key="logIndex"
              :class="[
                'text-xs font-mono px-2 py-0.5 rounded',
                getLogClass(log, logIndex === result.logs.length - 1)
              ]"
            >
              <span class="text-[var(--el-text-color-secondary)] mr-2">{{ logIndex + 1 }}</span>
              <span :class="getLogTextClass(log)">{{ log }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.error" class="mt-2">
          <div class="text-[10px] text-red-500 mb-1 flex items-center gap-1">
            <el-icon><Warning /></el-icon>
            <span>错误信息</span>
          </div>
          <div class="text-xs text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-950/30 rounded px-2 py-1.5 font-mono">
            {{ result.error }}
          </div>
        </div>

        <div v-if="result.data !== undefined && result.data !== null" class="mt-2">
          <el-popover placement="bottom" :width="320" trigger="click">
            <template #reference>
              <el-button size="small" text type="primary" :icon="DataAnalysis">
                查看返回值 ({{ formatDataType(result.data) }})
              </el-button>
            </template>
            <div class="max-h-64 overflow-auto">
              <pre class="text-xs font-mono whitespace-pre-wrap break-all">{{ formatData(result.data) }}</pre>
            </div>
          </el-popover>
        </div>
      </div>
    </div>

    <div v-if="totalTime > 0" class="mt-3 pt-3 border-t border-[var(--el-border-color-lighter)] flex items-center justify-between text-xs text-[var(--el-text-color-secondary)]">
      <span>总耗时</span>
      <span class="font-mono">{{ totalTime.toFixed(2) }}s</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { List, Delete, Timer, Warning, Top, Bottom, CircleCheck, CircleClose, DataAnalysis } from '@element-plus/icons-vue'
import type { StepExecutionResult } from '@/types/browser-automation-api'

const props = defineProps<{
  results: StepExecutionResult[]
  hasPrev?: boolean
  hasNext?: boolean
}>()

defineEmits<{
  prev: []
  next: []
  clear: []
}>()

const totalSteps = computed(() => props.results.length)
const successCount = computed(() => props.results.filter(r => r.success).length)
const allSuccess = computed(() => totalSteps.value > 0 && successCount.value === totalSteps.value)
const hasErrors = computed(() => successCount.value < totalSteps.value && successCount.value > 0)
const totalTime = computed(() =>
  props.results.reduce((sum, r) => sum + (r.execution_time || 0), 0)
)

// 检查是否有控制流执行信息
const hasControlFlowInfo = (result: StepExecutionResult): boolean => {
  return !!(
    (result.loop_index != null && result.loop_total != null) ||
    result.condition_result !== undefined ||
    (result.retry_count != null && result.retry_max != null)
  )
}

const getLogClass = (log: string, isLast: boolean): string => {
  if (isLast) {
    if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')) {
      return 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300'
    }
    if (log.toLowerCase().includes('success') || log.toLowerCase().includes('completed')) {
      return 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300'
    }
  }
  if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed') || log.toLowerCase().includes('exception')) {
    return 'text-red-600 dark:text-red-400'
  }
  if (log.toLowerCase().includes('warn')) {
    return 'text-amber-600 dark:text-amber-400'
  }
  return 'text-[var(--el-text-color-primary)]'
}

const getLogTextClass = (log: string): string => {
  if (log.toLowerCase().includes('error') || log.toLowerCase().includes('exception')) {
    return 'text-red-600 dark:text-red-400'
  }
  if (log.toLowerCase().includes('warn')) {
    return 'text-amber-600 dark:text-amber-400'
  }
  return ''
}

const formatDataType = (data: any): string => {
  if (data === null) return 'null'
  if (data === undefined) return 'undefined'
  if (Array.isArray(data)) return `Array(${data.length})`
  if (typeof data === 'object') return 'Object'
  if (typeof data === 'string') return `String(${data.length})`
  if (typeof data === 'number') return 'Number'
  return typeof data
}

const formatData = (data: any): string => {
  try {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return data
      }
    }
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

const clearLogs = () => {
  // emit('clear')
}
</script>