# 全局加载遮罩功能

## 功能概述

全局加载遮罩功能提供了在路由切换和异步操作时显示加载状态的能力，提升用户体验。

## 功能特性

- 🎯 **路由切换自动显示**：在页面路由切换时自动显示加载遮罩
- 🎨 **美观的UI设计**：包含旋转动画和毛玻璃效果
- 🌙 **深色主题支持**：自动适配深色/浅色主题
- 📱 **响应式设计**：适配不同屏幕尺寸
- 🔧 **灵活的控制**：支持手动控制显示/隐藏
- ⚡ **异步函数包装**：提供便捷的异步函数包装器

## 组件结构

```
src/
├── components/CommonCompo/
│   └── GlobalLoadingMask.vue    # 全局加载遮罩组件
├── stores/
│   └── global_loading.ts        # 全局加载状态管理
└── utils/
    └── globalLoading.ts         # 工具函数
```

## 使用方法

### 1. 路由切换自动显示

路由切换时会自动显示加载遮罩，无需额外配置。

### 2. 手动控制加载遮罩

```typescript
import { showGlobalLoading, hideGlobalLoading } from '@/utils/globalLoading'

// 显示加载遮罩
showGlobalLoading('数据加载中...')

// 隐藏加载遮罩
hideGlobalLoading()
```

### 3. 包装异步函数

```typescript
import { withGlobalLoading } from '@/utils/globalLoading'

// 原始异步函数
const fetchData = async () => {
  const response = await fetch('/api/data')
  return response.json()
}

// 包装后的函数，自动显示/隐藏加载遮罩
const fetchDataWithLoading = withGlobalLoading(fetchData, '数据加载中...')

// 使用
const data = await fetchDataWithLoading()
```

### 4. 在组件中使用

```vue
<script setup lang="ts">
import { useGlobalLoadingStore } from '@/stores/global_loading'

const globalLoadingStore = useGlobalLoadingStore()

const handleAsyncOperation = async () => {
  globalLoadingStore.showLoading('处理中...')
  try {
    await someAsyncOperation()
  } finally {
    globalLoadingStore.hideLoading()
  }
}
</script>
```

## API 参考

### GlobalLoadingStore

| 方法 | 参数 | 描述 |
|------|------|------|
| `showLoading` | `text?: string` | 显示加载遮罩 |
| `hideLoading` | - | 隐藏加载遮罩 |
| `forceHideLoading` | - | 强制隐藏所有加载遮罩 |
| `setLoadingText` | `text: string` | 设置加载文本 |

### 工具函数

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `showGlobalLoading` | `text?: string` | `void` | 显示全局加载遮罩 |
| `hideGlobalLoading` | - | `void` | 隐藏全局加载遮罩 |
| `forceHideGlobalLoading` | - | `void` | 强制隐藏所有全局加载遮罩 |
| `setGlobalLoadingText` | `text: string` | `void` | 设置全局加载文本 |
| `withGlobalLoading` | `asyncFn, loadingText?` | `Function` | 包装异步函数 |

## 样式定制

全局加载遮罩的样式可以通过修改 `GlobalLoadingMask.vue` 组件来定制：

- 遮罩背景色：`.global-loading-mask`
- 加载容器样式：`.loading-container`
- 旋转动画：`.spinner`
- 加载文本：`.loading-text`

## 注意事项

1. 加载遮罩使用 `Teleport` 渲染到 `body` 元素，确保层级正确
2. 支持多个并发加载请求，使用计数器管理显示状态
3. 路由切换时只在非首次访问时显示加载遮罩
4. 深色主题会自动适配样式
