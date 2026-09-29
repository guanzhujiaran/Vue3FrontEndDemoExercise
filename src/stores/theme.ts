import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { Sunny, Moon, Monitor } from '@element-plus/icons-vue'
import { useDark, useToggle, usePreferredDark, useStorage } from '@vueuse/core'
export type ThemeMode = 'light' | 'dark' | 'auto'
type themeEffectString = 'dark' | 'light'
export const useThemeStore = defineStore(
  'pref_theme',
  () => {
    // 使用VueUse的useDark，自动处理暗色模式切换（内部真实值，客户端会同步读 localStorage）
    const darkMode = useDark({
      selector: 'html',
      valueDark: 'dark',
      valueLight: 'light',
      storageKey: 'vueuse-theme-appearance'
    })
    const themeEffectString = computed<themeEffectString>(() => {
      return isDark.value ? 'dark' : 'light'
    })
    const toggleDark = useToggle(darkMode)

    /**
     * 是否已完成客户端首次挂载（由 `App.vue` 的 onMounted 调用 `markHydrated()` 置位）。
     *
     * 首帧必须与服务端一致：SSR / 预渲染阶段没有 localStorage，`useDark` 解析为 false（浅色），
     * 而客户端在 setup 阶段就会同步从 localStorage 恢复真实主题。对外的 `isDark` 在置位前
     * 固定为「浅色」，挂载后再放开 —— 否则全项目 ~20 处 `:effect="themeEffectString"`
     * （el-tag / el-alert / el-dialog）以及 `App.vue` 的背景图都会与静态 HTML 不一致。
     *
     * 内部真实的暗色状态请用 `darkMode`（applyThemeMode / 系统主题监听都用它），不要用对外的 `isDark`。
     */
    const hydrated = ref(false)
    const markHydrated = () => {
      hydrated.value = true
    }

    /** 对外的暗色状态：水合完成前恒为 false，与服务端输出保持一致 */
    const isDark = computed(() => hydrated.value && darkMode.value)

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
      applyThemeMode,
      themeEffectString,
      markHydrated
    }
  },
  {
    persist: {
      key: 'theme-store',
      storage: localStorage
    }
  }
)
