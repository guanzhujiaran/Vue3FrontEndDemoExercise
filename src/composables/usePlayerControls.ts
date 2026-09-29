import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * 播放器控制层行为（外观与交互参考 B 站直播播放器）
 *
 * - 鼠标移动显示控制层、静止数秒后淡出；
 * - 暂停 / 未播放 / 菜单展开时**钉住**控制层（否则用户找不到入口）；
 * - 全屏状态以浏览器事件为准（避免与浏览器真实状态不一致）。
 */

/** 鼠标静止多久后淡出控制层（与 B 站一致的观感） */
const CONTROLS_HIDE_DELAY = 2600

export interface UsePlayerControlsOptions {
  /** 画面容器引用（全屏目标） */
  screenRef: Ref<HTMLElement | null>
  /** 控制层是否必须常显（暂停 / 未播放 / 菜单展开 / 弹层展开） */
  pinned: () => boolean
}

export function usePlayerControls(options: UsePlayerControlsOptions) {
  /** 控制层是否可见 */
  const showControls = ref(true)
  /** 是否处于全屏 */
  const isFullscreen = ref(false)

  let controlsTimer: number | null = null

  const clearControlsTimer = () => {
    if (controlsTimer !== null) {
      window.clearTimeout(controlsTimer)
      controlsTimer = null
    }
  }

  const scheduleControlsHide = () => {
    clearControlsTimer()
    if (options.pinned()) return
    controlsTimer = window.setTimeout(() => {
      showControls.value = false
      controlsTimer = null
    }, CONTROLS_HIDE_DELAY)
  }

  const handleScreenMouseMove = () => {
    showControls.value = true
    scheduleControlsHide()
  }

  /** 鼠标移出画面立即淡出（与 B 站一致）；钉住时保持常显 */
  const handleScreenMouseLeave = () => {
    if (options.pinned()) {
      showControls.value = true
      return
    }
    clearControlsTimer()
    showControls.value = false
  }

  const toggleFullscreen = async () => {
    const el = options.screenRef.value
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen()
      }
    } catch (error) {
      console.warn('[usePlayerControls] 全屏切换失败:', error)
    }
  }

  const handleFullscreenChange = () => {
    isFullscreen.value = document.fullscreenElement === options.screenRef.value
    // 全屏切换后重置一次节拍，避免刚进全屏控制层就被淡出
    showControls.value = true
    scheduleControlsHide()
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    scheduleControlsHide()
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    clearControlsTimer()
  })

  return {
    showControls,
    isFullscreen,
    handleScreenMouseMove,
    handleScreenMouseLeave,
    toggleFullscreen,
    scheduleControlsHide,
    clearControlsTimer,
    /** 菜单 / 弹层展开时用：立即显示并重新计时 */
    keepControlsAlive: () => {
      showControls.value = true
      scheduleControlsHide()
    }
  }
}
