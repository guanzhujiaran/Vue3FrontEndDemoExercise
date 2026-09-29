<script setup lang="ts">
import { inject, onMounted, onUnmounted, provide, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import biliMessage from '@/utils/message'
import { useLiveStream } from '@/composables/useLiveStream'
import { useLivePages } from '@/composables/useLivePages'
import { useLiveSessionStatus } from '@/composables/useLiveSessionStatus'
import LivePageTabs from '@/components/rpa-browser/live/LivePageTabs.vue'
import LivePlayer from '@/components/rpa-browser/live/LivePlayer.vue'
import type { StreamQualityLevelEnum } from '@/api/browser/hey-api'

/**
 * 直播盒子（LiveBox）—— **编排层**
 *
 * 本组件只做三件事：组合 composable、把状态喂给子组件、把子组件事件转给 composable。
 * 具体实现已按职责拆开：
 *
 * | 职责 | 位置 |
 * | --- | --- |
 * | 建连（offer/answer/ICE/关闭） | `composables/useWebRtcConnection.ts` |
 * | 直播业务（启动/停止/重连/网速/清晰度/暂停） | `composables/useLiveStream.ts` |
 * | 标签页（新建/关闭/切换） | `composables/useLivePages.ts` + `live/LivePageTabs.vue` |
 * | 会话侧状态（人数/列表/生命周期） | `composables/useLiveSessionStatus.ts` |
 * | 播放器（画面/控制层/覆盖层） | `live/LivePlayer.vue` 及其子组件 |
 *
 * 交互参考 B 站直播播放器：**启动入口是播放器中央的播放按钮**，工具栏没有「启动直播」按钮。
 */
interface Props {
  browserId: string
  isStreaming: boolean
  /** 监管只读模式：只观看直播流，禁止一切写操作（不调用 /operation/*、不新建/关闭/切换页面） */
  readonly?: boolean
  /** 只读模式下的标签页数据（监管接口提供，避免调用 owner 校验的 /operation/get_page_info） */
  readonlyPages?: Array<{ index: number; title?: string; url?: string }>
}

const props = defineProps<Props>()
// ⚠️ 没有 'toggle-stream' 事件：`isStreaming` 由页面 provide、本组件 inject，
// 是**同一个 ref**，本组件直接读写它。此前「启动成功后再 emit 让父组件 toggle」
// 会把刚置为 true 的状态翻回 false —— 界面立刻退回「未开播」占位层（画面被黑底盖住），
// 用户只能再点一次播放，于是开出第二条 PeerConnection（后端两次 offer）。
const emit = defineEmits<{
  (e: 'webrtc-status-change', status: 'disconnected' | 'connecting' | 'connected'): void
  /** 暂停态上抛：页面需要据此标注网速行的含义（暂停后不归零的是链路保活包） */
  (e: 'paused-change', paused: boolean): void
}>()

const { t } = useI18n()

/** 根容器引用：可见性降档用 IntersectionObserver 观察它 */
const containerRef = ref<HTMLElement | null>(null)
/** 播放器 <video> 元素（LivePlayer 挂载后回写） */
const videoRef = ref<HTMLVideoElement | null>(null)
/** 供 LivePlayer 回传 <video> 元素（卸载时为 null） */
const setVideoEl = (el: HTMLVideoElement | null) => {
  videoRef.value = el
}
/** 当前观看的页面索引：建流时上报给后端，切页时由标签页组件更新 */
const currentPageIndex = ref(0)

const isSessionConnected = inject<Ref<boolean>>('isSessionConnected', ref(false))
const isStreaming = inject<Ref<boolean>>('isStreaming', ref(false))
const uploadSpeed = inject<Ref<string>>('uploadSpeed', ref('0'))
const downloadSpeed = inject<Ref<string>>('downloadSpeed', ref('0'))

// ── 直播流（拉流 / 重连 / 清晰度 / 暂停）──
const stream = useLiveStream({
  browserId: () => props.browserId,
  videoEl: () => videoRef.value,
  pageIndex: () => currentPageIndex.value,
  isStreaming,
  uploadSpeed,
  downloadSpeed,
  containerEl: () => containerRef.value
})

// ── 标签页（会话级操作）──
const pages = useLivePages({
  browserId: () => props.browserId,
  pageIndex: currentPageIndex,
  readonly: () => props.readonly === true,
  readonlyPages: () => props.readonlyPages,
  isStreaming,
  isSessionConnected,
  stopStream: (silent) => stream.stopStream(silent),
  restartStream: async () => {
    const connected = await stream.startStreamCore()
    if (!connected) biliMessage.error(t('rpa.startStreamFailed'))
  }
})

// ── 会话侧状态（观看者人数 / 列表 / 生命周期，来自 SSE）──
const { viewerCount, viewers, activeStreamsCount, sessionState } = useLiveSessionStatus()

watch(stream.webrtcStatus, (status) => {
  emit('webrtc-status-change', status)
})

// 暂停态上抛给页面：BrowserStream 的网速行据此标注「这只是保活包」。
// 用 immediate：首次挂载时可能已经是暂停态（本端观看者状态由后端快照同步而来）。
// 注意：暂停是**观看者级**状态（多观看者并发直播），只影响本端画面。
watch(stream.isPaused, (paused) => emit('paused-change', paused), { immediate: true })

provide('webrtcStatus', stream.webrtcStatus)
provide('isStreaming', isStreaming)

onMounted(() => {
  void pages.loadPagesList()
  stream.startVisibilityWatch()
})

onUnmounted(() => {
  stream.stopStatsMonitor()
  stream.stopVisibilityWatch()
  // 离开页面时静默断开，避免在下一个页面弹出「关闭 WebRTC 流成功」
  void stream.stopStream(true)
})
</script>

<template>
  <div
    ref="containerRef"
    class="live-box flex h-full flex-col overflow-hidden border border-border"
  >
    <!-- 本组件不设固定高：外层高度由调用方的分栏决定（直播页 el-splitter 固定 720px），
         这里 h-full 填满，屏幕用 flex-1 自适应剩余高度（视频本身不固定） -->
    <LivePageTabs
      :tabs="pages.pageTabs.value"
      :current-index="pages.currentPageIndex.value"
      :loading="pages.isLoadingPages.value"
      :readonly="props.readonly"
      :session-connected="isSessionConnected"
      @switch="(index) => pages.handleSwitchPage(index)"
      @add="pages.handleAddPage()"
      @close="(index) => pages.handleClosePage(index)"
    />

    <LivePlayer
      :bind-video="setVideoEl"
      :streaming="isStreaming"
      :webrtc-status="stream.webrtcStatus.value"
      :paused="stream.isPaused.value"
      :auto-degraded="stream.isAutoDegraded.value"
      :quality-level="stream.qualityLevel.value"
      :effective-level-label="stream.effectiveLevelLabel.value"
      :setting-quality="stream.isSettingQuality.value"
      :toggling-pause="stream.isTogglingPause.value"
      :quality-options="stream.qualityOptions.value"
      :viewer-count="viewerCount"
      :viewers="viewers"
      :active-streams-count="activeStreamsCount"
      :session-state="sessionState"
      :upload-speed="uploadSpeed"
      :download-speed="downloadSpeed"
      :can-play="isSessionConnected && !stream.isStartingStream.value"
      :busy="stream.isStartingStream.value"
      @start="stream.startStream()"
      @stop="stream.stopStream()"
      @resume="stream.resumeStream()"
      @toggle-pause="stream.togglePause()"
      @set-quality="(level: StreamQualityLevelEnum) => stream.setQuality(level)"
    />
  </div>
</template>
