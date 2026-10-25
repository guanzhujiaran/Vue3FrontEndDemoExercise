<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Refresh, Search, Delete, View, WarningFilled,
  CircleCheckFilled, Clock, QuestionFilled,
} from '@element-plus/icons-vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import ActionLogChainDialog from '@/components/rpa-browser/ActionLogChainDialog.vue'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import { ElMessageBox } from 'element-plus'
import { client } from '@/api/browser/hey-api/client.gen'

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

type QuickFilterKey = '' | 'failed' | 'workflow'

interface FilterChip {
  key: string
  label: string
}

// ── 状态 ────────────────────────────────────────────────

const userNavStore = useUserNavStore()
const route = useRoute()
const router = useRouter()
const logList = ref<LogSummary[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const stats = ref<LogStats | null>(null)
/**
 * 页面根节点：整页滚动由外层 BiliSideNavLayout 的 BiliScrollbar 统一接管
 * （页面内不再放滚动容器，否则内容被压到「视口高度」里，列表可用高度过低）。
 * 翻页后用它把自己滚回布局滚动区的顶部。
 */
/** FlexContainer 是组件，模板 ref 拿到的是组件实例，根元素在 `$el` 上 */
const pageRef = ref<{ $el?: HTMLElement } | null>(null)

// 筛选条件
const filterStatus = ref('')
const filterSuccess = ref<string | null>(null)
const filterSource = ref('')
const filterActionId = ref('')
const filterKeyword = ref('')
const filterBrowserId = ref('')
/** 执行批次筛选：可手动输入，也可由列表「只看本批次」/ 地址栏 `?execution_id=` 带入 */
const filterExecutionId = ref('')
/** 时间范围筛选（按 started_at）：[开始, 结束]，格式 `YYYY-MM-DD HH:mm:ss` */
const filterTimeRange = ref<[string, string] | null>(null)

// ── 详情弹窗 ────────────────────────────────────────────

const detailVisible = ref(false)
const detailRecord = ref<LogDetail | null>(null)
const detailLoading = ref(false)
// 执行结果原始 JSON 默认折叠，避免大 payload 直接刷屏
const showRawJson = ref(false)
// 折叠区默认展开项：失败记录默认展开「执行过程日志」
const detailCollapseActive = ref<string[]>([])

// ── 执行链路弹窗 ────────────────────────────────────────

const chainVisible = ref(false)
const chainExecutionId = ref('')

// ── 选中删除 ────────────────────────────────────────────

const selectedLogIds = ref<string[]>([])
const isAllSelected = computed({
  get: () => logList.value.length > 0 && selectedLogIds.value.length === logList.value.length,
  set: (val: boolean) => {
    selectedLogIds.value = val ? logList.value.map(l => l.log_id) : []
  },
})

// ── 展示辅助 ────────────────────────────────────────────

const apiBase = '/api/v1/rpa/browser/control'

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

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

const formatDuration = (ms: number) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

/** 批次 / ID 类长十六进制串缩短展示，完整值放 title */
const shortId = (id: string) => (id && id.length > 12 ? `${id.slice(0, 8)}…` : id)

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

const formatJson = (data: unknown) => {
  if (!data) return '-'
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// ── 派生状态 ────────────────────────────────────────────

/** 是否有任一筛选条件生效（用于空态文案区分） */
const hasActiveFilters = computed(
  () =>
    !!filterKeyword.value ||
    !!filterActionId.value ||
    !!filterBrowserId.value ||
    !!filterStatus.value ||
    (filterSuccess.value !== null && filterSuccess.value !== '') ||
    !!filterSource.value ||
    !!filterExecutionId.value,
)

/** 快捷筛选高亮态：与下拉筛选双向同步 */
const quickActive = computed<QuickFilterKey>(() => {
  if (filterSuccess.value === 'false') return 'failed'
  if (filterSource.value === 'workflow') return 'workflow'
  return ''
})

/** 时间 chip 文案只保留「月-日 时:分」，避免标签被长日期撑开 */
const chipTime = (value: string) => (value ? value.slice(5, 16) : '-')

/** 当前筛选条件 chips（仅供展示与单项移除） */
const activeFilterChips = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = []
  if (filterKeyword.value) chips.push({ key: 'keyword', label: `关键字：${filterKeyword.value}` })
  if (filterActionId.value) chips.push({ key: 'action_id', label: `操作ID：${filterActionId.value}` })
  if (filterBrowserId.value) chips.push({ key: 'browser_id', label: `浏览器：${filterBrowserId.value}` })
  if (filterStatus.value) chips.push({ key: 'status', label: `状态：${statusText(filterStatus.value)}` })
  if (filterSuccess.value !== null && filterSuccess.value !== '') {
    chips.push({ key: 'success', label: `结果：${filterSuccess.value === 'true' ? '成功' : '失败'}` })
  }
  if (filterSource.value) chips.push({ key: 'source', label: `来源：${sourceText(filterSource.value)}` })
  if (filterExecutionId.value) chips.push({ key: 'execution_id', label: `批次：${filterExecutionId.value}` })
  if (filterTimeRange.value) {
    const [from, to] = filterTimeRange.value
    chips.push({ key: 'time_range', label: `时间：${chipTime(from)} ~ ${chipTime(to)}` })
  }
  return chips
})

