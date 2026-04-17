# 混合色变量系统

## 概述

本文档描述了在 `src/assets/tailwind.css` 中定义的混合色变量系统，主要用于 Module Card、Hero Banner 和其他组件的渐变背景。

### 最新更新

- ✅ 添加了 20+ 个渐变变量，覆盖 Module Card、Hero Banner、徽章、文本等场景
- ✅ 更新了所有路由配置中的硬编码渐变色为变量引用
- ✅ 更新了 HomeView.vue、HeroBanner.vue、BiliAtariRanking.vue 等组件
- ✅ 更新了 GlobalConfigManagement.vue 中的徽章样式
- ✅ 更新了 bili-lottery-data-tailwind.css 中的文本渐变
- ✅ 所有渐变变量都支持亮色和暗色模式

## 变量分类

### 1. Module Card 渐变背景色

用于模块卡片的头部背景渐变效果：

- `--gradient-module-primary`: 主色调渐变（primary → info）
- `--gradient-module-danger`: 危险色调渐变（danger → warning）
- `--gradient-module-success`: 成功色调渐变（success → primary）
- `--gradient-module-warning`: 警告色调渐变（warning → danger）
- `--gradient-module-info`: 信息色调渐变（info → primary）

### 2. Hero Banner 渐变背景色

用于首页横幅的背景渐变效果：

- `--gradient-hero-primary`: 主横幅渐变（primary → warning → success → info）
- `--gradient-hero-vibrant`: 活力渐变（danger → primary → info）
- `--gradient-hero-warm`: 温暖渐变（danger → warning → info → success）
- `--gradient-hero-cool`: 冷静渐变（primary → info → warning → danger）
- `--gradient-hero-elegant`: 优雅渐变（warning → success → primary → info）

### 3. 其他常用渐变

- `--gradient-bili-data`: B站数据专用渐变
- `--gradient-lottery-item`: 抽奖项通用渐变
- `--gradient-shopping`: 购物相关渐变

### 4. 特殊用途渐变

- `--gradient-drawer-dark`: Drawer 深色背景渐变（black → info）

### 5. 徽章渐变

用于状态徽章和标签的渐变效果：

- `--gradient-badge-success`: 成功状态徽章渐变
- `--gradient-badge-warning`: 警告状态徽章渐变
- `--gradient-badge-info`: 信息状态徽章渐变
- `--gradient-badge-primary`: 主要状态徽章渐变

### 6. 文本渐变

用于文本的渐变效果（配合 `background-clip: text` 使用）：

- `--gradient-text-primary`: 主要文本渐变（亮色模式）
- `--gradient-text-primary-light`: 主要文本渐变（暗色模式）

## 使用示例

### 在 Vue 组件中使用

```vue
<template>
  <!-- Module Card 头部 -->
  <div class="module-header" :style="{ background: '--gradient-module-primary' }">
    <!-- 内容 -->
  </div>
  
  <!-- Hero Banner -->
  <section class="hero-banner" :style="{ background: '--gradient-hero-primary' }">
    <!-- 内容 -->
  </section>
</template>
```

### 在 CSS 中使用

```css
.module-header {
  background: var(--gradient-module-primary);
}

.hero-banner {
  background: var(--gradient-hero-vibrant);
}
```

## 设计原则

1. **一致性**: 所有渐变都基于 Element Plus 的主题色变量
2. **响应式**: 支持亮色和暗色模式自动适配
3. **可扩展**: 易于添加新的渐变色组合
4. **语义化**: 变量命名清晰表达用途和颜色特征

## 路由配置中的颜色映射

在 `src/router/index.ts` 中，所有硬编码的渐变色已替换为变量：

### 路由模块颜色映射表

| 路由模块 | 使用的渐变变量 | 说明 |
|---------|--------------|------|
| 反馈区 (feedback) | `--gradient-hero-cool` | 冷静渐变 |
| B站抽奖数据 (lottery) | `--gradient-hero-vibrant` | 活力渐变 |
| 抽奖数据首页 | `--gradient-hero-warm` | 温暖渐变 |
| 爬虫状态 | `--gradient-hero-warm` | 温暖渐变 |
| B站中奖名人堂 | `--gradient-hero-elegant` | 优雅渐变 |
| B站抽奖数据汇总 | `--gradient-bili-data` | 专用数据渐变 |
| 官方/预约/充电/话题抽奖 | `--gradient-lottery-item` | 抽奖项通用渐变 |
| 山姆会员店 | `--gradient-shopping` | 购物相关渐变 |
| 用户中心 | `--gradient-hero-cool` | 冷静渐变 |

### Module Card 子项颜色建议

对于 Module Card 的子项（child items），可以使用以下渐变：

- 主要功能: `--gradient-module-primary`
- 数据分析: `--gradient-module-danger`
- 成功状态: `--gradient-module-success`
- 警告提示: `--gradient-module-warning`
- 信息展示: `--gradient-module-info`

## 注意事项

- 所有渐变变量都在 `:root` 和 `.dark` 选择器中定义，确保主题切换时正常工作
- 渐变角度和颜色停止点经过精心设计，以提供最佳的视觉效果
- 可以根据具体需求调整渐变的颜色和角度
