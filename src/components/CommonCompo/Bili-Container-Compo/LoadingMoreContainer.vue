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

const scrollbarRef = ref<{ wrapRef?: HTMLElement }>()
function onScroll() {
  const wrap = scrollbarRef.value?.wrapRef
  if (!wrap) return
  const { scrollTop, scrollHeight, clientHeight } = wrap
  // 仅当内容真正可滚动（存在纵向滚动条）时才可能触发
  if (scrollHeight - clientHeight <= 1) return
  // 仅当滚动到接近底部时触发，顶部不会误触发
  if (scrollTop + clientHeight >= scrollHeight - 10) {
    handleLoad()
  }
}
const onWindowResize = () => {
  windowHeight.value = window.innerHeight
}
onMounted(() => {
  window.addEventListener('resize', onWindowResize)
  scrollbarRef.value?.wrapRef?.addEventListener('scroll', onScroll)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  scrollbarRef.value?.wrapRef?.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="with-loading-more-container-wrapper mb-4 flex min-h-0 flex-1" v-loading="isLoading">
    <el-scrollbar ref="scrollbarRef" class="with-loading-more-container mx-auto max-w-6xl w-full" noresize
      aria-orientation="vertical" :style="{ maxHeight: maxHeightPx }"
      wrap-style="overflow-x: hidden;">
      <slot name="content"></slot>
      <div class="loading-more-txt relative w-full text-center bg-transparent py-2"
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