/** 失败较多的操作排行（取统计接口的按 action 聚合，点击可筛选） */
const statsFailedRanking = computed(() =>
  (stats.value?.items ?? [])
    .filter((item) => item.failed > 0)
    .sort((a, b) => b.failed - a.failed)
    .slice(0, 5),
)

// ── API 调用 ────────────────────────────────────────────

const loadLogs = async () => {
  loading.value = true

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
  const timeRange = filterTimeRange.value
  if (timeRange) {
    // 选择器给的是 `YYYY-MM-DD HH:mm:ss`，后端按 ISO 时间解析 starting_at
    body.started_after = timeRange[0].replace(' ', 'T')
    body.started_before = timeRange[1].replace(' ', 'T')
  }

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
    logList.value = result.data.items || []
    total.value = result.data.total || 0
  }
  loading.value = false
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

/**
 * 翻页 / 切换每页条数后回到页面顶部。
 *
 * 页面自身没有滚动容器，滚动发生在布局的 BiliScrollbar 里，因此用
 * `scrollIntoView` 让最近的滚动祖先（布局）把本页滚到顶部。
 */
const resetScrollToTop = () => {
  nextTick(() => {
    pageRef.value?.$el?.scrollIntoView({ block: 'start' })
  })
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  resetScrollToTop()
  loadLogs()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  resetScrollToTop()
  loadLogs()
}

const handleRefresh = () => {
  selectedLogIds.value = []
  loadLogs()
  loadStats()
}

const handleSearch = () => {
  selectedLogIds.value = []
  currentPage.value = 1
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
  filterTimeRange.value = null
  syncExecutionQuery('')
  handleSearch()
}

/** 把批次筛选同步到地址栏：刷新 / 分享链接后仍定位到同一批次 */
const syncExecutionQuery = (executionId: string) => {
  const query = { ...route.query }
  if (executionId) query.execution_id = executionId
  else delete query.execution_id
  void router.replace({ query })
}

/** 只看某个执行批次（列表批次标签 / 详情弹窗入口） */
const filterByExecution = (executionId: string) => {
  if (!executionId) return
  filterExecutionId.value = executionId
  syncExecutionQuery(executionId)
  // 从详情弹窗触发时顺带关闭弹窗，避免遮住筛选后的列表
  detailVisible.value = false
  handleSearch()
}

/** 快捷筛选：与下拉条件双向同步 */
const applyQuickFilter = (key: QuickFilterKey) => {
  if (key === 'failed') {
    filterSuccess.value = 'false'
  } else if (key === 'workflow') {
    filterSource.value = 'workflow'
  } else {
    filterSuccess.value = null
    filterSource.value = ''
  }
  filterStatus.value = ''
  handleSearch()
}

/** 统计卡点击：只看成功 / 只看失败 / 清除结果类筛选 */
const filterBySuccess = (success: boolean) => {
  filterSuccess.value = success ? 'true' : 'false'
  filterStatus.value = ''
  handleSearch()
}

const clearResultFilters = () => {
  filterSuccess.value = null
  filterStatus.value = ''
  handleSearch()
}

/** 失败排行点击：只看某一操作的日志 */
const filterByAction = (actionId: string) => {
  filterActionId.value = actionId
  handleSearch()
}

