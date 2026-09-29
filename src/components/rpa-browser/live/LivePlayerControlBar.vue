<script setup lang="ts">
import { SwitchButton } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { StreamQualityLevelEnum } from '@/api/browser/hey-api'
import type { LiveQualityOption } from '@/models/rpa_browser/live_stream'

/**
 * 播放器底部控制条：播放/暂停 + 观看人数 + 清晰度 + 停止直播 + 全屏
 *
 * 说明：直播没有进度条，时间轴位置由「LIVE + 观看人数」替代。
 * 暂停 / 清晰度都是**观看者级**操作，只影响本端画面。
 */
interface Props {
  /** 是否显示（跟随控制层淡入淡出） */
  visible: boolean
  paused: boolean
  togglingPause: boolean
  qualityOptions: LiveQualityOption[]
  qualityLevel: StreamQualityLevelEnum
  effectiveLevelLabel: string
  settingQuality: boolean
  isFullscreen: boolean
  viewerCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-pause'): void
  (e: 'set-quality', level: StreamQualityLevelEnum): void
  (e: 'toggle-fullscreen'): void
  (e: 'stop'): void
  (e: 'quality-menu-visible', visible: boolean): void
}>()

const { t } = useI18n()

// el-dropdown 的 command 是宽松类型（string | number | object），这里收窄回档位枚举
const handleQualityCommand = (command: unknown) => {
  emit('set-quality', command as StreamQualityLevelEnum)
}
</script>

<template>
  <div
    class="live-player-controlbar absolute inset-x-0 bottom-0 flex items-center gap-1 bg-linear-to-t from-black/85 via-black/55 to-transparent px-2 pt-8 pb-1.5 transition-opacity duration-300"
    :class="props.visible ? 'opacity-100' : 'pointer-events-none opacity-0'"
  >
    <button
      type="button"
      class="live-player-controlbar__pause-btn flex h-9 w-9 items-center justify-center rounded text-white/90 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
      :disabled="props.togglingPause"
      :title="props.paused ? t('rpa.resumePausedStream') : t('rpa.pauseStream')"
      @click="emit('toggle-pause')"
    >
      <svg
        v-if="props.paused"
        viewBox="0 0 24 24"
        class="ml-0.5 h-5 w-5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.29-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
        <rect x="6" y="4.5" width="3.6" height="15" rx="1.1" />
        <rect x="14.4" y="4.5" width="3.6" height="15" rx="1.1" />
      </svg>
    </button>

    <div class="ml-0.5 flex items-center gap-2 text-xs text-white/75">
      <span
        class="live-player-controlbar__live-badge inline-flex items-center gap-1 rounded bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white"
      >
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span>
        LIVE
      </span>
      <span class="tabular-nums">{{ t('rpa.viewerCount', { count: props.viewerCount }) }}</span>
    </div>

    <div class="flex-1"></div>

    <!-- 清晰度：观看者级（只影响本端画面）
         teleported=false：菜单挂在控制条内，否则全屏时会被渲染到全屏元素之外而看不见 -->
    <el-dropdown
      trigger="click"
      placement="top"
      :teleported="false"
      @command="handleQualityCommand"
      @visible-change="(visible: boolean) => emit('quality-menu-visible', visible)"
    >
      <button
        type="button"
        class="live-player-controlbar__quality-btn flex h-9 items-center gap-1 rounded px-2 text-xs text-white/90 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
        :disabled="props.settingQuality"
        :title="t('rpa.quality')"
      >
        {{ props.effectiveLevelLabel }}
        <svg
          viewBox="0 0 24 24"
          class="h-3 w-3"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="opt in props.qualityOptions"
            :key="opt.value"
            :command="opt.value"
            :disabled="opt.value === props.qualityLevel"
          >
            {{ opt.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 停止直播：关闭本观看者这一路（不影响其他观看者） -->
    <button
      type="button"
      class="live-player-controlbar__stop-btn flex h-9 w-9 items-center justify-center rounded text-white/90 transition hover:bg-white/15 hover:text-white"
      :title="t('rpa.stopLive')"
      @click="emit('stop')"
    >
      <el-icon :size="18"><SwitchButton /></el-icon>
    </button>

    <button
      type="button"
      class="live-player-controlbar__fullscreen-btn flex h-9 w-9 items-center justify-center rounded text-white/90 transition hover:bg-white/15 hover:text-white"
      :title="props.isFullscreen ? t('rpa.fullscreenExit') : t('rpa.fullscreenEnter')"
      @click="emit('toggle-fullscreen')"
    >
      <svg
        v-if="props.isFullscreen"
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4" />
        <path d="M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4" />
        <path d="M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20" />
        <path d="M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
        <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
        <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
        <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
      </svg>
    </button>
  </div>
</template>
