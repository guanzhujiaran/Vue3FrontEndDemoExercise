<script setup lang="ts">
import { type PropType } from 'vue'
import { useDebounceFn, useElementSize, useScroll } from '@vueuse/core'

const props = defineProps({
  handleLoad: {
    type: Function as PropType<() => void>,
    required: true,
    default: () => {}
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
const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer')

const { width, height } = useElementSize(scrollContainer)
const { x, y, isScrolling, arrivedState, directions, measure } = useScroll(scrollContainer, {
  behavior: 'smooth'
})

const handleLoad = useDebounceFn(() => {
  if (!isMore.value || isError.value) return
  props.handleLoad()
  y.value += 600
  nextTick(() => {
    measure()
  })
}, 2e3)
</script>

<template>
  <div class="with-loading-more-container-wrapper mb-4" ref="scrollContainer" v-loading="isLoading">
    <el-scrollbar class="with-loading-more-container p-0 m-0 flex flex-col items-center h-[75vh] overflow-auto [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0" @end-reached="handleLoad" :distance="10">
      <slot name="content"></slot>
      <div class="loading-more-txt relative w-full text-center bg-transparent h-25" style="background-color: transparent">
        <span v-if="isMore" @click="handleLoad" class="cursor-pointer">查看更多</span>
        <span v-else-if="!isError" class="cursor-pointer">到底了喵~</span>
      </div>
    </el-scrollbar>
  </div>
</template>
