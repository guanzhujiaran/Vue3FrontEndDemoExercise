# 设计系统 Design System

本文档定义了项目的统一设计系统，包括字体大小、间距、圆角、组件尺寸等规范。

## 📐 尺寸系统

### 基础单位
- **基础单位**: `4px` (`0.25rem`)
- 所有尺寸都是基础单位的倍数，确保视觉一致性

### 间距系统 (Spacing)

| 变量名 | 值 | 像素 | 用途 |
|--------|------|------|------|
| `--spacing-0` | 0 | 0px | 无间距 |
| `--spacing-1` | 0.25rem | 4px | 极小间距 |
| `--spacing-2` | 0.5rem | 8px | 小间距 |
| `--spacing-3` | 0.75rem | 12px | 次小间距 |
| `--spacing-4` | 1rem | 16px | 标准间距 (默认) |
| `--spacing-5` | 1.25rem | 20px | 次大间距 |
| `--spacing-6` | 1.5rem | 24px | 大间距 |
| `--spacing-7` | 1.75rem | 28px | 超大间距 |
| `--spacing-8` | 2rem | 32px | 区块间距 |
| `--spacing-10` | 2.5rem | 40px | 区块间距 |
| `--spacing-12` | 3rem | 48px | 区块间距 |
| `--spacing-16` | 4rem | 64px | 页面间距 |
| `--spacing-20` | 5rem | 80px | 页面间距 |

### 圆角系统 (Border Radius)

| 变量名 | 值 | 像素 | 用途 |
|--------|------|------|------|
| `--size-radius-base` | 0.5rem | 8px | 默认圆角 |
| `--size-radius-large` | 0.75rem | 12px | 大圆角 |
| `--size-radius-full` | 9999px | 完全圆角 | 圆形 |

### 字体大小系统 (Font Size)

| 变量名 | 值 | 像素 | 用途 |
|--------|------|------|------|
| `--font-size-xs` | 0.75rem | 12px | 极小文字 |
| `--font-size-sm` | 0.875rem | 14px | 小文字 |
| `--font-size-base` | 1rem | 16px | 正文 (默认) |
| `--font-size-lg` | 1.125rem | 18px | 小标题 |
| `--font-size-xl` | 1.25rem | 20px | 标题 |
| `--font-size-2xl` | 1.5rem | 24px | 大标题 |
| `--font-size-3xl` | 1.875rem | 30px | 超大标题 |
| `--font-size-4xl` | 2.25rem | 36px | 特大标题 |

### 行高系统 (Line Height)

| 变量名 | 值 | 用途 |
|--------|------|------|
| `--line-height-none` | 1 | 无行高 |
| `--line-height-tight` | 1.25 | 紧凑行高 |
| `--line-height-snug` | 1.375 | 较紧行高 |
| `--line-height-normal` | 1.5 | 正常行高 (默认) |
| `--line-height-relaxed` | 1.625 | 宽松行高 |
| `--line-height-loose` | 2 | 宽行高 |

## 🎨 组件尺寸系统

### 组件高度 (Component Height)

| 尺寸 | 变量名 | 值 | 像素 | 用途 |
|------|--------|------|------|------|
| XS | `--component-height-xs` | 1.75rem | 28px | 超小组件 |
| SM | `--component-height-sm` | 2rem | 32px | 小组件 |
| Base | `--component-height-base` | 2.25rem | 36px | 默认组件 |
| LG | `--component-height-lg` | 2.5rem | 40px | 大组件 |
| XL | `--component-height-xl` | 2.75rem | 44px | 超大组件 |

### 组件内边距 (Component Padding)

| 尺寸 | 变量名 | 值 | 像素 |
|------|--------|------|------|
| XS | `--component-padding-x-xs` | 0.5rem | 8px |
| SM | `--component-padding-x-sm` | 0.625rem | 10px |
| Base | `--component-padding-x-base` | 0.75rem | 12px |
| LG | `--component-padding-x-lg` | 0.875rem | 14px |
| XL | `--component-padding-x-xl` | 1rem | 16px |

