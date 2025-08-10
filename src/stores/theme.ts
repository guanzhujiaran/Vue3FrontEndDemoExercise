/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-19 10:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-19 10:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\stores\theme.ts
 * @Description: 主题管理store
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { Sunny, Moon, Monitor } from '@element-plus/icons-vue'
export type ThemeMode = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore(
  'theme',
  () => {
    // 主题模式
    const themeMode = ref<ThemeMode>('auto')

    // 当前实际主题
    const currentTheme = ref<'light' | 'dark'>('light')

    // 初始化主题
    const initTheme = () => {
      // 从本地存储读取主题设置
      const savedTheme = localStorage.getItem('theme-mode')
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        themeMode.value = savedTheme as ThemeMode
      }

      // 应用主题
      applyTheme()
    }

    // 切换主题
    const toggleTheme = () => {
      if (themeMode.value === 'light') {
        themeMode.value = 'dark'
      } else if (themeMode.value === 'dark') {
        themeMode.value = 'auto'
      } else {
        themeMode.value = 'light'
      }

      // 保存到本地存储
      localStorage.setItem('theme-mode', themeMode.value)

      // 应用主题
      applyTheme()
    }

    // 设置主题
    const setTheme = (theme: ThemeMode) => {
      themeMode.value = theme
      localStorage.setItem('theme-mode', theme)
      applyTheme()
    }

    // 应用主题
    const applyTheme = () => {
      let targetTheme: 'light' | 'dark' = 'light'

      if (themeMode.value === 'auto') {
        // 跟随系统主题
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        targetTheme = mediaQuery.matches ? 'dark' : 'light'
      } else {
        targetTheme = themeMode.value as 'light' | 'dark'
      }

      currentTheme.value = targetTheme

      // 应用到DOM
      const html = document.documentElement
      const body = document.body

      // 移除现有主题类
      html.classList.remove('light', 'dark')
      body.classList.remove('light', 'dark')

      // 添加新主题类
      html.classList.add(targetTheme)
      body.classList.add(targetTheme)

      // 设置Element Plus主题
      if (targetTheme === 'dark') {
        html.setAttribute('data-theme', 'dark')
      } else {
        html.setAttribute('data-theme', 'light')
      }
    }

    // 监听系统主题变化
    const setupSystemThemeListener = () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = () => {
        if (themeMode.value === 'auto') {
          applyTheme()
        }
      }

      mediaQuery.addEventListener('change', handleChange)

      // 返回清理函数
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }

    // 获取主题图标
    const getThemeIcon = () => {
      if (themeMode.value === 'light') {
        return Sunny
      } else if (themeMode.value === 'dark') {
        return Moon
      } else {
        return Monitor
      }
    }

    // 获取主题文本
    const getThemeText = () => {
      if (themeMode.value === 'light') {
        return '浅色'
      } else if (themeMode.value === 'dark') {
        return '深色'
      } else {
        return '自动'
      }
    }

    return {
      themeMode,
      currentTheme,
      initTheme,
      toggleTheme,
      setTheme,
      applyTheme,
      setupSystemThemeListener,
      getThemeIcon,
      getThemeText
    }
  },
  {
    persist: {
      key: 'theme-store',
      storage: localStorage
    }
  }
)
