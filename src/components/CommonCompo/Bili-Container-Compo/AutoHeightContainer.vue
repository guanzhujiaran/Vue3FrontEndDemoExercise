<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * AutoHeightContainer —— 自适应视口高度的布局容器（公共组件）
 *
 * 背景：App.vue 的外层结构是「el-scrollbar > el-container > el-main」，el-main 自身高度由
 * flex 撑开，页面内容一旦变化高度就会跟着变，导致内部页面里的 h-full / flex-1 拿不到确定高度
 * （历史做法是在各页面写 min-h-[70vh] 之类的兜底）。
 *
 * 因此统一在这里按「窗口高度 - 顶部导航高度 - 偏移量」算出一个确定高度并下沉到容器上，
 * 让内部页面可以按 100% 高度自行布局与滚动（侧边导航布局 BiliSideNavLayout、RPA 浏览器布局
 * RpaBrowserLayout 等共用同一套测量口径，避免各处再抄一遍魔法数字）。
 *
 * 高度公式：window.innerHeight - .bili-header 高度 - offset
 */

interface Props {
  /** 追加扣减的偏移量（px），默认 28 = el-main 的 mt-3(12px) + pb-4(16px) */
  offset?: number
  /** 高度下限保护（px），避免窗口过矮时算出过小或负值 */
  minHeight?: number
  /** 顶部导航选择器，用于扣减其高度 */
  headerSelector?: string
  /** 顶部导航测量失败时的兜底高度（px） */
  fallbackHeaderHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  offset: 28,
  minHeight: 300,
  headerSelector: '.bili-header',
  fallbackHeaderHeight: 60,
})

// 首帧先用 100%（跟随父级 flex 撑出的高度），挂载后再换算成精确的像素高度，避免布局跳变
const layoutHeight = ref('100%')

function calcLayoutHeight() {
  const headerEl = document.querySelector<HTMLElement>(props.headerSelector)
  const headerHeight = headerEl?.getBoundingClientRect().height ?? props.fallbackHeaderHeight
  const availableHeight = window.innerHeight - headerHeight - props.offset
  layoutHeight.value = `${Math.max(availableHeight, props.minHeight)}px`
}

onMounted(() => {
  calcLayoutHeight()
  window.addEventListener('resize', calcLayoutHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calcLayoutHeight)
})
</script>

<template>
  <div class="auto-height-container" :style="{ height: layoutHeight }">
    <!-- 动态像素高度无法用静态 class 表达，这里是全项目唯一承载该内联 height 的位置 -->
    <slot />
  </div>
</template>
