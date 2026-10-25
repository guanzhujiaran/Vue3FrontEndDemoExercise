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
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Trophy } from '@element-plus/icons-vue'
import BiliLotterySimpleList from '@/components/lottery_data/bili_data/BiliLotterySimpleList.vue'
import { fetchHotLotteries } from '@/api/notify/moment-api'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'

const props = withDefaults(
  defineProps<{
    /** 浏览记录统计窗口（天） */
    windowDays?: number
    /** 展示条数上限 */
    limit?: number
  }>(),
  { windowDays: 7, limit: 10 }
)

/** 热度榜拉回的抽奖详情原始数据（直接喂给小卡片组件，保持与抽奖界面一致的数据形态） */
const details = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const resp = await fetchHotLotteries({ windowDays: props.windowDays, limit: props.limit })
    const items = resp?.items ?? []
    // 热度榜 id 回捞抽奖详情（弱依赖：单个失败只丢该卡，不影响整榜）
    const settled = await Promise.allSettled(
      items.map((item) => lotteryDataBaseApi.getLotteryDetailById(String(item.bizId)))
    )
    details.value = settled
      .filter(
        (r): r is PromiseFulfilledResult<{ code: number; data: unknown }> =>
          r.status === 'fulfilled' && r.value.code === 0 && !!r.value.data
      )
      .map((r) => r.value.data)
  } catch {
    // 静默：热门榜是旁路信息，失败不影响主页其他模块
    details.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
