<script setup lang="ts">
import { type PropType} from 'vue'

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
const handleLoad = () => {
  props.handleLoad()
}
</script>

<template>
  <div class="with-loading-more with-scroll loading-more-pc">
    <div
      class="with-loading-more-container"
      v-infinite-scroll="handleLoad"
      :infinite-scroll-disabled="!isMore"
      :infinite-scroll-delay="500"
      :infinite-scroll-immediate="true"
      :infinite-scroll-distance="0"
    >
      <slot name="content"></slot>
      <div v-if="isMore" class="loading-more" style="background-color: transparent">
        <span @click="handleLoad">查看更多</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.with-loading-more-container {
  max-height: 85vh;
  padding: 0;
  margin: 0;
  overflow-y: auto;
}

.loading-more {
  position: relative;
  width: -webkit-fill-available;
  text-align: center;

  background-color: var(--el-bg-color);
  height: 600px;
  & span {
    cursor: pointer;
  }
}

.with-loading-more.with-scroll {
  flex: 1;
  overflow: auto;
  height: 90vh;
}

.with-loading-more {
  background-color: var(--el-bg-color);
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
}

.with-loading-more.with-scroll ::-webkit-scrollbar {
  display: none;
}
</style>
