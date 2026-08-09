<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  Refresh, Search, Delete, Loading, View, WarningFilled,
  CircleCheckFilled, Clock, ArrowDown, ArrowRight,
} from '@element-plus/icons-vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import { ElMessageBox } from 'element-plus'
import { client } from '@/api/browser/hey-api/client.gen'

// ── 类型 ────────────────────────────────────────────────

interface LogRecord {
  id: number
  log_id: string
  mid: string
  execution_id: string
  parent_execution_id: string | null
  depth: number
  action_id: string
  action_name: string
  action_type: string
  source: string
  workflow_id: string | null
  browser_id: string
  session_id: string
  page_url: string
  status: string
  success: boolean
  params: Record<string, unknown> | null
  result_data: Record<string, unknown> | null
  variables: Record<string, unknown> | null
  logs: string[]
  error_message: string | null
  execution_time: number
  started_at: string
  finished_at: string | null
}

interface LogStats {
  days: number
  total: number
  success: number
  failed: number
  items: Array<{
    action_id: string
    action_name: string
    total: number
    success: number
    failed: number
    avg_execution_time: number
  }>
}

// ── 状态 ────────────────────────────────────────────────

const userNavStore = useUserNavStore()
const logList = ref<LogRecord[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const loadingMore = ref(false)
const stats = ref<LogStats | null>(null)

// 筛选条件
const filterStatus = ref('')
const filterSuccess = ref<string | null>(null)
const filterSource = ref('')
const filterActionId = ref('')
const filterKeyword = ref('')
const filterBrowserId = ref('')

const hasMore = computed(() => logList.value.length < total.value)

// ── 详情弹窗 ────────────────────────────────────────────

const detailVisible = ref(false)
const detailRecord = ref<LogRecord | null>(null)
const detailExecutionLogs = ref<LogRecord[]>([])

// ── 选中删除 ────────────────────────────────────────────

const selectedLogIds = ref<string[]>([])
const isAllSelected = computed({
  get: () => logList.value.length > 0 && selectedLogIds.value.length === logList.value.length,
  set: (val: boolean) => {
    selectedLogIds.value = val ? logList.value.map(l => l.log_id) : []
  },
})

// ── API 调用 ────────────────────────────────────────────

const apiBase = '/api/v1/rpa/browser/control'

const loadLogs = async (append = false) => {
  if (append) {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    currentPage.value++
  } else {
    loading.value = true
    currentPage.value = 1
  }

  const body: Record<string, unknown> = {
    page: currentPage.value,
    per_page: pageSize.value,
    order_desc: true,
  }
  if (filterStatus.value) body.status = filterStatus.value
  if (filterSuccess.value !== null && filterSuccess.value !== '') {
    body.success = filterSuccess.value === 'true'
  }
  if (filterSource.value) body.source = filterSource.value
  if (filterActionId.value) body.action_id = filterActionId.value
  if (filterKeyword.value) body.keyword = filterKeyword.value
  if (filterBrowserId.value) body.browser_id = filterBrowserId.value

  const result = await businessHandler<{ items?: LogRecord[]; total?: number }>(
    client.post({
      url: `${apiBase}/action-logs/list`,
      body,
      headers: {
        'Content-Type': 'application/json',
        ...userNavStore.user_header,
      },
    }) as unknown as Promise<{ code: number; data?: { items?: LogRecord[]; total?: number }; msg?: string }>,
    { successMessage: '', errorMessage: '获取日志列表失败', showSuccessToast: false },
  )

  if (result.success && result.data) {
    const items = result.data.items || []
    if (append) {
      logList.value.push(...items)
    } else {
      logList.value = items
    }
    total.value = result.data.total || 0
  } else if (append) {
    currentPage.value--
  }
  loading.value = false
  loadingMore.value = false
}

const loadStats = async () => {
  const result = await businessHandler<LogStats>(
    client.post({
      url: `${apiBase}/action-logs/stats`,
      body: { days: 7 },
      headers: {
        'Content-Type': 'application/json',
        ...userNavStore.user_header,
      },
    }) as unknown as Promise<{ code: number; data?: LogStats; msg?: string }>,
    { successMessage: '', errorMessage: '', showSuccessToast: false },
  )
  if (result.success && result.data) {
    stats.value = result.data
  }
}

const handleRefresh = () => {
  selectedLogIds.value = []
  loadLogs()
  loadStats()
}

const handleSearch = () => {
  selectedLogIds.value = []
  loadLogs()
}

const handleResetFilters = () => {
  filterStatus.value = ''
  filterSuccess.value = null
  filterSource.value = ''
  filterActionId.value = ''
  filterKeyword.value = ''
  filterBrowserId.value = ''
  handleSearch()
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollHeight - scrollTop - clientHeight < 100 && hasMore.value && !loadingMore.value) {
    loadLogs(true)
  }
}

