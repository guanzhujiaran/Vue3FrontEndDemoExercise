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
            @click="handle_get_scrapy_status"
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
          <div class="text-2xl font-bold text-text-primary">{{ Object.entries(data).filter((el) => getKeyName(el[0])).length }}</div>
        </div>
        <div class="bg-bg rounded-lg border border-border-light p-4 flex flex-col">
          <div class="text-text-secondary text-sm mb-2">运行中爬虫</div>
          <div class="text-2xl font-bold text-[#67c23a]">{{ Object.entries(data).filter((el) => getKeyName(el[0]) && el[1].is_running).length }}</div>
        </div>
        <div class="bg-bg rounded-lg border border-border-light p-4 flex flex-col">
          <div class="text-text-secondary text-sm mb-2">总成功数量</div>
          <div class="text-2xl font-bold text-text-primary">{{ Object.entries(data).reduce((sum, [_, scrapy]) => sum + scrapy.succ_count, 0).toLocaleString() }}</div>
        </div>
        <div class="bg-bg rounded-lg border border-border-light p-4 flex flex-col">
          <div class="text-text-secondary text-sm mb-2">总处理数量</div>
          <div class="text-2xl font-bold text-text-primary">{{ Object.entries(data).reduce((sum, [_, scrapy]) => sum + scrapy.processed_items_count, 0).toLocaleString() }}</div>
        </div>
      </div>
      
      <div v-if="data" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="([category, scrapy_data], idx) in Object.entries(data).filter((el) => getKeyName(el[0]))" 
          :key="category"
          class="rounded-lg overflow-hidden border border-border-light bg-bg transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
          <div class="p-4 border-b border-border-light">
            <div class="flex justify-between items-center">
              <h3 class="text-xl font-semibold text-text-primary">{{ getKeyName(category) }}</h3>
              <div 
                class="flex items-center px-3 py-1 rounded-full text-sm font-medium"
                :class="scrapy_data.is_running ? 'text-[var(--color-success)]' : 'text-[#c45656]'"
              >
                <el-icon v-if="scrapy_data.is_running" class="text-[var(--color-success)] w-4 h-4"><Check /></el-icon>
                <el-icon v-else class="text-[#c45656] w-4 h-4"><Close /></el-icon>
                <span class="ml-1">{{ scrapy_data.is_running ? '运行中' : '已停止' }}</span>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="space-y-5">
              <!-- 运行状态 -->
              <div class="flex flex-col">
                <div class="font-medium text-text-regular flex items-center mb-2">
                  <Timer class="mr-2 w-4 h-4 text-text-secondary" />
                  运行状态
                </div>
                <div class="flex items-center">
                  <div class="w-full bg-border-light rounded-full h-2.5 mr-3">
                    <div 
                      class="h-2.5 rounded-full transition-all duration-500" 
                      :class="scrapy_data.is_running ? 'bg-[#67c23a] w-full' : 'bg-[#f56c6c] w-1/4'"
                    ></div>
                  </div>
                  <span :class="scrapy_data.is_running ? 'text-[#67c23a] font-medium' : 'text-[#f56c6c] font-medium'">
                    {{ scrapy_data.is_running ? '运行中' : '已停止' }}
                  </span>
                </div>
              </div>
              
              <!-- 数据统计 -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                  <div class="text-text-secondary text-xs mb-1">成功数量</div>
                  <div class="text-lg font-bold text-text-primary">{{ scrapy_data.succ_count.toLocaleString() }}</div>
                </div>
                <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                  <div class="text-text-secondary text-xs mb-1">处理数量</div>
                  <div class="text-lg font-bold text-text-primary">{{ scrapy_data.processed_items_count.toLocaleString() }}</div>
                </div>
                <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                  <div class="text-text-secondary text-xs mb-1">空值数量</div>
                  <div class="text-lg font-bold text-text-primary">{{ scrapy_data.null_count.toLocaleString() }}</div>
                </div>
                <div class="bg-bg-page rounded-lg p-3 border border-border-light">
                  <div class="text-text-secondary text-xs mb-1">爬取速度</div>
                  <div class="text-lg font-bold text-text-primary">{{ scrapy_data.crawling_speed.toFixed(4) }}s/个</div>
                </div>
              </div>
              
              <!-- 时间信息 -->
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <div class="font-medium text-text-regular">开始时间</div>
                  <div class="text-text-primary">{{ formatValue('start_time_str', scrapy_data.start_time_str) }}</div>
                </div>
                <div class="flex justify-between items-center">
                  <div class="font-medium text-text-regular">最后更新</div>
                  <div class="text-text-primary">{{ formatValue('last_update_time_str', scrapy_data.last_update_time_str) }}</div>
                </div>
              </div>
              
              <!-- 参数信息 -->
              <div class="space-y-2">
                <div v-for="key in ['init_params', 'end_params', 'end_success_params']" :key="key" class="flex justify-between items-center">
                  <div class="font-medium text-text-regular">{{ getKeyName(key) }}</div>
                  <el-popover placement="top" :width="300" trigger="hover">
                    <template #reference>
                      <span class="text-primary hover:underline cursor-pointer text-sm">{{ formatValue(key, scrapy_data[key]) }}</span>
                    </template>
                    <div class="params-detail p-3 rounded border border-border-light bg-bg max-h-60 overflow-auto">
                      <pre class="text-sm text-text-regular">{{ JSON.stringify(scrapy_data[key], null, 2) }}</pre>
                    </div>
                  </el-popover>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-4 border-t border-border-light bg-bg-page">
            <div class="flex items-center text-sm text-text-secondary">
              <Clock class="mr-2 w-4 h-4 text-text-placeholder" />
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
  
  .sm\:grid-cols-2 {
    grid-template-columns: 1fr;
  }
  
  .lg\:grid-cols-4 {
    grid-template-columns: 1fr;
  }
  
  .md\:grid-cols-2 {
    grid-template-columns: 1fr;
  }
  
  .lg\:grid-cols-3 {
    grid-template-columns: 1fr;
  }
}

/* 参数详情样式 */
.params-detail pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 滚动条样式 */
.params-detail::-webkit-scrollbar {
  width: 6px;
}

.params-detail::-webkit-scrollbar-track {
  background: var(--color-bg-page);
  border-radius: 3px;
}

.params-detail::-webkit-scrollbar-thumb {
  background: var(--color-border-light);
  border-radius: 3px;
}

.params-detail::-webkit-scrollbar-thumb:hover {
  background: var(--color-border);
}
</style>



