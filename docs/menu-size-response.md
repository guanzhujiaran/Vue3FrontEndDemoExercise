# 菜单组件尺寸响应性说明

## 问题描述

之前 `el-menu-item` 使用固定的 `--el-menu-item-height: var(--component-height-base)`，导致切换尺寸主题时，菜单组件的高度和字体大小不会随之变化。

## 解决方案

### 1. 为每个尺寸主题定义菜单专用变量

在 `src/assets/tailwind.css` 中，为每个尺寸主题类定义了菜单专用的 CSS 变量：

```css
/* 示例：base 尺寸 */
.size-base {
    --el-menu-item-height: var(--component-height-base);
    --el-menu-horizontal-item-padding: 0 var(--component-padding-x-base);
    --el-menu-base-level-padding: var(--spacing-5);
    --el-menu-level-padding: var(--spacing-5);
    --el-menu-font-size: var(--component-font-size-base);
}

/* 示例：lg 尺寸 */
.size-lg {
    --el-menu-item-height: var(--component-height-lg);
    --el-menu-horizontal-item-padding: 0 var(--component-padding-x-lg);
    --el-menu-base-level-padding: var(--spacing-6);
    --el-menu-level-padding: var(--spacing-6);
    --el-menu-font-size: var(--component-font-size-lg);
}
```

### 2. 应用到菜单组件

```css
.el-menu-item,
.el-sub-menu__title {
    font-size: var(--el-menu-font-size);
    height: var(--el-menu-item-height);
    line-height: var(--el-menu-item-height);
}
```

### 3. 修复响应式媒体查询中的硬编码

在 `src/assets/components/navigation/header-bar-view-tailwind.css` 中，将硬编码的 Tailwind 类替换为 CSS 变量：

```css
/* 修改前 */
.header-menu :deep(.el-menu-item) {
    @apply text-xs px-2 py-3;
}

/* 修改后 */
.header-menu :deep(.el-menu-item) {
    padding: 0 var(--spacing-2) var(--spacing-1);
    min-width: fit-content;
    font-size: var(--component-font-size-sm);
    height: var(--component-height-sm);
}
```

## 测试方法

### 方法 1: 使用 SizeThemeSwitcher 组件

```vue
<template>
  <div>
    <SizeThemeSwitcher />

    <el-menu mode="horizontal">
      <el-menu-item index="1">首页</el-menu-item>
      <el-menu-item index="2">视频</el-menu-item>
      <el-menu-item index="3">直播</el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import SizeThemeSwitcher from '@/components/SizeThemeSwitcher.vue'
</script>
```

切换尺寸主题后，观察菜单项的高度和字体大小是否随之变化。

### 方法 2: 使用 useSizeTheme composable

```vue
<template>
  <div>
    <button @click="setSize('xs')">小尺寸</button>
    <button @click="setSize('base')">标准尺寸</button>
    <button @click="setSize('xl')">大尺寸</button>

    <el-menu mode="horizontal">
      <el-menu-item index="1">首页</el-menu-item>
      <el-menu-item index="2">视频</el-menu-item>
    </el-menu>
  </div>
</template>

<script setup>
import { useSizeTheme } from '@/composables/useSizeTheme'

const { setSize } = useSizeTheme()
</script>
```

### 方法 3: 直接使用尺寸类

```vue
<template>
  <div class="size-lg">
    <el-menu mode="horizontal">
      <el-menu-item index="1">首页</el-menu-item>
      <el-menu-item index="2">视频</el-menu-item>
    </el-menu>
  </div>
</template>
```

## 预期效果

切换不同尺寸主题时，菜单组件应该呈现以下变化：

| 尺寸 | 菜单项高度 | 字体大小 | 内边距 |
|------|-----------|---------|--------|
| xxs | 24px | 11px | 0 6px |
| xs | 28px | 12px | 0 8px |
| sm | 32px | 13px | 0 10px |
| md | 36px | 14px | 0 12px |
| base | 40px | 15px | 0 14px |
| lg | 44px | 16px | 0 16px |
| xl | 48px | 18px | 0 18px |
| 2xl | 56px | 20px | 0 20px |

## 常见问题

### Q: 为什么菜单项没有响应尺寸变化？

A: 检查以下几点：
1. 确保菜单容器或其父元素应用了尺寸类（如 `size-lg`）
2. 检查是否有其他 CSS 规则覆盖了菜单样式
3. 确保没有使用硬编码的 Tailwind 类（如 `text-xs`）

### Q: 水平菜单和垂直菜单都支持吗？

A: 是的，`el-menu-item` 和 `el-sub-menu__title` 都支持尺寸响应，无论水平还是垂直菜单。

### Q: 响应式媒体查询会影响尺寸主题吗？

A: 在小屏幕（< 768px）时，媒体查询会设置较小的尺寸，但如果同时应用了尺寸主题，尺寸主题的优先级更高。

## 技术细节

### CSS 变量优先级

尺寸主题类定义的 CSS 变量会覆盖 `:root` 中定义的默认值：

```css
/* :root 中定义默认值 */
:root {
    --el-menu-item-height: var(--component-height-base); /* 40px */
}

/* 尺寸主题类中覆盖 */
.size-lg {
    --el-menu-item-height: var(--component-height-lg); /* 44px */
}
```

### 特异性

`.el-menu-item` 和 `.el-sub-menu__title` 的选择器特异性较低，会被更高特异性的规则覆盖。如果遇到问题，可以使用 `!important` 或提高选择器特异性。

## 相关文件

- `src/assets/tailwind.css` - 主要样式定义
- `src/assets/components/navigation/header-bar-view-tailwind.css` - 头部导航样式
- `src/composables/useSizeTheme.ts` - 尺寸主题 composable
- `src/components/SizeThemeSwitcher.vue` - 尺寸切换组件
