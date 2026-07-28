<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import type { ScrapyStatus, OfficialScrapyStatus } from '@/models/api/lottery/lotdata'
import type { ScrapyTypeEnum } from '@/api/bili_lottery_data/hey-api'
import lottery_database_bili_api from '@/api/lottery_data/bili/lottery_database_bili_api'

type CrawlerKey = 'official' | 'reserve' | 'topic' | 'others' | 'dyn'

const props = withDefaults(
  defineProps<{
    /** 需要展示的爬虫类型，对应各抽奖页的数据来源 */
    crawlerKey?: CrawlerKey
  }>(),
  {
    crawlerKey: 'official'
  }
)

// 爬虫类型 -> 展示文案 + 后端 ScrapyTypeEnum 入参的映射
const mapping: Record<CrawlerKey, { label: string; scrapyName: ScrapyTypeEnum }> = {
  official: { label: '官方抽奖爬虫', scrapyName: 'refresh_bili_official' },
  reserve: { label: '直播预约爬虫', scrapyName: 'reserve' },
  topic: { label: '话题抽奖爬虫', scrapyName: 'topic' },
  others: { label: '空间抽奖爬虫', scrapyName: 'other_space' },
  dyn: { label: '动态抽奖爬虫', scrapyName: 'dyn' },
}

const is_loading = ref(false)
const load_error = ref(false)
const status = ref<ScrapyStatus | OfficialScrapyStatus | null>(null)

// 官方/空间抽奖爬虫使用另一套字段结构（start_ts/total_num/progress 等）
const isOfficialType = (s: any): boolean =>
  !!(s && (s.start_ts !== undefined || s.total_num !== undefined))

const updateStr = (s: any): string => {
  const t = s?.last_update_time_str || s?.update_time || s?.start_time_str || s?.start_time
  return t || '未启动'
}

const succCount = (s: any): number => s?.succ_count ?? 0

const handle_get_scrapy_status = () => {
  is_loading.value = true
  load_error.value = false
  lottery_database_bili_api
    .get_single_scrapy_status(mapping[props.crawlerKey].scrapyName)
    .then((res) => {
      // 单接口返回 data 即该爬虫状态对象（未登录时后端仍可能返回数据，尝试展示）
      if (res.data) {
        status.value = res.data as any
      } else if (res.code) {
        load_error.value = true
      } else {
        load_error.value = true
      }
    })
    .catch(() => {
      load_error.value = true
    })
    .finally(() => {
      is_loading.value = false
    })
}

onMounted(() => {
  handle_get_scrapy_status()
})
</script>

<template>
  <div class="rounded-lg border border-border-light bg-bg-page px-4 py-2.5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span
          class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          :class="
            status
              ? status.is_running
                ? 'bg-success'
                : 'bg-danger'
              : 'bg-text-placeholder'
          "
        ></span>
        <span class="text-sm font-medium text-text-primary">{{ mapping[crawlerKey].label }}</span>
        <el-tag size="default" :type="status?.is_running ? 'success' : 'danger'" effect="light">
          {{ status ? (status.is_running ? '运行中' : '已停止') : '未知' }}
        </el-tag>
      </div>

      <div class="flex items-center gap-4 text-xs text-text-secondary">
        <template v-if="status">
          <span>成功 {{ succCount(status).toLocaleString() }}</span>
          <span v-if="isOfficialType(status)">进度 {{ (status as OfficialScrapyStatus).progress }}%</span>
        </template>
        <span v-else-if="load_error" class="text-danger">状态获取失败</span>
        <span v-else>加载中…</span>
        <el-button text size="default" :loading="is_loading" @click="handle_get_scrapy_status">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>
