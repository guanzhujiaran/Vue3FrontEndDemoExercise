<template>
  <!-- 数据概览：审核待办多维统计（点击卡片跳转对应管理页）。
       抽奖数据维度不在此处查询——由 UpcomingLotteryMarquee 复用同一次
       getLotterySummary 查询一并展示，避免重复请求。 -->
  <section class="stats-overview-cards flex flex-col gap-4">
    <div class="stats-overview-cards__header flex items-center justify-between gap-3">
      <el-text class="stats-overview-cards__title m-0 text-base font-semibold text-text-primary" tag="h2">数据概览</el-text>
      <el-link class="stats-overview-cards__refresh" type="primary" :underline="false" @click="loadStats">
        <el-icon class="mr-1"><Refresh /></el-icon>刷新
      </el-link>
    </div>

    <!-- 审核待办维度 -->
    <div class="stats-overview-cards__group flex flex-col gap-2">
      <el-text class="stats-overview-cards__group-title m-0 text-sm font-semibold text-text-secondary" tag="h3">审核待办</el-text>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <router-link
          v-for="card in auditCards"
          :key="card.key"
          :to="{ name: card.route }"
          class="stats-overview-cards__card flex items-center gap-3 rounded-lg border border-border-lighter bg-primary-light-9 p-3 no-underline transition-colors hover:border-primary hover:bg-primary-light-8"
        >
          <span class="stats-overview-cards__icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" :class="card.iconClass">
            <el-icon class="text-xl"><component :is="card.icon" /></el-icon>
          </span>
          <div class="flex min-w-0 flex-col">
            <span class="stats-overview-cards__label truncate text-xs text-text-secondary">{{ card.label }}</span>
            <span class="stats-overview-cards__value text-xl font-semibold text-text-primary">{{ statText(card.value) }}</span>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import {
  Refresh,
  ChatDotSquare,
  ChatLineSquare,
  Message,
  User,
  Picture,
  PriceTag,
  WarningFilled
} from '@element-plus/icons-vue'
import { AuditBizType, fetchAuditStatisticsByBiz } from '@/api/notify/moment-api'

/** 数据概览卡片（图标 + 维度名 + 数值 + 跳转路由） */
interface StatCard {
  key: string
  label: string
  icon: Component
  iconClass: string
  route: string
  value: number | null
}

/** 审核待办域：按 bizType 逐域拉取「审核中/待处理」计数 */
const AUDIT_DOMAINS: Array<Omit<StatCard, 'value'>> = [
  { key: 'dynamic', label: '动态待审核', icon: ChatDotSquare, iconClass: 'bg-primary-light-9 text-primary', route: 'ADMIN_MOMENT_AUDIT' },
  { key: 'comment', label: '评论待审核', icon: ChatLineSquare, iconClass: 'bg-success-light-9 text-success', route: 'ADMIN_MESSAGE_COMMENT' },
  { key: 'dm', label: '私信待审核', icon: Message, iconClass: 'bg-info-light-9 text-info', route: 'ADMIN_MESSAGE_DM' },
  { key: 'avatar', label: '头像待审核', icon: User, iconClass: 'bg-warning-light-9 text-warning', route: 'ADMIN_USER_AVATAR_AUDIT' },
  { key: 'folder_cover', label: '封面待审核', icon: Picture, iconClass: 'bg-danger-light-9 text-danger', route: 'ADMIN_USER_FOLDER_COVER_AUDIT' },
  { key: 'topic', label: '话题待审核', icon: PriceTag, iconClass: 'bg-primary-light-9 text-primary', route: 'ADMIN_MOMENT_TOPIC_AUDIT' },
  { key: 'report', label: '举报待处理', icon: WarningFilled, iconClass: 'bg-danger-light-9 text-danger', route: 'ADMIN_REPORT' }
]

/** 审核域 bizType（与 AUDIT_DOMAINS 顺序一一对应） */
const AUDIT_BIZ_TYPES: number[] = [
  AuditBizType.DYNAMIC,
  AuditBizType.COMMENT,
  AuditBizType.DM,
  AuditBizType.AVATAR,
  AuditBizType.FOLDER_COVER,
  AuditBizType.TOPIC,
  AuditBizType.REPORT
]

const statsLoading = ref(false)
const auditCounts = ref<Record<string, number | null>>({})

const auditCards = computed<StatCard[]>(() =>
  AUDIT_DOMAINS.map((domain) => ({ ...domain, value: auditCounts.value[domain.key] ?? null }))
)

/** 数值展示：加载中「…」/ 失败「—」/ 正常千分位 */
function statText(value: number | null): string {
  if (value === null) return statsLoading.value ? '…' : '—'
  return value.toLocaleString('zh-CN')
}

async function loadStats() {
  statsLoading.value = true
  const results = await Promise.all(
    AUDIT_BIZ_TYPES.map((bizType) =>
      fetchAuditStatisticsByBiz(bizType, { showErrorToast: false }).catch(() => null)
    )
  )
  AUDIT_DOMAINS.forEach((domain, index) => {
    const stat = results[index]
    // 取「审核中」（auditing）或「待处理」（pending）计数；失败置 null 显示「—」
    auditCounts.value[domain.key] = stat
      ? (stat.byStatus?.auditing ?? stat.byStatus?.pending ?? 0)
      : null
  })
  statsLoading.value = false
}

onMounted(() => {
  void loadStats()
})
</script>
