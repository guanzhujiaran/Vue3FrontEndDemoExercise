<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Close, Loading, Timer, Trophy } from '@element-plus/icons-vue'
import { LaunchQueueStateEnum, type BrowserLaunchQueueStatusResponse } from '@/api/browser/hey-api'

/**
 * 浏览器启动排队面板（内存准入）
 *
 * 内存不足时后端会把启动请求放进队列（VIP 队列优先于普通队列），
 * 本组件只负责展示排队进度，轮询由父组件负责（见 BrowserStream）。
 */
const props = defineProps<{
  /** 排队状态（queue_status 接口返回），未取到时为 null */
  queue: BrowserLaunchQueueStatusResponse | null
  /** 已等待秒数（前端本地计时，比后端轮询值更平滑） */
  waitingSeconds: number
  /** 是否正在取消排队 */
  cancelling?: boolean
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const { t } = useI18n()

/** 是否大会员队列 */
const isVip = computed(() => props.queue?.queue_type === 'vip')

/** 是否已放行、正在启动 */
const isLaunching = computed(
  () => props.queue?.queue_state === LaunchQueueStateEnum.LAUNCHING
)

/** 前方还有多少人（排位从 1 开始，排位 1 表示下一个就是自己） */
const aheadCount = computed(() => {
  const position = props.queue?.queue_position
  return position && position > 1 ? position - 1 : 0
})

/** 已等待 / 最长等待 的百分比，用于提示距离超时还有多远 */
const waitPercent = computed(() => {
  const maxWait = props.queue?.max_wait_seconds ?? 0
  if (maxWait <= 0) return 0
  return Math.min(99, Math.round((props.waitingSeconds / maxWait) * 100))
})

/** 是否为「不限等待时长」 */
const hasMaxWait = computed(() => (props.queue?.max_wait_seconds ?? 0) > 0)
</script>

<template>
  <div
    class="launch-queue-panel flex h-full min-h-105 flex-col items-center justify-center gap-6 rounded-2xl border border-border bg-bg p-6"
  >
    <div class="launch-queue-panel__header flex flex-col items-center gap-3">
      <el-icon class="launch-queue-panel__icon animate-spin text-4xl text-primary">
        <Loading />
      </el-icon>
      <el-text class="launch-queue-panel__title text-xl font-medium text-text-primary">
        {{ isLaunching ? t('rpa.sessionStatusConnecting') : t('rpa.queueTitle') }}
      </el-text>
      <el-tag
        class="launch-queue-panel__queue-type"
        :type="isVip ? 'warning' : 'info'"
        size="large"
      >
        <span class="flex items-center gap-1">
          <el-icon v-if="isVip"><Trophy /></el-icon>
          {{ isVip ? t('rpa.queueVipHint') : t('rpa.queueNormalHint') }}
        </span>
      </el-tag>
    </div>

    <div
      v-if="!isLaunching"
      class="launch-queue-panel__position flex flex-col items-center gap-1"
    >
      <span class="launch-queue-panel__ahead text-3xl font-semibold text-primary">
        {{ t('rpa.queueAhead', { count: aheadCount }) }}
      </span>
      <el-text
        v-if="queue?.queue_position"
        class="launch-queue-panel__rank text-base text-text-secondary"
      >
        {{ t('rpa.queuePosition', { position: queue.queue_position }) }}
      </el-text>
    </div>

    <div class="launch-queue-panel__wait w-full max-w-120">
      <div class="mb-2 flex items-center justify-between text-sm text-text-secondary">
        <span class="launch-queue-panel__waiting flex items-center gap-1">
          <el-icon><Timer /></el-icon>
          {{ t('rpa.queueWaiting', { seconds: waitingSeconds }) }}
        </span>
        <span v-if="hasMaxWait" class="launch-queue-panel__max-wait">
          {{ t('rpa.queueMaxWait', { seconds: queue?.max_wait_seconds ?? 0 }) }}
        </span>
      </div>
      <el-progress
        v-if="hasMaxWait"
        class="launch-queue-panel__progress"
        :percentage="waitPercent"
        :show-text="false"
        :stroke-width="8"
      />
    </div>

    <div
      class="launch-queue-panel__stats flex flex-wrap items-center justify-center gap-2"
      v-if="queue"
    >
      <el-tag class="launch-queue-panel__stat-vip" type="warning" effect="plain">
        {{ t('rpa.queueVipWaiting', { count: queue.vip_waiting ?? 0 }) }}
      </el-tag>
      <el-tag class="launch-queue-panel__stat-normal" type="info" effect="plain">
        {{ t('rpa.queueNormalWaiting', { count: queue.normal_waiting ?? 0 }) }}
      </el-tag>
      <el-tag class="launch-queue-panel__stat-launching" type="primary" effect="plain">
        {{ t('rpa.queueLaunching', { count: queue.launching ?? 0 }) }}
      </el-tag>
    </div>

    <el-text class="launch-queue-panel__hint text-sm text-text-placeholder">
      {{ t('rpa.queueKeepPageHint') }}
    </el-text>

    <el-button
      class="launch-queue-panel__cancel"
      type="danger"
      plain
      size="large"
      :icon="Close"
      :loading="cancelling"
      @click="emit('cancel')"
    >
      {{ t('rpa.queueCancel') }}
    </el-button>
  </div>
</template>
