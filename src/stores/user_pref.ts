import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { watch } from 'vue'

export type SizeTheme = 'xs' | 'sm' | 'base' | 'lg' | 'xl'

export const useUserPrefStore = defineStore(
  'user-pref',
  () => {
    // 大小主题
    const sizeTheme = useStorage<SizeTheme>('size-theme', 'base')

    // 应用主题到DOM
    const applyThemes = () => {
      const body = document.body

      // 清除现有的颜色和大小主题类
      const classesToRemove: string[] = []
      for (const cls of body.classList as any) {
        if (cls.startsWith('size-')) {
          classesToRemove.push(cls)
        }
      }
      classesToRemove.forEach((cls) => body.classList.remove(cls))

      // 应用大小主题类
      body.classList.add(`size-${sizeTheme.value}`)

      // 触发自定义事件，通知组件主题已更改
      window.dispatchEvent(
        new CustomEvent('theme-changed', {
          detail: {
            sizeTheme: sizeTheme.value
          }
        })
      )
    }

    // 设置大小主题
    const setSizeTheme = (theme: SizeTheme) => {
      sizeTheme.value = theme
      applyThemes()
    }

    // 监听主题变化并自动应用
    watch([sizeTheme], () => {
      applyThemes()
    })

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
