import { defineStore } from 'pinia'
import { watch } from 'vue'

export type SizeTheme = 'xs' | 'sm' | 'base' | 'lg' | 'xl'

export const useUserPrefStore = defineStore(
  'user-pref',
  () => {
    // 大小主题
    const sizeTheme = ref<SizeTheme>('base')
    // 应用主题到DOM
    const applyThemes = () => {
      switch (sizeTheme.value) {
        case 'xs':
          document.documentElement.style.fontSize = '12px'
          break
        case 'sm':
          document.documentElement.style.fontSize = '14px'
          break
        case 'base':
          document.documentElement.style.fontSize = '16px'
          break
        case 'lg':
          document.documentElement.style.fontSize = '18px'
          break
        case 'xl':
          document.documentElement.style.fontSize = '20px'
          break
      }
    }

    // 设置大小主题
    const setSizeTheme = (theme: SizeTheme) => {
      sizeTheme.value = theme
      applyThemes()
    }

    return {
      sizeTheme,
      setSizeTheme,
      applyThemes
    }
  },
  {
    persist: {
      key: 'user-pref-store',
      storage: localStorage
    }
  }
)
