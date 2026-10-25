<template>
  <FlexContainer class="membership-view gap-4">
    <!-- 页面根节点直接用 FlexContainer（自带 flex / flex-col / flex-1）：
         纵向滚动由 BiliSideNavLayout 内容区的 BiliScrollbar 承接（它的 view 已是 h-full flex flex-col），
         页面既不用再写 flex-1 / flex-col / min-h-0，也不能加 overflow-auto（会多出原生滚动条）。 -->

    <!-- ============ 页头：标题 + 主操作 ============ -->
    <BiliPageHeader title="时长权益" hide-title description="签到领时长、兑换码充值；月卡有效期内定时调度自动触发的工作流免扣时长（手动运行/调试不扣费）">
      <template #extra>
        <div class="membership-view__header-actions flex flex-wrap items-center gap-2">
          <el-button
            type="primary"
            size="large"
            class="membership-view__sign-in-btn"
            :disabled="account?.signed_today || signing"
            :loading="signing"
            @click="handleSignIn"
          >
            {{ account?.signed_today ? '今日已签到' : '每日签到' }}
          </el-button>
          <el-button
            type="success"
            size="large"
            class="membership-view__redeem-btn"
            @click="openRedeemDialog"
          >
            兑换码
          </el-button>
          <el-button
            type="warning"
            size="large"
            class="membership-view__sign-in-reward-btn"
            @click="rewardDialogVisible = true"
          >
            兑换奖励
          </el-button>
          <!-- 当前页跳转（不开新标签）：空 href 时禁用，避免跳到无效地址 -->
          <el-link
            type="danger"
            size="large"
            class="membership-view__buy-btn"
            :underline="false"
            :href="casdoorShopUrl || undefined"
            :disabled="!casdoorShopUrl"
            :rel="LINK_REL"
            :referrerpolicy="LINK_REFERRER_POLICY"
            @click="markPaymentPending"
          >
            {{ casdoorShopUrl ? '购买月卡' : '购买月卡（暂未开放）' }}
          </el-link>
        </div>
      </template>
    </BiliPageHeader>

    <!-- ============ 账户概览 ============ -->
    <div class="membership-view__account grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
      <div class="membership-view__balance-card flex flex-col justify-center gap-1 rounded-2xl bg-primary-light-9 border border-primary-light-8 px-4 py-5">
        <span class="membership-view__label text-sm text-text-secondary">剩余时长</span>
        <span class="membership-view__balance text-3xl font-bold text-primary">{{ formatSeconds(account?.balance_seconds ?? '0') }}</span>
        <div class="membership-view__balance-buckets flex flex-col gap-0.5 text-xs">
          <el-tooltip placement="bottom" effect="light">
            <template #content>
              <div class="text-xs leading-relaxed">
                签到 / 活动赠送的时长，<b>每月最后一天 24:00 未用完自动清零</b>；<br>
                定时工作流消耗时会<b>优先扣减这部分</b>
              </div>
            </template>
            <span class="flex w-fit cursor-help items-center gap-1 text-warning">
              赠送 {{ formatSeconds(account?.granted_balance_seconds ?? '0') }} · {{ monthEndHint }}
            </span>
          </el-tooltip>
          <el-tooltip placement="bottom" effect="light">
            <template #content>
              <div class="text-xs leading-relaxed">
                时长卡兑换 / 支付购买的时长，<b>永久有效、月底不清理</b>；<br>
                赠送部分用完后才会扣减这部分
              </div>
            </template>
            <span class="flex w-fit cursor-help items-center gap-1 text-success">
              时长卡 {{ formatSeconds(account?.paid_balance_seconds ?? '0') }} · 永久有效
            </span>
          </el-tooltip>
        </div>
      </div>
      <div class="membership-view__month-card flex flex-col justify-center gap-2 rounded-2xl bg-info-light-9 border border-info-light-8 px-4 py-5">
        <span class="membership-view__label text-sm text-text-secondary">月卡状态</span>
        <el-tooltip
          v-if="account?.month_card?.active"
          placement="top"
          effect="light"
        >
          <template #content>
            <div class="text-xs leading-relaxed">
              月卡有效期内，由<b>定时调度自动触发</b>的工作流运行<br>
              不消耗时长余额；手动运行/调试原本就不扣费
            </div>
          </template>
          <el-tag type="success" class="membership-view__month-card-tag w-fit cursor-help">
            月卡生效中 · 定时调度工作流免扣时长
          </el-tag>
        </el-tooltip>
        <el-tag v-else type="info" class="membership-view__month-card-tag w-fit">未开通</el-tag>
        <span v-if="account?.month_card?.expire_at" class="membership-view__expire text-xs text-text-secondary">
          到期：{{ formatDateTime(account.month_card.expire_at ?? '') }}
        </span>
      </div>
      <div class="membership-view__granted flex flex-col justify-center gap-1 rounded-2xl border border-border-light bg-bg px-4 py-5">
        <span class="membership-view__label text-sm text-text-secondary">累计获得</span>
        <span class="membership-view__granted-value text-2xl font-semibold text-success">{{ formatSeconds(account?.total_granted_seconds ?? '0') }}</span>
      </div>
      <div class="membership-view__consumed flex flex-col justify-center gap-1 rounded-2xl border border-border-light bg-bg px-4 py-5">
        <span class="membership-view__label text-sm text-text-secondary">累计消耗</span>
        <span class="membership-view__consumed-value text-2xl font-semibold text-danger">{{ formatSeconds(account?.total_consumed_seconds ?? '0') }}</span>
      </div>
    </div>

    <!-- ============ 签到日历（独占一整行） ============ -->
    <!-- 格内只显示日期，悬浮显示当天奖励；可补登日期点击补签 -->
    <div class="membership-view__sign-in flex flex-col gap-3 shrink-0 rounded-2xl border border-border-light bg-bg p-4">
      <div class="membership-view__sign-in-header flex flex-wrap items-center justify-between gap-2">
        <div class="membership-view__sign-in-heading flex flex-col gap-1">
          <span class="membership-view__sign-in-title text-lg font-semibold text-text-primary">签到日历</span>
          <span class="membership-view__sign-in-hint text-xs text-text-secondary">
            每日签到得 {{ formatSeconds(dailyRewardSeconds) }}，累计达标可领 {{ tierSummary }}
          </span>
        </div>
        <div class="membership-view__sign-in-stats flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <el-tag type="info" class="membership-view__sign-in-days-tag" effect="plain">
            累计签到 {{ overview?.streak?.days ?? '0' }} 天
          </el-tag>
          <el-tag type="success" class="membership-view__sign-in-month-days-tag" effect="plain">
            本月 {{ overview?.streak?.month_total_days ?? '0' }} 天<template v-if="Number(overview?.streak?.month_consumed_days ?? 0) > 0">
              （补签 {{ overview?.streak?.month_consumed_days }} 天）</template>
          </el-tag>
          <el-tag type="warning" class="membership-view__sign-in-card-tag" effect="plain">
            补登卡 {{ overview?.makeup_cards?.balance ?? '0' }} / {{ overview?.makeup_cards?.max ?? '0' }} 张
          </el-tag>
        </div>
      </div>

      <!-- 里程碑进度：距下一档位还差 N 天 -->
      <div
        v-if="calendarNextMilestone"
        class="membership-view__sign-in-progress flex flex-col gap-1 rounded-xl bg-fill-light px-3 py-2"
      >
        <div class="membership-view__sign-in-progress-head flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
          <span>
            累计签到 <span class="membership-view__sign-in-progress-days text-primary font-semibold">{{ overview?.streak?.days ?? '0' }}</span>
            / {{ calendarNextMilestone.days }} 天
          </span>
          <span>
            再签 <span class="membership-view__sign-in-progress-remaining text-warning font-semibold">{{ calendarNextMilestone.remaining }}</span> 天可领
            <span class="membership-view__sign-in-progress-tier">{{ calendarNextMilestone.tier }} 档奖励</span>
            （{{ formatSeconds(calendarNextMilestone.reward_seconds) }} + {{ calendarNextMilestone.makeup_cards }} 张补登卡）
          </span>
        </div>
        <el-progress
          class="membership-view__sign-in-progress-bar"
          :percentage="milestonePercent"
          :stroke-width="10"
          color="var(--color-primary)"
        />
      </div>

      <el-calendar
        v-model="signInCalendarDate"
        v-loading="signInCalendarLoading"
        class="membership-view__sign-in-calendar"
        :range="signInCalendarRange"
      >
        <template #date-cell="{ data }">
          <el-tooltip
            placement="top"
            :show-after="200"
            class="membership-view__calendar-tip"
          >
            <template #content>
              <div class="membership-view__calendar-tip-content flex flex-col gap-1">
                <span class="membership-view__calendar-tip-title">{{ data.day }}</span>
                <span>{{ signInTooltipText(data.day) }}</span>
              </div>
            </template>
            <div
              class="membership-view__calendar-cell flex items-center justify-center h-full rounded-lg p-1"
              :class="signInCellClass(data.day)"
              @click="handleCalendarClick(data.day)"
            >
              <span class="membership-view__calendar-date text-sm text-text-primary">
                {{ Number(data.day.slice(8)) }}
              </span>
            </div>
          </el-tooltip>
        </template>
      </el-calendar>

      <div class="membership-view__sign-in-legend flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        <span class="membership-view__legend-item flex items-center gap-1">
          <span class="membership-view__legend-dot bg-success-light-8 rounded" /> 已打卡
        </span>
        <span class="membership-view__legend-item flex items-center gap-1">
          <span class="membership-view__legend-dot bg-fill-light rounded" /> 未打卡
        </span>
        <span class="membership-view__legend-item flex items-center gap-1">
          <span class="membership-view__legend-dot bg-warning-light-8 rounded" /> 可补登（点击补签）
        </span>
      </div>
    </div>

    <!-- ============ 使用统计 + 时长明细 ============ -->
    <div class="membership-view__main grid grid-cols-1 xl:grid-cols-3 gap-4">
      <!-- 使用统计（近 30 天） -->
      <div class="membership-view__usage flex flex-col gap-3 rounded-2xl border border-border-light bg-bg p-4 xl:col-span-2">
        <div class="membership-view__usage-header flex flex-wrap items-center justify-between gap-2">
          <div class="membership-view__usage-heading flex flex-col gap-1">
            <span class="membership-view__usage-title text-lg font-semibold text-text-primary">使用统计（近 30 天）</span>
            <span class="membership-view__usage-summary text-xs text-text-secondary">
              工作流 {{ usageTotals.workflow }} · 手动调试 {{ usageTotals.manual }}（不计费） · 定时运行 {{ usageTotals.runs }} 次
            </span>
          </div>
          <el-button size="large" class="membership-view__usage-refresh shrink-0" :loading="usageLoading" @click="loadUsage">刷新</el-button>
        </div>

        <div v-if="usageLoading && usageStats.length === 0" class="membership-view__usage-skeleton w-full">
          <el-skeleton :rows="3" animated />
        </div>
        <el-empty v-else-if="usageStats.length === 0" description="近 30 天暂无使用记录" />

        <div v-else class="membership-view__usage-list flex flex-col gap-2">
          <div
            v-for="item in usageStats"
            :key="item.stat_date + item.browser_id"
            class="membership-view__usage-row flex flex-wrap items-center gap-3"
          >
            <span class="membership-view__usage-date text-xs text-text-secondary w-24 shrink-0">
              {{ formatDate(item.stat_date) }}
            </span>
            <span class="membership-view__usage-browser text-xs text-text-secondary w-20 shrink-0 truncate" :title="item.browser_id">
              浏览器 {{ item.browser_id || '-' }}
            </span>
            <el-progress
              class="membership-view__usage-bar flex-1 min-w-24"
              :percentage="usagePercent(item.workflow_seconds)"
              :stroke-width="12"
              color="var(--color-primary)"
            />
            <span class="membership-view__usage-workflow text-xs text-text-primary w-24 text-right shrink-0">
              工作流 {{ formatSeconds(item.workflow_seconds) }}
            </span>
            <span class="membership-view__usage-manual text-xs text-text-secondary w-24 text-right shrink-0">
              手动 {{ formatSeconds(item.manual_seconds) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 时长流水（获得 + 消耗 一起展示，无限滚动） -->
      <div class="membership-view__ledger flex flex-col gap-3 rounded-2xl border border-border-light bg-bg p-4">
        <div class="membership-view__ledger-header flex flex-wrap items-center justify-between gap-2">
          <div class="membership-view__ledger-heading flex flex-col gap-1">
            <span class="membership-view__ledger-title text-lg font-semibold text-text-primary">时长明细</span>
            <span class="membership-view__ledger-summary text-xs text-text-secondary">
              已加载 {{ ledgerItems.length }} / {{ ledgerTotal }} 条 ·
              <span class="membership-view__ledger-gain text-success">获得 {{ formatSeconds(ledgerFilterTotals.gain) }}</span>
              ·
              <span class="membership-view__ledger-consume text-danger">消耗 {{ formatSeconds(ledgerFilterTotals.consume) }}</span>
            </span>
          </div>
          <div class="membership-view__ledger-filter flex items-center gap-2">
            <el-radio-group
              v-model="ledgerFilter"
              size="large"
              class="membership-view__ledger-filter-group"
            >
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="gain">仅获得</el-radio-button>
              <el-radio-button value="consume">仅消耗</el-radio-button>
            </el-radio-group>
            <el-button size="large" class="membership-view__ledger-refresh" :loading="ledgerLoading" @click="loadLedger(true)">刷新</el-button>
          </div>
        </div>

        <div v-if="ledgerLoading && ledgerItems.length === 0" class="membership-view__ledger-skeleton w-full">
          <el-skeleton :rows="4" animated />
        </div>
        <el-empty v-else-if="ledgerItems.length === 0" :description="ledgerEmptyText" />

        <!-- 明细列表内部滚动：普通滚动容器 + 项目细滚动条样式，
             不再嵌套 BiliScrollbar（避免多出 wrap/view/两条 bar 的元素堆叠） -->
        <div
          v-else
          class="membership-view__ledger-list flex flex-col gap-2 max-h-96 overflow-y-auto bili-thin-scroll"
          @scroll="handleLedgerScroll"
        >
          <div
            v-for="item in ledgerItems"
            :key="item.id"
            class="membership-view__ledger-item flex items-center gap-3 rounded-lg border border-border-light p-3 hover:border-primary transition-colors"
          >
            <el-tag :type="ledgerTagType(item.change_type)" class="membership-view__ledger-tag shrink-0">
              {{ ledgerTypeText(item.change_type) }}
            </el-tag>
            <div class="membership-view__ledger-body flex-1 min-w-0">
              <div class="membership-view__ledger-main flex items-center gap-2">
                <span
                  class="membership-view__ledger-change font-semibold"
                  :class="Number(item.change_seconds) >= 0 ? 'text-success' : 'text-danger'"
                >
                  {{ Number(item.change_seconds) >= 0 ? '+' : '' }}{{ formatSeconds(item.change_seconds) }}
                </span>
                <span class="membership-view__ledger-balance text-xs text-text-secondary">
                  余额 {{ formatSeconds(item.balance_after) }}
                </span>
              </div>
              <div class="membership-view__ledger-meta flex items-center gap-3 text-xs text-text-secondary mt-1 flex-wrap">
                <span>{{ formatDateTime(item.created_at) }}</span>
                <span v-if="item.workflow_id">工作流: {{ item.workflow_id }}</span>
                <span v-if="item.run_id">运行: {{ item.run_id }}</span>
                <span v-if="item.browser_id">浏览器: {{ item.browser_id }}</span>
                <span v-if="item.remark">{{ item.remark }}</span>
              </div>
            </div>
          </div>

          <div v-if="ledgerLoadingMore" class="membership-view__ledger-more text-center py-3 text-sm text-text-secondary">
            加载中...
          </div>
          <div v-else-if="!ledgerHasMore" class="membership-view__ledger-end text-center py-3 text-sm text-text-secondary">
            没有更多了
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 兑换码（弹窗） ============ -->
    <el-dialog
      v-model="redeemDialogVisible"
      class="membership-view__redeem-dialog"
      title="兑换码"
      width="480px"
      align-center
      append-to-body
      :lock-scroll="false"
    >
      <div class="membership-view__redeem-body flex flex-col gap-3">
        <div class="membership-view__redeem-form flex items-center gap-2">
          <el-input
            v-model="redeemCode"
            class="membership-view__redeem-input"
            placeholder="输入兑换码（时长卡 / 月卡）"
            clearable
            @keyup.enter="handleRedeem"
          />
          <el-button type="success" size="large" class="membership-view__redeem-submit-btn shrink-0" :loading="redeeming" @click="handleRedeem">
            兑换
          </el-button>
        </div>
        <span class="membership-view__redeem-hint text-xs text-text-secondary">
          时长卡永久有效、月底不清零（消耗时先扣签到/活动赠送部分，再扣时长卡）；月卡有效期内，定时调度自动触发的工作流运行不扣时长（手动运行/调试本来就免费）。
        </span>
      </div>
    </el-dialog>

    <!-- ============ 兑换奖励（三档里程碑） ============ -->
    <el-dialog
      v-model="rewardDialogVisible"
      class="membership-view__reward-dialog"
      title="兑换奖励"
      width="720px"
      align-center
      append-to-body
      :lock-scroll="false"
    >
      <div class="membership-view__reward-body flex flex-col gap-3">
        <span class="membership-view__reward-summary text-sm text-text-secondary">
          累计签到 <span class="membership-view__reward-days text-primary font-semibold">{{ overview?.streak?.days ?? '0' }}</span> 天 ·
          补登卡 <span class="membership-view__reward-cards text-warning font-semibold">{{ overview?.makeup_cards?.balance ?? '0' }}</span> /
          {{ overview?.makeup_cards?.max ?? '0' }} 张
        </span>

        <div class="membership-view__reward-list grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="tier in overview?.redemption_status?.tiers ?? []"
            :key="tier.tier"
            class="membership-view__reward-card flex flex-col gap-2 rounded-xl border p-4"
            :class="rewardCardClass(tier.status)"
          >
            <span class="membership-view__reward-card-name text-base font-semibold text-text-primary">
              {{ tier.name || `${tier.tier} 档` }}
            </span>
            <span class="membership-view__reward-card-days text-xs text-text-secondary">
              累计签到 {{ tier.days }} 天
            </span>
            <div class="membership-view__reward-card-items flex flex-col gap-1 text-sm">
              <span class="membership-view__reward-card-duration text-primary">
                时长 +{{ formatSeconds(tier.reward_seconds) }}
              </span>
              <span class="membership-view__reward-card-makeup text-warning">
                补登卡 +{{ tier.makeup_cards }} 张
              </span>
            </div>
            <el-tag :type="rewardTagType(tier.status)" class="membership-view__reward-card-status w-fit">
              {{ rewardStatusText(tier.status) }}
            </el-tag>
            <el-button
              v-if="tier.status === 'unlocked'"
              type="warning"
              size="large"
              class="membership-view__reward-card-btn"
              :loading="exchangingTier === tier.tier"
              @click="handleExchangeReward(tier.tier)"
            >
              立即兑换
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </FlexContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import membershipApi, { MEMBERSHIP_CODE } from '@/api/browser/membership_api'
import type {
  DurationAccountResponse,
  DurationLedgerItem,
  SignInCalendarResponse,
  SignOverviewResponse,
  UsageStatItem
} from '@/api/browser/membership_api'
import type { SignInCalendarDay } from '@/api/browser/hey-api'
import biliMessage from '@/utils/message'
import { formatDate, formatDateTime } from '@/utils/dateFormat'
import { LINK_REL, LINK_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'

const route = useRoute()
const router = useRouter()

// ============ 账户 ============
const account = ref<DurationAccountResponse | null>(null)
const signing = ref(false)

async function loadAccount() {
  const result = await membershipApi.GetAccount()
  if (result.success && result.data) account.value = result.data
}

// ============ 签到 ============
async function handleSignIn() {
  signing.value = true
  try {
    const resp = await membershipApi.SignInRaw()
    if (resp.code === 0 && resp.data) {
      biliMessage.success(
        `签到成功：获得 ${formatSeconds(resp.data.reward_seconds)}（累计 ${resp.data.total_sign_days} 天）`
      )
      await refreshSignIn()
    } else if (resp.code === MEMBERSHIP_CODE.SIGN_IN_ALREADY_TODAY) {
      biliMessage.info('今日已签到，明天再来吧')
    } else {
      biliMessage.error(resp.msg || '签到失败')
    }
  } finally {
    signing.value = false
  }
}

// ============ 签到日历 & 概览 ============
/** el-calendar 的展示月份（切换月份即重新拉该月数据） */
const signInCalendarDate = ref(new Date())
const signInCalendar = ref<SignInCalendarResponse | null>(null)
const signInCalendarLoading = ref(false)
const overview = ref<SignOverviewResponse | null>(null)
const rewardDialogVisible = ref(false)
const exchangingTier = ref('')
const makeupInProgress = ref(false)

/** el-calendar 只展示该月，补白日不展示（用 range 收敛到 1 号 ~ 月末） */
const signInCalendarRange = computed<[Date, Date]>(() => {
  const year = signInCalendarDate.value.getFullYear()
  const month = signInCalendarDate.value.getMonth()
  const lastDay = new Date(year, month + 1, 0)
  return [new Date(year, month, 1), lastDay]
})

/** 日期(YYYY-MM-DD) -> 当天日历条目（已签到 + 可补登） */
const signInDayMap = computed(() => {
  const map = new Map<string, SignInCalendarDay>()
  for (const day of signInCalendar.value?.days ?? []) {
    map.set(day.date, day)
  }
  return map
})

/** 下一档位（来自日历响应，含剩余天数与奖励） */
const calendarNextMilestone = computed(() => signInCalendar.value?.next_milestone ?? null)

const milestonePercent = computed(() => {
  const next = calendarNextMilestone.value
  const days = safeNumber(next?.days)
  if (!next || days <= 0) return 100
  const current = safeNumber(overview.value?.streak?.days)
  return Math.max(0, Math.min(100, Math.round((current / days) * 100)))
})

/** 每日签到奖励（任取当天已发记录，配置变更后次日生效；兜底用日历当天记录） */
const dailyRewardSeconds = computed(() => {
  const first = (signInCalendar.value?.days ?? []).find((d) => d.signed)
  return first?.reward_seconds ?? '0'
})

/** 档位概览文案：7d/14d/28d */
const tierSummary = computed(() =>
  (overview.value?.redemption_status?.tiers ?? [])
    .map((t) => `${t.tier} ${formatSeconds(t.reward_seconds)}`)
    .join(' · ')
)

/** 月底清零提示文案：显示本月最后一天日期 */
const monthEndHint = computed(() => {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return `本月 ${lastDay} 日 24:00 清零`
})

/** 已签到绿底、可补登黄底（可点击）、未签到灰底 */
function signInCellClass(day: string): string {
  const base = 'border border-transparent'
  const record = signInDayMap.value.get(day)
  if (record?.signed) return `${base} bg-success-light-9 border-success-light-8 cursor-default`
  if (record?.can_makeup) return `${base} bg-warning-light-9 border-warning-light-8 cursor-pointer`
  return `${base} bg-fill-light`
}

/** 悬浮提示：当天奖励 / 是否补签 / 是否可补登 */
function signInTooltipText(day: string): string {
  const record = signInDayMap.value.get(day)
  if (record?.signed) {
    const makeup = record.is_makeup ? '（补签）' : ''
    return `已签到 · 获得 ${formatSeconds(record.reward_seconds)}${makeup}`
  }
  if (record?.can_makeup) {
    return `未打卡 · 可补登（消耗 1 张补登卡，获得 ${formatSeconds(dailyRewardSeconds.value)}）`
  }
  return '未打卡'
}

function handleCalendarClick(day: string) {
  const record = signInDayMap.value.get(day)
  if (record?.can_makeup) void handleMakeup(day)
}

async function handleMakeup(day: string) {
  if (makeupInProgress.value) return
  makeupInProgress.value = true
  try {
    const resp = await membershipApi.MakeupSignInRaw(day)
    if (resp.code === 0 && resp.data) {
      biliMessage.success(
        `补签 ${resp.data.date} 成功：获得 ${formatSeconds(resp.data.reward_seconds)}`
      )
      await refreshSignIn()
    } else {
      // 5010 不可补签 / 5011 已签到 / 5012 卡不足：原样展示后端 msg
      biliMessage.error(resp.msg || '补签失败')
    }
  } finally {
    makeupInProgress.value = false
  }
}

function rewardStatusText(status: string): string {
  if (status === 'exchanged') return '已兑换'
  if (status === 'unlocked') return '可兑换'
  const remain = tierRemainingText(status)
  return remain ? `还差 ${remain}` : '未解锁'
}

function tierRemainingText(status: string): string {
  const tier = (overview.value?.redemption_status?.tiers ?? []).find(
    (t) => t.status === status
  )
  if (!tier) return ''
  const remain = safeNumber(tier.days) - safeNumber(overview.value?.streak?.days)
  return remain > 0 ? `${remain} 天` : ''
}

function rewardCardClass(status: string): string {
  if (status === 'exchanged') return 'border-border-light bg-fill-light'
  if (status === 'unlocked') return 'border-warning-light-8 bg-warning-light-9'
  return 'border-border-light'
}

function rewardTagType(status: string): 'success' | 'warning' | 'info' {
  if (status === 'exchanged') return 'success'
  if (status === 'unlocked') return 'warning'
  return 'info'
}

async function handleExchangeReward(tier: string) {
  if (exchangingTier.value) return
  exchangingTier.value = tier
  try {
    const resp = await membershipApi.ExchangeSignRewardRaw(tier)
    if (resp.code === 0 && resp.data) {
      biliMessage.success(
        `兑换成功：${resp.data.name} · 时长 +${formatSeconds(resp.data.reward_seconds)} · 补登卡 +${resp.data.makeup_cards} 张`
      )
      await refreshSignIn()
    } else {
      // 5013 未解锁 / 5014 已兑换：原样展示后端 msg
      biliMessage.error(resp.msg || '兑换失败')
    }
  } finally {
    exchangingTier.value = ''
  }
}

async function loadSignInOverview() {
  const result = await membershipApi.SignInOverview()
  if (result.success && result.data) overview.value = result.data
}

async function loadSignInCalendar() {
  const year = signInCalendarDate.value.getFullYear()
  const month = signInCalendarDate.value.getMonth() + 1
  const monthText = `${year}-${String(month).padStart(2, '0')}`
  signInCalendarLoading.value = true
  try {
    const result = await membershipApi.SignInCalendar(monthText)
    if (result.success && result.data) signInCalendar.value = result.data
  } finally {
    signInCalendarLoading.value = false
  }
}

/** 签到 / 补签 / 兑换后统一刷新：概览 + 日历 + 账户 */
async function refreshSignIn() {
  await Promise.all([loadSignInOverview(), loadSignInCalendar(), loadAccount()])
}

// 日历翻月 → 重新查询该月
watch(signInCalendarDate, () => {
  void loadSignInCalendar()
})

// ============ 兑换码（弹窗） ============
const redeemCode = ref('')
const redeeming = ref(false)
const redeemDialogVisible = ref(false)

function openRedeemDialog() {
  redeemDialogVisible.value = true
}

async function handleRedeem() {
  const code = redeemCode.value.trim()
  if (!code) {
    biliMessage.warning('请输入兑换码')
    return
  }
  redeeming.value = true
  try {
    const resp = await membershipApi.RedeemRaw(code)
    if (resp.code === 0 && resp.data) {
      const isMonthCard = resp.data.code_type === 'month_card'
      biliMessage.success(
        isMonthCard
          ? `月卡已开通：${resp.data.reward_summary}`
          : `兑换成功：获得 ${formatSeconds(resp.data.duration_seconds ?? '0')}`
      )
      redeemCode.value = ''
      redeemDialogVisible.value = false
      await loadAccount()
    } else {
      // 非 0 业务码：原样展示后端 msg（兑换码无效/已用尽/已兑换过等）
      biliMessage.error(resp.msg || '兑换失败，请稍后重试')
    }
  } finally {
    redeeming.value = false
  }
}

// ============ 使用统计（近 30 天） ============
const usageStats = ref<UsageStatItem[]>([])
const usageLoading = ref(false)

function isoDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return d.toISOString().slice(0, 10)
}

async function loadUsage() {
  usageLoading.value = true
  try {
    const result = await membershipApi.UsageStats(isoDate(-29), isoDate(0))
    if (result.success && result.data) {
      // 后端返回 { items: [...] } 包装对象；再过滤无效行（browser_id 非正整数的
      // 历史脏数据），避免空浏览器名 / NaN 进度条
      const items = Array.isArray(result.data.items) ? result.data.items : []
      usageStats.value = items.filter((s) => Number(s.browser_id) > 0)
    }
  } finally {
    usageLoading.value = false
  }
}

const usageTotals = computed(() => {
  let workflow = 0
  let manual = 0
  let runs = 0
  for (const s of usageStats.value) {
    workflow += safeNumber(s.workflow_seconds)
    manual += safeNumber(s.manual_seconds)
    runs += safeNumber(s.workflow_run_count)
  }
  return { workflow: formatSeconds(workflow), manual: formatSeconds(manual), runs }
})

function safeNumber(v: string | number | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const usageMaxSeconds = computed(() =>
  Math.max(1, ...usageStats.value.map((s) => safeNumber(s.workflow_seconds)))
)

function usagePercent(seconds: string): number {
  const pct = (safeNumber(seconds) / usageMaxSeconds.value) * 100
  return Number.isFinite(pct) ? Math.min(100, Math.round(pct)) : 0
}

// ============ 时长流水（无限滚动） ============
const LEDGER_PAGE_SIZE = 20
const ledgerItems = ref<DurationLedgerItem[]>([])
const ledgerLoading = ref(false)
const ledgerLoadingMore = ref(false)
const ledgerPage = ref(1)
const ledgerTotal = ref(0)
const ledgerHasMore = computed(() => ledgerItems.value.length < ledgerTotal.value)

/** 流水筛选：all=全部 / gain=仅获得 / consume=仅消耗（服务端按 change_types 过滤） */
type LedgerFilter = 'all' | 'gain' | 'consume'
const LEDGER_FILTER_CHANGE_TYPES: Record<LedgerFilter, string> = {
  all: '',
  gain: 'sign_in,activity,redeem,purchase,adjust',
  consume: 'consume'
}
const ledgerFilter = ref<LedgerFilter>('all')

const ledgerFilterTotals = computed(() => {
  let gain = 0
  let consume = 0
  for (const item of ledgerItems.value) {
    const seconds = safeNumber(item.change_seconds)
    if (seconds >= 0) gain += seconds
    else consume += -seconds
  }
  return { gain, consume }
})

const ledgerEmptyText = computed(() => {
  if (ledgerFilter.value === 'gain') return '暂无获得记录'
  if (ledgerFilter.value === 'consume') return '暂无消耗记录'
  return '暂无流水记录'
})

async function loadLedger(reset: boolean) {
  if (reset) {
    ledgerPage.value = 1
    ledgerLoading.value = true
  } else {
    if (ledgerLoadingMore.value || !ledgerHasMore.value) return
    ledgerLoadingMore.value = true
  }
  try {
    const result = await membershipApi.LedgerList(
      ledgerPage.value,
      LEDGER_PAGE_SIZE,
      LEDGER_FILTER_CHANGE_TYPES[ledgerFilter.value]
    )
    if (result.success && result.data) {
      ledgerTotal.value = result.data.total
      if (reset) ledgerItems.value = result.data.items
      else ledgerItems.value.push(...result.data.items)
      ledgerPage.value += 1
    }
  } finally {
    ledgerLoading.value = false
    ledgerLoadingMore.value = false
  }
}

/** 明细列表触底加载：普通滚动容器，事件目标即滚动元素本身 */
function handleLedgerScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    void loadLedger(false)
  }
}

// 切换筛选：服务端按 change_types 过滤，重新从第一页拉取
watch(ledgerFilter, () => {
  void loadLedger(true)
})

function ledgerTypeText(type: string): string {
  const map: Record<string, string> = {
    sign_in: '签到',
    activity: '活动',
    redeem: '兑换',
    purchase: '购买',
    consume: '消耗',
    adjust: '调整',
    monthly_reset: '月清零'
  }
  return map[type] ?? type
}

function ledgerTagType(type: string): 'success' | 'danger' | 'warning' | 'info' {
  if (type === 'consume') return 'danger'
  if (type === 'monthly_reset') return 'warning'
  if (type === 'adjust') return 'warning'
  if (['sign_in', 'redeem', 'purchase', 'activity'].includes(type)) return 'success'
  return 'info'
}

// ============ 工具 ============
/** 秒数格式化；负数（消耗）保留负号，避免被截断成 0 秒 */
function formatSeconds(raw: string | number): string {
  const value = Math.floor(Number(raw) || 0)
  const total = Math.abs(value)
  let body: string
  if (total < 60) body = `${total} 秒`
  else {
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    if (hours <= 0) body = `${minutes} 分钟`
    else body = minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
  }
  return value < 0 ? `-${body}` : body
}

// ============ 支付：跳转 Casdoor 商店 + RPA 主动查询核销 ============
/**
 * Casdoor 无法直接跳回 RPA 页面，月卡核销不依赖 Success URL 跳转：
 * - 点击「购买月卡」时在本地记一笔「支付中」标记（同页跳走后返回仍在）；
 * - 回到本页后由后端 POST /payment/confirm 主动查 Casdoor、推进交易并幂等入账；
 * - 有标记时每 5s 轮询一次，核销成功或超过 15 分钟自动停止；
 * - 后端另有定时对账任务兜底，即使用户不回本页也会入账。
 */
const PAYMENT_PENDING_KEY = 'rpa_payment_pending_at'
const PAYMENT_POLL_INTERVAL_MS = 5000
const PAYMENT_POLL_MAX_MS = 15 * 60 * 1000
let paymentPollTimer: ReturnType<typeof window.setInterval> | undefined

/**
 * Casdoor 商店页（商品列表页）：`{server}/products?organization=xx&application=xx`
 * 「购买月卡」直接跳商店，由用户自行挑选商品；入账由 RPA 主动查询对账完成。
 */
const casdoorShopUrl = computed(() => {
  const base = (import.meta.env.VITE_CASDOOR_SERVER_URL ?? '').trim().replace(/\/+$/, '')
  if (!base) return ''
  const params = new URLSearchParams({
    organization: import.meta.env.VITE_CASDOOR_ORGANIZATION ?? '',
    application: import.meta.env.VITE_CASDOOR_APPLICATION ?? ''
  })
  return `${base}/products?${params.toString()}`
})

/** 跳转 Casdoor 商店前置下「支付中」标记（链接导航仍照常发生） */
function markPaymentPending() {
  if (!casdoorShopUrl.value) return
  localStorage.setItem(PAYMENT_PENDING_KEY, String(Date.now()))
}

function clearPaymentPending() {
  localStorage.removeItem(PAYMENT_PENDING_KEY)
}

function stopPaymentPolling() {
  if (paymentPollTimer !== undefined) {
    window.clearInterval(paymentPollTimer)
    paymentPollTimer = undefined
  }
}

/**
 * Casdoor Success URL 跳回处理（兼容仍可跳回的部署）：?transactionOwner=x&transactionName=y
 * 参数仅透传给后端做服务端核验（notify-payment + get-payment），
 * 入账与否则以后端返回为准；完成后清掉 query 防刷新重复提示（后端幂等兜底）。
 * @returns 本轮是否有新支付入账
 */
async function handlePaymentRedirect(): Promise<boolean> {
  const owner = route.query.transactionOwner
  const name = route.query.transactionName
  if (typeof owner !== 'string' || typeof name !== 'string' || !owner || !name) {
    return false
  }
  const result = await membershipApi.NotifyPayment(owner, name)
  // 后端返回 { granted: [...] } 包装对象，不是裸数组
  const granted = result.success && result.data?.granted ? result.data.granted : []
  if (granted.length > 0) {
    for (const g of granted) biliMessage.success(g.summary)
  } else if (result.success) {
    biliMessage.info('支付确认中，若已付款请稍候自动到账')
  }
  await router.replace({ query: { ...route.query, transactionOwner: undefined, transactionName: undefined } })
  await loadAccount()
  return granted.length > 0
}

/**
 * 主动对账：服务端查 Casdoor 真实状态、推进交易并幂等入账（不依赖任何跳转）。
 * 无新入账时静默，不打扰正常浏览。
 * @returns 本轮是否有新支付入账
 */
async function handleFallbackConfirm(): Promise<boolean> {
  const result = await membershipApi.PaymentConfirm()
  // 后端返回 { granted: [...] } 包装对象，不是裸数组
  const granted = result.success && result.data?.granted ? result.data.granted : []
  if (granted.length > 0) {
    for (const g of granted) biliMessage.success(g.summary)
    await loadAccount()
    return true
  }
  return false
}

/**
 * 支付中轮询：存在未过期的「支付中」标记时，定时让后端主动查单核销，
 * 成功入账或超过最长等待时间后自动停止。
 */
function startPaymentPolling() {
  const raw = localStorage.getItem(PAYMENT_PENDING_KEY)
  if (!raw) return
  const startedAt = Number(raw)
  if (!Number.isFinite(startedAt)) {
    clearPaymentPending()
    return
  }
  if (Date.now() - startedAt > PAYMENT_POLL_MAX_MS) {
    clearPaymentPending()
    return
  }
  stopPaymentPolling()
  paymentPollTimer = window.setInterval(async () => {
    if (Date.now() - startedAt > PAYMENT_POLL_MAX_MS) {
      stopPaymentPolling()
      clearPaymentPending()
      return
    }
    try {
      const granted = await handleFallbackConfirm()
      if (granted) {
        stopPaymentPolling()
        clearPaymentPending()
      }
    } catch {
      // 网络抖动 / Casdoor 暂不可用：下一轮继续，后端与定时任务均有幂等兜底
    }
  }, PAYMENT_POLL_INTERVAL_MS)
}

onMounted(async () => {
  loadAccount()
  loadUsage()
  loadLedger(true)
  loadSignInOverview()
  loadSignInCalendar()
  const fromRedirect = await handlePaymentRedirect()
  const granted = await handleFallbackConfirm()
  if (fromRedirect || granted) {
    clearPaymentPending()
  } else {
    startPaymentPolling()
  }
})

onUnmounted(() => {
  stopPaymentPolling()
})
</script>
