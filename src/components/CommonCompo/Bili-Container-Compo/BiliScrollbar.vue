<script setup lang="ts">
/**
 * 统一封装的纵向滚动条（el-scrollbar + 内置快速滚动按钮）
 *
 * - 快速滚动按钮（回到顶部 / 一键到底）内置在本组件内，随内容可滚动性自动显隐，
 *   由 `showScrollButtons` 控制是否启用；
 * - 所有属性（class / style / noresize 等）透传给内部 el-scrollbar；
 * - `view-class` / `wrap-style` 与 el-scrollbar 同名属性对应；
 * - 通过 ref 暴露 `scrollbarRef`（el-scrollbar 实例）与 `wrapRef`（真实滚动元素），
 *   供无限滚动 / 滚动定位等场景使用（用法与直接持有 el-scrollbar 一致）。
 */
import { computed, ref } from 'vue'
import ScrollButtons from '@/components/common/ScrollButtons.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 透传 el-scrollbar 的 view-class */
    viewClass?: string
    /** 透传 el-scrollbar 的 wrap-style */
    wrapStyle?: string
    /** 是否显示内置快速滚动按钮（默认显示） */
    showScrollButtons?: boolean
    topThreshold?: number
    bottomThreshold?: number
    /** 滚动内容包裹层 class（默认自然高度；需要子页面撑满时传 'h-full flex flex-col min-h-0'） */
    innerClass?: string
  }>(),
  {
    viewClass: '',
    wrapStyle: 'overflow-x: hidden;',
    showScrollButtons: true,
    topThreshold: 100,
    bottomThreshold: 100,
    innerClass: ''
  }
)

const emit = defineEmits<{ scroll: [payload: { scrollTop: number; scrollLeft: number }] }>()

const scrollbarRef = ref<{ wrapRef?: HTMLElement }>()
const wrapRef = computed(() => scrollbarRef.value?.wrapRef)

defineExpose({ scrollbarRef, wrapRef })
</script>

<template>
  <el-scrollbar
    ref="scrollbarRef"
    v-bind="$attrs"
    :view-class="viewClass"
    :wrap-style="wrapStyle"
    @scroll="emit('scroll', $event)"
  >
    <div class="bili-scrollbar__inner min-h-0" :class="innerClass">
      <slot />
      <ScrollButtons
        v-if="showScrollButtons"
        :scroll-top="-1"
        :top-threshold="topThreshold"
        :bottom-threshold="bottomThreshold"
      />
    </div>
  </el-scrollbar>
</template>
