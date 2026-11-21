<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useWindowSize } from '@vueuse/core'
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import type { ScrapyStatus, ScrapyStatusResp } from '@/models/api/lottery/lotdata.ts'
import lottery_database_bili_api from '@/api/lottery_data/bili/lottery_database_bili_api.ts'
import {
  fetchCrawlerServiceStatus,
  operateCrawlerService,
  type CrawlerServiceAction
} from '@/api/lottery_data/bili/crawler_service_api.ts'
import biliMessage, { ElMessageBox } from '@/utils/message'
import { Refresh, Clock, Timer, DataAnalysis, Check, Close, Loading } from '@element-plus/icons-vue'

const props = withDefaults(
  defineProps<{
    /** 管理端：在爬虫名称后展示后端服务名，并显示启停 / 重启按钮 */
    showAdminActions?: boolean
  }>(),
  { showAdminActions: false }
)

/** 状态字段 → crawler 后台服务名（BackgroundServiceName），启停接口以此为入参 */
const CRAWLER_BACKEND_SERVICE: Record<string, string> = {
  dyn_scrapy_status: 'GET_DYN',
  topic_scrapy_status: 'GET_TOPIC',
  reserve_scrapy_status: 'GET_RESERVE_INFO',
  official_scrapy_status: 'REFRESH_BILI_LOTDATA_DATABASE',
  other_space_scrapy_status: 'GET_OTHERS_LOT_DYN'
}

const getBackendServiceName = (category: string): string =>
  CRAWLER_BACKEND_SERVICE[category] || ''

const ACTION_LABEL: Record<CrawlerServiceAction, string> = {
  start: '启动',
  stop: '停止',
  restart: '重启'
}

const is_loading = ref(false)

const placeholder_props = ref({
  inner_text: `选一个平台看看数据吧！`,
  is_show: true
})

interface KeyToChineseMap {
  [key: string]: string
}

const keyToChineseMap: KeyToChineseMap = {
  succ_count: '成功数量',
  start_time: '开始时间',
  start_time_str: '开始时间',
  crawling_speed: '爬取速度',
  is_running: '运行状态',
  last_update_time: '最后更新时间',
  last_update_time_str: '最后更新时间',
  null_count: '空值数量',
  processed_items_count: '处理项目数量',
  total_run_duration: '总运行时长',
  dyn_scrapy_status: '动态爬虫',
  topic_scrapy_status: '话题爬虫',
  reserve_scrapy_status: '直播预约爬虫',
  official_scrapy_status: '官方抽奖爬虫',
  other_space_scrapy_status: '空间抽奖爬虫',
  end_params: '结束参数',
  end_success_params: '成功结束参数',
  init_params: '初始参数',
  running_params: '运行中任务',
  running_params_set: '运行中参数集',
  health_status: '健康状态'
}

// 爬虫健康状态展示映射
const healthStatusMap: Record<string, { text: string; class: string }> = {
  normal: {
    text: '正常',
    class: 'text-success bg-success-light-9'
  },
  stuck: {
    text: '卡住',
    class: 'text-warning bg-warning-light-9'
  },
  stopped: {
    text: '已停止',
    class: 'text-danger bg-danger-light-9'
  }
}
const getHealthStatusMeta = (status?: string) => {
  return (
    healthStatusMap[status ?? ''] ?? {
      text: status || '未知',
      class: 'text-text-secondary bg-bg-page'
    }
  )
}

const getKeyName = (key: string): undefined | string => {
  return keyToChineseMap[key]
}

// 官方/空间抽奖爬虫使用另一套字段结构（start_ts/total_num/progress/running_params 等）
// 动态/话题/预约爬虫使用 ScrapyStatus 结构（start_time_str/processed_items_count/running_params_set 等）
const isOfficialType = (s: any): boolean =>
  !!(s && (s.start_ts !== undefined || s.total_num !== undefined))

