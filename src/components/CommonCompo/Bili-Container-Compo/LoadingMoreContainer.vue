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
const scrollContainer = useTemplateRef('scrollContainer')

const { width, height } = useElementSize(scrollContainer)
const { x, y, isScrolling, arrivedState, directions, measure } = useScroll(scrollContainer, {
  behavior: 'smooth'
})

const handleLoad = useDebounceFn(() => {
  props.handleLoad()
  y.value += 600
  nextTick(() => {
    measure()
  })
}, 2e3)
</script>

<template>
  <div class="with-loading-more-container-wrapper" ref="scrollContainer">
    <div
      class="with-loading-more-container"
      v-infinite-scroll="handleLoad"
      :infinite-scroll-disabled="!isMore"
      :infinite-scroll-immediate="true"
      :infinite-scroll-distance="10"
    >
      <slot name="content"></slot>
      <div v-if="isMore" class="loading-more-txt" style="background-color: transparent">
        <span @click="handleLoad">查看更多</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.with-loading-more-container-wrapper {
  width: -webkit-fill-available;
  overflow-y: scroll;
  overflow-x: hidden;
}
.with-loading-more-container {
  padding: 0;
  margin: 0;
  height: 600px;
}

.loading-more-txt {
  position: relative;
  width: -webkit-fill-available;
  text-align: center;
  background-color: transparent;
  height: 600px;
  & span {
    cursor: pointer;
  }
}
</style>
