<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useWindowSize } from '@vueuse/core'
import { Clock, Refresh } from '@element-plus/icons-vue'
import Placeholder from '@/components/opus-detail/RightPannel/PannelItems/Placeholder.vue'
import type { ScrapyStatus, ScrapyStatusResp } from '@/models/lottery/lotdata.ts'
import lottery_database_bili_api from '@/api/lottery_data/bili/lottery_database_bili_api.ts'
import emitter from '@/utils/mitt.ts'

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
  start_time_str: '开始时间(字符串)',
  crawling_speed: '爬取速度（秒/个）',
  is_running: '是否运行中',
  last_update_time: '最后更新时间',
  last_update_time_str: '最后更新时间(字符串)',
  null_count: '空值数量',
  processed_items_count: '处理项目数量',
  total_run_duration: '总运行时长(秒)',
  dyn_scrapy_status: '动态',
  topic_scrapy_status: '话题',
  reserve_scrapy_status: '直播预约',
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
    speed: (v: number) => `${v.toFixed(4)}（秒/个）`,
    count: (v: number) => v.toLocaleString(),
    bool: (v: boolean) => (v ? '✅' : '❌'),
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
  if (key === 'end_params' || key === 'end_success_params' || key === 'init_params') return formatters.params(value)
  if (key === 'running_params_set') return formatters.paramsList(value)
  return formatters.default(value)
}
const handle_get_scrapy_status = () => {
  is_loading.value = true
  lottery_database_bili_api
    .get_all_scrapy_status()
    .then((res) => {
      res.code
        ? emitter.emit('toast', {
            t: res.msg,
            e: 'error'
          })
        : (data.value = res.data)
    })
    .finally(() => {
      is_loading.value = false
    })
}
const handle_show_scrapy_data = (scrapy_data: ScrapyStatus | any) => {
  // 过滤并排序显示的字段，确保重要信息优先显示
  const priorityOrder = [
    'is_running', 'succ_count', 'processed_items_count', 'null_count',
    'crawling_speed', 'start_time_str', 'last_update_time_str', 
    'total_run_duration', 'init_params', 'end_params', 'end_success_params'
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
  <FlexContainer>
    <el-card class="status-wrapper" v-loading="is_loading">
      <template #header>
        <h2 v-if="data">BiliBili</h2>
      </template>
      <template #default>
        <div v-if="data" class="status-panel">
          <el-carousel
            height="70vh"
            :autoplay="false"
            :direction="windowWidth > 768 ? 'horizontal' : 'vertical'"
            type="card"
            class="marquee-panel"
            indicator-position="none"
            arrow="never"
          >
            <el-carousel-item
              v-for="([category, scrapy_data], idx) in Object.entries(data).filter((el) =>
                getKeyName(el[0])
              )"
              :key="category"
            >
              <div class="marquee-card">
                <div class="card-header">
                  <h3 class="title">{{ getKeyName(category) }}</h3>
                  <div
                    class="status-indicator"
                    :class="scrapy_data.is_running ? 'running' : 'stopped'"
                    v-if="scrapy_data.is_running !== undefined"
                  >
                    {{ scrapy_data.is_running ? '运行中' : '已停止' }}
                  </div>
                  <div
                    class="refresh-sec"
                    style="margin-left: auto; gap: 10px; display: flex; align-items: center"
                  >
                    <el-switch
                      v-model="isAutoRefresh"
                      inline-prompt
                      active-text="自动刷新中"
                      inactive-text="开启自动刷新"
                      size="large"
                      style="--el-switch-off-color: var(--el-text-color-primary)"
                    />
                    <el-button
                      type="info"
                      @click="handle_get_scrapy_status"
                      :disabled="isAutoRefresh"
                    >
                      <el-icon>
                        <Refresh />
                      </el-icon>
                    </el-button>
                  </div>
                </div>

                <div class="card-body">
                  <div
                    v-for="([key, value], i) in handle_show_scrapy_data(scrapy_data)"
                    :key="key"
                    class="data-row"
                    :class="{'highlight': key === 'is_running' && value}"
                  >
                    <div class="row-label">
                      {{ getKeyName(key) }}
                    </div>
                    <div class="row-value">
                      <template v-if="key === 'end_params' || key === 'end_success_params' || key === 'init_params'">
                        <el-popover
                          placement="top"
                          :width="300"
                          trigger="hover"
                        >
                          <template #reference>
                            <span class="params-link">{{ formatValue(key, value) }}</span>
                          </template>
                          <div class="params-detail">
                            <pre>{{ JSON.stringify(value, null, 2) }}</pre>
                          </div>
                        </el-popover>
                      </template>
                      <template v-else>
                        {{ formatValue(key, value) }}
                      </template>
                    </div>
                  </div>
                </div>

                <div class="card-footer">
                  <el-icon>
                    <Clock />
                  </el-icon>
                  <span
                    >持续运行：{{ formatValue('total_run_duration', scrapy_data.total_run_duration) }}</span
                  >
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
        </div>
        <Placeholder v-else v-model="placeholder_props" />
      </template>
    </el-card>
  </FlexContainer>
</template>

<style scoped>
.status-panel {
  display: flex;
  background-color: var(--el-bg-color-page);
  justify-content: center;
  align-items: center;
  padding-bottom: 3rem;
}

.marquee-panel {
  --card-bg: linear-gradient(145deg, var(--el-bg-color) 0%, var(--el-bg-color-overlay) 100%);
  --running-color: var(--el-color-success-light-9);
  --stopped-color: var(--el-color-danger-light-9);
}

.marquee-card {
  height: 100%;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color-light);

  .title {
    margin: 0;
    font-size: 2em;
    color: var(--el-text-color-primary);
  }

  .status-indicator {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9em;
    font-weight: bold;

    &.running {
      background: var(--running-color);
      color: var(--el-color-success);
    }

    &.stopped {
      background: var(--stopped-color);
      color: var(--el-color-danger);
    }
  }
}

.card-body {
  flex: 1;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  overflow-y: auto;
}

.data-row {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;

  .row-label {
    font-size: 0.9rem;
    color: var(--el-text-color-primary);
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
  }

  .row-value {
    font-family: 'Roboto Mono', monospace;
    font-size: 0.85rem;
    color: var(--el-text-color-primary);
    word-break: break-all;
    line-height: 1.4;
  }
}

.card-footer {
  padding: 12px 24px;
  background: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-light);
  font-size: 0.9em;
  color: #191919;
  display: flex;
  align-items: center;
  gap: 8px;
}

.params-link {
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: underline;
}

.params-detail {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
}

.param-item {
  padding: 4px 0;
  border-bottom: 1px dashed #eee;
}

.param-item:last-child {
  border-bottom: none;
}

.highlight {
  border-left: 3px solid var(--el-color-success);
  background: var(--el-color-success-light-9);
}

@media (max-width: 768px) {
  .status-panel {
    padding: 10px;
  }

  .marquee-card {
    border-radius: 8px;
    margin: 0 auto;
  }

  .card-header {
    padding: 12px;

    .title {
      font-size: 1.2em;
    }
  }

  .card-body {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 12px;
  }

  .data-row {
    padding: 8px;
  }
}

.marquee-card:nth-child(2n) {
  background-color: var(--el-bg-color);
}

.marquee-card:nth-child(2n + 1) {
  background-color: var(--el-color-primary-light-5);
}

:deep(.el-carousel) {
  max-width: 900px;
  width: 100%;
  overflow: visible;
}
</style>
