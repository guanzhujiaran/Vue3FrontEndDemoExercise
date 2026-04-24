<script setup lang="ts">
import { type PropType, computed } from 'vue'
import { useElementSize, useThrottleFn } from '@vueuse/core'

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
const {  height } = useElementSize(scrollContainer)

const handleLoad = useThrottleFn(() => {
  if (!isMore.value || isError.value) return
  props.handleLoad()
}, 2e3)
const wrapperHeight = computed(() => {
  return height.value
})
</script>

<template>
  <div ref="scrollContainer" class="with-loading-more-container-wrapper mb-4 flex-1" v-loading="isLoading">
    <el-scrollbar class="with-loading-more-container h-full" :height="wrapperHeight" noresize aria-orientation="vertical" @end-reached="handleLoad" :distance="10">
      <div class="w-full flex-1">
        <slot name="content"></slot>
      </div>
      <div class="loading-more-txt relative w-full text-center bg-transparent h-25" style="background-color: transparent">
        <span v-if="isMore" @click="handleLoad" class="cursor-pointer">查看更多</span>
        <span v-else-if="!isError" class="cursor-pointer">到底了喵~</span>
      </div>
    </el-scrollbar>
  </div>
</template>