### 组件字体大小 (Component Font Size)

| 尺寸 | 变量名 | 值 | 像素 |
|------|--------|------|------|
| XS | `--component-font-size-xs` | 0.75rem | 12px |
| SM | `--component-font-size-sm` | 0.8125rem | 13px |
| Base | `--component-font-size-base` | 0.875rem | 14px |
| LG | `--component-font-size-lg` | 0.9375rem | 15px |
| XL | `--component-font-size-xl` | 1rem | 16px |

### 图标尺寸 (Icon Size)

| 尺寸 | 变量名 | 值 | 像素 |
|------|--------|------|------|
| XS | `--icon-size-xs` | 0.875rem | 14px |
| SM | `--icon-size-sm` | 1rem | 16px |
| Base | `--icon-size-base` | 1.125rem | 18px |
| LG | `--icon-size-lg` | 1.25rem | 20px |
| XL | `--icon-size-xl` | 1.5rem | 24px |

## 📦 尺寸主题类

设计系统提供了 8 种尺寸主题类，以及 3 种全局缩放模式，满足不同场景的需求。

### 尺寸主题类

#### size-xxs (超超小)
- 组件高度: 24px
- 间距: 8px
- 字体: 11px
- 内边距: 6px
- **适用场景**: 极致紧凑布局、移动端、信息密度极高的场景

#### size-xs (超小)
- 组件高度: 28px
- 间距: 12px
- 字体: 12px
- 内边距: 8px
- **适用场景**: 紧凑布局、小屏幕、表格中的操作按钮

#### size-sm (小)
- 组件高度: 32px
- 间距: 16px
- 字体: 13px
- 内边距: 10px
- **适用场景**: 空间有限的情况、次级操作

#### size-md (中)
- 组件高度: 36px
- 间距: 16px
- 字体: 14px
- 内边距: 12px
- **适用场景**: 中等大小的组件、平衡空间和可点击性

#### size-base (标准)
- 组件高度: 40px
- 间距: 20px
- 字体: 15px
- 内边距: 14px
- **适用场景**: 标准情况、推荐使用、桌面端默认尺寸

#### size-lg (大)
- 组件高度: 44px
- 间距: 24px
- 字体: 16px
- 内边距: 16px
- **适用场景**: 重要操作、需要突出显示、主按钮

#### size-xl (超大)
- 组件高度: 48px
- 间距: 28px
- 字体: 18px
- 内边距: 18px
- **适用场景**: 强调展示、主要操作、桌面端重点功能

#### size-2xl (超超大)
- 组件高度: 56px
- 间距: 32px
- 字体: 20px
- 内边距: 20px
- **适用场景**: Hero 区域、超大型操作按钮、特殊展示区域

### 全局缩放模式

#### 正常模式 (normal)
- 默认模式，使用标准尺寸
- 无需额外类名

#### 紧凑模式 (compact)
- 所有尺寸缩小 10%
- 类名: `size-compact`
- **适用场景**: 需要在有限空间内展示更多内容

#### 宽松模式 (spacious)
- 所有尺寸放大 10%
- 类名: `size-spacious`
- **适用场景**: 大屏幕设备、需要更好的视觉呼吸感

### 使用方式

#### 全局尺寸主题（推荐）

```vue
<template>
  <div>
    <!-- 方式 1: 使用 composable -->
    <button @click="setTheme('lg')">切换到大尺寸</button>

    <!-- 方式 2: 直接添加类名 -->
    <div :class="`size-${currentSize}`">
      <el-button>按钮</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSizeTheme } from '@/composables/useSizeTheme'

const { currentSize, setSize } = useSizeTheme()

const setTheme = (size) => {
  setSize(size) // 会自动应用到整个页面
}
</script>
```

#### 局部尺寸主题

```vue
<template>
  <div>
    <!-- 全局使用标准尺寸 -->
    <el-button>标准按钮</el-button>

    <!-- 局部使用大尺寸 -->
    <div class="size-lg">
      <el-button>大按钮</el-button>
    </div>
  </div>
</template>
```

