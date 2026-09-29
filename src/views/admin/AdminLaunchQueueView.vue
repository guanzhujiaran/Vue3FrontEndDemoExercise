<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import {
  管理员管理Service,
  type BrowserLaunchQueueMonitorResponse,
  type BrowserLaunchQueueWaitingItem,
  type LaunchQueueStatus,
} from '@/api/browser/hey-api'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasRpaAdminPerm } from '@/views/message/messageAdmin'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'

/**
 * 浏览器启动队列总览（管理端）
 *
 * 只读观察项：系统内存水位、单实例内存实测（准入额度来源）、VIP / 普通队列长度、
 * 排队中的会话明细。用于判断是否需要扩容或调整准入配置。
 */
const AUTO_REFRESH_INTERVAL_MS = 5000
/** 内存使用率达到该值时高亮预警（与后端默认红线一致） */
const MEMORY_WARN_PERCENT = 90

const adminStore = useMessageAdminStore()
const isAdmin = computed(() =>
  hasRpaAdminPerm(adminStore.status.biz_perms, adminStore.status.is_root)
)

const queue = ref<LaunchQueueStatus | null>(null)
const waitingSessions = ref<BrowserLaunchQueueWaitingItem[]>([])
const loading = ref(false)
const autoRefresh = ref(true)
const lastUpdatedAt = ref(0)
let refreshTimer: ReturnType<typeof setInterval> | null = null

const load = async () => {
  if (!isAdmin.value) return
  loading.value = true
  const res = await businessHandler(
    管理员管理Service.getLaunchQueueStatusApiAdminRpaBrowserLaunchQueueStatusPost() as unknown as Promise<
      BusinessResponse<BrowserLaunchQueueMonitorResponse | null | undefined>
    >,
    { showSuccessToast: false, errorMessage: '获取启动队列状态失败' }
  )
  const data = res.data
  if (data) {
    queue.value = data.queue
    waitingSessions.value = data.waiting_sessions ?? []
    lastUpdatedAt.value = Date.now()
  }
  loading.value = false
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  if (autoRefresh.value) {
    refreshTimer = setInterval(load, AUTO_REFRESH_INTERVAL_MS)
  }
}

watch(autoRefresh, () => startAutoRefresh())

const memory = computed(() => queue.value?.memory)
const browserMemory = computed(() => queue.value?.browser_memory)

const memoryPercent = computed(() => Math.round(memory.value?.used_percent ?? 0))
const memoryWarning = computed(() => memoryPercent.value >= MEMORY_WARN_PERCENT)

/** 按当前实测额度估算还能容纳的实例数（仅参考，真正的准入由后端判定） */
const capacityEstimate = computed(() => {
  const reserved = browserMemory.value?.reserved_mb ?? 0
  const available = memory.value?.available_mb ?? 0
  if (reserved <= 0) return 0
  return Math.max(0, Math.floor(available / reserved))
})

/** 已占用实例数：运行中（实测扫描）+ 启动中 */
const occupiedInstances = computed(
  () => (browserMemory.value?.active_instances ?? 0) + (queue.value?.launching ?? 0)
)

const maxInstancesText = computed(() => {
  const max = queue.value?.max_instances ?? 0
  return max > 0 ? `${max}` : '不限'
})

const waitingTotal = computed(
  () => (queue.value?.vip_waiting ?? 0) + (queue.value?.normal_waiting ?? 0)
)

function formatMb(value?: number | null): string {
  if (value === undefined || value === null) return '-'
  return `${Math.round(value)} MB`
}

