# Element Plus 全局加载遮罩使用指南

## 功能概述

已将原有的自定义加载遮罩替换为基于 Element Plus UI 库的 `v-loading` 指令，提供更统一的设计风格和更好的性能。

## 主要特性

- 🎯 **基于 Element Plus**: 使用官方 `v-loading` 指令
- 🎨 **可自定义样式**: 支持自定义背景色、图标和样式类
- 🌙 **深色主题支持**: 自动适配深色/浅色主题
- 📱 **响应式设计**: 适配不同屏幕尺寸
- 🔧 **灵活控制**: 支持手动控制显示/隐藏
- ⚡ **性能优化**: 使用 Element Plus 优化过的加载动画

## 使用方法

### 1. 基本使用

组件会自动在路由切换时显示加载遮罩，无需额外配置。

### 2. 自定义样式

```vue
<template>
  <GlobalLoadingMask 
    :loading-background="'rgba(0, 0, 0, 0.8)'"
    :custom-spinner="'custom-spinner-class'"
    custom-class="my-custom-loading"
  />
</template>
```

### 3. 手动控制

```typescript
import { showGlobalLoading, hideGlobalLoading } from '@/utils/globalLoading'

// 显示加载遮罩
showGlobalLoading('数据加载中...')

// 隐藏加载遮罩
hideGlobalLoading()
```

### 4. 异步函数包装

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

## 组件属性

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `loadingBackground` | `string` | `'rgba(255, 255, 255, 0.9)'` | 自定义加载背景色 |
| `customSpinner` | `string` | `''` | 自定义加载图标类名 |
| `customClass` | `string` | `''` | 自定义样式类名 |

## 样式定制

### 1. 全局样式覆盖

```css
/* 自定义加载遮罩样式 */
:deep(.el-loading-mask) {
  background-color: rgba(0, 0, 0, 0.8) !important;
}

:deep(.el-loading-text) {
  color: #ffffff !important;
  font-size: 18px !important;
}

:deep(.el-loading-spinner) {
  margin-top: 20px !important;
}
```

### 2. 深色主题适配

组件会自动适配深色主题：

```css
/* 深色主题下的样式 */
:global(.dark) :deep(.el-loading-mask) {
  background-color: rgba(48, 48, 48, 0.9) !important;
}

:global(.dark) :deep(.el-loading-text) {
  color: #e5e5e5 !important;
}
```

### 3. 自定义加载图标

```vue
<template>
  <GlobalLoadingMask 
    :custom-spinner="'my-custom-spinner'"
  />
</template>

<style>
.my-custom-spinner {
  /* 自定义旋转动画 */
  animation: my-spin 1s linear infinite;
}

@keyframes my-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
```

## 特殊页面处理

### 登录页面优化

登录页面会自动禁用背景遮罩，保持背景图亮度：

```typescript
// 自动判断逻辑
const shouldShowBackdrop = computed(() => {
  if (isLoginPage.value) {
    return false
  }
  // ... 其他判断逻辑
})
```

### 配置不需要背景遮罩的页面

```typescript
const pagesWithoutBackdrop = [
  '/', // 登录页面
  '/home', // 首页
  // 可以添加更多不需要背景遮罩的页面
]
```

## 性能优势

1. **使用 Element Plus 优化**: 基于官方组件的性能优化
2. **减少自定义代码**: 减少维护成本
3. **统一设计风格**: 与项目其他 Element Plus 组件保持一致
4. **更好的兼容性**: 支持更多浏览器和设备

## 迁移说明

从原有的自定义加载遮罩迁移到 Element Plus 版本：

### 原有功能保持不变
- ✅ 路由切换自动显示/隐藏
- ✅ 手动控制 API
- ✅ 异步函数包装器
- ✅ 登录页面特殊处理
- ✅ 深色主题适配

### 新增功能
- 🆕 Element Plus 官方加载动画
- 🆕 更好的样式定制能力
- 🆕 更统一的用户体验

## 注意事项

1. 确保 Element Plus 已正确安装和配置
2. 自定义样式时注意使用 `:deep()` 选择器
3. 深色主题会自动适配，无需额外配置
4. 登录页面会自动禁用背景遮罩
5. 支持多个并发加载请求的计数器机制
