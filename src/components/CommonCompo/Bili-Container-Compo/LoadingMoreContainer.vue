<script setup lang="ts">
import { type PropType, ref } from 'vue'

const props = defineProps({
  handleLoad: {
    type: Function as PropType<() => void>,
    required: true
  }
})
const isMore = defineModel('isMore', {
  required: true,
  type: Boolean
})
</script>

<template>
  <div class="with-loading-more with-scroll loading-more-pc">
    <div
      class="with-loading-more-container"
      v-infinite-scroll="props.handleLoad"
      :infinite-scroll-disabled="!isMore"
      :infinite-scroll-delay="1e3"
    >
      <slot name="content"></slot>
    </div>
    <slot name="footer">
      <div v-if="isMore" class="loading-more" style="background-color: transparent" @click="props.handleLoad">
        <span>查看更多</span>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.loading-more {
  position: relative;
  font-size: 0.32rem;
  width: 100%;
  min-width: 100%;
  text-align: center;
  cursor: pointer;
  height: 1.066667rem;
  line-height: 1.066667rem;
  background-color: #606060;
}

.with-loading-more.with-scroll {
  height: inherit;
  overflow-y: auto;
}

.with-loading-more {
      background-color: var(--el-bg-color);

  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
}

.with-loading-more.with-scroll ::-webkit-scrollbar {
  width: 0.133333rem;
  background: hsla(0, 0%, 100%, 0);
}

.with-loading-more.with-scroll.loading-more-pc::-webkit-scrollbar-button {
  display: none;
}

.with-loading-more.with-scroll.loading-more-pc::-webkit-scrollbar {
  width: 0.133333rem;
  background: hsla(0, 0%, 100%, 0);
  border-radius: 0.133333rem;
}

.with-loading-more.with-scroll.loading-more-pc::-webkit-scrollbar-thumb {
  background: hsla(0, 2%, 41%, 0.5);
  border-radius: 0.133333rem;
}
</style>
