<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LiveViewersPanel from '@/components/rpa-browser/live/LiveViewersPanel.vue'
import type { LiveViewerInfo } from '@/models/rpa_browser/live_stream'

/**
 * 播放器顶部浮层：LIVE 标识 / 观看人数 / 暂停·降档徽标 / 会话状态 / 实时速率
 *
 * 浮层整体 `pointer-events-none`，只有需要交互的入口（人数徽标）单独放行。
 */
interface Props {
  /** 是否显示（跟随控制层淡入淡出） */
  visible: boolean
  paused: boolean
  autoDegraded: boolean
  effectiveLevelLabel: string
  viewerCount: number
  viewers: LiveViewerInfo[]
  /** 会话被自动化任务占用（展示「任务执行中」） */
  sessionPinned: boolean
  uploadSpeed: string
  downloadSpeed: string
  activeStreamsCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'viewers-open'): void
  (e: 'viewers-close'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="live-player-topbar pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-linear-to-b from-black/70 via-black/25 to-transparent px-3 pt-2.5 pb-8 transition-opacity duration-300"
    :class="props.visible ? 'opacity-100' : 'opacity-0'"
  >
    <div class="live-player-topbar__left flex flex-wrap items-center gap-1.5 text-xs text-white/90">
      <span
        class="live-player-topbar__live-badge inline-flex items-center gap-1.5 rounded bg-linear-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 font-medium tracking-wide"
      >
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>
        LIVE
      </span>

      <!-- 多观看者并发直播：点开看「谁在看」（设备 / IP / 接入时间） -->
      <el-popover
        v-if="props.viewerCount > 0"
        trigger="click"
        placement="bottom-start"
        :width="300"
        :teleported="false"
        @show="emit('viewers-open')"
        @hide="emit('viewers-close')"
      >
        <template #reference>
          <button
            type="button"
            class="live-player-topbar__viewers-badge pointer-events-auto inline-flex items-center gap-1 rounded bg-black/45 px-1.5 py-0.5 backdrop-blur-sm transition hover:bg-black/70"
            :title="t('rpa.multiViewerHint')"
          >
            <svg viewBox="0 0 24 24" class="h-3 w-3" fill="currentColor" aria-hidden="true">
              <path
                d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4Z"
              />
            </svg>
            {{ props.viewerCount }}
          </button>
        </template>

        <LiveViewersPanel :viewers="props.viewers" :viewer-count="props.viewerCount" />
      </el-popover>

      <span
        v-if="props.paused"
        class="live-player-topbar__paused-badge rounded bg-black/45 px-1.5 py-0.5 backdrop-blur-sm"
      >
        {{ t('rpa.streamPaused') }}
      </span>
      <span
        v-else-if="props.autoDegraded"
        class="live-player-topbar__degraded-badge rounded bg-black/45 px-1.5 py-0.5 backdrop-blur-sm"
      >
        {{ t('rpa.qualityAutoDegraded') }}（{{ props.effectiveLevelLabel }}）
      </span>
    </div>

    <div class="live-player-topbar__right flex items-center gap-1.5 text-xs text-white/70">
      <span v-if="props.sessionPinned" class="rounded bg-black/45 px-1.5 py-0.5 backdrop-blur-sm">
        {{ t('rpa.taskRunning') }}
      </span>
      <span class="rounded bg-black/45 px-1.5 py-0.5 tabular-nums backdrop-blur-sm">
        ↑ {{ props.uploadSpeed }}
      </span>
      <span class="rounded bg-black/45 px-1.5 py-0.5 tabular-nums backdrop-blur-sm">
        ↓ {{ props.downloadSpeed }}
      </span>
      <span
        v-if="props.activeStreamsCount > 0"
        class="hidden rounded bg-black/45 px-1.5 py-0.5 tabular-nums backdrop-blur-sm sm:inline"
      >
        {{ t('rpa.connections') }} {{ props.activeStreamsCount }}
      </span>
    </div>
  </div>
</template>
