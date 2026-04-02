import { ref, computed, onMounted, watch } from 'vue'

type SizeTheme = 'xxs' | 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl'
type ScaleMode = 'normal' | 'compact' | 'spacious'

interface SizeThemeConfig {
  value: SizeTheme
  scale: ScaleMode
}

const STORAGE_KEY_THEME = 'size-theme'
const STORAGE_KEY_SCALE = 'size-scale'

const DEFAULT_THEME: SizeTheme = 'base'
const DEFAULT_SCALE: ScaleMode = 'normal'

/**
 * 尺寸主题 Composable
 * 提供全局尺寸主题切换和管理功能
 */
export function useSizeTheme() {
  const currentSize = ref<SizeTheme>(DEFAULT_THEME)
  const currentScale = ref<ScaleMode>(DEFAULT_SCALE)

  // 计算当前尺寸类名
  const sizeClass = computed(() => `size-${currentSize.value}`)

  // 计算当前缩放类名
  const scaleClass = computed(() => {
    return currentScale.value === 'normal' ? '' : `size-${currentScale.value}`
  })

  // 获取尺寸标签
  const getSizeLabel = (size: SizeTheme): string => {
    const labels: Record<SizeTheme, string> = {
      xxs: '超超小',
      xs: '超小',
      sm: '小',
      md: '中',
      base: '标准',
      lg: '大',
      xl: '超大',
      '2xl': '超超大'
    }
    return labels[size]
  }

  // 设置尺寸主题
  const setSize = (size: SizeTheme) => {
    currentSize.value = size
    applySizeTheme()
    saveThemeToStorage()
  }

  // 设置缩放模式
  const setScale = (scale: ScaleMode) => {
    currentScale.value = scale
    applyScaleMode()
    saveScaleToStorage()
  }

  // 应用尺寸主题到 DOM
  const applySizeTheme = () => {
    const htmlElement = document.documentElement
    const sizeClasses = ['size-xxs', 'size-xs', 'size-sm', 'size-md', 'size-base', 'size-lg', 'size-xl', 'size-2xl']

    sizeClasses.forEach(cls => htmlElement.classList.remove(cls))
    htmlElement.classList.add(`size-${currentSize.value}`)
  }

  // 应用缩放模式到 DOM
  const applyScaleMode = () => {
    const htmlElement = document.documentElement
    const scaleClasses = ['size-compact', 'size-spacious']

    scaleClasses.forEach(cls => htmlElement.classList.remove(cls))
    if (currentScale.value !== 'normal') {
      htmlElement.classList.add(`size-${currentScale.value}`)
    }
  }

  // 保存到 localStorage
  const saveThemeToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, currentSize.value)
    } catch (error) {
      console.warn('Failed to save size theme to localStorage:', error)
    }
  }

  const saveScaleToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY_SCALE, currentScale.value)
    } catch (error) {
      console.warn('Failed to save scale mode to localStorage:', error)
    }
  }

  // 从 localStorage 加载
  const loadFromStorage = () => {
    try {
      const savedSize = localStorage.getItem(STORAGE_KEY_THEME)
      const savedScale = localStorage.getItem(STORAGE_KEY_SCALE)

      if (savedSize && isValidSizeTheme(savedSize)) {
        currentSize.value = savedSize as SizeTheme
      }

      if (savedScale && isValidScaleMode(savedScale)) {
        currentScale.value = savedScale as ScaleMode
      }

      applySizeTheme()
      applyScaleMode()
    } catch (error) {
      console.warn('Failed to load size theme from localStorage:', error)
    }
  }

  // 验证尺寸主题值
  const isValidSizeTheme = (value: string): value is SizeTheme => {
    return ['xxs', 'xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl'].includes(value)
  }

  // 验证缩放模式值
  const isValidScaleMode = (value: string): value is ScaleMode => {
    return ['normal', 'compact', 'spacious'].includes(value)
  }

  // 重置为默认值
  const resetTheme = () => {
    currentSize.value = DEFAULT_THEME
    currentScale.value = DEFAULT_SCALE
    applySizeTheme()
    applyScaleMode()
    saveThemeToStorage()
    saveScaleToStorage()
  }

  // 获取当前配置
  const getConfig = (): SizeThemeConfig => ({
    value: currentSize.value,
    scale: currentScale.value
  })

  // 设置完整配置
  const setConfig = (config: SizeThemeConfig) => {
    if (isValidSizeTheme(config.value)) {
      currentSize.value = config.value
    }
    if (isValidScaleMode(config.scale)) {
      currentScale.value = config.scale
    }
    applySizeTheme()
    applyScaleMode()
    saveThemeToStorage()
    saveScaleToStorage()
  }

  // 监听配置变化
  watch(currentSize, () => {
    applySizeTheme()
  })

  watch(currentScale, () => {
    applyScaleMode()
  })

  return {
    currentSize,
    currentScale,
    sizeClass,
    scaleClass,
    getSizeLabel,
    setSize,
    setScale,
    resetTheme,
    getConfig,
    setConfig
  }
}

/**
 * 局部尺寸主题 Composable
 * 用于特定组件的尺寸控制
 */
export function useLocalSizeTheme(initialSize?: SizeTheme) {
  const localSize = ref<SizeTheme>(initialSize || DEFAULT_THEME)

  const setLocalSize = (size: SizeTheme) => {
    localSize.value = size
  }

  const localSizeClass = computed(() => `size-${localSize.value}`)

  return {
    localSize,
    setLocalSize,
    localSizeClass
  }
}
