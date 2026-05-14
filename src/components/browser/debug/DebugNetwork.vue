<template>
  <div class="debug-network flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
      <span class="text-xs font-medium text-[#cccccc]">网络请求</span>
      <div class="flex items-center gap-2 text-xs text-[#858585]">
        <span>{{ requests.length }} 个请求</span>
        <el-button size="small" text @click="requests = []">清除</el-button>
      </div>
    </div>

    <!-- 请求列表 -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="(req, index) in requests"
        :key="index"
        class="request-item px-3 py-2 border-b border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors cursor-pointer group"
        @click="selectedRequest = selectedRequest === index ? -1 : index"
      >
        <div class="flex items-center gap-2">
          <!-- 状态码标签 -->
          <el-tag
            size="small"
            :type="getStatusType(req.status)"
            effect="plain"
            class="shrink-0 font-mono"
          >
            {{ req.status }}
          </el-tag>

          <!-- HTTP 方法 -->
          <span
            class="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
            :class="getMethodClass(req.method)"
          >
            {{ req.method }}
          </span>

          <!-- URL -->
          <span class="flex-1 text-xs text-[#cccccc] truncate font-mono">{{ req.url }}</span>

          <!-- 耗时 -->
          <span class="text-xs text-[#858585] shrink-0">{{ req.duration }}ms</span>
        </div>

        <!-- 展开的详情 -->
        <div v-if="selectedRequest === index" class="mt-2 pl-4 space-y-1">
          <div class="text-xs">
            <span class="text-[#6a9955]">URL:</span>
            <span class="text-[#ce9178] ml-1 break-all">{{ req.url }}</span>
          </div>
          <div v-if="req.response" class="text-xs">
            <span class="text-[#6a9955]">Response:</span>
            <pre class="mt-1 p-2 bg-[#252526] rounded text-[#dcdcaa] overflow-x-auto max-h-32 text-[11px] m-0">{{ typeof req.response === 'string' ? req.response : JSON.stringify(req.response, null, 2) }}</pre>
          </div>
        </div>
      </div>

      <div v-if="requests.length === 0" class="flex flex-col items-center justify-center py-8 text-[#6a6a6a]">
        <el-icon :size="28"><Connection /></el-icon>
        <span class="mt-2 text-xs">暂无网络请求</span>
      </div>
    </div>

    <!-- 底部统计 -->
    <div v-if="requests.length > 0" class="px-3 py-1.5 bg-[#252526] border-t border-[#3c3c3c] text-xs text-[#858585] shrink-0 flex items-center gap-4">
      <span>总耗时: {{ totalDuration }}ms</span>
      <span>平均: {{ avgDuration }}ms</span>
      <span :class="{ 'text-green-400': successCount > 0 }">成功: {{ successCount }}</span>
      <span :class="{ 'text-red-400': errorCount > 0 }">失败: {{ errorCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Connection } from '@element-plus/icons-vue'

export interface NetworkRequest {
  url: string
  method: string
  status: number
  duration: number
  response?: any
  timestamp?: number
}

const requests = ref<NetworkRequest[]>([])
const selectedRequest = ref(-1)

const totalDuration = computed(() => requests.value.reduce((sum, r) => sum + r.duration, 0))
const avgDuration = computed(() => requests.value.length > 0 ? Math.round(totalDuration.value / requests.value.length) : 0)
const successCount = computed(() => requests.value.filter(r => r.status >= 200 && r.status < 300).length)
const errorCount = computed(() => requests.value.filter(r => r.status >= 400).length)

const getStatusType = (status: number): '' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'info'
  if (status >= 400 && status < 500) return 'warning'
  if (status >= 500) return 'danger'
  return ''
}

const getMethodClass = (method: string): string => {
  const cls: Record<string, string> = {
    GET: 'bg-green-600 text-white',
    POST: 'bg-blue-600 text-white',
    PUT: 'bg-yellow-600 text-white',
    DELETE: 'bg-red-600 text-white',
    PATCH: 'bg-purple-600 text-white',
    HEAD: 'bg-gray-600 text-white',
    OPTIONS: 'bg-gray-500 text-white'
  }
  return cls[method.toUpperCase()] || 'bg-gray-400 text-white'
}

const addRequest = (req: NetworkRequest) => {
  requests.value.push({ ...req, timestamp: Date.now() })
}

defineExpose({ addRequest, clear: () => { requests.value = [] } })
</script>