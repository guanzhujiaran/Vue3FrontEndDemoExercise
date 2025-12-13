import type { ElTheme, Hue } from '@/models/store/theme.ts'
import { defineStore } from 'pinia'

const HUES: Hue[] = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose'
]

// 默认主题（fallback）
const DEFAULT_THEME: ElTheme = {
  primary: 'sky',
  success: 'green',
  warning: 'amber',
  danger: 'rose',
  error: 'rose',
  info: 'slate'
}

// 从 theme 对象生成 CSS 变量
function applyThemeToDOM(theme: ElTheme) {
  const html = document.documentElement
  const roles = Object.keys(theme) as (keyof ElTheme)[]

  roles.forEach((role) => {
    const hue = theme[role]
    html.style.setProperty(`--el-color-${role}`, `var(--color-${hue}-500)`)
    html.style.setProperty(`--el-color-${role}-light-3`, `var(--color-${hue}-400)`)
    html.style.setProperty(`--el-color-${role}-light-5`, `var(--color-${hue}-300)`)
    html.style.setProperty(`--el-color-${role}-light-7`, `var(--color-${hue}-200)`)
    html.style.setProperty(`--el-color-${role}-light-8`, `var(--color-${hue}-100)`)
    html.style.setProperty(`--el-color-${role}-light-9`, `var(--color-${hue}-50)`)
    html.style.setProperty(`--el-color-${role}-dark-2`, `var(--color-${hue}-600)`)
  })
}

// 生成随机主题
function generateRandomTheme(): ElTheme {
  return {
    primary: HUES[Math.floor(Math.random() * HUES.length)]!,
    success: HUES[Math.floor(Math.random() * HUES.length)]!,
    warning: HUES[Math.floor(Math.random() * HUES.length)]!,
    danger: HUES[Math.floor(Math.random() * HUES.length)]!,
    error: HUES[Math.floor(Math.random() * HUES.length)]!,
    info: HUES[Math.floor(Math.random() * HUES.length)]!
  }
}

export const useHueThemeStore = defineStore('hue_theme', () => {
  // 历史记录（最多保留 20 个）
  const history = ref<{id: number, theme: ElTheme}[]>([{id: 0, theme: DEFAULT_THEME}])
  const currentIndex = ref(0)
  const nextId = ref(1) // 用于生成唯一ID
  const MAX_HISTORY_COUNT = 20

  // 计算属性
  const currentTheme = computed(() => {
    const item = history.value.find(item => item.id === currentIndex.value)
    return item ? item.theme : DEFAULT_THEME
  })
  
  const canGenerate = computed(() => history.value.length < MAX_HISTORY_COUNT)

  // 应用当前主题到 DOM
  function applyCurrentTheme() {
    applyThemeToDOM(currentTheme.value!)
  }

  // 生成并添加新主题
  function randomizeTheme() {
    // 检查是否可以生成新主题
    if (history.value.length >= MAX_HISTORY_COUNT) {
      return false
    }

    const newTheme = generateRandomTheme()
    const newId = nextId.value++
    
    // 添加新主题到历史记录
    history.value.push({id: newId, theme: newTheme})
    currentIndex.value = newId

    applyCurrentTheme()
    saveToLocalStorage()
    return true
  }

  // 删除指定ID的主题（除了默认主题）
  function deleteTheme(id: number) {
    // 不能删除默认主题（ID为0）且不能删除当前使用的主题
    if (id === 0 || id === currentIndex.value) {
      return false
    }

    const index = history.value.findIndex(item => item.id === id)
    if (index === -1) {
      return false
    }

    history.value.splice(index, 1)
    
    saveToLocalStorage()
    return true
  }

  // 恢复默认主题
  function restoreDefaultTheme() {
    currentIndex.value = 0
    applyCurrentTheme()
    saveToLocalStorage()
  }

  // 保存到 localStorage（可选）
  function saveToLocalStorage() {
    const data = {
      history: history.value,
      currentIndex: currentIndex.value,
      nextId: nextId.value
    }
    localStorage.setItem('el-theme-store', JSON.stringify(data))
  }

  // 从 localStorage 恢复
  function restoreFromLocalStorage() {
    const raw = localStorage.getItem('el-theme-store')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        history.value = data.history || [{id: 0, theme: DEFAULT_THEME}]
        currentIndex.value = data.currentIndex ?? 0
        nextId.value = data.nextId ?? history.value.length
        
        // 确保当前索引有效
        const hasCurrent = history.value.some(item => item.id === currentIndex.value)
        if (!hasCurrent) {
          currentIndex.value = 0
        }
        
        applyCurrentTheme()
      } catch (e) {
        console.warn('Failed to restore theme from localStorage', e)
        // fallback
        history.value = [{id: 0, theme: DEFAULT_THEME}]
        currentIndex.value = 0
        nextId.value = 1
        applyCurrentTheme()
      }
    } else {
      applyCurrentTheme()
    }
  }

  return {
    // state
    history,
    currentIndex,
    currentTheme,
    canGenerate,

    // actions
    randomizeTheme,
    deleteTheme,
    restoreDefaultTheme,
    applyCurrentTheme,
    restoreFromLocalStorage
  }
})