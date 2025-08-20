import { useDebounceFn } from '@vueuse/core'

// 存储屏幕尺寸
const screenSize = {
  width: window.innerWidth,
  height: window.innerHeight
}

export const setFontSize = useDebounceFn(() => {
  const n = document.documentElement
  const t = n.clientWidth > 150 ? 150 : n.clientWidth,
    e = t / 10
  n.style.fontSize = e + 'px'
}, 100)

/**
 * 自动缩放布局函数
 * 当窗口宽度小于body的min-width时，自动缩放页面以显示所有内容
 */
export const adjustLayout = useDebounceFn(() => {
  // 更新屏幕尺寸
  screenSize.width = window.innerWidth
  screenSize.height = window.innerHeight

  // 调用现有的setFontSize函数
  setFontSize()

  // 确保body至少有视口的高度
  // document.body.style.minHeight = `${screenSize.height - 10}px`

  const minWidth = 500 // body的min-width值

  // 当窗口宽度小于body的min-width时，自动缩放
  if (window.innerWidth < minWidth) {
    // 计算缩放比例
    const scale = window.innerWidth / minWidth

    // 应用缩放到app元素
    const appElement = document.getElementById('app')
    if (appElement) {
      // 设置缩放
      appElement.style.transform = `scale(${scale})`
      appElement.style.transformOrigin = 'top left'

      // 调整容器大小以适应缩放后的内容
      appElement.style.width = `${100 / scale}%`

      // 设置最小宽度，确保内容不会被裁剪
      document.body.style.minWidth = `${minWidth}px`
      document.body.style.width = `${minWidth}px`

      // 允许垂直滚动，但隐藏水平滚动条
      document.body.style.overflowX = 'hidden'
      document.body.style.overflowY = 'auto'

      // 添加一个标记类，用于CSS样式调整
      document.documentElement.classList.add('scaled-view')
    }
  } else {
    // 重置缩放
    const appElement = document.getElementById('app')
    if (appElement) {
      appElement.style.transform = ''
      appElement.style.transformOrigin = ''
      appElement.style.width = '100%'
    }

    // 重置body样式
    document.body.style.width = ''

    // 移除标记类
    document.documentElement.classList.remove('scaled-view')

    // 根据屏幕尺寸调整其他布局参数
    if (screenSize.width < 768) {
      // 小屏幕布局调整
      document.body.style.overflowX = 'auto'
    } else {
      // 大屏幕布局调整
      document.body.style.overflowX = 'hidden'
    }
  }
}, 200) // 200ms的防抖延迟

/**
 * 设置自动缩放功能
 * 返回一个清理函数，用于在组件卸载时移除事件监听器
 */
export const setupAutoScale = () => {
  // 初始调用一次以确保正确的初始布局
  adjustLayout()

  // 添加窗口resize事件监听器
  window.addEventListener('resize', adjustLayout)

  // 返回清理函数
  return () => {
    window.removeEventListener('resize', adjustLayout)
  }
}