// 各类字段的统一取值（带兜底，避免两种结构字段缺失时报错）
const statSucc = (s: any) => s?.succ_count ?? 0
const statProcessed = (s: any) => s?.processed_items_count ?? s?.total_num ?? 0
const statTotal = (s: any) => s?.total_num ?? 0
const statNull = (s: any) => s?.null_count ?? 0
const statSpeed = (s: any) => s?.crawling_speed ?? 0
const startStr = (s: any) => s?.start_time_str ?? s?.start_time ?? '未启动'
const updateStr = (s: any) => s?.last_update_time_str ?? s?.update_time ?? '未启动'

/** 官方/空间型的 progress 是 0~1 的比例（后端 show_pace），统一换算成 0~100 */
const progressPercent = (s: any): number => {
  const percent = Math.round(Number(s?.progress ?? 0) * 100)
  return Math.min(100, Math.max(0, percent))
}

/** 剩余待处理数量（官方/空间型） */
const statRemaining = (s: any): number => Math.max(0, statTotal(s) - statSucc(s))

/** 运行中任务列表：新版为 WorkerSummaryModel[]，老接口为裸 id[] */
const getParamsList = (s: any): any[] => {
  const list = s?.running_params_set ?? s?.running_params ?? []
  return Array.isArray(list) ? list : []
}

/** 取参数本体：StatsPlugin 的 init/end 是 WorkerSummaryModel，参数在 params 里 */
const paramPayload = (value: any): any =>
  value && typeof value === 'object' && value.params && typeof value.params === 'object'
    ? value.params
    : value

/** 大整数（如动态 ID）经 JSON 解析后会丢精度，超出安全整数时退回 seqId */
const safeParamId = (label: string, value: any): string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return `${label} ${value}`
  const num = Number(value)
  if (!Number.isFinite(num)) return `${label} ${value}`
  return Number.isSafeInteger(num) ? `${label} ${num}` : null
}

/** 运行中任务的短标识：空间用户显示 UID，动态判定显示动态 ID，其余按 seqId 兜底 */
const runningParamLabel = (item: any): string => {
  if (typeof item === 'number' || typeof item === 'string') return `参数 ${item}`
  const fallback = item?.seqId !== undefined ? `任务 #${item.seqId}` : '任务'
  const params = item?.params
  const obj = params?.obj
  if (obj && typeof obj === 'object') {
    if (obj.uid !== undefined) return safeParamId('UID', obj.uid) ?? fallback
    if (obj.dynamic_id !== undefined) return safeParamId('动态', obj.dynamic_id) ?? fallback
  }
  if (params && typeof params === 'object') {
    if (params.rid !== undefined) return safeParamId('RID', params.rid) ?? fallback
    if (params.topic_id !== undefined) return safeParamId('话题', params.topic_id) ?? fallback
    if (params.reserve_id !== undefined) return safeParamId('预约', params.reserve_id) ?? fallback
  }
  return fallback
}

/** WorkerModel.fetchStatusStr 在运行中恒为 pending，这里转成更直观的文案 */
const runningParamStatus = (item: any): string => {
  const status = String(item?.fetchStatusStr ?? '')
  if (!status) return '运行中'
  return status.toLowerCase() === 'pending' ? '运行中' : status
}

const fmtUnix = (ts?: number): string =>
  ts ? dayjs.unix(ts).format('MM-DD HH:mm:ss') : '—'

/** 参数是否值得展示：避免卡片长期挂着三行「无」 */
const hasParamValue = (value: any): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value !== 'object') return value !== ''
  const payload = paramPayload(value)
  const extraKeys = Object.keys(payload?.extra_fields ?? {})
  return (
    ['rid', 'topic_id', 'reserve_id'].some(
      (key) => payload?.[key] !== undefined && payload?.[key] !== null
    ) || extraKeys.length > 0
  )
}

/** 只保留有内容的初始/结束参数；运行中任务由专门的区块展示 */
const getParamKeys = (s: any): string[] =>
  ['init_params', 'end_params', 'end_success_params'].filter((key) =>
    hasParamValue(s?.[key])
  )
