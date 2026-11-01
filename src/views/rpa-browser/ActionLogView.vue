<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Refresh, Search, Delete, Loading, View, WarningFilled,
  CircleCheckFilled, Clock, Connection,
} from '@element-plus/icons-vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import ActionLogChainDialog from '@/components/rpa-browser/ActionLogChainDialog.vue'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import { ElMessageBox } from 'element-plus'
import { client } from '@/api/browser/hey-api/client.gen'

/**
 * 页面支持从别处带批次号直达：`?execution_id=<批次>`。
 *
 * 典型来源是「已处理数据」表格的「执行批次」列 —— 资源记录的 execution_id
 * 与日志的 execution_id 同名同值，点过来即可看到写入该资源的那一轮全部步骤。
 */

// ── 类型 ────────────────────────────────────────────────

/** 列表项（轻量）：不含入参 / 结果 / 变量 / 执行日志等大字段 */
interface LogSummary {
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
  error_message: string | null
  /** 执行耗时（秒） */
  execution_time: number
  started_at: string
  finished_at: string | null
}

/** 单条日志详情：在列表项基础上附带大字段（按需拉取） */
interface LogDetail extends LogSummary {
  params: Record<string, unknown> | null
  result_data: Record<string, unknown> | null
  variables: Record<string, unknown> | null
  logs: string[]
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

/** 顶部概览卡片 */
interface StatCard {
  key: string
  label: string
  value: string
  dotClass: string
  valueClass: string
}

// ── 状态 ────────────────────────────────────────────────

const userNavStore = useUserNavStore()
const logList = ref<LogSummary[]>([])
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
/** 执行批次ID：与「已处理数据」记录的 execution_id 同值，可直接定位同一轮运行 */
const filterExecutionId = ref('')

const hasMore = computed(() => logList.value.length < total.value)

// ── 执行链路弹窗 ────────────────────────────────────────

const route = useRoute()
const router = useRouter()
const chainVisible = ref(false)
/** 链路弹窗展示的批次号（点击某条日志的「链路」时写入） */
const chainExecutionId = ref('')

/** 打开某批次的完整执行链路（按写入顺序 + depth 缩进还原调用树） */
const openChain = (executionId: string) => {
  if (!executionId) return
  chainExecutionId.value = executionId
  chainVisible.value = true
}

/** 清除批次筛选：同步清掉地址栏 query，避免刷新后又回到过滤态 */
const clearExecutionFilter = () => {
  filterExecutionId.value = ''
  if (route.query.execution_id) {
    const restQuery = { ...route.query }
    delete restQuery.execution_id
    router.replace({ query: restQuery })
  }
  handleSearch()
}

/** 链路里点某一步 → 收起链路并打开该步骤的日志详情 */
const handleChainSelect = (logId: string) => {
  chainVisible.value = false
  openDetail(logId)
}

// ── 详情弹窗 ────────────────────────────────────────────

const detailVisible = ref(false)
const detailRecord = ref<LogDetail | null>(null)
const detailLoading = ref(false)
// 执行结果原始 JSON 默认折叠，避免大 payload 直接刷屏
const showRawJson = ref(false)

// ── 选中删除 ────────────────────────────────────────────

const selectedLogIds = ref<string[]>([])
const isAllSelected = computed({
  get: () => logList.value.length > 0 && selectedLogIds.value.length === logList.value.length,
  set: (val: boolean) => {
    selectedLogIds.value = val ? logList.value.map(l => l.log_id) : []
  },
})

/** 是否已勾选该条日志（用于卡片高亮） */
const isSelected = (logId: string) => selectedLogIds.value.includes(logId)

/**
 * 勾选 / 取消单条日志
 *
 * `el-checkbox` 的 `v-model` 类型只声明了单值（boolean/string/number），
 * 直接绑 `string[]` 通不过类型检查；这里用它支持的 `:model-value` + 事件手动维护集合，
 * 运行时行为与「数组 v-model」等价。
 */
const toggleLogSelection = (logId: string, checked: boolean) => {
  if (checked) {
    if (!selectedLogIds.value.includes(logId)) {
      selectedLogIds.value = [...selectedLogIds.value, logId]
    }
    return
  }
  selectedLogIds.value = selectedLogIds.value.filter((id) => id !== logId)
}

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
  if (filterExecutionId.value) body.execution_id = filterExecutionId.value

