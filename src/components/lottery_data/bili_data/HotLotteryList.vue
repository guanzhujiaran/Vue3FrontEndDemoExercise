<template>
  <section class="hot-lottery-list flex flex-col gap-3">
    <!-- 标题行：榜单名 + 统计口径 -->
    <div class="hot-lottery-list__header flex flex-wrap items-center gap-2">
      <el-text class="hot-lottery-list__title m-0 flex items-center gap-1.5 text-sm font-semibold text-text-primary" tag="h3">
        <el-icon><Trophy /></el-icon>
        热门抽奖
      </el-text>
      <el-tag size="large" type="warning" effect="plain" round>近 {{ windowDays }} 天浏览热度</el-tag>
      <span v-if="!loading && details.length" class="text-xs text-text-placeholder">
        Top {{ details.length }}
      </span>
    </div>

    <!-- 加载中 -->
    <el-text v-if="loading" class="hot-lottery-list__loading m-0 text-xs text-text-placeholder" tag="p">
      正在加载热门抽奖…
    </el-text>

    <!-- 空态 -->
    <el-text
      v-else-if="!details.length"
      class="hot-lottery-list__empty m-0 text-xs text-text-placeholder"
      tag="p"
    >
      暂无热门抽奖数据
    </el-text>

    <!-- 复用抽奖界面的小卡片列表（含点赞 / 收藏 / 转发 / 详情弹窗，不重复实现）；竖排单列 -->
    <BiliLotterySimpleList
      v-else
      class="hot-lottery-list__cards [&>div]:grid-cols-1"
      :data="details"
      :initial-status="statusMap"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Trophy } from '@element-plus/icons-vue'
import BiliLotterySimpleList from '@/components/lottery_data/bili_data/BiliLotterySimpleList.vue'
import { fetchHotLotteries } from '@/api/notify/moment-api'
import type { InteractionStatusItem, LotteryCard } from '@/api/notify/moment-api'
import {
  fetchInteractionStatusMap,
  lotteryCardInteractionTargets,
} from '@/utils/lotteryInteractionStatus'

const props = withDefaults(
  defineProps<{
    /** 浏览记录统计窗口（天） */
    windowDays?: number
    /** 展示条数上限 */
    limit?: number
  }>(),
  { windowDays: 7, limit: 10 }
)

/**
 * 榜单卡片：榜单接口一次带回 `card`（`raw` + `extra_info`，与 GetLotteryDetail 的 data
 * 同形态），直接喂给小卡片组件；不再由首页二次调用 detail 域接口回捞。
 */
const details = ref<LotteryCard[]>([])
/** 全榜互动态：一次批量拉取后注入卡片列表，不再由每张卡片各自请求（避免一串「单个查询」） */
const statusMap = ref<Record<string, InteractionStatusItem> | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const resp = await fetchHotLotteries({ windowDays: props.windowDays, limit: props.limit })
    // 卡片缺失的项后端已剔除，这里再兜一层（弱依赖降级时不会渲染空壳卡片）
    details.value = (resp?.items ?? [])
      .map((item) => item.card)
      .filter((card): card is LotteryCard => Boolean(card))
    // 一次批量拉全榜互动态（按 bizType 分组 + 后端 50 上限分片），注入给卡片列表
    statusMap.value = await fetchInteractionStatusMap(lotteryCardInteractionTargets(details.value))
  } catch {
    // 静默：热门榜是旁路信息，失败不影响主页其他模块
    details.value = []
    statusMap.value = {}
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