/** 移除单项筛选条件 */
const removeFilter = (key: string) => {
  switch (key) {
    case 'keyword': filterKeyword.value = ''; break
    case 'action_id': filterActionId.value = ''; break
    case 'browser_id': filterBrowserId.value = ''; break
    case 'status': filterStatus.value = ''; break
    case 'success': filterSuccess.value = null; break
    case 'source': filterSource.value = ''; break
    case 'execution_id': filterExecutionId.value = ''; syncExecutionQuery(''); break
    case 'time_range': filterTimeRange.value = null; break
  }
  handleSearch()
}

// ── 详情 / 链路 ─────────────────────────────────────────

const openDetailByLogId = async (logId: string) => {
  // 列表只回轻量摘要，入参/结果/变量/执行日志等大字段按需单条拉取，
  // 避免列表分页随行下发数百 KB 的重字段。
  detailRecord.value = null
  showRawJson.value = false
  detailCollapseActive.value = []
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
    // 失败记录默认展开执行过程日志，方便直接定位出错环节
    detailCollapseActive.value = result.data.success ? [] : ['processLogs']
  }
  detailLoading.value = false
}

const openDetail = (record: LogSummary) => openDetailByLogId(record.log_id)

const openChain = (executionId: string) => {
  if (!executionId) return
  chainExecutionId.value = executionId
  chainVisible.value = true
}

/** 链路弹窗点击步骤 → 打开该步骤详情 */
const onChainSelect = (logId: string) => openDetailByLogId(logId)

/** 单条日志勾选 / 取消勾选 */
const toggleLogSelect = (logId: string, checked: boolean | string | number) => {
  if (checked) {
    selectedLogIds.value.push(logId)
  } else {
    selectedLogIds.value = selectedLogIds.value.filter((id) => id !== logId)
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
    currentPage.value = 1
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
    currentPage.value = 1
    loadLogs()
    loadStats()
  }
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

/** 复合操作的步骤执行摘要（result_data.data.results：每步成败 / 耗时 / 错误） */
interface CompositeStepSummary {
  action_id: string
  action_name: string
  success: boolean
  error: string | null
  execution_time: number
}

const compositeSteps = computed<CompositeStepSummary[]>(() => {
  const rd = detailRecord.value?.result_data
  if (!rd) return []
  const data = 'data' in rd ? rd.data : null
  if (!data || typeof data !== 'object') return []
  const results = (data as Record<string, unknown>).results
  if (!Array.isArray(results)) return []
  return results
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      action_id: String(r.action_id ?? ''),
      action_name: String(r.action_name ?? '') || String(r.action_id ?? ''),
      success: Boolean(r.success),
      error: (r.error as string | null) ?? null,
      execution_time: Number(r.execution_time ?? 0),
    }))
})

const compositeStepsSuccessCount = computed(
  () => compositeSteps.value.filter((s) => s.success).length,
)

onMounted(() => {
  // 支持其他页面带 `?execution_id=` 直接定位到某个执行批次
  const fromQuery = route.query.execution_id
  if (typeof fromQuery === 'string' && fromQuery) filterExecutionId.value = fromQuery
  loadLogs()
  loadStats()
})
</script>

