<template>
  <div class="flex flex-col gap-3 h-full">
    <div class="flex items-center justify-between pb-2 border-b border-[var(--el-border-color-lighter)]">
      <span class="text-sm font-medium flex items-center gap-1.5">
        <el-icon><Document /></el-icon>
        操作日志
      </span>
      <el-button size="small" text @click="clearLogs">
        清空
      </el-button>
    </div>

    <div ref="logContainer" class="flex-1 overflow-y-auto space-y-1 text-xs">
      <div
        v-for="(log, index) in logs"
        :key="index"
        :class="[
          'flex gap-2 p-2 rounded',
          getLogClass(log.type)
        ]"
      >
        <span class="text-[var(--el-text-color-placeholder)] shrink-0">{{ log.time }}</span>
        <span :class="getLogTextClass(log.type)">{{ log.message }}</span>
      </div>
      <div v-if="logs.length === 0" class="text-center py-4 text-[var(--el-text-color-placeholder)]">
        暂无日志
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Document } from '@element-plus/icons-vue'

const logs = ref<Array<{
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'debug'
  time: string
}>>([])

const logContainer = ref<HTMLElement | null>(null)

const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.push({ message, type, time })
  
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

const clearLogs = () => {
  logs.value = []
}

const getLogClass = (type: string) => {
  const classMap: Record<string, string> = {
    info: 'bg-blue-50',
    success: 'bg-green-50',
    warning: 'bg-yellow-50',
    error: 'bg-red-50',
    debug: 'bg-gray-50'
  }
  return classMap[type] || 'bg-gray-50'
}

const getLogTextClass = (type: string) => {
  const classMap: Record<string, string> = {
    info: 'text-blue-700',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
    debug: 'text-gray-600'
  }
  return classMap[type] || 'text-gray-700'
}

defineExpose({ addLog, clearLogs })
</script>