#### 组合使用（全局缩放 + 局部尺寸）

```vue
<template>
  <!-- 全局使用紧凑模式 -->
  <div class="size-compact">
    <!-- 大部分组件都会缩小 10% -->

    <!-- 某个特定区域使用大尺寸 -->
    <div class="size-lg">
      <el-button>相对大按钮</el-button>
    </div>
  </div>
</template>
```

### 尺寸选择建议

| 场景 | 推荐尺寸 | 缩放模式 |
|------|----------|----------|
| 移动端主界面 | sm | normal |
| 桌面端主界面 | base | normal |
| 信息密集型页面 | xs | compact |
| 宽屏展示页面 | lg | spacious |
| 表格操作列 | xxs | normal |
| 主按钮/CTA | xl | normal |
| Hero 区域 | 2xl | spacious |
| 表单输入 | md/base | normal |
| 导航菜单 | sm | normal |
| 工具栏按钮 | xs | compact |

## 🎯 使用指南

### 在 Vue 组件中使用

```vue
<template>
  <div class="size-lg">
    <!-- 这里的组件将使用大尺寸 -->
    <el-button>按钮</el-button>
  </div>
</template>
```

### 在 CSS 中使用变量

```css
.my-component {
  padding: var(--spacing-4);
  border-radius: var(--size-radius-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
}
```

### 使用 Tailwind 类

```vue
<template>
  <!-- 使用间距 -->
  <div class="p-4">padding: var(--spacing-4)</div>
  <div class="m-4">margin: var(--spacing-4)</div>

  <!-- 使用字体大小 -->
  <div class="text-sm">font-size: var(--font-size-sm)</div>
  <div class="text-base">font-size: var(--font-size-base)</div>

  <!-- 使用圆角 -->
  <div class="rounded-lg">border-radius: var(--size-radius-large)</div>
</template>
```

## 🧩 Element Plus 组件覆盖

设计系统已覆盖以下 Element Plus 组件的默认样式：

- ✅ 按钮
- ✅ 输入框
- ✅ 选择器
- ✅ 对话框
- ✅ 卡片
- ✅ 消息提示
- ✅ 通知
- ✅ 抽屉
- ✅ 弹出框
- ✅ 下拉菜单
- ✅ 分页
- ✅ 标签
- ✅ 进度条
- ✅ 开关
- ✅ 滑块
- ✅ 表格
- ✅ 消息框
- ✅ 加载
- ✅ 菜单
- ✅ 面包屑
- ✅ 链接
- ✅ 表单

## ⚡ 过渡动画

| 变量名 | 值 | 用途 |
|--------|------|------|
| `--transition-fast` | 150ms | 快速过渡 |
| `--transition-base` | 250ms | 标准过渡 |
| `--transition-slow` | 350ms | 慢速过渡 |
| `--transition-timing` | cubic-bezier(0.4, 0, 0.2, 1) | 缓动函数 |

## 🌓 暗黑模式

设计系统已完整支持暗黑模式，所有颜色变量在 `.dark` 类下都有对应的暗黑模式值。

## 📝 最佳实践

1. **优先使用 CSS 变量**: 使用设计系统定义的变量而不是硬编码的像素值
2. **保持一致性**: 相同类型的组件使用相同的尺寸
3. **响应式设计**: 小屏幕使用较小尺寸，大屏幕使用较大尺寸
4. **可访问性**: 确保最小点击目标尺寸为 32px × 32px
5. **间距规律**: 遵循 4px 基准，使用倍数关系

## 🔧 自定义

如果需要自定义设计系统，请直接在 `src/assets/tailwind.css` 文件中修改对应的 CSS 变量值。

## 📚 相关资源

- [Tailwind CSS](https://tailwindcss.com/)
- [Element Plus](https://element-plus.org/)
- [Design Systems](https://www.designsystems.com/)