<template>
  <FlexContainer ref="pageRef" class="action-log-view">
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

    <!-- 内容卡片按自然高度铺开：整页滚动交给外层布局，页面内不放滚动容器 -->
    <FlexContainer class="action-log-content mt-4 bg-bg rounded-2xl p-4">
      <!-- 统计概览（可点击筛选）+ 日志说明 -->
      <div v-if="stats" class="stats-bar flex items-center gap-3 mb-3 flex-wrap">
        <el-tag type="info" effect="plain" size="large" class="stats-bar__days">近 {{ stats.days }} 天</el-tag>
        <el-tag
          type="primary"
          effect="plain"
          size="large"
          class="stats-bar__tag stats-bar__tag--total cursor-pointer transition-opacity hover:opacity-80"
          title="点击清除结果类筛选"
          @click="clearResultFilters"
        >
          总计 {{ stats.total }}
        </el-tag>
        <el-tag
          type="success"
          effect="plain"
          size="large"
          class="stats-bar__tag stats-bar__tag--success cursor-pointer transition-opacity hover:opacity-80"
          title="点击只看成功"
          @click="filterBySuccess(true)"
        >
          成功 {{ stats.success }}
        </el-tag>
        <el-tag
          type="danger"
          effect="plain"
          size="large"
          class="stats-bar__tag stats-bar__tag--failed cursor-pointer transition-opacity hover:opacity-80"
          title="点击只看失败"
          @click="filterBySuccess(false)"
        >
          失败 {{ stats.failed }}
        </el-tag>

        <el-popover placement="bottom-start" :width="380" trigger="click">
          <template #reference>
            <el-button class="stats-bar__help" :icon="QuestionFilled">日志说明</el-button>
          </template>
          <div class="action-log-help flex flex-col gap-2 text-sm text-text-secondary">
            <div class="action-log-help__title font-semibold text-text-primary">
              操作日志是怎么生成、怎么展示的
            </div>
            <div class="action-log-help__item">
              <span class="font-semibold text-text-primary">一条日志 = 一次操作执行</span>：
              手动运行、工作流步骤、插件钩子各产生一条。
            </div>
            <div class="action-log-help__item">
              <span class="font-semibold text-text-primary">来源</span>：单操作 = 手动运行；
              工作流 = 工作流中的步骤；插件 = 插件钩子。
            </div>
            <div class="action-log-help__item">
              <span class="font-semibold text-text-primary">执行批次</span>：一次完整运行
              （手动 / 定时触发）内所有步骤共享同一批次 ID，点击列表里的批次标签可查看完整链路。
            </div>
            <div class="action-log-help__item">
              <span class="font-semibold text-text-primary">嵌套深度</span>：复合操作 / 循环 /
              分支内部子步骤的层级，0 为顶层步骤。
            </div>
            <div class="action-log-help__item">
              <span class="font-semibold text-text-primary">采集开关</span>：工作流或操作的
              「执行日志」关闭时不产生日志；开启「仅出错时记录」后，成功的执行不会落库。
            </div>
            <div class="action-log-help__item">
              <span class="font-semibold text-text-primary">详情按需加载</span>：列表只展示摘要，
              入参 / 结果 / 变量 / 过程日志点「详情」才会拉取。
            </div>
          </div>
        </el-popover>
      </div>

      <!-- 失败较多的操作（点击筛选） -->
      <div v-if="statsFailedRanking.length" class="failed-ranking flex items-center gap-2 mb-3 flex-wrap">
        <span class="failed-ranking__label text-xs text-text-secondary">失败较多的操作</span>
        <el-tag
          v-for="item in statsFailedRanking"
          :key="item.action_id"
          type="danger"
          effect="plain"
          class="failed-ranking__item cursor-pointer transition-opacity hover:opacity-80"
          :title="`点击只看「${item.action_name}」的日志`"
          @click="filterByAction(item.action_id)"
        >
          {{ item.action_name }} · 失败 {{ item.failed }}/{{ item.total }}
        </el-tag>
      </div>

      <!-- 快捷筛选 + 当前筛选 chips -->
      <div class="quick-filter flex items-center gap-2 mb-3 flex-wrap">
        <span class="quick-filter__label text-xs text-text-secondary">快捷查看</span>
        <el-button
          class="quick-filter__btn quick-filter__btn--all"
          :type="quickActive === '' ? 'primary' : 'default'"
          :plain="quickActive !== ''"
          @click="applyQuickFilter('')"
        >
          全部
        </el-button>
        <el-button
          class="quick-filter__btn quick-filter__btn--failed"
          :type="quickActive === 'failed' ? 'danger' : 'default'"
          :plain="quickActive !== 'failed'"
          @click="applyQuickFilter('failed')"
        >
          仅看失败
        </el-button>
        <el-button
          class="quick-filter__btn quick-filter__btn--workflow"
          :type="quickActive === 'workflow' ? 'warning' : 'default'"
          :plain="quickActive !== 'workflow'"
          @click="applyQuickFilter('workflow')"
        >
          仅看工作流
        </el-button>
      </div>

      <div v-if="activeFilterChips.length" class="filter-chips flex items-center gap-2 mb-3 flex-wrap">
        <span class="filter-chips__label text-xs text-text-secondary">当前筛选</span>
        <el-tag
          v-for="chip in activeFilterChips"
          :key="chip.key"
          closable
          class="filter-chips__item"
          @close="removeFilter(chip.key)"
        >
          {{ chip.label }}
        </el-tag>
        <el-button class="filter-chips__clear" text type="primary" @click="handleResetFilters">
          清除全部
        </el-button>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar flex items-center gap-3 mb-4 flex-wrap">
        <el-input
          v-model="filterKeyword"
          class="filter-bar__keyword w-55"
          placeholder="搜索操作名/ID/错误"
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="filterActionId"
          class="filter-bar__action-id w-45"
          placeholder="按操作ID筛选"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="filterBrowserId"
          class="filter-bar__browser-id w-40"
          placeholder="按浏览器ID筛选"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-input
          v-model="filterExecutionId"
          class="filter-bar__execution-id w-72"
          placeholder="按批次ID筛选"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="filterStatus"
          class="filter-bar__status w-28"
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
          class="filter-bar__success w-28"
          placeholder="结果"
          clearable
          @change="handleSearch"
        >
          <el-option label="成功" value="true" />
          <el-option label="失败" value="false" />
        </el-select>
        <el-select
          v-model="filterSource"
          class="filter-bar__source w-30"
          placeholder="来源"
          clearable
          @change="handleSearch"
        >
          <el-option label="单操作" value="action" />
          <el-option label="工作流" value="workflow" />
        </el-select>
        <el-date-picker
          v-model="filterTimeRange"
          class="filter-bar__time-range w-90"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          unlink-panels
          @change="handleSearch"
        />
        <el-button class="filter-bar__search" :icon="Search" type="primary" @click="handleSearch">
          查询
        </el-button>
        <el-button class="filter-bar__reset" @click="handleResetFilters">重置</el-button>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="action-log-skeleton w-full shrink-0">
        <div v-for="i in 5" :key="i" class="rounded-xl p-4 border border-border-light mb-3">
          <el-skeleton :rows="2" animated />
        </div>
      </div>

      <!-- 空状态：区分「无日志」与「筛选无结果」 -->
      <div
        v-else-if="logList.length === 0"
        class="action-log-empty flex flex-col items-center justify-center my-20 text-text-secondary shrink-0"
      >
        <el-empty :description="hasActiveFilters ? '没有符合当前筛选条件的日志' : '暂无操作日志'">
          <el-button v-if="hasActiveFilters" type="primary" @click="handleResetFilters">
            清除筛选条件
          </el-button>
        </el-empty>
      </div>

      <!-- 日志列表：自然高度铺开，整页滚动由外层 BiliSideNavLayout 统一接管 -->
      <template v-else>
        <div class="action-log-toolbar flex items-center justify-between mb-3 shrink-0">
          <div class="flex items-center gap-3">
            <el-checkbox v-model="isAllSelected" class="action-log-toolbar__select-all">全选</el-checkbox>
            <span class="action-log-toolbar__count text-xs text-text-secondary">
              已选 {{ selectedLogIds.length }} 项 · 本页 {{ logList.length }} / 共 {{ total }} 条
            </span>
          </div>
        </div>

        <div class="action-log-list flex flex-col">
          <div
            v-for="item in logList"
            :key="item.log_id"
            class="log-item rounded-xl p-4 mb-3 border transition-colors"
            :class="
              item.success
                ? 'border-border-light hover:border-primary'
                : 'border-l-2 border-l-danger border-border-light hover:border-danger'
            "
          >
            <div class="flex items-start gap-4">
              <!-- 复选框 -->
              <el-checkbox
                :model-value="selectedLogIds.includes(item.log_id)"
                class="log-item__checkbox mt-0.5"
                @change="(val: boolean | string | number) => toggleLogSelect(item.log_id, val)"
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
                    <el-tag class="log-item__status-tag" :type="statusType(item.status)">
                      {{ statusText(item.status) }}
                    </el-tag>
                    <el-tag class="log-item__source-tag" effect="plain">{{ sourceText(item.source) }}</el-tag>
                  </div>
                  <span class="log-item__time text-xs text-text-secondary whitespace-nowrap">
                    {{ formatTime(item.started_at) }}
                  </span>
                </div>

                <!-- 元信息行 -->
                <div class="flex items-center gap-3 text-xs text-text-secondary mb-2 flex-wrap">
                  <span class="log-item__action-id">操作ID: {{ item.action_id }}</span>
                  <span v-if="item.browser_id" class="log-item__browser-id">浏览器: {{ item.browser_id }}</span>
                  <span class="log-item__duration">耗时: {{ formatDuration(item.execution_time * 1000) }}</span>
                  <span v-if="item.workflow_id" class="log-item__workflow-id">工作流: {{ item.workflow_id }}</span>
                  <el-tag
                    v-if="item.execution_id"
                    class="log-item__batch cursor-pointer"
                    :title="`执行批次 ${item.execution_id}，点击查看完整链路`"
                    @click="openChain(item.execution_id)"
                  >
                    批次: {{ shortId(item.execution_id) }}
                  </el-tag>
                  <el-button
                    v-if="item.execution_id"
                    class="log-item__filter-batch"
                    link
                    type="primary"
                    :title="`只看该批次（${item.execution_id}）的全部日志`"
                    @click="filterByExecution(item.execution_id)"
                  >
                    只看本批次
                  </el-button>
                  <span v-if="item.depth > 0 && item.depth <= 10" class="log-item__depth">嵌套深度: {{ item.depth }}</span>
                </div>

                <!-- 错误 / 提示信息（失败=错误红；成功但带原因=警告黄，如「预约未生效」） -->
                <div
                  v-if="item.error_message"
                  class="log-item__error text-xs rounded-lg px-2.5 py-1.5 mt-1 whitespace-pre-wrap break-all"
                  :class="item.success ? 'text-warning bg-warning-light-9' : 'text-danger bg-danger-light-9'"
                >
                  <span v-if="item.success" class="font-semibold">提示：</span>{{ item.error_message }}
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="log-item__actions flex items-center gap-1 shrink-0">
                <el-button class="log-item__detail-btn" :icon="View" @click="openDetail(item)">
                  详情
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页：跟在列表后面（整页滚动由外层布局负责，不再吸底） -->
        <BiliPagination
          class="action-log-pagination mt-3 flex justify-center"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          hide-on-single-page
          layout="sizes, prev, pager, next, total"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </template>
    </FlexContainer>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      class="log-detail-dialog"
      title="日志详情"
      width="720px"
      append-to-body
      :lock-scroll="false"
    >
      <el-skeleton v-if="detailLoading" :rows="6" animated class="py-6" />
      <div v-else-if="detailRecord" class="flex flex-col gap-4">
        <!-- 基本信息 -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-text-secondary">操作名称：</span>{{ detailRecord.action_name }}</div>
          <div><span class="text-text-secondary">操作ID：</span>{{ detailRecord.action_id }}</div>
          <div><span class="text-text-secondary">状态：</span>
            <el-tag :type="statusType(detailRecord.status)">{{ statusText(detailRecord.status) }}</el-tag>
          </div>
          <div><span class="text-text-secondary">来源：</span>{{ sourceText(detailRecord.source) }}</div>
          <div><span class="text-text-secondary">浏览器ID：</span>{{ detailRecord.browser_id || '-' }}</div>
          <div><span class="text-text-secondary">会话ID：</span>{{ detailRecord.session_id || '-' }}</div>
          <div><span class="text-text-secondary">执行耗时：</span>{{ formatDuration(detailRecord.execution_time * 1000) }}</div>
          <div><span class="text-text-secondary">嵌套深度：</span>{{ detailRecord.depth }}</div>
          <div><span class="text-text-secondary">开始时间：</span>{{ formatTime(detailRecord.started_at) }}</div>
          <div><span class="text-text-secondary">结束时间：</span>{{ formatTime(detailRecord.finished_at) }}</div>
          <div v-if="detailRecord.page_url" class="col-span-2">
            <span class="text-text-secondary">页面URL：</span>
            <span class="break-all">{{ detailRecord.page_url }}</span>
          </div>
          <div v-if="detailRecord.workflow_id" class="col-span-2">
            <span class="text-text-secondary">工作流ID：</span>{{ detailRecord.workflow_id }}
          </div>
          <div v-if="detailRecord.execution_id" class="col-span-2">
            <span class="text-text-secondary">执行批次：</span>
            <el-tag>{{ detailRecord.execution_id }}</el-tag>
          </div>
        </div>

        <!-- 错误信息（常显，不折叠） -->
        <div v-if="detailRecord.error_message">
          <div class="text-sm font-semibold mb-1 text-danger">错误信息</div>
          <pre class="log-detail__error-text text-xs bg-danger-light-9 text-danger rounded-lg p-3 overflow-auto whitespace-pre-wrap max-h-50">{{ detailRecord.error_message }}</pre>
        </div>

        <!-- 折叠区：入参 / 结果 / 变量 / 过程日志 -->
        <el-collapse v-model="detailCollapseActive">
          <el-collapse-item v-if="detailRecord.params" title="调用参数" name="params">
            <pre class="text-xs bg-fill-light rounded-lg p-3 overflow-auto max-h-75">{{ formatJson(detailRecord.params) }}</pre>
          </el-collapse-item>

          <el-collapse-item v-if="detailRecord.result_data" title="执行结果" name="result">
            <div class="flex items-center gap-2 mb-2 text-xs">
              <template v-if="resultSuccess !== null">
                <span class="text-text-secondary">执行成功：</span>
                <el-tag :type="resultSuccess ? 'success' : 'danger'">{{ resultSuccess ? '是' : '否' }}</el-tag>
              </template>
              <el-tag v-if="resultTruncated" type="warning" effect="plain">结果过大已截断</el-tag>
            </div>

            <!-- 复合操作：步骤执行摘要表（哪一步失败 / 耗时多少一眼可见） -->
            <template v-if="compositeSteps.length">
              <div class="log-detail__steps-summary text-xs text-text-secondary mb-1">
                步骤摘要：共 {{ compositeSteps.length }} 步，成功 {{ compositeStepsSuccessCount }} 步
              </div>
              <el-table :data="compositeSteps" border max-height="260" class="mb-2">
                <el-table-column label="步骤" min-width="140">
                  <template #default="{ row }">
                    <span class="truncate" :title="row.action_id">{{ row.action_name }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="80">
                  <template #default="{ row }">
                    <el-tag :type="row.success ? 'success' : 'danger'">
                      {{ row.success ? '成功' : '失败' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="耗时" width="90">
                  <template #default="{ row }">{{ formatDuration(row.execution_time * 1000) }}</template>
                </el-table-column>
                <el-table-column label="错误" min-width="180" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span v-if="row.error" class="text-danger break-all">{{ row.error }}</span>
                    <span v-else class="text-text-secondary">-</span>
                  </template>
                </el-table-column>
              </el-table>
            </template>

            <el-table :data="resultFields" border max-height="260" class="mb-2">
              <el-table-column prop="key" label="字段" width="220" show-overflow-tooltip />
              <el-table-column prop="value" label="值" show-overflow-tooltip />
            </el-table>

            <el-button text type="primary" @click="showRawJson = !showRawJson">
              {{ showRawJson ? '收起原始 JSON' : '查看原始 JSON' }}
            </el-button>
            <pre v-if="showRawJson" class="text-xs bg-fill-light rounded-lg p-3 overflow-auto whitespace-pre-wrap mt-2 max-h-75">{{ formatJson(detailRecord.result_data) }}</pre>
          </el-collapse-item>

          <!-- 变量快照（仅当实际记录到变量时展示，避免空壳折叠区） -->
          <el-collapse-item
            v-if="detailRecord.variables && Object.keys(detailRecord.variables).length"
            title="变量池快照"
            name="variables"
          >
            <pre class="text-xs bg-fill-light rounded-lg p-3 overflow-auto max-h-75">{{ formatJson(detailRecord.variables) }}</pre>
          </el-collapse-item>

          <el-collapse-item
            v-if="detailRecord.logs?.length"
            :title="`执行过程日志 (${detailRecord.logs.length})`"
            name="processLogs"
          >
            <div class="text-xs bg-fill-light rounded-lg p-3 overflow-auto max-h-75">
              <div v-for="(line, idx) in detailRecord.logs" :key="idx" class="py-0.5">{{ line }}</div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      <el-empty v-else description="未找到该日志或加载失败" />
      <template #footer>
        <div class="log-detail-dialog__footer flex items-center justify-between">
          <div class="flex items-center gap-2">
            <el-button
              v-if="detailRecord?.execution_id"
              class="log-detail-dialog__chain-btn"
              :icon="View"
              @click="openChain(detailRecord.execution_id)"
            >
              查看同批次链路
            </el-button>
            <el-button
              v-if="detailRecord?.execution_id"
              class="log-detail-dialog__filter-batch-btn"
              @click="filterByExecution(detailRecord.execution_id)"
            >
              只看本批次
            </el-button>
          </div>
          <el-button class="log-detail-dialog__close" @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 执行链路弹窗 -->
    <ActionLogChainDialog
      v-model="chainVisible"
      :execution-id="chainExecutionId"
      @select="onChainSelect"
    />
  </FlexContainer>
</template>
