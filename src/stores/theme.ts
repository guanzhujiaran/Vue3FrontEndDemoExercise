import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { Sunny, Moon, Monitor } from '@element-plus/icons-vue'
import { useDark, useToggle, usePreferredDark, useStorage } from '@vueuse/core'
export type ThemeMode = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore(
  'theme',
  () => {
    // 使用VueUse的useDark，自动处理暗色模式切换
    const isDark = useDark({
      selector: 'html',
      valueDark: 'dark',
      valueLight: 'light',
      storageKey: 'vueuse-theme-appearance'
    })
    const toggleDark = useToggle(isDark)

    // 使用useStorage持久化主题模式设置
    const themeMode = useStorage<ThemeMode>('theme-mode', 'auto')

    // 系统偏好
    const prefersDark = usePreferredDark()

    // 当前实际主题 - 从isDark计算得出
    const currentTheme = computed<'light' | 'dark'>(() => (isDark.value ? 'dark' : 'light'))

    // 初始化主题
    const initTheme = () => {
      // 根据当前主题模式设置暗色/亮色
      applyThemeMode()
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
      // 应用新的主题模式
      applyThemeMode()
    }

    // 设置主题
    const setTheme = (theme: ThemeMode) => {
      themeMode.value = theme
      // 应用新的主题模式
      applyThemeMode()
    }

    // 应用主题模式
    const applyThemeMode = () => {
      if (themeMode.value === 'light') {
        toggleDark(false)
      } else if (themeMode.value === 'dark') {
        toggleDark(true)
      } else if (themeMode.value === 'auto') {
        // 自动模式下根据系统偏好设置
        toggleDark(prefersDark.value)
      }
    }

    // 监听系统主题变化
    const setupSystemThemeListener = () => {
      // 使用watch监听系统偏好变化
      return watch(prefersDark, (newValue) => {
        if (themeMode.value === 'auto') {
          toggleDark(newValue)
        }
      })
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
      setupSystemThemeListener,
      getThemeIcon,
      getThemeText,
      isDark,
      toggleDark,
      applyThemeMode
    }
  },
  {
    persist: {
      key: 'theme-store',
      storage: localStorage
    }
  }
)
