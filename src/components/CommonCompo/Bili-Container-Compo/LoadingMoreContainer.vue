<script setup lang="ts">
import { type PropType, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useThrottleFn } from '@vueuse/core'
const props = defineProps({
  handleLoad: {
    type: Function as PropType<() => void>,
    required: true,
    default: () => { }
  },
  // 是否显示「到底了」文案：列表为空等空态场景可传入 false 关闭
  showEndText: {
    type: Boolean,
    default: true
  },
  // 是否由父级 flex 链条决定滚动高度（父容器需有确定高度，如 h-full → flex-1 min-h-0）。
  // 为 true 时忽略 heightRatio 的窗口高度系数，滚动容器撑满父级，避免嵌套滚动导致底部内容无法滚到底
  fillParent: {
    type: Boolean,
    default: false
  },
  // 反向（向上加载）模式：用于「最新在下、向上拉取更老内容」的场景（如聊天记录）。
  // 为 true 时，滚动贴近顶部触发 handleLoad，且加载/到底提示置于顶部；为 false 时维持原行为（底部触发）。
  reverse: {
    type: Boolean,
    default: false
  },
  // 初始化时滚动条位置：'top'（默认，新内容在上方）或 'bottom'（如聊天首屏定位到最新）。
  // 仅决定挂载瞬间的初值；异步加载完成后的定位（如聊天滚到底）仍由父组件显式调用 scrollToBottom 控制。
  initialPosition: {
    type: String as PropType<'top' | 'bottom'>,
    default: 'top'
  }
})
const isMore = defineModel('isMore', {
  required: true,
  type: Boolean
})
const isLoading = defineModel('isLoading', {
  required: true,
  type: Boolean
})
const isError = defineModel('isError', {
  required: true,
  type: Boolean
})

// 滚动容器高度 = 窗口高度 × 高度系数（v-model 可配置，默认 0.7）
const heightRatio = defineModel<number>('heightRatio', { default: 0.7 })

// 强制约束高度系数 ∈ (0, 1)：非法值回退默认，>=1 收拢到 0.99
const effectiveHeightRatio = computed(() => {
  const raw = Number(heightRatio.value)
  if (!Number.isFinite(raw) || raw <= 0) return 0.7
  return Math.min(raw, 0.99)
})

// 组件自行维护窗口高度，乘以系数作为滚动容器的高度上限
const windowHeight = ref(window.innerHeight)
const maxHeightPx = computed(() => `${Math.floor(windowHeight.value * effectiveHeightRatio.value)}px`)

const handleLoad = useThrottleFn(() => {
  if (!isMore.value || isError.value) return
  props.handleLoad()
}, 2e3)

// 手动重试：错误态下自动节流守卫会拦截 handleLoad，故清除错误后直接触发父级加载
function retry() {
  isError.value = false
  props.handleLoad()
}

const scrollbarRef = ref<{ wrapRef?: HTMLElement }>()
function onScroll() {
  const wrap = scrollbarRef.value?.wrapRef
  if (!wrap) return
  const { scrollTop, scrollHeight, clientHeight } = wrap
  // 仅当内容真正可滚动（存在纵向滚动条）时才可能触发
  if (scrollHeight - clientHeight <= 1) return
  if (props.reverse) {
    // 反向模式：贴近顶部（向上拉取更老内容）时触发
    if (scrollTop <= 10) {
      handleLoad()
    }
  } else {
    // 正向模式：滚动到接近底部（加载更新内容）时触发
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      handleLoad()
    }
  }
}

// 暴露给父组件：直接把滚动条拉到最底部（聊天场景「最新在底部」首屏定位用）
function scrollToBottom() {
  const el = scrollbarRef.value?.wrapRef
  if (el) el.scrollTop = el.scrollHeight
}

// 暴露给父组件：取底层滚动元素，便于「向上加载更老内容」时做滚动位置补偿
function getScrollEl(): HTMLElement | undefined {
  return scrollbarRef.value?.wrapRef
}

defineExpose({ scrollToBottom, getScrollEl })
const onWindowResize = () => {
  windowHeight.value = window.innerHeight
}
onMounted(() => {
  window.addEventListener('resize', onWindowResize)
  const wrap = scrollbarRef.value?.wrapRef
  if (wrap) {
    wrap.addEventListener('scroll', onScroll)
    // 初始化滚动位置：'bottom' 拉到底（如聊天首屏），否则置顶（默认）
    if (props.initialPosition === 'bottom') {
      wrap.scrollTop = wrap.scrollHeight
    } else {
      wrap.scrollTop = 0
    }
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  scrollbarRef.value?.wrapRef?.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="with-loading-more-container-wrapper mb-4 flex min-h-0 flex-1" v-loading="isLoading && !props.reverse">
    <el-scrollbar ref="scrollbarRef" class="with-loading-more-container mx-auto max-w-6xl w-full" noresize
      aria-orientation="vertical" :class="{ 'h-full': props.fillParent }"
      :style="props.fillParent ? undefined : { maxHeight: maxHeightPx }"
      wrap-style="overflow-x: hidden;">
      <!-- 反向（向上加载更老）模式：提示置于顶部 -->
      <div v-if="props.reverse" class="loading-more-txt relative w-full text-center bg-transparent py-2"
        style="background-color: transparent">
        <span v-if="isLoading" class="cursor-default">加载中…</span>
        <span v-else-if="isError" @click="retry" class="cursor-pointer">加载失败，点击重试</span>
        <span v-else-if="isMore" @click="handleLoad" class="cursor-pointer">向上查看更多</span>
        <span v-else-if="showEndText" class="cursor-default">上面没有更多了</span>
      </div>
      <slot name="content"></slot>
      <!-- 正向（向下加载更新）模式：提示置于底部 -->
      <div v-if="!props.reverse" class="loading-more-txt relative w-full text-center bg-transparent py-2"
        style="background-color: transparent">
        <span v-if="isMore" @click="handleLoad" class="cursor-pointer">查看更多</span>
        <span v-else-if="!isError && showEndText" class="cursor-pointer">到底了喵~</span>
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped>
/* 隐藏 Element Plus 滚动容器的横向滚动条 */
.with-loading-more-container :deep(.el-scrollbar__bar.is-horizontal) {
  display: none;
}
</style>
