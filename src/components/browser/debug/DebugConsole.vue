<template>
  <div class="debug-console flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
    <!-- 控制台头部 -->
    <div class="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
      <span class="text-xs font-medium text-[#cccccc]">调试控制台</span>
      <div class="flex items-center gap-2">
        <el-button size="small" text :class="{ 'text-primary': filterLevel === 'all' }" @click="filterLevel = 'all'">全部</el-button>
        <el-button size="small" text class="text-green-400" :class="{ 'opacity-100': filterLevel === 'info', 'opacity-50': filterLevel !== 'info' && filterLevel !== 'all' }" @click="filterLevel = filterLevel === 'info' ? 'all' : 'info'">Info</el-button>
        <el-button size="small" text class="text-yellow-400" :class="{ 'opacity-100': filterLevel === 'warn', 'opacity-50': filterLevel !== 'warn' && filterLevel !== 'all' }" @click="filterLevel = filterLevel === 'warn' ? 'all' : 'warn'">Warn</el-button>
        <el-button size="small" text class="text-red-400" :class="{ 'opacity-100': filterLevel === 'error', 'opacity-50': filterLevel !== 'error' && filterLevel !== 'all' }" @click="filterLevel = filterLevel === 'error' ? 'all' : 'error'">Error</el-button>
        <el-button size="small" text class="text-purple-400" :class="{ 'opacity-100': filterLevel === 'plugin', 'opacity-50': filterLevel !== 'plugin' && filterLevel !== 'all' }" @click="filterLevel = filterLevel === 'plugin' ? 'all' : 'plugin'">Plugin</el-button>
        <el-divider direction="vertical" />
        <el-button size="small" text @click="clearLogs"><el-icon><Delete /></el-icon></el-button>
      </div>
    </div>

    <!-- 日志列表 -->
    <div ref="logContainerRef" class="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs" @scroll="handleScroll">
      <div
        v-for="(log, index) in filteredLogs"
        :key="index"
        class="log-item flex gap-2 px-2 py-1 rounded hover:bg-[#2a2a2a] transition-colors group"
        :class="getLogClass(log.level)"
      >
        <!-- 时间戳 -->
        <span class="text-[#6a9955] shrink-0 w-20">{{ formatTime(log.timestamp) }}</span>

        <!-- 级别标签 -->
        <span
          class="shrink-0 w-12 text-center font-bold uppercase text-[10px]"
          :class="{
            'text-green-400': log.level === 'info',
            'text-yellow-400': log.level === 'warn',
            'text-red-400': log.level === 'error',
            'text-purple-400': log.level === 'plugin',
            'text-gray-400': log.level === 'debug'
          }"
        >
          {{ log.level }}
        </span>

        <!-- 来源（插件名称） -->
        <span v-if="log.source" class="text-purple-300 shrink-0 max-w-[120px] truncate">[{{ log.source }}]</span>

        <!-- 消息内容 -->
        <span class="flex-1 break-all" :class="getMessageColor(log.level)">{{ log.message }}</span>
      </div>

      <div v-if="filteredLogs.length === 0" class="flex flex-col items-center justify-center h-full text-[#6a6a6a]">
        <el-icon :size="32"><Document /></el-icon>
        <span class="mt-2">暂无日志</span>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-t border-[#3c3c3c] text-xs text-[#858585] shrink-0">
      <span>{{ filteredLogs.length }} 条日志</span>
      <div class="flex items-center gap-4">
        <span v-if="errorCount > 0" class="text-red-400">{{ errorCount }} 错误</span>
        <span v-if="pluginCount > 0" class="text-purple-400">{{ pluginCount }} 插件</span>
        <span>自动滚动: {{ autoScroll ? '开' : '关' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Delete, Document } from '@element-plus/icons-vue'

export interface DebugLog {
  level: 'info' | 'warn' | 'error' | 'debug' | 'plugin'
  message: string
  timestamp: number
  source?: string
}

const props = defineProps<{
  logs?: DebugLog[]
}>()

const emit = defineEmits<{
  clear: []
}>()

const logContainerRef = ref<HTMLElement | null>(null)
const filterLevel = ref<'all' | 'info' | 'warn' | 'error' | 'plugin'>('all')
const autoScroll = ref(true)

const logs = computed(() => props.logs || [])

const filteredLogs = computed(() => {
  if (filterLevel.value === 'all') return logs.value
  return logs.value.filter(l => l.level === filterLevel.value)
})

const errorCount = computed(() => logs.value.filter(l => l.level === 'error').length)
const pluginCount = computed(() => logs.value.filter(l => l.level === 'plugin').length)

watch(() => logs.value.length, () => {
  if (autoScroll.value) {
    nextTick(() => scrollToBottom())
  }
})

const getLogClass = (level: string) => ({
  'border-l-2 border-green-500': level === 'info',
  'border-l-2 border-yellow-500': level === 'warn',
  'border-l-2 border-red-500': level === 'error',
  'border-l-2 border-purple-500': level === 'plugin',
  'border-l-2 border-gray-500': level === 'debug'
})

const getMessageColor = (level: string) => ({
  'text-[#dcdcaa]': level === 'info',
  'text-[#dcdcaa]': level === 'warn',
  'text-[#f14c4c]': level === 'error',
  'text-[#c586c0]': level === 'plugin',
  'text-[#9cdcfe]': level === 'debug'
})

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0')
}

const scrollToBottom = () => {
  if (logContainerRef.value) {
    logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
  }
}

const handleScroll = () => {
  if (!logContainerRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = logContainerRef.value
  autoScroll.value = scrollHeight - scrollTop - clientHeight < 50
}

const clearLogs = () => {
  emit('clear')
}

defineExpose({ scrollToBottom })
</script>

<style scoped>
.debug-console {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
.log-item {
  animation: fadeIn 0.15s ease-in;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>