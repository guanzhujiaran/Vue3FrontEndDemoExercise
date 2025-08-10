/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-19 10:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-19 10:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\utils\globalLoading.ts
 * @Description: 全局加载遮罩工具函数
 */
import { useGlobalLoadingStore } from '@/stores/global_loading'

/**
 * 显示全局加载遮罩
 * @param text 加载文本
 */
export const showGlobalLoading = (text?: string) => {
  const globalLoadingStore = useGlobalLoadingStore()
  globalLoadingStore.showLoading(text)
}

/**
 * 隐藏全局加载遮罩
 */
export const hideGlobalLoading = () => {
  const globalLoadingStore = useGlobalLoadingStore()
  globalLoadingStore.hideLoading()
}

/**
 * 强制隐藏所有全局加载遮罩
 */
export const forceHideGlobalLoading = () => {
  const globalLoadingStore = useGlobalLoadingStore()
  globalLoadingStore.forceHideLoading()
}

/**
 * 设置全局加载文本
 * @param text 加载文本
 */
export const setGlobalLoadingText = (text: string) => {
  const globalLoadingStore = useGlobalLoadingStore()
  globalLoadingStore.setLoadingText(text)
}

/**
 * 包装异步函数，自动显示/隐藏加载遮罩
 * @param asyncFn 异步函数
 * @param loadingText 加载文本
 * @returns 包装后的函数
 */
export const withGlobalLoading = <T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  loadingText?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      showGlobalLoading(loadingText)
      const result = await asyncFn(...args)
      return result
    } finally {
      hideGlobalLoading()
    }
  }
}