  const result = await businessHandler<{ items?: LogSummary[]; total?: number }>(
    client.post({
      url: `${apiBase}/action-logs/list`,
      body,
      headers: {
        'Content-Type': 'application/json',
        ...userNavStore.user_header,
      },
    }) as unknown as Promise<{ code: number; data?: { items?: LogSummary[]; total?: number }; msg?: string }>,
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
  filterExecutionId.value = ''
  handleSearch()
}

// 触底加载：BiliScrollbar 的 wrapRef 才是真实滚动元素（内部已接入统一滚动封装）
const listScrollbarRef = ref<{ wrapRef?: HTMLElement }>()
const handleScroll = () => {
  const wrap = listScrollbarRef.value?.wrapRef
  if (!wrap) return
  const { scrollTop, scrollHeight, clientHeight } = wrap
  if (scrollHeight - scrollTop - clientHeight < 120 && hasMore.value && !loadingMore.value) {
    loadLogs(true)
  }
}

// ── 查看详情 ────────────────────────────────────────────

/** 按 log_id 打开详情（列表点击、链路下钻共用同一条路径） */
const openDetail = async (logId: string) => {
  // 列表只回轻量摘要，入参/结果/变量/执行日志等大字段按需单条拉取，
  // 避免列表分页/无限滚动随行下发数百 KB 的重字段。
  detailRecord.value = null
  showRawJson.value = false
  detailVisible.value = true
  detailLoading.value = true
  const result = await businessHandler<LogDetail>(
    client.post({
      url: `${apiBase}/action-logs/get`,
      body: { log_id: logId },
      headers: {
        'Content-Type': 'application/json',
        ...userNavStore.user_header,
      },
    }) as unknown as Promise<{ code: number; data?: LogDetail; msg?: string }>,
    { successMessage: '', errorMessage: '获取日志详情失败', showSuccessToast: false },
  )
  if (result.success && result.data) {
    detailRecord.value = result.data
  }
  detailLoading.value = false
}

// ── 执行结果可读化 ──────────────────────────────────────

interface ResultField { key: string; value: string }

/** result_data 约定为 { success, data }；取出业务主体 data（无该结构时回退整体） */
const resultPayload = computed<unknown>(() => {
  const rd = detailRecord.value?.result_data
  if (!rd) return null
  return 'data' in rd ? rd.data : rd
})

const resultSuccess = computed<boolean | null>(() => {
  const rd = detailRecord.value?.result_data
  if (!rd || !('success' in rd)) return null
  return Boolean(rd.success)
})

const resultTruncated = computed(() => Boolean(detailRecord.value?.result_data?._truncated))

/** 把任意值描述为一行可读文本：容器只给规模，标量直出（过长截断）。 */
const describeValue = (v: unknown): string => {
  if (v === null || v === undefined) return '-'
  if (Array.isArray(v)) return `数组 · ${v.length} 项`
  if (typeof v === 'object') return `对象 · ${Object.keys(v as object).length} 键`
  const s = String(v)
  return s.length > 120 ? `${s.slice(0, 120)}…` : s
}

/** 执行结果主字段（业务主体 data 的第一层键值对） */
const resultFields = computed<ResultField[]>(() => {
  const p = resultPayload.value
  if (p === null || typeof p !== 'object') {
    return [{ key: '值', value: describeValue(p) }]
  }
  const entries: Array<[string, unknown]> = Array.isArray(p)
    ? p.map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(p as Record<string, unknown>)
  return entries.map(([k, v]) => ({ key: k, value: describeValue(v) }))
})

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
        lockScroll: false,
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

// ── 格式化 / 映射 ───────────────────────────────────────

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

/** 相对时间：日志场景看「多久之前」比看绝对时间更快，超过一周回落绝对时间 */
const relativeTime = (t: string | null) => {
  if (!t) return '-'
  const ts = new Date(t).getTime()
  if (Number.isNaN(ts)) return '-'
  const diff = Date.now() - ts
  if (diff < 0) return formatTime(t)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return formatTime(t)
}

/** 长 ID（雪花 id / 会话 id）中段省略，避免把卡片撑成一行数字 */
const shortId = (id: string | null) => {
  if (!id) return '-'
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id
}

/** 耗时（秒）→ 自适应单位文本 */
const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0ms'
  const ms = seconds * 1000
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}m${s % 60}s`
}

/** 耗时配色：慢操作给警示色，便于扫读定位卡住的步骤 */
const durationClass = (seconds: number) => {
  if (seconds >= 30) return 'text-danger'
  if (seconds >= 5) return 'text-warning'
  return 'text-text-secondary'
}

const STATUS_ACCENT_CLASS: Record<string, string> = {
  success: 'bg-success',
  failed: 'bg-danger',
  timeout: 'bg-warning',
}

const statusAccentClass = (status: string) => STATUS_ACCENT_CLASS[status] ?? 'bg-info'

const statusIcon = (status: string) => {
  switch (status) {
    case 'success': return CircleCheckFilled
    case 'failed': return WarningFilled
    case 'timeout': return Clock
    default: return CircleCheckFilled
  }
}

const statusType = (status: string): 'success' | 'warning' | 'info' | 'danger' => {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'timeout': return 'warning'
    default: return 'info'
  }
}

const statusIconClass = (status: string) => {
  switch (status) {
    case 'failed': return 'text-danger'
    case 'timeout': return 'text-warning'
    default: return 'text-success'
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

/** 卡片边框 / 底色：勾选态优先，其余为 hover 反馈 */
const itemCardClass = (item: LogSummary) => (
  isSelected(item.log_id)
    ? 'border-primary bg-primary-light-9'
    : 'border-border-light bg-bg hover:border-primary hover:bg-fill-lighter'
)

/** 成功但带 error_message 的日志是「提示」而非失败，配色区分开 */
const itemMessageClass = (item: LogSummary) => (
  item.success ? 'bg-warning-light-9 text-warning' : 'bg-danger-light-9 text-danger'
)

const formatJson = (data: unknown) => {
  if (!data) return '-'
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

/** 概览卡片：总量 / 成功 / 失败 / 成功率 */
const statsCards = computed<StatCard[]>(() => {
  const s = stats.value
  if (!s) return []
  const rate = s.total > 0 ? `${Math.round((s.success / s.total) * 100)}%` : '—'
  return [
    {
      key: 'total',
      label: `近 ${s.days} 天总操作`,
      value: String(s.total),
      dotClass: 'bg-primary',
      valueClass: 'text-text-primary',
    },
    {
      key: 'success',
      label: '成功',
      value: String(s.success),
      dotClass: 'bg-success',
      valueClass: 'text-success',
    },
    {
      key: 'failed',
      label: '失败',
      value: String(s.failed),
      dotClass: 'bg-danger',
      valueClass: 'text-danger',
    },
    {
      key: 'rate',
      label: '成功率',
      value: rate,
      dotClass: 'bg-info',
      valueClass: 'text-text-primary',
    },
  ]
})

/** 从地址栏带入筛选（execution_id / browser_id），别处跳转时免手填 */
const applyQueryFilters = () => {
  const { execution_id: executionId, browser_id: browserId } = route.query
  if (typeof executionId === 'string' && executionId) filterExecutionId.value = executionId
  if (typeof browserId === 'string' && browserId) filterBrowserId.value = browserId
}

onMounted(() => {
  applyQueryFilters()
  loadLogs()
  loadStats()
})

// 同一路由复用组件时（例如从表格再次带不同批次跳进来）query 会变但组件不重建
watch(
  () => route.query.execution_id,
  value => {
    const next = typeof value === 'string' ? value : ''
    if (next === filterExecutionId.value) return
    filterExecutionId.value = next
    selectedLogIds.value = []
    loadLogs()
  },
)
</script>

<template>
  <FlexContainer class="action-log-view min-h-0">
    <BiliPageHeader title="操作日志" hide-title description="查看浏览器操作的执行历史与详情" tag-text="日志查询">
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

    <FlexContainer class="action-log-view__body mt-4 min-h-0 gap-3 rounded-2xl bg-bg p-4">
      <!-- 概览：单行四格，数字直出便于扫读 -->
      <div v-if="stats" class="action-log-stats shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="card in statsCards"
          :key="card.key"
          class="action-log-stats__item rounded-xl border border-border-lighter bg-fill-lighter px-4 py-2.5"
        >
          <div class="action-log-stats__label flex items-center gap-1.5 text-xs text-text-secondary">
            <span class="action-log-stats__dot h-1.5 w-1.5 rounded-full" :class="card.dotClass"></span>
            {{ card.label }}
          </div>
          <div class="action-log-stats__value mt-0.5 text-xl font-semibold tabular-nums" :class="card.valueClass">
            {{ card.value }}
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <!-- 批次过滤条：从「已处理数据」带 execution_id 跳转进来时显示 -->
      <div
        v-if="filterExecutionId"
        class="action-log-view__batch-bar shrink-0 flex items-center gap-2 rounded-lg bg-primary-light-9 px-3 py-1.5 text-xs"
      >
        <span class="action-log-view__batch-label text-text-secondary">执行批次</span>
        <span class="action-log-view__batch-value font-mono text-primary" :title="filterExecutionId">
          {{ filterExecutionId }}
        </span>
        <el-button
          text
          type="primary"
          :icon="Connection"
          class="action-log-view__batch-chain-btn"
          @click="openChain(filterExecutionId)"
        >
          查看该批次链路
        </el-button>
        <el-button text class="action-log-view__batch-clear-btn" @click="clearExecutionFilter">
          清除批次筛选
        </el-button>
      </div>

      <div class="action-log-view__filter shrink-0 flex flex-wrap items-center gap-2">
        <el-input
          v-model="filterKeyword"
          class="action-log-view__filter-keyword w-52"
          placeholder="搜索操作名/ID/错误"
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="filterActionId"
          class="action-log-view__filter-action-id w-40"
          placeholder="操作ID"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="filterBrowserId"
          class="action-log-view__filter-browser-id w-40"
          placeholder="浏览器ID"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="filterStatus"
          class="action-log-view__filter-status w-28"
          placeholder="状态"
          clearable
          @change="handleSearch"
        >
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="超时" value="timeout" />
        </el-select>
        <el-select
          v-model="filterSuccess"
          class="action-log-view__filter-success w-28"
          placeholder="结果"
          clearable
          @change="handleSearch"
        >
          <el-option label="成功" value="true" />
          <el-option label="失败" value="false" />
        </el-select>
        <el-select
          v-model="filterSource"
          class="action-log-view__filter-source w-28"
          placeholder="来源"
          clearable
          @change="handleSearch"
        >
          <el-option label="单操作" value="action" />
          <el-option label="工作流" value="workflow" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button @click="handleResetFilters">重置</el-button>
      </div>

      <!-- 列表工具条：全选 / 已选统计固定在滚动区外，始终可见 -->
      <div
        v-if="logList.length"
        class="action-log-list__toolbar shrink-0 flex items-center justify-between gap-3 border-b border-border-lighter pb-2"
      >
        <el-checkbox v-model="isAllSelected" class="action-log-list__select-all">全选已加载</el-checkbox>
        <div class="action-log-list__summary flex items-center gap-3 text-xs text-text-secondary">
          <span class="action-log-list__count">
            已加载 {{ logList.length }} / 共 {{ total }} 条
            <template v-if="selectedLogIds.length">，已选 {{ selectedLogIds.length }} 条</template>
          </span>
          <el-button
            v-if="selectedLogIds.length"
            text
            type="danger"
            :icon="Delete"
            @click="handleBatchDelete"
          >
            删除选中
          </el-button>
        </div>
      </div>

      <!-- 日志列表：内部滚动（统一滚动封装，自带快速滚动按钮） -->
      <BiliScrollbar
        ref="listScrollbarRef"
        class="action-log-list flex-1 min-h-0"
        @scroll="handleScroll"
      >
        <!-- 加载骨架 -->
        <div v-if="loading" class="action-log-list__skeleton flex flex-col gap-2">
          <div v-for="i in 5" :key="i" class="rounded-xl border border-border-lighter p-4">
            <el-skeleton :rows="2" animated />
          </div>
        </div>

        <!-- 空状态 -->
        <el-empty v-else-if="logList.length === 0" class="action-log-list__empty my-16" description="暂无操作日志" />

        <template v-else>
          <div class="action-log-list__items flex flex-col gap-2 pr-1">
            <article
              v-for="item in logList"
              :key="item.log_id"
              class="log-item relative flex items-start gap-3 overflow-hidden rounded-xl border py-3 pl-5 pr-4 cursor-pointer transition-all duration-200"
              :class="itemCardClass(item)"
              @click="openDetail(item.log_id)"
            >
              <!-- 左侧状态色条：成功/失败/超时一眼区分 -->
              <span
                class="log-item__accent absolute inset-y-0 left-0 w-1"
                :class="statusAccentClass(item.status)"
              ></span>

              <!-- 复选框（阻止冒泡，避免点选时弹出详情） -->
              <span class="log-item__check mt-0.5 shrink-0" @click.stop>
                <el-checkbox
                  :model-value="isSelected(item.log_id)"
                  :aria-label="`选择日志 ${item.action_name || item.action_id}`"
                  @update:model-value="(val: string | number | boolean) => toggleLogSelection(item.log_id, Boolean(val))"
                />
              </span>

              <!-- 状态图标 -->
              <el-icon class="log-item__status mt-1 shrink-0" :size="18" :class="statusIconClass(item.status)">
                <component :is="statusIcon(item.status)" />
              </el-icon>

              <!-- 主体信息 -->
              <div class="log-item__main min-w-0 flex-1">
                <!-- 第一行：操作名 + 状态/来源/层级 + 耗时/时间 -->
                <div class="log-item__title-row flex items-start justify-between gap-3">
                  <div class="log-item__title flex min-w-0 items-center gap-2">
                    <span
                      class="log-item__name truncate text-base font-semibold text-text-primary"
                      :title="item.action_name || item.action_id"
                    >
                      {{ item.action_name || item.action_id }}
                    </span>
                    <el-tag class="log-item__status-tag shrink-0" :type="statusType(item.status)" effect="light">
                      {{ statusText(item.status) }}
                    </el-tag>
                    <el-tag class="log-item__source-tag shrink-0" type="info" effect="plain">
                      {{ sourceText(item.source) }}
                    </el-tag>
                    <el-tag
                      v-if="item.depth > 0"
                      class="log-item__depth-tag shrink-0"
                      type="warning"
                      effect="plain"
                    >
                      第 {{ item.depth }} 层
                    </el-tag>
                  </div>

                  <div class="log-item__time shrink-0 flex items-center gap-2 text-xs">
                    <span
                      class="log-item__duration inline-flex items-center gap-1 rounded-md bg-fill-light px-1.5 py-0.5 tabular-nums"
                      :class="durationClass(item.execution_time)"
                    >
                      <el-icon :size="12"><Clock /></el-icon>{{ formatDuration(item.execution_time) }}
                    </span>
                    <span
                      class="log-item__started-at tabular-nums text-text-secondary"
                      :title="formatTime(item.started_at)"
                    >
                      {{ relativeTime(item.started_at) }}
                    </span>
                  </div>
                </div>

                <!-- 元信息：标签 + 等宽值（长 ID 截断，title 看全量） -->
                <div class="log-item__meta mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <span class="log-item__meta-item inline-flex min-w-0 items-center gap-1">
                    <span class="log-item__meta-label shrink-0 text-text-placeholder">操作ID</span>
                    <span
                      class="log-item__meta-value truncate rounded bg-fill-light px-1.5 py-0.5 font-mono text-text-regular"
                      :title="item.action_id"
                    >
                      {{ item.action_id }}
                    </span>
                  </span>
                  <span v-if="item.browser_id" class="log-item__meta-item inline-flex items-center gap-1">
                    <span class="log-item__meta-label text-text-placeholder">浏览器</span>
                    <span
                      class="log-item__meta-value rounded bg-fill-light px-1.5 py-0.5 font-mono text-text-regular"
                      :title="item.browser_id"
                    >
                      {{ shortId(item.browser_id) }}
                    </span>
                  </span>
                  <span v-if="item.workflow_id" class="log-item__meta-item inline-flex items-center gap-1">
                    <span class="log-item__meta-label text-text-placeholder">工作流</span>
                    <span
                      class="log-item__meta-value rounded bg-fill-light px-1.5 py-0.5 font-mono text-text-regular"
                      :title="item.workflow_id"
                    >
                      {{ shortId(item.workflow_id) }}
                    </span>
                  </span>
                </div>

                <!-- 错误 / 提示：失败用 danger，成功但带信息用 warning -->
                <div
                  v-if="item.error_message"
                  class="log-item__error mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed"
                  :class="itemMessageClass(item)"
                >
                  <el-icon class="log-item__error-icon mt-0.5 shrink-0" :size="14"><WarningFilled /></el-icon>
                  <span class="log-item__error-text line-clamp-2 break-all">{{ item.error_message }}</span>
                </div>
              </div>

              <!-- 操作入口：详情 / 本批次链路 -->
              <div class="log-item__actions shrink-0 self-center flex items-center gap-1">
                <el-tooltip content="查看该批次完整链路" placement="top">
                  <el-button
                    class="log-item__chain-btn"
                    :icon="Connection"
                    circle
                    @click.stop="openChain(item.execution_id)"
                  />
                </el-tooltip>
                <el-button
                  class="log-item__detail-btn"
                  :icon="View"
                  @click.stop="openDetail(item.log_id)"
                >
                  详情
                </el-button>
              </div>
            </article>
          </div>

          <!-- 触底加载 / 到底提示 -->
          <div
            v-if="loadingMore"
            class="action-log-list__loading flex items-center justify-center gap-2 py-4 text-sm text-text-secondary"
          >
            <el-icon class="is-loading" :size="18"><Loading /></el-icon>
            加载中…
          </div>
          <div
            v-else-if="!hasMore"
            class="action-log-list__end py-4 text-center text-sm text-text-placeholder"
          >
            没有更多了
          </div>
          <div v-else class="action-log-list__more flex justify-center py-3">
            <el-button text type="primary" @click="loadLogs(true)">加载更多</el-button>
          </div>
        </template>
      </BiliScrollbar>
    </FlexContainer>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="720px" class="log-detail-dialog" :lock-scroll="false">
      <el-skeleton v-if="detailLoading" :rows="6" animated class="py-6" />
      <div v-else-if="detailRecord" class="log-detail flex flex-col gap-4">
        <!-- 基本信息 -->
        <div class="log-detail__basic grid grid-cols-2 gap-3 text-sm">
          <div class="log-detail__field"><span class="text-text-secondary">操作名称：</span>{{ detailRecord.action_name || '-' }}</div>
          <div class="log-detail__field"><span class="text-text-secondary">操作ID：</span>{{ detailRecord.action_id }}</div>
          <div class="log-detail__field">
            <span class="text-text-secondary">状态：</span>
            <el-tag :type="statusType(detailRecord.status)" effect="light">{{ statusText(detailRecord.status) }}</el-tag>
          </div>
          <div class="log-detail__field"><span class="text-text-secondary">来源：</span>{{ sourceText(detailRecord.source) }}</div>
          <div class="log-detail__field"><span class="text-text-secondary">浏览器ID：</span>{{ detailRecord.browser_id || '-' }}</div>
          <div class="log-detail__field"><span class="text-text-secondary">会话ID：</span>{{ detailRecord.session_id || '-' }}</div>
          <div class="log-detail__field"><span class="text-text-secondary">执行耗时：</span>{{ formatDuration(detailRecord.execution_time) }}</div>
          <div class="log-detail__field"><span class="text-text-secondary">嵌套深度：</span>{{ detailRecord.depth }}</div>
          <div class="log-detail__field"><span class="text-text-secondary">开始时间：</span>{{ formatTime(detailRecord.started_at) }}</div>
          <div class="log-detail__field"><span class="text-text-secondary">结束时间：</span>{{ formatTime(detailRecord.finished_at) }}</div>
          <div v-if="detailRecord.page_url" class="log-detail__field col-span-2">
            <span class="text-text-secondary">页面URL：</span>
            <span class="break-all">{{ detailRecord.page_url }}</span>
          </div>
          <div v-if="detailRecord.workflow_id" class="log-detail__field col-span-2">
            <span class="text-text-secondary">工作流ID：</span>{{ detailRecord.workflow_id }}
          </div>
          <div v-if="detailRecord.execution_id" class="log-detail__field col-span-2 flex items-center gap-2">
            <span class="text-text-secondary">执行批次：</span>
            <el-tag class="log-detail__execution-id">{{ detailRecord.execution_id }}</el-tag>
            <el-button
              text
              type="primary"
              :icon="Connection"
              class="log-detail__chain-btn"
              @click="openChain(detailRecord.execution_id)"
            >
              查看该批次链路
            </el-button>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="detailRecord.error_message" class="log-detail__error">
          <div class="mb-1 text-sm font-semibold text-danger">错误信息</div>
          <pre class="max-h-50 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-danger-light-9 p-3 text-xs text-danger">{{ detailRecord.error_message }}</pre>
        </div>

        <!-- 入参 -->
        <el-collapse v-if="detailRecord.params">
          <el-collapse-item title="调用参数" name="params">
            <pre class="max-h-75 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-fill-light p-3 text-xs">{{ formatJson(detailRecord.params) }}</pre>
          </el-collapse-item>
        </el-collapse>

        <!-- 执行结果：主字段表格化 + 原始 JSON 折叠 -->
        <el-collapse v-if="detailRecord.result_data">
          <el-collapse-item title="执行结果" name="result">
            <div class="mb-2 flex items-center gap-2 text-xs">
              <template v-if="resultSuccess !== null">
                <span class="text-text-secondary">执行成功：</span>
                <el-tag :type="resultSuccess ? 'success' : 'danger'">{{ resultSuccess ? '是' : '否' }}</el-tag>
              </template>
              <el-tag v-if="resultTruncated" type="warning" effect="plain">结果过大已截断</el-tag>
            </div>

            <el-table :data="resultFields" border max-height="260" class="log-detail__result-table mb-2">
              <el-table-column prop="key" label="字段" width="220" show-overflow-tooltip />
              <el-table-column prop="value" label="值" show-overflow-tooltip />
            </el-table>

            <el-button text type="primary" @click="showRawJson = !showRawJson">
              {{ showRawJson ? '收起原始 JSON' : '查看原始 JSON' }}
            </el-button>
            <pre v-if="showRawJson" class="mt-2 max-h-75 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-fill-light p-3 text-xs">{{ formatJson(detailRecord.result_data) }}</pre>
          </el-collapse-item>
        </el-collapse>

        <!-- 变量快照（仅当实际记录到变量时展示，避免空壳折叠区） -->
        <el-collapse v-if="detailRecord.variables && Object.keys(detailRecord.variables).length">
          <el-collapse-item title="变量池快照" name="variables">
            <pre class="max-h-75 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-fill-light p-3 text-xs">{{ formatJson(detailRecord.variables) }}</pre>
          </el-collapse-item>
        </el-collapse>

        <!-- 执行过程日志 -->
        <el-collapse v-if="detailRecord.logs?.length">
          <el-collapse-item :title="`执行过程日志 (${detailRecord.logs.length})`" name="processLogs">
            <div class="max-h-75 overflow-auto rounded-lg bg-fill-light p-3 text-xs bili-thin-scroll">
              <div v-for="(line, idx) in detailRecord.logs" :key="idx" class="py-0.5 break-all">{{ line }}</div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      <el-empty v-else description="未找到该日志或加载失败" />
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 执行链路：按写入顺序 + depth 缩进还原同一批次的所有步骤 -->
    <ActionLogChainDialog
      v-model="chainVisible"
      :execution-id="chainExecutionId"
      @select="handleChainSelect"
    />
  </FlexContainer>
</template>
