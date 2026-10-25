<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Top, Bottom } from '@element-plus/icons-vue'

// 定义组件属性
const props = defineProps({
  // 显示回到顶部按钮的滚动阈值
  topThreshold: {
    type: Number,
    default: 300
  },
  // 显示滚动到底部按钮的距离阈值
  bottomThreshold: {
    type: Number,
    default: 100
  },
  // 外部传入的滚动位置（来自 el-scrollbar 的 @scroll 事件）。
  // 传 -1 表示未提供，由组件自行监听滚动（兼容整页滚动等场景）。
  scrollTop: {
    type: Number,
    default: -1
  }
})

// 状态变量
const showBackToTop = ref(false)
const showScrollToBottom = ref(false)
const rootRef = ref<HTMLElement | null>(null)

// 解析真正负责滚动的容器，用于读取 scrollHeight / clientHeight
const getMetrics = () => {
  const wrap = rootRef.value?.closest('.el-scrollbar__wrap') as HTMLElement | null
  if (wrap) {
    return {
      el: wrap as HTMLElement | Window,
      clientHeight: wrap.clientHeight,
      scrollHeight: wrap.scrollHeight
    }
  }
  // 尚未挂载（watch 的 immediate 回调发生在 setup 阶段，此时 rootRef 还是 null）
  // 或 SSR / 预渲染（没有 window / document）：拿不到滚动容器就返回零值，让按钮保持
  // 隐藏，等 onMounted 与 ResizeObserver 拿到真实尺寸再算。
  //
  // 早期这里回退成 window 的**整页**尺寸，于是「el-scrollbar 内不可滚动、但整页可滚动」
  // 的页面（如个人空间）会被误判为可滚动，一键到底按钮凭空出现。
  if (!rootRef.value || typeof window === 'undefined') {
    return {
      el: null as unknown as HTMLElement | Window,
      clientHeight: 0,
      scrollHeight: 0
    }
  }
  return {
    el: window as unknown as HTMLElement | Window,
    clientHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight
  }
}

// 根据当前滚动位置计算按钮显隐
const applyVisibility = (scrollTop: number) => {
  const { clientHeight, scrollHeight } = getMetrics()
  // 内容本身不可滚动时（scrollHeight <= clientHeight）两个按钮都隐藏，
  // 避免「内容不满一屏也显示一键到底」的误导性按钮
  const canScroll = scrollHeight - clientHeight > 1
  // 当滚动超过设定阈值时显示回到顶部按钮
  const nextTop = canScroll && scrollTop > props.topThreshold
  // 当没有滚动到底部时显示一键到底按钮（距离底部设定阈值以上）
  const nextBottom =
    canScroll && scrollHeight - (scrollTop + clientHeight) > props.bottomThreshold

  showBackToTop.value = nextTop
  showScrollToBottom.value = nextBottom
}

// 防抖后的显隐计算（高频滚动时避免频繁计算与调试打印）
const debouncedApply = useDebounceFn((top: number) => applyVisibility(top), 100)

// 读取当前真实滚动位置（尺寸变化回调里 lastScrollTop 可能已过期）
const readScrollTop = () => {
  const wrap = rootRef.value?.closest('.el-scrollbar__wrap') as HTMLElement | null
  if (wrap) return wrap.scrollTop
  return typeof window === 'undefined' ? 0 : window.scrollY
}

// 内容高度变化（异步数据到位 / 图片加载 / tab 切换 / 窗口缩放）**不会触发 scroll 事件**，
// 只靠 scroll 监听会把按钮留在过期的显隐状态（典型症状：内容已经不满一屏了，
// 「一键到底」还杵在那）。这里用 ResizeObserver 同时盯住滚动容器（视口变化）与
// 内容节点（高度变化）来补齐这类变化。
let ro: ResizeObserver | null = null
let rafRetry = 0
let settleRafs: ReturnType<typeof requestAnimationFrame>[] = []
// 该工程的全局类型混入了 @types/node，setTimeout 返回会被推断成 NodeJS.Timeout，
// 但浏览器运行时句柄就是 number，这里统一用 number 收纳 window.setTimeout 的返回值。
let settleTimers: number[] = []

