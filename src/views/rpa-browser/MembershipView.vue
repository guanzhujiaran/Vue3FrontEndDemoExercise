<template>
  <div class="membership-view flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-auto">
    <!-- ============ 账户概览 ============ -->
    <div class="membership-view__account grid grid-cols-1 md:grid-cols-4 gap-3">
      <div class="membership-view__balance-card flex flex-col gap-1 rounded-xl p-4 bg-primary-light-9 border border-primary-light-8">
        <span class="membership-view__label text-sm text-text-secondary">剩余时长</span>
        <span class="membership-view__balance text-3xl font-bold text-primary">{{ formatSeconds(account?.balance_seconds ?? '0') }}</span>
      </div>
      <div class="membership-view__month-card flex flex-col gap-2 rounded-xl p-4 bg-info-light-9 border border-info-light-8">
        <span class="membership-view__label text-sm text-text-secondary">月卡状态</span>
        <el-tag v-if="account?.month_card?.active" type="success" class="membership-view__month-card-tag">月卡生效中 · 定时任务免扣</el-tag>
        <el-tag v-else type="info" class="membership-view__month-card-tag">未开通</el-tag>
        <span v-if="account?.month_card?.expire_at" class="membership-view__expire text-xs text-text-secondary">
          到期：{{ formatDateTime(account.month_card.expire_at ?? '') }}
        </span>
      </div>
      <div class="membership-view__granted flex flex-col gap-1 rounded-xl p-4 border border-border-light">
        <span class="membership-view__label text-sm text-text-secondary">累计获得</span>
        <span class="membership-view__granted-value text-xl font-semibold text-success">{{ formatSeconds(account?.total_granted_seconds ?? '0') }}</span>
      </div>
      <div class="membership-view__consumed flex flex-col gap-1 rounded-xl p-4 border border-border-light">
        <span class="membership-view__label text-sm text-text-secondary">累计消耗</span>
        <span class="membership-view__consumed-value text-xl font-semibold text-danger">{{ formatSeconds(account?.total_consumed_seconds ?? '0') }}</span>
      </div>
    </div>

    <!-- ============ 购买（Casdoor 收银台；buy_url 为空表示服务端未启用支付） ============ -->
    <div
      v-if="paymentProducts.length > 0"
      class="membership-view__payment flex flex-col gap-3 rounded-xl border border-border-light p-4"
    >
      <span class="membership-view__payment-title text-base font-semibold text-text-primary">购买权益</span>
      <div class="membership-view__payment-list grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          v-for="item in paymentProducts"
          :key="item.product_name"
          class="membership-view__payment-card flex flex-col gap-2 rounded-xl border border-border-light p-4 hover:border-primary transition-colors"
        >
          <span class="membership-view__payment-name font-semibold text-text-primary">{{ item.display_name }}</span>
          <span class="membership-view__payment-desc text-xs text-text-secondary">
            {{ item.grant_type === 'month_card' ? `月卡 ${item.card_days} 天 · 定时任务免扣` : `时长 ${formatSeconds(item.duration_seconds)}` }}
          </span>
          <span class="membership-view__payment-price text-lg font-bold text-warning">￥{{ item.price }}</span>
          <el-button
            v-if="item.buy_url"
            type="warning"
            size="large"
            class="membership-view__payment-buy"
            @click="openExternalLink(item.buy_url)"
          >
            购买
          </el-button>
        </div>
      </div>
    </div>

    <!-- ============ 签到 & 兑换 ============ -->
    <div class="membership-view__actions flex flex-wrap items-center gap-4 rounded-xl border border-border-light p-4">
      <div class="membership-view__sign-in flex items-center gap-3">
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
        <span class="membership-view__sign-in-hint text-xs text-text-secondary">
          基础 30 分钟，连续签到每日 +10 分钟，单日封顶 60 分钟
        </span>
      </div>
      <el-divider direction="vertical" class="membership-view__divider h-8" />
      <div class="membership-view__redeem flex items-center gap-2">
        <el-input
          v-model="redeemCode"
          class="membership-view__redeem-input"
          placeholder="输入兑换码（时长卡 / 月卡）"
          clearable
          @keyup.enter="handleRedeem"
        />
        <el-button type="success" size="large" class="membership-view__redeem-btn" :loading="redeeming" @click="handleRedeem">
          兑换
        </el-button>
      </div>
    </div>

    <!-- ============ 使用统计（最近 30 天） ============ -->
    <div class="membership-view__usage flex flex-col gap-3 rounded-xl border border-border-light p-4">
      <div class="membership-view__usage-header flex items-center justify-between flex-wrap gap-2">
        <span class="membership-view__usage-title text-base font-semibold text-text-primary">使用统计（近 30 天）</span>
        <div class="membership-view__usage-filter flex items-center gap-2">
          <span class="membership-view__usage-summary text-xs text-text-secondary">
            工作流 {{ usageTotals.workflow }} · 手动调试 {{ usageTotals.manual }}（不计费） · 定时运行 {{ usageTotals.runs }} 次
          </span>
          <el-button size="large" class="membership-view__usage-refresh" :loading="usageLoading" @click="loadUsage">刷新</el-button>
        </div>
      </div>

      <div v-if="usageLoading && usageStats.length === 0" class="membership-view__usage-skeleton w-full">
        <el-skeleton :rows="3" animated />
      </div>
      <el-empty v-else-if="usageStats.length === 0" description="近 30 天暂无使用记录" />

      <div v-else class="membership-view__usage-list flex flex-col gap-2">
        <div
          v-for="item in usageStats"
          :key="item.stat_date + item.browser_id"
          class="membership-view__usage-row flex items-center gap-3"
        >
          <span class="membership-view__usage-date text-xs text-text-secondary w-24 shrink-0">
            {{ formatDate(item.stat_date) }}
          </span>
          <span class="membership-view__usage-browser text-xs text-text-secondary w-20 shrink-0 truncate" :title="item.browser_id">
            浏览器 {{ item.browser_id || '-' }}
          </span>
          <el-progress
            class="membership-view__usage-bar flex-1"
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

    <!-- ============ 时长流水（无限滚动） ============ -->
    <div class="membership-view__ledger flex flex-col gap-3 rounded-xl border border-border-light p-4">
      <span class="membership-view__ledger-title text-base font-semibold text-text-primary">时长流水</span>

      <div v-if="ledgerLoading && ledgerItems.length === 0" class="membership-view__ledger-skeleton w-full">
        <el-skeleton :rows="4" animated />
      </div>
      <el-empty v-else-if="ledgerItems.length === 0" description="暂无流水记录" />

      <div v-else class="membership-view__ledger-list flex flex-col gap-2 max-h-96 overflow-auto" @scroll="handleLedgerScroll">
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
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import membershipApi, { MEMBERSHIP_CODE } from '@/api/browser/membership_api'
import type {
  DurationAccountResponse,
  DurationLedgerItem,
  PaymentProductItem,
  UsageStatItem
} from '@/api/browser/membership_api'
import biliMessage from '@/utils/message'
import { formatDate, formatDateTime } from '@/utils/dateFormat'
import { openExternalLink } from '@/utils/PageOpen/linkPolicy'

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
        `签到成功：获得 ${formatSeconds(resp.data.reward_seconds)}（连续 ${resp.data.continuous_days} 天）`
      )
      await loadAccount()
    } else if (resp.code === MEMBERSHIP_CODE.SIGN_IN_ALREADY_TODAY) {
      biliMessage.info('今日已签到，明天再来吧')
    } else {
      biliMessage.error(resp.msg || '签到失败')
    }
  } finally {
    signing.value = false
  }
}

