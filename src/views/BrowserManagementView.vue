<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\BrowserManagementView.vue
 * @Description: RPA浏览器控制台 - 统一管理浏览器自动化操作和调试
-->
<template>
  <FlexContainer>
    <router-view />
  </FlexContainer>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted } from 'vue'
import type { BrowserSessionStatus } from '@/types/browser-automation-api'

const browserId = ref<string | null>(null)

const sessionState = ref<BrowserSessionStatus | undefined>(undefined)
provide('browserSessionState', sessionState)

type StopBrowserCallback = () => void
const stopBrowserCallbacks = new Set<StopBrowserCallback>()

const onStopBrowser = (callback: StopBrowserCallback) => {
  stopBrowserCallbacks.add(callback)
  return () => {
    stopBrowserCallbacks.delete(callback)
  }
}
provide('onStopBrowser', onStopBrowser)

const triggerStopBrowser = () => {
  stopBrowserCallbacks.forEach(callback => {
    try {
      callback()
    } catch (error) {
      console.error('[BrowserManagementView] Error in stopBrowser callback:', error)
    }
  })
}

defineExpose({ sessionState, triggerStopBrowser })
</script>


