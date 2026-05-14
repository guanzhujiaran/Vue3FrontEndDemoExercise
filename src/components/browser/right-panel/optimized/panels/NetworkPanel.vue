<template>
  <div class="network-panel flex flex-col h-full bg-white overflow-hidden">
    <!-- 工具栏 -->
    <div class="toolbar flex items-center justify-between px-3 py-2 border-b border-[var(--el-border-color-lighter)] shrink-0">
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">网络请求</label>
        <el-badge :value="requests.length" :max="99" />
      </div>

      <div class="flex items-center gap-2">
        <!-- 类型过滤 -->
        <el-radio-group v-model="typeFilter" size="small">
          <el-radio-button value="all" class="!text-xs">全部</el-radio-button>
          <el-radio-button value="XHR" class="!text-xs">XHR</el-radio-button>
          <el-radio-button value="FETCH" class="!text-xs">Fetch</el-radio-button>
          <el-radio-button value="WS" class="!text-xs">WS</el-radio-button>
        </el-radio-group>

        <el-divider direction="vertical" />

        <!-- 状态码过滤 -->
        <el-select v-model="statusFilter" placeholder="状态" size="small" clearable class="w-20">
          <el-option label="2xx" value="2xx" />
          <el-option label="4xx" value="4xx" />
          <el-option label="5xx" value="5xx" />
        </el-select>

        <el-button size="small" text :icon="Delete" @click="clearRequests">
          清空
        </el-button>
      </div>
    </div>

    <!-- 请求列表 -->
    <div class="requests-content flex-1 overflow-y-auto">
      <transition-group name="request-item" tag="div" class="divide-y divide-[var(--el-border-color-lighter)]">
        <div
          v-for="(req, index) in filteredRequests"
          :key="index"
          class="request-item flex items-center gap-3 px-3 py-2 hover:bg-base-50/50 cursor-pointer transition-colors group"
          @click="selectRequest(req)"
        >
          <!-- 方法标签 -->
          <el-tag
            size="small"
            :type="getMethodTagType(req.method)"
            effect="dark"
            class="shrink-0 !text-[10px] !font-bold w-12 text-center"
          >
            {{ req.method }}
          </el-tag>

          <!-- URL -->
          <div class="flex-1 min-w-0">
            <div class="text-xs text-[var(--el-text-color-primary)] truncate font-mono">
              {{ req.url }}
            </div>
            <div class="text-[10px] text-[var(--el-text-color-placeholder)] mt-0.5">
              {{ formatTime(req.timestamp) }}
            </div>
          </div>

          <!-- 状态码和耗时 -->
          <div class="flex items-center gap-2 shrink-0">
            <el-tag
              size="small"
              :type="getStatusTagType(req.status)"
              effect="plain"
              class="!text-[10px] !font-mono"
            >
              {{ req.status }}
            </el-tag>

            <span
              class="text-[10px]"
              :class="req.duration > 1000 ? 'text-red-500' : req.duration > 500 ? 'text-yellow-600' : 'text-green-600'"
            >
              {{ formatDuration(req.duration) }}
            </span>
          </div>
        </div>
      </transition-group>

      <!-- 空状态 -->
      <div v-if="filteredRequests.length === 0" class="empty-state flex flex-col items-center justify-center py-12 text-[var(--el-text-color-placeholder)]">
        <el-icon :size="32"><Connection /></el-icon>
        <span class="mt-2 text-sm">{{ requests.length === 0 ? '暂无网络请求' : '无匹配的请求' }}</span>
      </div>
    </div>

    <!-- 请求详情弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      title="请求详情"
      width="700px"
      destroy-on-close
      append-to-body
    >
      <div v-if="selectedRequestDetail" class="space-y-4">
        <!-- 基本信息 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">方法</label>
            <p class="text-sm font-mono mt-1">{{ selectedRequestDetail.method }}</p>
          </div>
          <div>
            <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">URL</label>
            <p class="text-sm font-mono mt-1 break-all">{{ selectedRequestDetail.url }}</p>
          </div>
          <div>
            <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">状态码</label>
            <p class="text-sm font-mono mt-1">{{ selectedRequestDetail.status }}</p>
          </div>
          <div>
            <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">耗时</label>
            <p class="text-sm font-mono mt-1">{{ formatDuration(selectedRequestDetail.duration) }}</p>
          </div>
        </div>

        <!-- 请求头（模拟） -->
        <div>
          <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">请求头</label>
          <pre class="text-xs font-mono bg-base-50 p-3 rounded-lg mt-1 max-h-32 overflow-y-auto">{ "Content-Type": "application/json", ... }</pre>
        </div>

        <!-- 响应体（模拟） -->
        <div>
          <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">响应体</label>
          <pre class="text-xs font-mono bg-base-50 p-3 rounded-lg mt-1 max-h-48 overflow-y-auto">{{ JSON.stringify({ code: 0, data: {}, msg: "success" }, null, 2) }}</pre>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyRequestUrl">复制 URL</el-button>
      </template>
    </el-dialog>

    <!-- 底部统计栏 -->
    <div class="status-bar flex items-center justify-between px-3 py-1.5 bg-base-50 border-t border-[var(--el-border-color-lighter)] text-[10px] text-[var(--el-text-color-placeholder)] shrink-0">
      <div class="flex items-center gap-3">
        <span>{{ filteredRequests.length }} 个请求</span>
        <span class="text-red-400">{{ errorCount }} 失败</span>
      </div>
      <div class="flex items-center gap-3">
        <span>总耗时: {{ totalDuration }}ms</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Delete, Connection } from '@element-plus/icons-vue'