const { width: windowWidth } = useWindowSize()
const data = ref<ScrapyStatusResp>({
  dyn_scrapy_status: {
    crawling_speed: 0,
    end_params: { extra_fields: null },
    end_success_params: { extra_fields: null },
    init_params: { extra_fields: null },
    is_running: false,
    last_update_time: 0,
    last_update_time_str: '',
    null_count: 0,
    processed_items_count: 0,
    running_params_set: [],
    start_time: 0,
    start_time_str: '',
    succ_count: 0,
    total_run_duration: 0,
    health_status: ''
  },
  topic_scrapy_status: {
    crawling_speed: 0,
    end_params: { extra_fields: null },
    end_success_params: { extra_fields: null },
    init_params: { extra_fields: null },
    is_running: false,
    last_update_time: 0,
    last_update_time_str: '',
    null_count: 0,
    processed_items_count: 0,
    running_params_set: [],
    start_time: 0,
    start_time_str: '',
    succ_count: 0,
    total_run_duration: 0,
    health_status: ''
  },
  reserve_scrapy_status: {
    crawling_speed: 0,
    end_params: { extra_fields: null },
    end_success_params: { extra_fields: null },
    init_params: { extra_fields: null },
    is_running: false,
    last_update_time: 0,
    last_update_time_str: '',
    null_count: 0,
    processed_items_count: 0,
    running_params_set: [],
    start_time: 0,
    start_time_str: '',
    succ_count: 0,
    total_run_duration: 0,
    health_status: ''
  },
  official_scrapy_status: {
    succ_count: 0,
    start_ts: 0,
    total_num: 0,
    progress: 0,
    is_running: false,
    update_ts: 0,
    running_params: [],
    update_time: '',
    start_time: ''
  },
  other_space_scrapy_status: {
    succ_count: 0,
    start_ts: 0,
    total_num: 0,
    progress: 0,
    is_running: false,
    update_ts: 0,
    running_params: [],
    update_time: '',
    start_time: ''
  }
})

const formatValue = (key: string, value: any) => {
  const formatters = {
    time: (v: number) => (v ? dayjs.unix(v).format('MM月DD日 HH:mm:ss') : '未启动'),
    timeStr: (v: string) => v || '未启动',
    speed: (v: number) => `${v.toFixed(4)} 个/秒`,
    count: (v: number) => v.toLocaleString(),
    bool: (v: boolean) => (v ? '运行中' : '已停止'),
    duration: (v: number) => {
      const hours = Math.floor(v / 3600)
      const minutes = Math.floor((v % 3600) / 60)
      const seconds = Math.floor(v % 60)
      return `${hours}小时${minutes}分${seconds}秒`
    },
    params: (v: any) => {
      if (!v) return '无'
      const payload = paramPayload(v)
      const parts = []
      if (payload.rid) parts.push(`RID: ${payload.rid}`)
      if (payload.topic_id) parts.push(`话题ID: ${payload.topic_id}`)
      if (payload.reserve_id) parts.push(`预约ID: ${payload.reserve_id}`)
      return parts.length ? parts.join(', ') : '无参数'
    },
    paramsList: (v: any[]) => {
      if (!v || !v.length) return '无'
      return `${v.length}个参数`
    },
    default: (v: any) => {
      if (v === null || v === undefined) return '无'
      if (typeof v === 'object') return JSON.stringify(v)
      return v
    }
  }

  if (key === 'start_time' || key === 'last_update_time') return formatters.time(value)
  if (key === 'start_time_str' || key === 'last_update_time_str') return formatters.timeStr(value)
  if (key === 'crawling_speed') return formatters.speed(value)
  if (/_(count|num)$/.test(key)) return formatters.count(value)
  if (key === 'is_running') return formatters.bool(value)
  if (key === 'total_run_duration') return formatters.duration(value)
  if (key === 'end_params' || key === 'end_success_params' || key === 'init_params')
    return formatters.params(value)
  if (Array.isArray(value)) return formatters.paramsList(value)
  return formatters.default(value)
}
/**
 * 后台服务在 crawler 全局调度器中的状态，启停按钮的可用性以此为准：
 * - unknown：还没成功拿到调度状态（首次加载中 / 接口失败），一律不放行；
 * - stopped：未注册在调度器中，只能「启动」；
 * - paused：已注册但未排期（next_run_time 为 null），只能「停止 / 重启」；
 * - scheduled：已注册且已排期，只能「停止 / 重启」。
 */
type SchedulerState = 'unknown' | 'stopped' | 'paused' | 'scheduled'

