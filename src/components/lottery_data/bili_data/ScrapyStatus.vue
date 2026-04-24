<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useWindowSize } from '@vueuse/core'
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import type { ScrapyStatus, ScrapyStatusResp } from '@/models/api/lottery/lotdata.ts'
import lottery_database_bili_api from '@/api/lottery_data/bili/lottery_database_bili_api.ts'
import biliMessage from '@/utils/message'
import { Refresh, Clock, Timer, DataAnalysis, Check, Close, Loading } from '@element-plus/icons-vue'

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
  end_params: '结束参数',
  end_success_params: '成功结束参数',
  init_params: '初始参数',
  running_params_set: '运行中参数集'
}

const getKeyName = (key: string): undefined | string => {
  return keyToChineseMap[key]
}
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
    total_run_duration: 0
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
    total_run_duration: 0
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
    total_run_duration: 0
  }
})

const formatValue = (key: string, value: any) => {
  const formatters = {
    time: (v: number) => (v ? dayjs.unix(v).format('MM月DD日 HH:mm:ss') : '未启动'),
    timeStr: (v: string) => v || '未启动',
    speed: (v: number) => `${v.toFixed(4)} 秒/个`,
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
      const parts = []
      if (v.rid) parts.push(`RID: ${v.rid}`)
      if (v.topic_id) parts.push(`话题ID: ${v.topic_id}`)
      if (v.reserve_id) parts.push(`预约ID: ${v.reserve_id}`)
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
  if (key === 'running_params_set') return formatters.paramsList(value)
  return formatters.default(value)
}
const handle_get_scrapy_status = () => {
  is_loading.value = true
  lottery_database_bili_api
    .get_all_scrapy_status()
    .then((res) => {
      res.code
        ? biliMessage.error(res.msg)
        : (data.value = res.data)
    })
    .finally(() => {
      is_loading.value = false
    })
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
onMounted(() => {
  handle_get_scrapy_status()
  startAutoRefresh()
})
const isAutoRefresh = ref(false)
let autoRefreshTimer: number | undefined
const startAutoRefresh = () => {
  if (!autoRefreshTimer && isAutoRefresh.value) {
    autoRefreshTimer = window.setInterval(() => {
      handle_get_scrapy_status()
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
  <div class="flex w-full min-h-screen bg-bg py-6 px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-text-primary flex items-center">
          <DataAnalysis class="mr-2 text-text-primary" />
          BiliBili爬虫状态监控
        </h1>
        <div class="flex items-center space-x-4">
          <el-switch
            v-model="isAutoRefresh"
            inline-prompt
            active-text="自动刷新"
            inactive-text="手动刷新"
            size="large"
            class="mr-2"
          />
          <el-button
            type="primary"
            @click="handle_get_scrapy_status"
            :disabled="isAutoRefresh"
            :loading="is_loading"
          >
            <Refresh class="mr-1" />
            {{ is_loading ? '刷新中...' : '立即刷新' }}
          </el-button>
        </div>
      </div>
      
      <div v-if="data" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="([category, scrapy_data], idx) in Object.entries(data).filter((el) => getKeyName(el[0]))" 
          :key="category"
          class="rounded-lg overflow-hidden border border-border-light bg-bg transition-all"
        >
          <div class="p-4">
            <div class="flex justify-between items-center">
              <h3 class="text-xl font-semibold text-text-primary">{{ getKeyName(category) }}</h3>
              <div 
                class="flex items-center px-3 py-1 rounded-full text-sm font-medium"
                :class="scrapy_data.is_running ? 'text-success' : 'text-danger'"
              >
                <el-icon v-if="scrapy_data.is_running" class="text-success"><Check /></el-icon>
                <el-icon v-else class="text-danger"><Close /></el-icon>
                <span class="ml-1">{{ scrapy_data.is_running ? '运行中' : '已停止' }}</span>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="space-y-4">
              <div 
                v-for="([key, value], i) in handle_show_scrapy_data(scrapy_data)" 
                :key="key"
                class="flex justify-between items-center pb-2 border-b border-border-light"
              >
                <div class="font-medium text-text-regular flex items-center">
                  <span v-if="key === 'is_running'" class="mr-2 text-text-secondary"><Timer /></span>
                  <span v-else-if="key === 'succ_count' || key === 'processed_items_count' || key === 'null_count'" class="mr-2 text-text-secondary"><DataAnalysis /></span>
                  {{ getKeyName(key) }}
                </div>
                <div class="font-medium text-text-primary">
                  <template v-if="key === 'end_params' || key === 'end_success_params' || key === 'init_params'">
                    <el-popover placement="top" :width="300" trigger="hover">
                      <template #reference>
                        <span class="text-primary hover:underline cursor-pointer">{{ formatValue(key, value) }}</span>
                      </template>
                      <div class="params-detail p-3 rounded border border-border-light bg-bg">
                        <pre class="text-sm text-text-regular">{{ JSON.stringify(value, null, 2) }}</pre>
                      </div>
                    </el-popover>
                  </template>
                  <template v-else-if="key === 'is_running'">
                    <span :class="scrapy_data.is_running ? 'text-success' : 'text-danger'">
                      {{ formatValue(key, value) }}
                    </span>
                  </template>
                  <template v-else>
                    {{ formatValue(key, value) }}
                  </template>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-4 border-t border-border-light">
            <div class="flex items-center text-sm text-text-secondary">
              <Clock class="mr-2 text-text-placeholder" />
              <span>持续运行：{{ formatValue('total_run_duration', scrapy_data.total_run_duration) }}</span>
            </div>
          </div>
        </div>
      </div>
      <Placeholder v-else v-model="placeholder_props" />
    </div>
  </div>
</template>

<style scoped>
/* 响应式调整 */
@media (max-width: 768px) {
  .grid-cols-1 {
    grid-template-columns: 1fr;
  }
}

/* 卡片动画效果 */
.marquee-card {
  transition: all 0.3s ease;
}

.marquee-card:hover {
  transform: translateY(-5px);
}

/* 数据行高亮效果 */
.data-row.highlight {
  background-color: rgba(0, 128, 0, 0.05);
  border-left: 3px solid var(--color-success);
}

/* 参数详情样式 */
.params-detail pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 状态指示器样式 */
.status-indicator {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.running {
  background-color: rgba(76, 175, 80, 0.2);
  color: var(--color-success);
}

.status-indicator.stopped {
  background-color: rgba(244, 67, 54, 0.2);
  color: var(--color-danger);
}
</style>

<style scoped>
/* 响应式调整 */
@media (max-width: 768px) {
  .grid-cols-1 {
    grid-template-columns: 1fr;
  }
}

/* 卡片动画效果 */
.marquee-card {
  transition: all 0.3s ease;
}

.marquee-card:hover {
  transform: translateY(-5px);
}

/* 数据行高亮效果 */
.data-row.highlight {
  background-color: rgba(0, 128, 0, 0.05);
  border-left: 3px solid #4CAF50;
}

/* 参数详情样式 */
.params-detail pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 状态指示器样式 */
.status-indicator {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.running {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.status-indicator.stopped {
  background-color: rgba(244, 67, 54, 0.2);
  color: #F44336;
}
</style>



