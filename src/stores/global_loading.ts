/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-19 10:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-19 10:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\stores\global_loading.ts
 * @Description: 全局加载状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGlobalLoadingStore = defineStore('globalLoading', () => {
  const isLoading = ref(false)
  const loadingText = ref('页面加载中...')
  const loadingCount = ref(0)

  // 显示加载
  const showLoading = (text?: string) => {
    if (text) {
      loadingText.value = text
    }
    loadingCount.value++
    isLoading.value = true
  }

  // 隐藏加载
  const hideLoading = () => {
    loadingCount.value = Math.max(0, loadingCount.value - 1)
    if (loadingCount.value === 0) {
      isLoading.value = false
    }
  }

  // 强制隐藏所有加载
  const forceHideLoading = () => {
    loadingCount.value = 0
    isLoading.value = false
  }

  // 设置加载文本
  const setLoadingText = (text: string) => {
    loadingText.value = text
  }

  return {
    isLoading,
    loadingText,
    loadingCount,
    showLoading,
    hideLoading,
    forceHideLoading,
    setLoadingText
  }
})
