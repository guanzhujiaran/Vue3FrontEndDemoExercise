<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
  start_ts: '开始时间戳',
  freq: '获取成功频率（个/秒）',
  is_running: '是否运行中',
  latest_rid: '最新获取的图片动态RID',
  latest_succ_dyn_id: '最新成功动态ID',
  first_dyn_id: '第一个动态ID',
  update_ts: '更新时间戳',
  latest_succ_dyn_id_str: '最新成功动态ID',
  first_dyn_id_str: '第一个动态ID',
  latest_succ_topic_id: '最新成功主题ID',
  first_topic_id: '执行时的topic_id',
  latest_topic_id: '最新获取的topic_id',
  latest_succ_reserve_id: '最新获取成功reserve_id',
  first_reserve_id: '执行时的reserve_id',
  latest_reserve_id: '最新获取的reserve_id',
  dyn_scrapy_status: '动态',
  topic_scrapy_status: '话题',
  reserve_scrapy_status: '直播预约'
}

const getKeyName = (key: string): undefined | string => {
  return keyToChineseMap[key]
}
const { width: windowWidth } = useWindowSize()
const data = ref<ScrapyStatusResp>({
  dyn_scrapy_status: {
    succ_count: -1,
    cur_stop_num: -1,
    start_ts: -1,
    freq: -1,
    is_running: false,
    update_ts: -1
  },
  topic_scrapy_status: {
    succ_count: -1,
    cur_stop_num: -1,
    start_ts: -1,
    freq: -1,
    is_running: false,
    update_ts: -1
  },
  reserve_scrapy_status: {
    succ_count: -1,
    cur_stop_num: -1,
    start_ts: -1,
    freq: -1,
    is_running: false,
    update_ts: -1
  }
})

const formatValue = (key: string, value: any) => {
  const formatters = {
    ts: (v: number) => dayjs.unix(v).format('MM月DD日 HH:mm'),
    freq: (v: number) => `${v.toFixed(1)}/秒`,
    count: (v: number) => v.toLocaleString(),
    bool: (v: boolean) => (v ? '✅' : '❌'),
    default: (v: any) => v
  }

  if (/_(ts|time)$/.test(key)) return formatters.ts(value)
  if (key === 'freq') return formatters.freq(value)
  if (/_(count|num)$/.test(key)) return formatters.count(value)
  if (key === 'is_running') return formatters.bool(value)
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
const handle_show_scrapy_data = (scrapy_data: ScrapyStatus) => {
  return Object.entries(scrapy_data).filter(([k, v]) => getKeyName(k))
}
onMounted(() => {
  handle_get_scrapy_status()
})
</script>

<template>
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
            v-for="([category, scrapy_data], idx) in Object.entries(data)"
            :key="category"
          >
            <div class="marquee-card">
              <div class="card-header">
                <h3 class="title">{{ getKeyName(category) }}</h3>
                <div
                  class="status-indicator"
                  :class="scrapy_data.is_running ? 'running' : 'stopped'"
                >
                  {{ scrapy_data.is_running ? '运行中' : '已停止' }}
                </div>
                <el-button type="info" @click="handle_get_scrapy_status" style="margin-left: auto">
                  <el-icon>
                    <Refresh />
                  </el-icon>
                </el-button>
              </div>

              <div class="card-body">
                <div
                  v-for="([key, value], i) in handle_show_scrapy_data(scrapy_data)"
                  :key="key"
                  class="data-row"
                >
                  <div class="row-label">
                    {{ getKeyName(key) }}
                  </div>
                  <div class="row-value">
                    {{ formatValue(key, value) }}
                  </div>
                </div>
              </div>

              <div class="card-footer">
                <el-icon>
                  <Clock />
                </el-icon>
                <span
                  >持续运行：{{
                    dayjs.unix(scrapy_data.update_ts - scrapy_data.start_ts).format('HH:mm:ss')
                  }}</span
                >
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
      <Placeholder v-else v-model="placeholder_props" />
    </template>
  </el-card>
</template>

<style scoped>
.status-panel {
  display: flex;
  background-color: #f5f7fa;
  justify-content: center;
  align-items: center;
  padding-bottom: 3rem;
}

.marquee-panel {
  --card-bg: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%);
  --running-color: rgba(103, 194, 58, 0.1);
  --stopped-color: rgba(245, 108, 108, 0.1);
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
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .title {
    margin: 0;
    font-size: 2em;
    color: #18191c;
  }

  .status-indicator {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9em;
    font-weight: bold;

    &.running {
      background: var(--running-color);
      color: #67c23a;
    }

    &.stopped {
      background: var(--stopped-color);
      color: #f56c6c;
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
  background: rgba(245, 247, 250, 0.6);
  border-radius: 8px;

  .row-label {
    font-size: 0.325rem;
    color: #18191c;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .row-value {
    font-family: 'Roboto Mono', monospace;
    font-size: 0.625rem;
    color: var(--el-text-color-primary);
    word-break: break-all;
    line-height: 1.4;
  }
}

.card-footer {
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.03);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 0.9em;
  color: #191919;
  display: flex;
  align-items: center;
  gap: 8px;
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
  background-color: #bebcbc;
}

.marquee-card:nth-child(2n + 1) {
  background-color: #01ddff;
}

:deep(.el-carousel) {
  max-width: 900px;
  width: 100%;
  overflow: visible;
}
</style>
