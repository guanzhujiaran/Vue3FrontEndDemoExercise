<template>
  <transition name="fade">
    <div v-show="globalLoading.isLoading" class="global-loading-mask">
      <div class="loading-box">
        {{ globalLoading.loadingText }}
      </div>
    </div>
  </transition>
</template>

<script setup>
import emitter from '@/utils/mitt.js'
const globalLoading = ref({
  isLoading: false,
  loadingText: '加载中...'
})
emitter.on('loading', ({ isLoading, loadingText }) => {
  globalLoading.value.isLoading = isLoading
  globalLoading.value.loadingText = loadingText ?? '加载中...'
})
</script>

<style scoped>
@import '@/assets/components/feedback/global-loading-mask-tailwind.css';
</style>
