<script setup lang="ts">
import { computed, ref, watch, type ComponentPublicInstance, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayerControls } from '@/composables/usePlayerControls'
import LiveCenterPlayButton from '@/components/rpa-browser/live/LiveCenterPlayButton.vue'
import LiveOverlay from '@/components/rpa-browser/live/LiveOverlay.vue'
import LivePlayerTopbar from '@/components/rpa-browser/live/LivePlayerTopbar.vue'
import LivePlayerControlBar from '@/components/rpa-browser/live/LivePlayerControlBar.vue'
import type { StreamQualityLevelEnum } from '@/api/browser/hey-api'
import type {
  LiveOverlayState,
  LiveQualityOption,
  LiveSessionState,
  LiveViewerInfo,
  LiveWebrtcStatus
} from '@/models/rpa_browser/live_stream'

/**
 * 直播画面（播放器）
 *
 * 只做展示与交互上抛：拉流 / 重连 / 清晰度等逻辑都在父组件的 `useLiveStream` 里。
 * 交互参考 B 站直播播放器：未开播显示中央大播放按钮，播放中由控制条控制，
 * **工具栏不再放「启动直播」按钮**。
 */
const props = defineProps({
  /**
   * 挂载 / 卸载 <video> 元素的回调：父组件据此拿到元素（建流时要往它上面挂 srcObject）。
   *
   * 用回调而不是传 ref：模板里顶层 ref 会被自动解包，传不成 ref 对象。
   */
  bindVideo: { type: Function as PropType<(el: HTMLVideoElement | null) => void>, required: true },
  streaming: { type: Boolean, default: false },
  webrtcStatus: { type: String as PropType<LiveWebrtcStatus>, default: 'disconnected' },
  paused: { type: Boolean, default: false },
  autoDegraded: { type: Boolean, default: false },
  qualityOptions: { type: Array as PropType<LiveQualityOption[]>, default: () => [] },
  qualityLevel: { type: String as PropType<StreamQualityLevelEnum>, default: 'high' },
  effectiveLevelLabel: { type: String, default: '' },
  settingQuality: { type: Boolean, default: false },
  togglingPause: { type: Boolean, default: false },
  viewerCount: { type: Number, default: 0 },
  viewers: { type: Array as PropType<LiveViewerInfo[]>, default: () => [] },
  activeStreamsCount: { type: Number, default: 0 },
  sessionState: {
    type: Object as PropType<LiveSessionState>,
    default: () => ({ suspended: false, closingSoon: false, idleSeconds: null, closingCountdown: null, pinned: false })
  },
  uploadSpeed: { type: String, default: '0' },
  downloadSpeed: { type: String, default: '0' },
  /** 能否开播（浏览器会话已连接且未在启动中） */
  canPlay: { type: Boolean, default: true },
  /** 启动 / 恢复中（中央按钮转圈） */
  busy: { type: Boolean, default: false }
})

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'stop'): void
  (e: 'resume'): void
  (e: 'toggle-pause'): void
  (e: 'set-quality', level: StreamQualityLevelEnum): void
}>()

const { t } = useI18n()

const screenRef = ref<HTMLElement | null>(null)
/** 清晰度菜单 / 观看者弹层展开期间必须钉住控制层，否则鼠标移过去时控制条会淡出 */
const isQualityMenuOpen = ref(false)
const isViewersPopoverOpen = ref(false)

const { showControls, isFullscreen, handleScreenMouseMove, handleScreenMouseLeave, toggleFullscreen, keepControlsAlive } =
  usePlayerControls({
    screenRef,
    pinned: () =>
      props.paused || !props.streaming || isQualityMenuOpen.value || isViewersPopoverOpen.value
  })

/** 是否曾经播过：用于区分「从未开播」与「直播已停止」两种空态文案 */
const hasPlayed = ref(false)
watch(
  () => props.streaming,
  (streaming) => {
    if (streaming) hasPlayed.value = true
  }
)