function formatSeconds(seconds?: number): string {
  const total = Math.max(0, Math.round(seconds ?? 0))
  if (total < 60) return `${total} 秒`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分`
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

function queueTypeLabel(type: BrowserLaunchQueueWaitingItem['queue_type']): string {
  return type === 'vip' ? 'VIP' : '普通'
}

function stateLabel(state: BrowserLaunchQueueWaitingItem['state']): string {
  return state === 'launching' ? '启动中' : '排队中'
}

/** 后端 int 可能精度丢失，优先用 *_str */
function idOf(value: string | undefined, fallback: number): string {
  return value || String(fallback)
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) {
    load()
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="admin-launch-queue flex flex-col gap-4">
    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <template v-else>
      <div class="admin-launch-queue__header flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="text-lg font-medium text-text-primary">启动队列总览</span>
          <el-tag v-if="queue" :type="queue.enabled ? 'success' : 'info'">
            {{ queue.enabled ? '内存准入排队已启用' : '内存准入排队已关闭' }}
          </el-tag>
          <span v-if="lastUpdatedAt" class="admin-launch-queue__updated text-sm text-text-placeholder">
            更新于 {{ formatTime(lastUpdatedAt) }}
          </span>
        </div>

        <div class="admin-launch-queue__toolbar flex items-center gap-3">
          <el-switch v-model="autoRefresh" active-text="自动刷新" />
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <LoadingWrap :loading="loading && !queue" :rows="5">
        <div class="admin-launch-queue__cards grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div class="admin-launch-queue__card rounded-lg border border-border bg-bg p-4">
            <span class="admin-launch-queue__card-title text-sm text-text-secondary">系统内存</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span
                class="admin-launch-queue__memory-percent text-2xl font-semibold"
                :class="memoryWarning ? 'text-danger' : 'text-text-primary'"
              >
                {{ memoryPercent }}%
              </span>
              <span class="text-sm text-text-placeholder">
                可用 {{ memory?.available_mb ?? 0 }} / {{ memory?.total_mb ?? 0 }} MB
              </span>
            </div>
            <el-progress
              class="admin-launch-queue__memory-progress mt-3"
              :percentage="memoryPercent"
              :show-text="false"
              :stroke-width="6"
              :status="memoryWarning ? 'exception' : 'success'"
            />
            <span class="admin-launch-queue__card-hint mt-2 text-xs text-text-placeholder">
              启动单个实例需 {{ memory?.required_mb ?? 0 }} MB 可用内存，当前
              {{ memory?.can_launch ? '满足' : '不满足' }}
            </span>
          </div>

          <div class="admin-launch-queue__card rounded-lg border border-border bg-bg p-4">
            <span class="admin-launch-queue__card-title text-sm text-text-secondary">
              单实例内存实测
            </span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="admin-launch-queue__reserved text-2xl font-semibold text-text-primary">
                {{ formatMb(browserMemory?.reserved_mb) }}
              </span>
              <span class="text-sm text-text-placeholder">
                基准 {{ formatMb(browserMemory?.configured_reserved_mb) }}
              </span>
            </div>
            <div class="admin-launch-queue__memory-detail mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-placeholder">
              <span>平均 {{ formatMb(browserMemory?.average_mb) }}</span>
              <span>峰值 {{ formatMb(browserMemory?.peak_mb) }}</span>
              <span>
                样本 {{ browserMemory?.sample_count ?? 0 }}/{{ browserMemory?.window ?? 0 }}
              </span>
            </div>
          </div>

          <div class="admin-launch-queue__card rounded-lg border border-border bg-bg p-4">
            <span class="admin-launch-queue__card-title text-sm text-text-secondary">队列长度</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="admin-launch-queue__waiting-total text-2xl font-semibold text-text-primary">
                {{ waitingTotal }}
              </span>
              <span class="text-sm text-text-placeholder">人排队中</span>
            </div>
            <div class="admin-launch-queue__queue-detail mt-3 flex flex-wrap gap-2">
              <el-tag type="warning" effect="plain">VIP {{ queue?.vip_waiting ?? 0 }}</el-tag>
              <el-tag type="info" effect="plain">普通 {{ queue?.normal_waiting ?? 0 }}</el-tag>
              <el-tag type="primary" effect="plain">启动中 {{ queue?.launching ?? 0 }}</el-tag>
            </div>
          </div>

          <div class="admin-launch-queue__card rounded-lg border border-border bg-bg p-4">
            <span class="admin-launch-queue__card-title text-sm text-text-secondary">实例占用</span>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="admin-launch-queue__occupied text-2xl font-semibold text-text-primary">
                {{ occupiedInstances }}
              </span>
              <span class="text-sm text-text-placeholder">上限 {{ maxInstancesText }}</span>
            </div>
            <div class="admin-launch-queue__instance-detail mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-placeholder">
              <span>运行中 {{ browserMemory?.active_instances ?? 0 }}</span>
              <span>按当前额度约可再启动 {{ capacityEstimate }} 个</span>
            </div>
            <div class="admin-launch-queue__counter-detail mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-placeholder">
              <span>累计受理 {{ queue?.submitted_total ?? 0 }}</span>
              <span>累计排队 {{ queue?.queued_total ?? 0 }}</span>
              <span>累计超时 {{ queue?.timeout_total ?? 0 }}</span>
            </div>
          </div>
        </div>

        <div class="admin-launch-queue__table-wrap mt-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <span class="text-base font-medium text-text-primary">排队明细</span>
            <span class="text-sm text-text-placeholder">
              共 {{ waitingSessions.length }} 条（VIP 优先、等待久者在前）
            </span>
          </div>

          <EmptyState v-if="waitingSessions.length === 0" text="当前没有排队中的浏览器启动请求" />

          <el-table
            v-else
            class="admin-launch-queue__table"
            :data="waitingSessions"
            row-key="browser_id"
            stripe
          >
            <el-table-column label="用户 mid" min-width="160">
              <template #default="{ row }">
                <span class="text-text-primary">{{ idOf(row.mid_str, row.mid) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="浏览器 ID" min-width="160">
              <template #default="{ row }">
                <span class="text-text-primary">{{ idOf(row.browser_id_str, row.browser_id) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="队列" width="110">
              <template #default="{ row }">
                <el-tag :type="row.queue_type === 'vip' ? 'warning' : 'info'">
                  {{ queueTypeLabel(row.queue_type) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.state === 'launching' ? 'primary' : 'success'">
                  {{ stateLabel(row.state) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="排位" width="90">
              <template #default="{ row }">
                <span class="text-text-primary">{{ row.position ?? '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="已等待" min-width="120">
              <template #default="{ row }">
                <span class="admin-launch-queue__row-waiting text-text-secondary">
                  {{ formatSeconds(row.waiting_seconds) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </LoadingWrap>
    </template>
  </div>
</template>
