<template>
  <transition name="fade">
    <div v-show="globalLoading.isLoading" class="global-loading-mask fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div class="loading-box rounded-lg bg-[var(--el-bg-color)] p-5 text-base text-[var(--el-text-color-regular)] shadow-sm">
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