const observeSize = () => {
  if (typeof ResizeObserver === 'undefined') return
  const wrap = rootRef.value?.closest('.el-scrollbar__wrap') as HTMLElement | null
  // 挂载瞬间 el-scrollbar 的 wrap 可能还没渲染好（F5 硬刷新时子组件先于定高祖先
  // 完成布局），直接 return 会永久丢失观察。这里用 rAF 短暂重试，等 wrap 出现再观察。
  if (!wrap) {
    if (rafRetry < 20) {
      rafRetry += 1
      requestAnimationFrame(observeSize)
    }
    return
  }
  rafRetry = 0
  ro?.disconnect()
  ro = new ResizeObserver(() => debouncedApply(readScrollTop()))
  ro.observe(wrap)
  const view = wrap.querySelector('.el-scrollbar__view')
  if (view) ro.observe(view)
  // 关键：F5 首屏时外层 AutoHeightContainer 的高度首帧是 100%，要等它自己 onMounted
  // 后才改成精确像素高度。wrap 是它的子孙，wrap 自身通常会随之触发一次 RO 回调，
  // 但个别情况下该变化与 RO 建立处于同一帧而被合并漏掉，导致按钮停留在「wrap 尚未定高
  // → scrollHeight>clientHeight → 误判可滚动」的初始状态。这里把定高祖先也纳入观察兜底。
  const autoHeight = wrap.closest('.auto-height-container') as HTMLElement | null
  if (autoHeight && autoHeight !== wrap) ro.observe(autoHeight)
}

// 状态声明必须位于 watch 之前：watch 带 immediate:true 会在 setup 阶段同步回调
let offScroll: (() => void) | null = null
let lastScrollTop = 0

// 外部传入 scrollTop：直接驱动显隐
watch(
  () => props.scrollTop,
  (v) => {
    if (v >= 0) {
      lastScrollTop = v
      debouncedApply(v)
    }
  },
  { immediate: true }
)

// 滚动事件驱动显隐；内容 / 视口尺寸变化由 observeSize 的 ResizeObserver 补齐。
onMounted(() => {
  if (props.scrollTop < 0) {
    const onScroll = (e?: Event) => {
      const t = e?.target as EventTarget | null
      let scroller: HTMLElement | Window = window
      if (t && t !== document && t !== document.documentElement && t !== document.body) {
        const wrap = rootRef.value?.closest('.el-scrollbar__wrap') as HTMLElement | null
        scroller =
          wrap && (t === wrap || (t instanceof Node && wrap.contains(t)))
            ? (t as HTMLElement)
            : wrap ?? window
      } else {
        const wrap = rootRef.value?.closest('.el-scrollbar__wrap') as HTMLElement | null
        scroller = wrap ?? window
      }
      const top = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop
      lastScrollTop = top
      debouncedApply(top)
    }
    window.addEventListener('scroll', onScroll as EventListener, true)
    offScroll = () => window.removeEventListener('scroll', onScroll as EventListener, true)
    onScroll()
    requestAnimationFrame(() => onScroll())
  } else {
    lastScrollTop = props.scrollTop
    debouncedApply(lastScrollTop)
  }
  // 挂载后才拿得到滚动容器尺寸：这里先按当前 DOM 算一次
  // （setup 阶段的 immediate watch 拿不到容器，只能返回零值）
  observeSize()
  // F5 硬刷新时，外层 AutoHeightContainer 首帧高度为 100%、el-scrollbar 自身也有
  // update 过程，真正的 wrap 尺寸要再等 1~2 帧才稳定；异步骨架 / 数据回来得更晚。
  // 单次 rAF 可能跑在定高之前，于是首帧算出「可滚动」并残留按钮。
  // 这里在接下来的若干帧 + 两个延时点反复重算，确保布局稳定后按钮状态被纠正为隐藏。
  // 真正可滚动的页面不受影响：多算几次结果仍是「显示」，无闪烁副作用（v-show 同值不触发渲染）。
  const reapply = () => debouncedApply(readScrollTop())
  for (let i = 1; i <= 6; i++) {
    settleRafs.push(requestAnimationFrame(reapply))
  }
  settleTimers.push(window.setTimeout(reapply, 200))
  settleTimers.push(window.setTimeout(reapply, 600))
})
onUnmounted(() => {
  offScroll?.()
  ro?.disconnect()
  settleRafs.forEach((id) => cancelAnimationFrame(id))
  settleTimers.forEach((id) => clearTimeout(id))
  settleRafs = []
  settleTimers = []
})

// 回到顶部
const scrollToTop = () => {
  const { el } = getMetrics()
  if (el === window) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    ;(el as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 滚动到底部
const scrollToBottom = () => {
  const { el } = getMetrics()
  if (el === window) {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  } else {
    const node = el as HTMLElement
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }
}

// 暴露方法给父组件
defineExpose({
  scrollToTop,
  scrollToBottom
})
</script>

<template>
  <div ref="rootRef" class="fixed right-16 bottom-16 z-1000 flex flex-col gap-8 items-end">
    <!-- 回到顶部按钮 -->
    <el-button
      v-show="showBackToTop"
      class="[box-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
      circle
      type="info"
      @click="scrollToTop"
      :icon="Top"
    >
    </el-button>

    <!-- 滚动到底部按钮 -->
    <el-button
      v-show="showScrollToBottom"
      class="[box-shadow:0_1px_2px_rgba(0,0,0,0.1)]"
      circle
      type="primary"
      @click="scrollToBottom"
      :icon="Bottom"
    >
    </el-button>
  </div>
</template>
