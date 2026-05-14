<template>
  <div class="log-panel flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
    <!-- 日志过滤工具栏 -->
    <div class="toolbar flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
      <div class="flex items-center gap-2">
        <el-radio-group v-model="filterLevel" size="small" class="!bg-transparent">
          <el-radio-button value="all" class="!text-[#858585]">全部</el-radio-button>
          <el-radio-button value="info" class="!text-blue-400">信息</el-radio-button>
          <el-radio-button value="warn" class="!text-yellow-400">警告</el-radio-button>
          <el-radio-button value="error" class="!text-red-400">错误</el-radio-button>
        </el-radio-group>
      </div>

      <div class="flex items-center gap-2">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索日志..."
          size="small"
          clearable
          class="w-32 !bg-transparent"
        />
        <el-divider direction="vertical" class="!border-[#3c3c3c]" />
        <el-button size="small" text :icon="Delete" @click="clearLogs" class="!text-[#858585] hover:!text-white" />
      </div>
    </div>

    <!-- 日志内容区 -->
    <div
      ref="logContainerRef"
      class="log-content flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs"
      @scroll="handleScroll"
    >
      <transition-group name="log-entry">
        <div
          v-for="(log, index) in filteredLogs"
          :key="index"
          class="log-item flex gap-2 px-2 py-1 rounded hover:bg-[#2a2a2a] transition-all group cursor-pointer"
          :class="{ [`border-l-2 ${getLogBorder(log.level)}`]: true }"
          @click="onLogClick(log)"
        >
          <span class="timestamp text-[#6a9955] w-20 shrink-0">{{ formatTime(log.timestamp) }}</span>

          <span
            :class="[`level shrink-0 w-14 text-center font-bold uppercase text-[10px] ${getLogTextClass(log.level)}`]"
          >
            {{ log.level }}
          </span>

          <span v-if="log.source" class="source text-purple-300 shrink-0 max-w-[90px] truncate">
            [{{ log.source }}]
          </span>

          <span :class="[`message flex-1 break-all ${getLogTextColor(log.level)}`]">
            {{ log.message }}
          </span>
        </div>
      </transition-group>

      <!-- 空状态 -->
      <div v-if="filteredLogs.length === 0" class="empty-state flex flex-col items-center justify-center py-8 text-[#4a4a4a]">
        <el-icon :size="24"><Document /></el-icon>
        <span class="mt-2 text-xs">{{ searchKeyword ? '无匹配日志' : '暂无日志输出' }}</span>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar flex items-center justify-between px-3 py-1 bg-[#252526] border-t border-[#3c3c3c] text-[10px] text-[#6a6a6a] shrink-0">
      <div class="flex items-center gap-3">
        <span>{{ filteredLogs.length }} 条</span>
        <span :class="{ 'text-red-400': errorCount > 0 }">{{ errorCount }} 错误</span>
        <span :class="{ 'text-yellow-400': warnCount > 0 }">{{ warnCount }} 警告</span>
      </div>

      <div class="flex items-center gap-3">
        <span>自动滚动: {{ autoScroll ? 'ON' : 'OFF' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Delete, Document } from '@element-plus/icons-vue'

interface LogEntry {
  level: 'info' | 'success' | 'warn' | 'error' | 'plugin'
  message: string
  timestamp: number
  source?: string
}

const props = defineProps<{
  logs: LogEntry[]
  compact?: boolean
}>()

// 状态
const logContainerRef = ref<HTMLElement | null>(null)
const filterLevel = ref<'all' | 'info' | 'warn' | 'error'>('all')
const searchKeyword = ref('')
const autoScroll = ref(true)

// 计算属性
const filteredLogs = computed(() => {
  let result = props.logs

  // 级别过滤
  if (filterLevel.value !== 'all') {
    result = result.filter(l => l.level === filterLevel.value)
  }

  // 关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(l =>
      l.message.toLowerCase().includes(keyword) ||
      (l.source && l.source.toLowerCase().includes(keyword))
    )
  }

  return result
})

const errorCount = computed(() => props.logs.filter(l => l.level === 'error').length)
const warnCount = computed(() => props.logs.filter(l => l.level === 'warn').length)

// 方法
const getLogBorder = (level: string): string => {
  const map: Record<string, string> = {
    success: 'border-green-500',
    warn: 'border-yellow-500',
    error: 'border-red-500',
    plugin: 'border-purple-500',
    info: 'border-blue-500'
  }
  return map[level] || 'border-gray-500'
}

const getLogTextClass = (level: string): string => {
  const map: Record<string, string> = {
    success: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    plugin: 'text-purple-400',
    info: 'text-blue-400'
  }
  return map[level] || 'text-[#858585]'
}

const getLogTextColor = (level: string): string => {
  const map: Record<string, string> = {
    success: 'text-[#89d185]',
    warn: 'text-[#dcdcaa]',
    error: 'text-[#f14c4c]',
    plugin: 'text-[#c586c0]',
    info: 'text-[#cccccc]'
  }
  return map[level] || '#cccccc'
}

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

const handleScroll = () => {
  if (!logContainerRef.value) return
  const el = logContainerRef.value
  autoScroll.value = (el.scrollHeight - el.scrollTop - el.clientHeight) < 30
}

const scrollToBottom = () => {
  nextTick(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTo({
        top: logContainerRef.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

const clearLogs = () => {
  // 通过 emit 或 inject 的方式通知父组件清空日志
  console.log('Clear logs requested')
}

const onLogClick = (log: LogEntry) => {
  console.log('Log clicked:', log)
}

// 监听新日志自动滚动
watch(() => props.logs.length, () => {
  if (autoScroll.value) {
    scrollToBottom()
  }
}, { flush: 'post' })

defineExpose({ scrollToBottom })
</script>

<style scoped>
.log-panel {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.log-item {
  animation: slideIn 0.15s ease-out;
}

.log-entry-enter-active {
  animation: slideIn 0.15s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