interface NetworkRequest {
  method: string
  url: string
  status: number
  duration: number
  timestamp: number
}

const props = defineProps<{
  requests: NetworkRequest[]
}>()

// 状态
const typeFilter = ref<'all' | 'XHR' | 'FETCH' | 'WS'>('all')
const statusFilter = ref<string>('')
const showDetailDialog = ref(false)
const selectedRequestDetail = ref<NetworkRequest | null>(null)

// 计算属性
const filteredRequests = computed(() => {
  let result = props.requests

  // 类型过滤（简化实现）
  if (typeFilter.value !== 'all') {
    // 实际应用中应该根据请求类型过滤
  }

  // 状态码过滤
  if (statusFilter.value) {
    if (statusFilter.value === '2xx') {
      result = result.filter(r => r.status >= 200 && r.status < 300)
    } else if (statusFilter.value === '4xx') {
      result = result.filter(r => r.status >= 400 && r.status < 500)
    } else if (statusFilter.value === '5xx') {
      result = result.filter(r => r.status >= 500 && r.status < 600)
    }
  }

  return result.reverse() // 最新的在前面
})

const errorCount = computed(() =>
  props.requests.filter(r => r.status >= 400).length
)

const totalDuration = computed(() =>
  props.requests.reduce((sum, r) => sum + r.duration, 0)
)

// 方法
const getMethodTagType = (method: string): string => {
  const map: Record<string, string> = {
    GET: '',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'info'
  }
  return map[method.toUpperCase()] || 'info'
}

const getStatusTagType = (status: number): string => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400 && status < 500) return 'danger'
  if (status >= 500) return 'danger'
  return 'info'
}

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const selectRequest = (req: NetworkRequest) => {
  selectedRequestDetail.value = req
  showDetailDialog.value = true
}

const copyRequestUrl = async () => {
  if (!selectedRequestDetail.value?.url) return

  try {
    await navigator.clipboard.writeText(selectedRequestDetail.value.url)
    console.log('URL copied to clipboard')
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

const clearRequests = () => {
  // 通过 emit 或 inject 的方式通知父组件清空
  console.log('Clear requests requested')
}
</script>

<style scoped>
.network-panel {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.request-item-enter-active {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