/** service_name → 下次触发时间（null 表示已注册但未排期 / 已暂停） */
const scheduled_services = ref<Map<string, number | null>>(new Map())
/** 是否至少成功拉到过一次调度状态：失败时不能把服务误判成「已停止」 */
const scheduled_loaded = ref(false)
const scheduled_loading = ref(false)
/** 正在执行的操作，格式为 `${service_name}:${action}`，用于按钮 loading */
const operating_key = ref('')

const getSchedulerState = (service_name: string): SchedulerState => {
  if (!scheduled_loaded.value) return 'unknown'
  if (!scheduled_services.value.has(service_name)) return 'stopped'
  return scheduled_services.value.get(service_name) == null ? 'paused' : 'scheduled'
}

/** 每个调度状态下允许的动作：已停止只能启动；已排期 / 暂停只能停止、重启 */
const ALLOWED_ACTIONS: Record<SchedulerState, CrawlerServiceAction[]> = {
  unknown: [],
  stopped: ['start'],
  scheduled: ['stop', 'restart'],
  paused: ['stop', 'restart']
}

const canOperate = (service_name: string, action: CrawlerServiceAction): boolean =>
  ALLOWED_ACTIONS[getSchedulerState(service_name)].includes(action)

/** 管理端状态徽标：调度状态 + 当前是否在执行（已排期但空闲不算「运行中」） */
type AdminCrawlerState = 'unknown' | 'stopped' | 'paused' | 'scheduled' | 'running'
const adminStateMap: Record<AdminCrawlerState, { text: string; class: string }> = {
  unknown: { text: '状态未知', class: 'text-text-secondary' },
  stopped: { text: '已停止', class: 'text-danger' },
  paused: { text: '已暂停', class: 'text-warning' },
  scheduled: { text: '已排期', class: 'text-primary' },
  running: { text: '运行中', class: 'text-success' }
}
const getAdminStateMeta = (service_name: string, is_running: boolean) => {
  const scheduler_state = getSchedulerState(service_name)
  const state: AdminCrawlerState =
    scheduler_state === 'scheduled' ? (is_running ? 'running' : 'scheduled') : scheduler_state
  return adminStateMap[state]
}

const isOperating = (service_name: string, action: CrawlerServiceAction): boolean =>
  operating_key.value === `${service_name}:${action}`

const load_scheduled_services = async () => {
  // 自动刷新与手动刷新可能同时触发，避免重复请求
  if (!props.showAdminActions || scheduled_loading.value) return
  scheduled_loading.value = true
  try {
    // 错误提示由统一请求层处理；失败时保留上一次的服务状态
    const data = await fetchCrawlerServiceStatus()
    if (data) {
      scheduled_services.value = new Map(
        (data.scheduled || []).map(
          (item) => [item.service_name, item.next_run_time ?? null] as const
        )
      )
      scheduled_loaded.value = true
    }
  } finally {
    scheduled_loading.value = false
  }
}

const handle_manual_refresh = async () => {
  await Promise.all([handle_get_scrapy_status(), load_scheduled_services()])
}