// ── 查看详情（含执行链路） ──────────────────────────────

const openDetail = async (record: LogRecord) => {
  detailRecord.value = record
  detailVisible.value = true
  detailExecutionLogs.value = []

  // 按 execution_id 拉取完整执行链路
  if (record.execution_id) {
    const result = await businessHandler<LogRecord[]>(
      client.post({
        url: `${apiBase}/action-logs/by-execution`,
        body: { execution_id: record.execution_id },
        headers: {
          'Content-Type': 'application/json',
          ...userNavStore.user_header,
        },
      }) as unknown as Promise<{ code: number; data?: LogRecord[]; msg?: string }>,
      { successMessage: '', errorMessage: '', showSuccessToast: false },
    )
    if (result.success && result.data) {
      detailExecutionLogs.value = result.data
    }
  }
}

// ── 批量删除 ────────────────────────────────────────────

const handleBatchDelete = async () => {
  if (!selectedLogIds.value.length) return
  const result = await businessHandler<{ deleted: number }>(
    client.post({
      url: `${apiBase}/action-logs/delete`,
      body: { log_ids: selectedLogIds.value },
      headers: {
        'Content-Type': 'application/json',
        ...userNavStore.user_header,
      },
    }) as unknown as Promise<{ code: number; data?: { deleted: number }; msg?: string }>,
    { successMessage: `已删除 ${selectedLogIds.value.length} 条日志`, errorMessage: '删除失败' },
  )
  if (result.success) {
    selectedLogIds.value = []
    loadLogs()
    loadStats()
  }
}

const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将清空当前筛选条件下的全部操作日志，且不可恢复。确定要继续吗？',
      '清空全部日志',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  const result = await businessHandler<{ deleted: number }>(
    client.post({
      url: `${apiBase}/action-logs/clear`,
      body: {},
      headers: {
        'Content-Type': 'application/json',
        ...userNavStore.user_header,
      },
    }) as unknown as Promise<{ code: number; data?: { deleted: number }; msg?: string }>,
    { successMessage: '已清空所有日志', errorMessage: '清空失败' },
  )
  if (result.success) {
    selectedLogIds.value = []
    loadLogs()
    loadStats()
  }
}

// ── 工具 ────────────────────────────────────────────────

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'success': return CircleCheckFilled
    case 'failed': return WarningFilled
    case 'timeout': return Clock
    default: return CircleCheckFilled
  }
}

const statusType = (status: string): '' | 'success' | 'warning' | 'info' | 'danger' => {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'timeout': return 'warning'
    default: return 'info'
  }
}

const statusText = (status: string) => {
  switch (status) {
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'timeout': return '超时'
    default: return status
  }
}

const sourceText = (source: string) => {
  switch (source) {
    case 'action': return '单操作'
    case 'workflow': return '工作流'
    case 'plugin': return '插件'
    default: return source
  }
}

