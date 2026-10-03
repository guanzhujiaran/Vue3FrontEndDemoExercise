<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * AutoHeightContainer —— 自适应视口高度的布局容器（公共组件）
 *
 * 背景：App.vue 的外层结构是「el-scrollbar > el-container > el-main」，el-main 自身高度由
 * flex 撑开，页面内容一旦变化高度就会跟着变，导致内部页面里的 h-full / flex-1 拿不到确定高度
 * （历史做法是在各页面写 min-h-[70vh] 之类的兜底）。
 *
 * 高度公式（v2，按自身位置测量）：
 *     height = window.innerHeight - 自身 getBoundingClientRect().top - bottomOffset
 *
 * 相比 v1（窗口 - header 高度 - 固定 offset）：
 * - 自身 top 已天然包含顶部导航、上方兄弟元素（如 RpaMobileTip 提示条）、
 *   el-main 的 margin/padding 等全部占位，不依赖 headerSelector 与魔法数字，
 *   上方内容增减时高度自动跟随，不会在 main 底部留下空隙；
 * - bottomOffset 只表达「自身底部到视口底部」希望保留的留白（默认 16 = el-main 的 pb-4）。
 */

interface Props {
  /** 自身底部到视口底部保留的留白（px），默认 16 = el-main 的 pb-4 */
  bottomOffset?: number
  /** 高度下限保护（px），避免窗口过矮时算出过小或负值 */
  minHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  bottomOffset: 16,
  minHeight: 300,
})

const rootEl = ref<HTMLElement | null>(null)

// 首帧先用 100%（跟随父级 flex 撑出的高度），挂载后再换算成精确的像素高度，避免布局跳变
const layoutHeight = ref('100%')

function calcLayoutHeight() {
  const el = rootEl.value
  if (!el || typeof window === 'undefined') return
  const top = el.getBoundingClientRect().top
  const availableHeight = window.innerHeight - top - props.bottomOffset
  layoutHeight.value = `${Math.max(availableHeight, props.minHeight)}px`
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  calcLayoutHeight()
  window.addEventListener('resize', calcLayoutHeight)
  // 上方兄弟元素（如提示条挂载/收起）改变自身 top 时跟随重算
  resizeObserver = new ResizeObserver(calcLayoutHeight)
  if (rootEl.value?.previousElementSibling) {
    resizeObserver.observe(rootEl.value.previousElementSibling)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calcLayoutHeight)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="rootEl" class="auto-height-container" :style="{ height: layoutHeight }">
    <!-- 动态像素高度无法用静态 class 表达，这里是全项目唯一承载该内联 height 的位置 -->
    <slot />
  </div>
</template>