const handle_service_action = async (category: string, action: CrawlerServiceAction) => {
  const service_name = getBackendServiceName(category)
  if (!service_name) return
  const label = ACTION_LABEL[action]
  if (action !== 'start') {
    try {
      await ElMessageBox.confirm(`确定要${label}后台服务 ${service_name} 吗？`, '提示', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
  }
  operating_key.value = `${service_name}:${action}`
  try {
    // 失败提示由统一请求层弹出，成功时展示后端返回的结果描述
    const result = await operateCrawlerService(action, service_name)
    if (result) {
      biliMessage.success(result.msg || `${label}成功`)
      await Promise.all([handle_get_scrapy_status(), load_scheduled_services()])
    }
  } finally {
    operating_key.value = ''
  }
}

const handle_get_scrapy_status = async () => {
  is_loading.value = true
  try {
    const res = await lottery_database_bili_api.get_all_scrapy_status()
    // 不显示未登录错误消息
    if (res.code === -101) {
      console.log('未登录状态，继续显示数据')
      // 即使未登录，也尝试显示数据
      if (res.data) {
        data.value = res.data
      }
    } else if (res.code) {
      biliMessage.error(res.msg)
    } else {
      data.value = res.data
    }
  } finally {
    is_loading.value = false
  }
  return data.value
}
const handle_show_scrapy_data = (scrapy_data: ScrapyStatus | any) => {
  // 过滤并排序显示的字段，确保重要信息优先显示
  const priorityOrder = [
    'is_running',
    'succ_count',
    'processed_items_count',
    'null_count',
    'crawling_speed',
    'last_update_time_str',
    'start_time_str',
    'total_run_duration',
    'init_params',
    'end_params',
    'end_success_params'
  ]

  return Object.entries(scrapy_data)
    .filter(([k, v]) => getKeyName(k) && k !== 'running_params_set') // 排除参数集合，太长了
    .sort((a, b) => {
      const indexA = priorityOrder.indexOf(a[0])
      const indexB = priorityOrder.indexOf(b[0])
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
}
// ============ 首屏数据：setup 阶段取，SSR / 预渲染的 HTML 才有内容 ============
/**
 * 爬虫状态列表由服务端在渲染时取好并进入 Nuxt payload，
 * 客户端 hydration 直接复用（不重复请求）。
 *
 * handler 额外带回 fetchedAt（本次取数的时间戳），供挂载后判断数据是否陈旧：
 * - SSR 实时渲染：时间戳是秒级前的新数据，无需再请求，避免首屏把接口打两遍；
 * - 预渲染快照（nuxt generate）：时间戳是构建期时间，早已陈旧，
 *   挂载后必须拉一次真实状态；
 * - 纯客户端路由导航：handler 在客户端刚执行完，fetchedAt 很新，同样不重复请求。
 */
const SCRAPY_STATUS_STALE_MS = 60 * 1000
const { data: ssrScrapyData } = await useAsyncData('scrapy-status', async () => {
  try {
    const value = await handle_get_scrapy_status()
    return { value, fetchedAt: Date.now() }
  } catch {
    return { value: null, fetchedAt: Date.now() }
  }
})
/**
 * 必须无条件写回 payload。
 *
 * 不能写成 `if (!data.value && ssrScrapyData.value)`：`data` 声明时带了一个**默认占位对象**
 * （dyn_scrapy_status 等字段），永远为真，于是 hydration 时 payload 根本不会被应用 ——
 * 服务端渲染真实数据、客户端渲染默认占位，出现大量
 * `Hydration text content mismatch（官方抽奖爬虫 / 动态爬虫）`。
 */
if (ssrScrapyData.value?.value) data.value = ssrScrapyData.value.value

onMounted(() => {
  // 仅在首屏数据「不存在或已陈旧」（预渲染快照）时才补拉一次真实状态；
  // SSR 实时数据 / 客户端导航刚取到的数据都不重复请求。
  // 自动轮询默认关闭，不能指望它来纠正首屏。
  const fetchedAt = ssrScrapyData.value?.fetchedAt ?? 0
  const isStale = !ssrScrapyData.value || Date.now() - fetchedAt > SCRAPY_STATUS_STALE_MS
  if (isStale) {
    handle_get_scrapy_status().catch(() => { })
  }
  if (props.showAdminActions) {
    load_scheduled_services()
  }
  startAutoRefresh()
})
const isAutoRefresh = ref(false)
let autoRefreshTimer: number | undefined
const startAutoRefresh = () => {
  if (!autoRefreshTimer && isAutoRefresh.value) {
    autoRefreshTimer = window.setInterval(() => {
      handle_get_scrapy_status()
      // 调度状态同样会被外部改变（别的管理员操作 / 服务自行停止），一并刷新，
      // 否则按钮可用性会一直停在页面打开时的状态
      if (props.showAdminActions) load_scheduled_services()
    }, 10e3) // 每隔10秒刷新一次
  }
}
const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = undefined
  }
}
watch(isAutoRefresh, (newValue) => {
  if (newValue) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})
onBeforeUnmount(() => {
  stopAutoRefresh() // 清理定时器防止内存泄漏
})
</script>

<template>
  <div class="flex w-full flex-0.98 bg-bg py-6 px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-6xl mx-auto" v-loading="is_loading" element-loading-text="加载中...">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 class="text-2xl font-bold text-text-primary flex items-center">
          <DataAnalysis class="mr-2 w-7 h-7 text-text-primary" />
          BiliBili爬虫状态监控
        </h1>
        <div class="flex items-center space-x-4 w-full md:w-auto">
          <div class="flex items-center space-x-2 flex-1 md:flex-none">
            <el-switch
              v-model="isAutoRefresh"
              inline-prompt
              active-text="自动刷新"
              inactive-text="手动刷新"
              size="large"
            />
          </div>
          <el-button
            type="primary"
            @click="handle_manual_refresh"
            :disabled="isAutoRefresh"
            :loading="is_loading"
            class="flex-1 md:flex-none"
          >
            <Refresh class="mr-1 w-4 h-4" />
            {{ is_loading ? '刷新中...' : '立即刷新' }}
          </el-button>
        </div>
      </div>
      
      <!-- 统计摘要 -->
      <div v-if="data" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-bg rounded-lg border border-border-light p-4 flex flex-col">
          <div class="text-text-secondary text-sm mb-2">总爬虫数量</div>
          <div class="text-2xl font-bold text-text-primary">{{ Object.entries(data).filter((el) => getKeyName(el[0]) && el[1]).length }}</div>
        </div>
        <div class="bg-bg rounded-lg border border-border-light p-4 flex flex-col">
          <div class="text-text-secondary text-sm mb-2">运行中爬虫</div>
          <div class="text-2xl font-bold text-success">{{ Object.entries(data).filter((el) => getKeyName(el[0]) && el[1]?.is_running).length }}</div>
        </div>
        <div class="bg-bg rounded-lg border border-border-light p-4 flex flex-col">
          <div class="text-text-secondary text-sm mb-2">总成功数量</div>
          <div class="text-2xl font-bold text-text-primary">{{ Object.entries(data).filter((el) => el[1]).reduce((sum, [_, scrapy]) => sum + statSucc(scrapy), 0).toLocaleString() }}</div>
        </div>
        <div class="bg-bg rounded-lg border border-border-light p-4 flex flex-col">
          <div class="text-text-secondary text-sm mb-2">总处理数量</div>
          <div class="text-2xl font-bold text-text-primary">{{ Object.entries(data).reduce((sum, [_, scrapy]) => sum + statProcessed(scrapy), 0).toLocaleString() }}</div>
        </div>
      </div>
      
      <div v-if="data" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="([category, scrapy_data], idx) in Object.entries(data).filter((el) => getKeyName(el[0]) && el[1])" 
          :key="category"
          class="rounded-lg overflow-hidden border border-border-light bg-bg transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col"
        >
          <div class="p-4 border-b border-border-light">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <div class="bili-crawler-card__title-box flex min-w-0 flex-wrap items-center gap-2">
                <h3 class="text-xl font-semibold text-text-primary">{{ getKeyName(category) }}</h3>
                <el-tag
                  v-if="showAdminActions && getBackendServiceName(category)"
                  class="bili-crawler-card__backend-name font-mono"
                  type="info"
                  effect="plain"
                >
                  {{ getBackendServiceName(category) }}
                </el-tag>
              </div>
              <div class="flex items-center gap-2">
                <!-- 代理池熔断时任务并没有失败，只是被挡住，避免误读成「已停止」 -->
                <el-tooltip
                  v-if="(scrapy_data as any).waiting_for_proxy"
                  :content="(scrapy_data as any).blocked_reason || '代理池不可用，任务暂时被阻塞'"
                  placement="top"
                >
                  <el-tag type="warning" effect="light">等待代理恢复</el-tag>
                </el-tooltip>
                <!-- 管理端：状态以调度器为准（与下方按钮可用性同源），已排期但空闲不再误显示为「已停止」 -->
                <div
                  v-if="showAdminActions && getBackendServiceName(category)"
                  class="bili-crawler-card__scheduler-status flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  :class="getAdminStateMeta(getBackendServiceName(category), scrapy_data.is_running).class"
                >
                  {{ getAdminStateMeta(getBackendServiceName(category), scrapy_data.is_running).text }}
                </div>
                <div
                  v-else
                  class="flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  :class="scrapy_data.is_running ? 'text-success' : 'text-danger'"
                >
                  <el-icon v-if="scrapy_data.is_running" class="text-success w-4 h-4"><Check /></el-icon>
                  <el-icon v-else class="text-danger w-4 h-4"><Close /></el-icon>
                  <span class="ml-1">{{ scrapy_data.is_running ? '运行中' : '已停止' }}</span>
                </div>
                <div
                  v-if="!isOfficialType(scrapy_data)"
                  class="flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  :class="getHealthStatusMeta((scrapy_data as any).health_status).class"
                >
                  <span>{{ getHealthStatusMeta((scrapy_data as any).health_status).text }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-6 flex-1">
            <div class="space-y-5">
              <!-- 抓取进度：官方/空间型有 total_num，按真实 progress 展示 -->
              <div v-if="isOfficialType(scrapy_data)" class="flex flex-col">
                <div class="mb-2 flex items-center justify-between">
                  <div class="font-medium text-text-regular flex items-center">
                    <Timer class="mr-2 w-4 h-4 text-text-secondary" />
                    抓取进度
                  </div>
                  <span class="text-sm text-text-secondary">
                    {{ statSucc(scrapy_data).toLocaleString() }} / {{ statTotal(scrapy_data).toLocaleString() }}
                    <span class="ml-1 font-medium text-text-primary">{{ progressPercent(scrapy_data) }}%</span>
                  </span>
                </div>
                <el-progress
                  :percentage="progressPercent(scrapy_data)"
                  :stroke-width="10"
                  :show-text="false"
                />
              </div>

              <!-- 数据统计 -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                  <div class="text-text-secondary text-xs mb-1">成功数量</div>
                  <div class="text-lg font-bold text-text-primary">{{ statSucc(scrapy_data).toLocaleString() }}</div>
                </div>
                <template v-if="isOfficialType(scrapy_data)">
                  <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                    <div class="text-text-secondary text-xs mb-1">总数</div>
                    <div class="text-lg font-bold text-text-primary">{{ statTotal(scrapy_data).toLocaleString() }}</div>
                  </div>
                  <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                    <div class="text-text-secondary text-xs mb-1">剩余</div>
                    <div class="text-lg font-bold text-text-primary">{{ statRemaining(scrapy_data).toLocaleString() }}</div>
                  </div>
                  <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                    <div class="text-text-secondary text-xs mb-1">运行中任务</div>
                    <div class="text-lg font-bold text-text-primary">{{ getParamsList(scrapy_data).length }}</div>
                  </div>
                </template>
                <template v-else>
                  <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                    <div class="text-text-secondary text-xs mb-1">处理数量</div>
                    <div class="text-lg font-bold text-text-primary">{{ statProcessed(scrapy_data).toLocaleString() }}</div>
                  </div>
                  <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                    <div class="text-text-secondary text-xs mb-1">空值数量</div>
                    <div class="text-lg font-bold text-text-primary">{{ statNull(scrapy_data).toLocaleString() }}</div>
                  </div>
                  <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                    <div class="text-text-secondary text-xs mb-1">爬取速度</div>
                    <div class="text-lg font-bold text-text-primary">{{ statSpeed(scrapy_data).toFixed(4) }} 个/秒</div>
                  </div>
                </template>
              </div>

              <!-- 时间信息 -->
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <div class="font-medium text-text-regular">开始时间</div>
                  <div class="text-text-primary">{{ startStr(scrapy_data) }}</div>
                </div>
                <div class="flex justify-between items-center">
                  <div class="font-medium text-text-regular">最后更新</div>
                  <div class="text-text-primary">{{ updateStr(scrapy_data) }}</div>
                </div>
              </div>

              <!-- 运行中任务：状态 + 参数摘要，替代原来的裸 id / 纯 JSON -->
              <div v-if="getParamsList(scrapy_data).length" class="space-y-2">
                <div class="flex items-center justify-between">
                  <div class="font-medium text-text-regular">运行中任务</div>
                  <el-tag type="success" effect="light">{{ getParamsList(scrapy_data).length }}</el-tag>
                </div>
                <!-- 全部展示运行中任务（可达上百个），用滚动区限高，避免卡片无限拉长 -->
                <div class="bili-crawler-card__running-tasks flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                  <el-popover
                    v-for="(item, idx) in getParamsList(scrapy_data)"
                    :key="`${item?.seqId ?? idx}`"
                    placement="top"
                    :width="360"
                    trigger="hover"
                  >
                    <template #reference>
                      <el-tag type="info" effect="plain" class="cursor-pointer font-mono">
                        {{ runningParamLabel(item) }}
                        <span v-if="item?.retry_count" class="ml-1 text-warning">重试{{ item.retry_count }}</span>
                      </el-tag>
                    </template>
                    <div class="space-y-2">
                      <div class="text-sm text-text-regular">
                        任务 #{{ item?.seqId ?? '-' }} · {{ runningParamStatus(item) }}
                        <span v-if="item?.retry_count"> · 重试 {{ item.retry_count }} 次</span>
                      </div>
                      <div class="text-xs text-text-placeholder">
                        开始 {{ fmtUnix(item?.created_at) }} · 更新 {{ fmtUnix(item?.updated_at) }}
                      </div>
                      <pre class="m-0 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded border border-border-light bg-bg p-3 text-sm text-text-regular">{{ JSON.stringify(item?.params ?? item, null, 2) }}</pre>
                    </div>
                  </el-popover>
                </div>
              </div>

              <!-- 参数信息：只展示有内容的初始/结束参数，避免长期挂着「无」 -->
              <div v-if="getParamKeys(scrapy_data).length" class="space-y-2">
                <div v-for="key in getParamKeys(scrapy_data)" :key="key" class="flex justify-between items-center">
                  <div class="font-medium text-text-regular">{{ getKeyName(key) }}</div>
                  <el-popover placement="top" :width="300" trigger="hover">
                    <template #reference>
                      <span class="text-primary hover:underline cursor-pointer text-sm">{{ formatValue(key, (scrapy_data as any)[key]) }}</span>
                    </template>
                    <div class="params-detail-scroll p-3 rounded border border-border-light bg-bg max-h-60 overflow-auto">
                      <pre class="text-sm text-text-regular m-0 whitespace-pre-wrap break-all">{{ JSON.stringify((scrapy_data as any)[key], null, 2) }}</pre>
                    </div>
                  </el-popover>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-4 border-t border-border-light bg-bg-page">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center text-sm text-text-secondary">
                <Clock class="mr-2 w-4 h-4 text-text-placeholder" />
                <span v-if="!isOfficialType(scrapy_data)">持续运行：{{ formatValue('total_run_duration', (scrapy_data as any).total_run_duration) }}</span>
                <span v-else>更新时间：{{ updateStr(scrapy_data) }}</span>
              </div>
              <div
                v-if="showAdminActions && getBackendServiceName(category)"
                class="bili-crawler-card__service-actions flex flex-wrap items-center gap-2"
              >
                <el-button
                  :id="`crawler-service-${getBackendServiceName(category)}-start`"
                  type="primary"
                  :disabled="!canOperate(getBackendServiceName(category), 'start')"
                  :loading="isOperating(getBackendServiceName(category), 'start')"
                  @click="handle_service_action(category, 'start')"
                >
                  启动
                </el-button>
                <el-button
                  :id="`crawler-service-${getBackendServiceName(category)}-stop`"
                  type="danger"
                  :disabled="!canOperate(getBackendServiceName(category), 'stop')"
                  :loading="isOperating(getBackendServiceName(category), 'stop')"
                  @click="handle_service_action(category, 'stop')"
                >
                  停止
                </el-button>
                <el-button
                  :id="`crawler-service-${getBackendServiceName(category)}-restart`"
                  :disabled="!canOperate(getBackendServiceName(category), 'restart')"
                  :loading="isOperating(getBackendServiceName(category), 'restart')"
                  @click="handle_service_action(category, 'restart')"
                >
                  重启
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Placeholder v-else v-model="placeholder_props" />
    </div>
  </div>
</template>