// ============ 兑换码 ============
const redeemCode = ref('')
const redeeming = ref(false)

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
      // 过滤无效行（browser_id 非正整数的历史脏数据），避免空浏览器名 / NaN 进度条
      usageStats.value = result.data.filter((s) => Number(s.browser_id) > 0)
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

async function loadLedger(reset: boolean) {
  if (reset) {
    ledgerPage.value = 1
    ledgerLoading.value = true
  } else {
    if (ledgerLoadingMore.value || !ledgerHasMore.value) return
    ledgerLoadingMore.value = true
  }
  try {
    const result = await membershipApi.LedgerList(ledgerPage.value, LEDGER_PAGE_SIZE)
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

function handleLedgerScroll(e: Event) {
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    loadLedger(false)
  }
}

function ledgerTypeText(type: string): string {
  const map: Record<string, string> = {
    sign_in: '签到',
    activity: '活动',
    redeem: '兑换',
    consume: '消耗',
    adjust: '调整'
  }
  return map[type] ?? type
}

function ledgerTagType(type: string): 'success' | 'danger' | 'warning' | 'info' {
  if (type === 'consume') return 'danger'
  if (type === 'adjust') return 'warning'
  if (type === 'sign_in' || type === 'redeem' || type === 'activity') return 'success'
  return 'info'
}

// ============ 工具 ============
function formatSeconds(raw: string | number): string {
  const total = Math.max(0, Math.floor(Number(raw) || 0))
  if (total < 60) return `${total} 秒`
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours <= 0) return `${minutes} 分钟`
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`
}

// ============ 支付：商品列表 + Casdoor 跳回处理 ============
const paymentProducts = ref<PaymentProductItem[]>([])

async function loadPaymentProducts() {
  const result = await membershipApi.PaymentProducts()
  if (result.success && result.data) paymentProducts.value = result.data
}

/**
 * Casdoor Success URL 跳回处理：?transactionOwner=x&transactionName=y
 * 参数仅透传给后端做服务端核验（notify-payment + get-payment），
 * 入账与否则以后端返回为准；完成后清掉 query 防刷新重复提示（后端幂等兜底）。
 */
async function handlePaymentRedirect() {
  const owner = route.query.transactionOwner
  const name = route.query.transactionName
  if (typeof owner !== 'string' || typeof name !== 'string' || !owner || !name) {
    return
  }
  const result = await membershipApi.NotifyPayment(owner, name)
  if (result.success && result.data && result.data.length > 0) {
    for (const g of result.data) biliMessage.success(g.summary)
  } else if (result.success) {
    biliMessage.info('未发现需要入账的新支付')
  }
  await router.replace({ query: { ...route.query, transactionOwner: undefined, transactionName: undefined } })
  await loadAccount()
}

/**
 * 兜底对账：未配置 successUrl（或用户手动回到页面）时也能补入账。
 * 无新入账时静默，不打扰正常浏览。
 */
async function handleFallbackConfirm() {
  const result = await membershipApi.PaymentConfirm()
  if (result.success && result.data && result.data.length > 0) {
    for (const g of result.data) biliMessage.success(g.summary)
    await loadAccount()
  }
}

onMounted(() => {
  loadAccount()
  loadUsage()
  loadLedger(true)
  loadPaymentProducts()
  handlePaymentRedirect()
  handleFallbackConfirm()
})
</script>
