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
emitter.on('loading', (isLoading, loadingText) => {
  globalLoading.value.isLoading = isLoading
  globalLoading.value.loadingText = loadingText ?? '加载中...'
})
</script>

<style scoped>
.global-loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-box {
  padding: 20px 40px;
  background-color: white;
  border-radius: 8px;
  font-size: 16px;
  color: #333;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
