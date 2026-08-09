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
  return {
    el: window as unknown as HTMLElement | Window,
    clientHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight
  }
}

// 根据当前滚动位置计算按钮显隐
const applyVisibility = (scrollTop: number) => {
  const { clientHeight, scrollHeight } = getMetrics()
  // 当滚动超过设定阈值时显示回到顶部按钮
  const nextTop = scrollTop > props.topThreshold
  // 当没有滚动到底部时显示一键到底按钮（距离底部设定阈值以上）
  const nextBottom = scrollHeight - (scrollTop + clientHeight) > props.bottomThreshold

  showBackToTop.value = nextTop
  showScrollToBottom.value = nextBottom
}

// 防抖后的显隐计算（高频滚动时避免频繁计算与调试打印）
const debouncedApply = useDebounceFn((top: number) => applyVisibility(top), 100)

// 外部传入 scrollTop：直接驱动显隐
watch(
  () => props.scrollTop,
  (v) => {
    if (v >= 0) debouncedApply(v)
  },
  { immediate: true }
)

// 未传入 scrollTop 时，自行监听滚动（兼容整页 / 内部容器滚动）
let offScroll: (() => void) | null = null
onMounted(() => {
  if (props.scrollTop < 0) {
    const onScroll = (e?: Event) => {
      const t = e?.target as HTMLElement | null
      let scroller: HTMLElement | Window = window
      if (t && t !== document && t !== document.documentElement && t !== document.body) {
        const wrap = rootRef.value?.closest('.el-scrollbar__wrap') as HTMLElement | null
        scroller = wrap && (t === wrap || wrap.contains(t)) ? wrap : t
      } else {
        const wrap = rootRef.value?.closest('.el-scrollbar__wrap') as HTMLElement | null
        scroller = wrap ?? window
      }
      const top = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop
      debouncedApply(top)
    }
    window.addEventListener('scroll', onScroll as EventListener, true)
    offScroll = () => window.removeEventListener('scroll', onScroll as EventListener, true)
    onScroll()
    requestAnimationFrame(onScroll)
  }
})
onUnmounted(() => offScroll?.())

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