const formatJson = (data: unknown) => {
  if (!data) return '-'
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

const formatDuration = (ms: number) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

onMounted(() => {
  loadLogs()
  loadStats()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="操作日志" description="查看浏览器操作的执行历史与详情" tag="日志查询">
      <template #extra>
        <div class="action-log-view__actions flex items-center gap-2">
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
          <el-button
            type="danger"
            plain
            :icon="Delete"
            :disabled="!selectedLogIds.length"
            @click="handleBatchDelete"
          >
            删除选中 ({{ selectedLogIds.length }})
          </el-button>
          <el-button type="danger" plain :icon="Delete" @click="handleClearAll">清空全部</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <!-- 统计概览 -->
      <div v-if="stats" class="stats-bar flex items-center gap-4 mb-4 flex-wrap">
        <el-tag type="info" effect="plain" size="large">近 {{ stats.days }} 天</el-tag>
        <el-tag type="primary" effect="plain" size="large">总计 {{ stats.total }}</el-tag>
        <el-tag type="success" effect="plain" size="large">成功 {{ stats.success }}</el-tag>
        <el-tag type="danger" effect="plain" size="large">失败 {{ stats.failed }}</el-tag>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar flex items-center gap-3 mb-4 flex-wrap">
        <el-input
          v-model="filterKeyword"
          placeholder="搜索操作名/ID/错误"
          :prefix-icon="Search"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="filterActionId"
          placeholder="按操作ID筛选"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="filterBrowserId"
          placeholder="按浏览器ID筛选"
          clearable
          style="width: 160px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 110px" @change="handleSearch">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="超时" value="timeout" />
        </el-select>
        <el-select v-model="filterSuccess" placeholder="结果" clearable style="width: 110px" @change="handleSearch">
          <el-option label="成功" value="true" />
          <el-option label="失败" value="false" />
        </el-select>
        <el-select v-model="filterSource" placeholder="来源" clearable style="width: 120px" @change="handleSearch">
          <el-option label="单操作" value="action" />
          <el-option label="工作流" value="workflow" />
          <el-option label="插件" value="plugin" />
        </el-select>
        <el-button :icon="Search" type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleResetFilters">重置</el-button>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="w-full">
        <div v-for="i in 5" :key="i" class="rounded-xl p-4 border border-[var(--el-border-color-light)] mb-3">
          <el-skeleton :rows="2" animated />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="logList.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <el-empty description="暂无操作日志" />
      </div>

      <!-- 日志列表（滚动容器） -->
      <div v-else class="log-list overflow-auto" style="max-height: calc(100vh - 380px)" @scroll="handleScroll">
        <div v-for="item in logList" :key="item.log_id" class="log-item rounded-xl p-4 border border-[var(--el-border-color-light)] mb-3 hover:border-[var(--el-color-primary)] transition-colors">
          <div class="flex items-start gap-4">
            <!-- 复选框 -->
            <el-checkbox
              v-model="selectedLogIds"
              :value="item.log_id"
              class="log-item__checkbox mt-0.5"
            />

            <!-- 状态图标 -->
            <el-icon :size="22" class="log-item__status mt-0.5" :color="item.success ? 'var(--el-color-success)' : 'var(--el-color-danger)'">
              <component :is="statusIcon(item.status)" />
            </el-icon>

            <!-- 主体信息 -->
            <div class="flex-1 min-w-0">
              <!-- 头部行 -->
              <div class="flex items-center justify-between gap-2 mb-1">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="log-item__action-name text-base font-semibold truncate" :title="item.action_name">
                    {{ item.action_name }}
                  </span>
                  <el-tag size="small" :type="statusType(item.status)">{{ statusText(item.status) }}</el-tag>
                  <el-tag size="small" effect="plain">{{ sourceText(item.source) }}</el-tag>
                </div>
                <span class="log-item__time text-xs text-gray-400 whitespace-nowrap">{{ formatTime(item.started_at) }}</span>
              </div>

              <!-- 元信息行 -->
              <div class="flex items-center gap-3 text-xs text-gray-400 mb-2 flex-wrap">
                <span>ID: {{ item.action_id }}</span>
                <span v-if="item.browser_id">浏览器: {{ item.browser_id }}</span>
                <span>耗时: {{ formatDuration(item.execution_time * 1000) }}</span>
                <span v-if="item.workflow_id">工作流: {{ item.workflow_id }}</span>
                <span v-if="item.depth > 0">深度: {{ item.depth }}</span>
              </div>

              <!-- 错误信息（仅失败时显示） -->
              <div v-if="item.error_message" class="log-item__error text-xs text-[var(--el-color-danger)] bg-[var(--el-color-danger-light-9)] rounded-lg px-2.5 py-1.5 mt-1 line-clamp-2">
                {{ item.error_message }}
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="log-item__actions flex items-center gap-1 flex-shrink-0">
              <el-button size="small" :icon="View" @click="openDetail(item)">详情</el-button>
            </div>
          </div>
        </div>

        <!-- 全选 -->
        <div v-if="logList.length > 0" class="flex items-center gap-2 mb-3 pl-2">
          <el-checkbox v-model="isAllSelected" class="log-list__select-all">全选</el-checkbox>
        </div>

        <!-- 加载更多 -->
        <div v-if="loadingMore" class="flex justify-center py-6">
          <el-icon class="is-loading" :size="24"><Loading /></el-icon>
          <span class="ml-2 text-sm text-gray-400">加载中...</span>
        </div>
        <div v-else-if="!hasMore && logList.length > 0" class="flex justify-center py-6 text-sm text-gray-400">
          没有更多了
        </div>
      </div>
    </FlexContainer>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="720px" class="log-detail-dialog">
      <div v-if="detailRecord" class="flex flex-col gap-4">
        <!-- 基本信息 -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-gray-400">操作名称：</span>{{ detailRecord.action_name }}</div>
          <div><span class="text-gray-400">操作ID：</span>{{ detailRecord.action_id }}</div>
          <div><span class="text-gray-400">状态：</span>
            <el-tag size="small" :type="statusType(detailRecord.status)">{{ statusText(detailRecord.status) }}</el-tag>
          </div>
          <div><span class="text-gray-400">来源：</span>{{ sourceText(detailRecord.source) }}</div>
          <div><span class="text-gray-400">浏览器ID：</span>{{ detailRecord.browser_id || '-' }}</div>
          <div><span class="text-gray-400">会话ID：</span>{{ detailRecord.session_id || '-' }}</div>
          <div><span class="text-gray-400">执行耗时：</span>{{ formatDuration(detailRecord.execution_time * 1000) }}</div>
          <div><span class="text-gray-400">嵌套深度：</span>{{ detailRecord.depth }}</div>
          <div><span class="text-gray-400">开始时间：</span>{{ formatTime(detailRecord.started_at) }}</div>
          <div><span class="text-gray-400">结束时间：</span>{{ formatTime(detailRecord.finished_at) }}</div>
          <div v-if="detailRecord.page_url" class="col-span-2">
            <span class="text-gray-400">页面URL：</span>
            <span class="break-all">{{ detailRecord.page_url }}</span>
          </div>
          <div v-if="detailRecord.workflow_id" class="col-span-2">
            <span class="text-gray-400">工作流ID：</span>{{ detailRecord.workflow_id }}
          </div>
          <div v-if="detailRecord.execution_id" class="col-span-2">
            <span class="text-gray-400">执行批次：</span>
            <el-tag size="small">{{ detailRecord.execution_id }}</el-tag>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="detailRecord.error_message">
          <div class="text-sm font-semibold mb-1 text-[var(--el-color-danger)]">错误信息</div>
          <pre class="text-xs bg-[var(--el-color-danger-light-9)] text-[var(--el-color-danger)] rounded-lg p-3 overflow-auto whitespace-pre-wrap" style="max-height: 200px">{{ detailRecord.error_message }}</pre>
        </div>

        <!-- 入参 -->
        <el-collapse v-if="detailRecord.params">
          <el-collapse-item title="调用参数" name="params">
            <pre class="text-xs bg-[var(--el-fill-color-light)] rounded-lg p-3 overflow-auto" style="max-height: 300px">{{ formatJson(detailRecord.params) }}</pre>
          </el-collapse-item>
        </el-collapse>

        <!-- 执行结果 -->
        <el-collapse v-if="detailRecord.result_data">
          <el-collapse-item title="执行结果" name="result">
            <pre class="text-xs bg-[var(--el-fill-color-light)] rounded-lg p-3 overflow-auto" style="max-height: 300px">{{ formatJson(detailRecord.result_data) }}</pre>
          </el-collapse-item>
        </el-collapse>

        <!-- 变量快照 -->
        <el-collapse v-if="detailRecord.variables">
          <el-collapse-item title="变量池快照" name="variables">
            <pre class="text-xs bg-[var(--el-fill-color-light)] rounded-lg p-3 overflow-auto" style="max-height: 300px">{{ formatJson(detailRecord.variables) }}</pre>
          </el-collapse-item>
        </el-collapse>

        <!-- 执行过程日志 -->
        <el-collapse v-if="detailRecord.logs?.length">
          <el-collapse-item :title="`执行过程日志 (${detailRecord.logs.length})`" name="processLogs">
            <div class="text-xs bg-[var(--el-fill-color-light)] rounded-lg p-3 overflow-auto" style="max-height: 300px">
              <div v-for="(line, idx) in detailRecord.logs" :key="idx" class="py-0.5">{{ line }}</div>
            </div>
          </el-collapse-item>
        </el-collapse>

        <!-- 执行链路（按 execution_id 关联） -->
        <div v-if="detailExecutionLogs.length > 1" class="execution-chain">
          <div class="text-sm font-semibold mb-2">执行链路 ({{ detailExecutionLogs.length }} 步)</div>
          <div class="flex flex-col gap-2">
            <div
              v-for="(link, idx) in detailExecutionLogs"
              :key="link.log_id"
              class="execution-chain__step flex items-center gap-3 rounded-lg p-3 border border-[var(--el-border-color-lighter)]"
              :class="{
                'bg-[var(--el-color-primary-light-9)] border-[var(--el-color-primary-light-5)]': link.log_id === detailRecord.log_id,
              }"
            >
              <el-icon :size="18" :color="link.success ? 'var(--el-color-success)' : 'var(--el-color-danger)'">
                <component :is="statusIcon(link.status)" />
              </el-icon>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium truncate">{{ link.action_name }}</span>
                  <el-tag size="small" :type="statusType(link.status)">{{ statusText(link.status) }}</el-tag>
                  <span class="text-xs text-gray-400">{{ formatDuration(link.execution_time * 1000) }}</span>
                </div>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{ link.action_id }} · {{ sourceText(link.source) }}
                  <span v-if="link.depth > 0"> · 深度 {{ link.depth }}</span>
                </div>
              </div>
              <span class="text-xs text-gray-400 whitespace-nowrap">{{ formatTime(link.started_at) }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </FlexContainer>
</template>
