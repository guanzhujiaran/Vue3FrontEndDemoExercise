<script setup lang="ts">
import { type PropType } from 'vue'
import { useThrottleFn } from '@vueuse/core'

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

const handleLoad = useThrottleFn(() => {
  if (!isMore.value || isError.value) return
  props.handleLoad()
}, 2e3)
</script>

<template>
  <div class="with-loading-more-container-wrapper mb-4 flex min-h-0 flex-1" v-loading="isLoading">
    <el-scrollbar
      class="with-loading-more-container mx-auto max-w-6xl w-full"
      noresize
      aria-orientation="vertical"
      @end-reached="handleLoad"
      :distance="10"
    >
      <div class="w-full">
        <slot name="content"></slot>
      </div>
      <div class="loading-more-txt relative w-full text-center bg-transparent h-25" style="background-color: transparent">
        <span v-if="isMore" @click="handleLoad" class="cursor-pointer">查看更多</span>
        <span v-else-if="!isError" class="cursor-pointer">到底了喵~</span>
      </div>
    </el-scrollbar>
  </div>
</template>