/** 覆盖层状态（互斥） */
const overlayState = computed<LiveOverlayState>(() => {
  if (!props.streaming && props.sessionState.suspended) return 'suspended'
  if (!props.streaming && props.sessionState.closingSoon) return 'closing'
  if (props.webrtcStatus === 'connecting') return 'connecting'
  if (!props.streaming) return hasPlayed.value ? 'stopped' : 'idle'
  return 'none'
})

/** 中央大播放按钮：未开播 → 启动直播；已暂停 → 继续播放 */
const centerButtonVisible = computed(
  () => overlayState.value === 'idle' || overlayState.value === 'stopped' || (props.streaming && props.paused)
)

const centerButtonTitle = computed(() =>
  props.streaming && props.paused ? t('rpa.resumePausedStream') : t('rpa.startLive')
)

const handleCenterButtonClick = () => {
  if (props.streaming && props.paused) {
    emit('toggle-pause')
    return
  }
  emit('start')
}

/** 把 <video> 元素回传给父组件（卸载时为 null） */
const onVideoRef = (el: Element | ComponentPublicInstance | null) => {
  props.bindVideo((el as HTMLVideoElement | null) ?? null)
}
</script>

<template>
  <div
    ref="screenRef"
    class="live-player relative flex-1 overflow-hidden bg-black"
    @mousemove="handleScreenMouseMove"
    @mouseleave="handleScreenMouseLeave"
  >
    <video
      :ref="onVideoRef"
      class="live-player__video h-full w-full object-contain"
      :class="props.streaming && !showControls ? 'cursor-none' : 'cursor-default'"
      autoplay
      playsinline
    ></video>

    <LivePlayerTopbar
      v-if="props.streaming"
      :visible="showControls"
      :paused="props.paused"
      :auto-degraded="props.autoDegraded"
      :effective-level-label="props.effectiveLevelLabel"
      :viewer-count="props.viewerCount"
      :viewers="props.viewers"
      :session-pinned="props.sessionState.pinned"
      :upload-speed="props.uploadSpeed"
      :download-speed="props.downloadSpeed"
      :active-streams-count="props.activeStreamsCount"
      @viewers-open="isViewersPopoverOpen = true; keepControlsAlive()"
      @viewers-close="isViewersPopoverOpen = false; keepControlsAlive()"
    />

    <LivePlayerControlBar
      v-if="props.streaming"
      :visible="showControls"
      :paused="props.paused"
      :toggling-pause="props.togglingPause"
      :quality-options="props.qualityOptions"
      :quality-level="props.qualityLevel"
      :effective-level-label="props.effectiveLevelLabel"
      :setting-quality="props.settingQuality"
      :is-fullscreen="isFullscreen"
      :viewer-count="props.viewerCount"
      @toggle-pause="emit('toggle-pause')"
      @set-quality="(level) => emit('set-quality', level)"
      @toggle-fullscreen="toggleFullscreen()"
      @stop="emit('stop')"
      @quality-menu-visible="(visible) => { isQualityMenuOpen = visible; keepControlsAlive() }"
    />

    <LiveOverlay
      :state="overlayState"
      :idle-seconds="props.sessionState.idleSeconds"
      :closing-countdown="props.sessionState.closingCountdown"
      :busy="props.busy"
      @resume="emit('resume')"
    />

    <!-- 中央大播放按钮：未开播 → 启动直播；已暂停 → 继续播放。
         放在覆盖层之后，保证它盖在空态 / 已停止遮罩之上可点击。 -->
    <LiveCenterPlayButton
      v-if="centerButtonVisible"
      :title="centerButtonTitle"
      :disabled="!props.canPlay"
      :loading="props.busy"
      @click="handleCenterButtonClick"
    />

    <!-- 用户暂停态：后端已停止出帧，画面停留在最后一帧。只压一层淡遮罩，
         pointer-events-none 保证控制条与中央按钮仍可点击。 -->
    <div
      v-if="props.streaming && props.paused"
      class="live-player__paused-mask pointer-events-none absolute inset-0 bg-black/25"
    ></div>
  </div>
</template>
