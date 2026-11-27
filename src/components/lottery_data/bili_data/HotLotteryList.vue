<template>
  <section class="hot-lottery-list flex flex-col gap-3">
    <!-- 标题行：榜单名 + 统计口径 -->
    <div class="hot-lottery-list__header flex flex-wrap items-center gap-2">
      <el-text class="hot-lottery-list__title m-0 flex items-center gap-1.5 text-sm font-semibold text-text-primary" tag="h3">
        <el-icon><Trophy /></el-icon>
        热门抽奖
      </el-text>
      <el-radio-group
        v-model="rankBy"
        size="default"
        class="hot-lottery-list__rank-switch"
      >
        <el-radio-button value="site">本站抽奖</el-radio-button>
        <el-radio-button value="site_third">第三方动态</el-radio-button>
        <el-radio-button value="bili">B站热门</el-radio-button>
      </el-radio-group>
      <el-tag size="large" type="warning" effect="plain" round>
        {{ rankBy === 'bili' ? '抓取时参与人数' : `近 ${windowDays} 天浏览人数` }}
      </el-tag>
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
      {{ emptyText }}
    </el-text>

    <!-- 复用抽奖界面的小卡片列表（含点赞 / 收藏 / 转发 / 详情弹窗，不重复实现）；竖排单列 -->
    <BiliLotterySimpleList
      v-else
      class="hot-lottery-list__cards [&>div]:grid-cols-1"
      :data="details"
      :initial-status="statusMap"
      :recent-viewer-map="recentViewerMap"
      :show-participants="rankBy === 'bili'"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Trophy } from '@element-plus/icons-vue'
import BiliLotterySimpleList from '@/components/lottery_data/bili_data/BiliLotterySimpleList.vue'
import { fetchHotLotteries } from '@/api/notify/moment-api'
import type {
  HotLotteryCard,
  HotLotteryRankBy,
  InteractionStatusItem,
} from '@/api/notify/moment-api'
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
 * 榜单卡片：榜单接口一次带回 `card`，直接喂给小卡片组件；不再由首页二次调用
 * detail 域接口回捞。形态由口径决定：
 * - site / bili：抽奖卡片（`raw` + `extra_info`，与 GetLotteryDetail 的 data 同形态）；
 * - site_third：第三方抽奖动态 item（`dynId` / `dynamicUrl` 等，识别为 THIRD_PARTY）。
 */
const details = ref<HotLotteryCard[]>([])
/** 榜单口径：site=本站抽奖浏览人数；site_third=本站第三方动态浏览人数；bili=B站抓取时参与人数 */
const rankBy = ref<HotLotteryRankBy>('site')
/** 近 N 天去重浏览人数（key=bizId）：榜单排序依据，透传给卡片展示 */
const recentViewerMap = ref<Record<string, number>>({})
/** 全榜互动态：一次批量拉取后注入卡片列表，不再由每张卡片各自请求（避免一串「单个查询」） */
const statusMap = ref<Record<string, InteractionStatusItem> | null>(null)
const loading = ref(true)

/** 空态文案：三个口径的数据来源不同，避免用一句话糊过去 */
const emptyText = computed(() =>
  rankBy.value === 'bili'
    ? '暂无热门抽奖数据'
    : rankBy.value === 'site_third'
      ? `近 ${props.windowDays} 天暂无第三方抽奖动态浏览记录`
      : `近 ${props.windowDays} 天暂无抽奖浏览记录`
)

async function load() {
  loading.value = true
  try {
    const resp = await fetchHotLotteries({
      windowDays: props.windowDays,
      limit: props.limit,
      rankBy: rankBy.value
    })
    const items = resp?.items ?? []
    // 卡片缺失的项后端已剔除，这里再兜一层（弱依赖降级时不会渲染空壳卡片）
    details.value = items
      .map((item) => item.card)
      .filter((card): card is HotLotteryCard => Boolean(card))
    recentViewerMap.value = Object.fromEntries(
      items.map((item) => [String(item.bizId), Number(item.recentViewCount ?? 0)])
    )
    // 一次批量拉全榜互动态（按 bizType 分组 + 后端 50 上限分片），注入给卡片列表
    statusMap.value = await fetchInteractionStatusMap(lotteryCardInteractionTargets(details.value))
  } catch {
    // 静默：热门榜是旁路信息，失败不影响主页其他模块
    details.value = []
    recentViewerMap.value = {}
    statusMap.value = {}
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

// 切换本站 / B站口径后重新拉榜（v-model 更新完成后再请求）
watch(rankBy, () => {
  void load()
})
</script>
