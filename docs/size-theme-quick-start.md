# 尺寸主题快速入门

本文档提供尺寸主题系统的快速入门指南。

## 🚀 快速开始

### 1. 基础使用

#### 全局切换尺寸

```vue
<template>
  <div>
    <button @click="setSize('lg')">切换到大尺寸</button>
    <button @click="setSize('sm')">切换到小尺寸</button>

    <el-button>这个按钮会随全局尺寸变化</el-button>
  </div>
</template>

<script setup lang="ts">
import { useSizeTheme } from '@/composables/useSizeTheme'

const { setSize } = useSizeTheme()
</script>
```

#### 局部使用尺寸

```vue
<template>
  <div>
    <div class="size-xs">
      <el-button>超小按钮</el-button>
    </div>
    <div class="size-lg">
      <el-button>大按钮</el-button>
    </div>
  </div>
</template>
```

### 2. 使用尺寸切换组件

```vue
<template>
  <div>
    <SizeThemeSwitcher />
  </div>
</template>

<script setup lang="ts">
import SizeThemeSwitcher from '@/components/SizeThemeSwitcher.vue'
</script>
```

### 3. 全局缩放模式

```vue
<template>
  <div class="size-compact">
    <!-- 所有组件缩小 10% -->
    <el-button>紧凑模式按钮</el-button>
  </div>
</template>
```

## 📋 尺寸对照表

| 尺寸 | 高度 | 间距 | 字体 | 内边距 | 适用场景 |
|------|------|------|------|--------|----------|
| xxs | 24px | 8px | 11px | 6px | 极致紧凑、移动端 |
| xs | 28px | 12px | 12px | 8px | 紧凑布局、表格 |
| sm | 32px | 16px | 13px | 10px | 空间有限、次级操作 |
| md | 36px | 16px | 14px | 12px | 中等组件 |
| base | 40px | 20px | 15px | 14px | 标准推荐 |
| lg | 44px | 24px | 16px | 16px | 重要操作 |
| xl | 48px | 28px | 18px | 18px | 强调展示 |
| 2xl | 56px | 32px | 20px | 20px | Hero 区域 |

## 🎯 Element Plus 组件响应

以下 Element Plus 组件已完全支持尺寸主题响应：

- ✅ 按钮
- ✅ 输入框
- ✅ 选择器
- ✅ **菜单**
- ✅ 对话框
- ✅ 卡片
- ✅ 下拉菜单
- ✅ 分页
- ✅ 标签
- ✅ 表格
- ✅ 表单
- ✅ 其他更多组件...

**特别说明**: 菜单组件现在会根据尺寸主题自动调整：
- 菜单项高度
- 菜单项字体大小
- 菜单内边距
- 菜单间距

## 🎯 常见场景示例

### 场景 1: 响应式尺寸

```vue
<template>
  <div :class="sizeClass">
    <el-button>按钮</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const isMobile = ref(window.innerWidth < 768)

const sizeClass = computed(() => {
  return isMobile.value ? 'size-sm' : 'size-base'
})
</script>
```

### 场景 2: 表单区域

```vue
<template>
  <div class="size-lg">
    <el-form :model="form">
      <el-form-item label="用户名">
        <el-input v-model="form.username" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" />
      </el-form-item>
      <el-button type="primary">提交</el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  username: '',
  email: ''
})
</script>
```

### 场景 3: 表格操作列

```vue
<template>
  <el-table :data="tableData">
    <el-table-column prop="name" label="名称" />
    <el-table-column prop="age" label="年龄" />
    <el-table-column label="操作">
      <template #default>
        <div class="size-xs">
          <el-button size="small">编辑</el-button>
          <el-button size="small" type="danger">删除</el-button>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
const tableData = [
  { name: '张三', age: 25 },
  { name: '李四', age: 30 }
]
</script>
```

### 场景 4: 主按钮强调

```vue
<template>
  <div class="size-base">
    <el-button>普通按钮</el-button>

    <div class="size-xl" style="display: inline-block; margin-left: 8px">
      <el-button type="primary" size="large">主要操作</el-button>
    </div>
  </div>
</template>
```

### 场景 5: Hero 区域

```vue
<template>
  <div class="size-2xl">
    <h1>欢迎使用我们的产品</h1>
    <el-button type="primary" size="large">立即开始</el-button>
  </div>
</template>

<style scoped>
h1 {
  font-size: var(--font-size-4xl);
  font-weight: 700;
  margin-bottom: var(--spacing-8);
}
</style>
```

## 🔧 Composable API

### useSizeTheme

全局尺寸主题管理。

```typescript
import { useSizeTheme } from '@/composables/useSizeTheme'

const {
  currentSize,      // 当前尺寸
  currentScale,     // 当前缩放模式
  sizeClass,        // 尺寸类名
  scaleClass,       // 缩放类名
  getSizeLabel,     // 获取尺寸标签
  setSize,          // 设置尺寸
  setScale,         // 设置缩放
  resetTheme,       // 重置主题
  getConfig,        // 获取配置
  setConfig         // 设置配置
} = useSizeTheme()
```

### useLocalSizeTheme

局部尺寸主题管理。

```typescript
import { useLocalSizeTheme } from '@/composables/useSizeTheme'

const {
  localSize,        // 局部尺寸
  setLocalSize,     // 设置局部尺寸
  localSizeClass    // 局部尺寸类名
} = useLocalSizeTheme('lg')  // 初始尺寸
```

## 💡 最佳实践

### 1. 优先使用全局主题

```vue
<!-- ✅ 推荐: 全局设置 -->
<script setup>
const { setSize } = useSizeTheme()
setSize('lg')
</script>

<!-- ❌ 不推荐: 到处添加类名 -->
<div class="size-lg">
  <el-button>按钮</el-button>
</div>
```

### 2. 混合使用全局和局部

```vue
<template>
  <!-- 全局紧凑模式 -->
  <div class="size-compact">
    <!-- 大部分组件 -->
    <el-button>普通按钮</el-button>

    <!-- 特殊区域使用大尺寸 -->
    <div class="size-xl">
      <el-button type="primary">重要操作</el-button>
    </div>
  </div>
</template>
```

### 3. 响应式设计

```vue
<template>
  <div :class="responsiveSizeClass">
    <el-button>按钮</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const screenWidth = ref(0)

onMounted(() => {
  screenWidth.value = window.innerWidth
  window.addEventListener('resize', () => {
    screenWidth.value = window.innerWidth
  })
})

const responsiveSizeClass = computed(() => {
  if (screenWidth.value < 480) return 'size-xs'
  if (screenWidth.value < 768) return 'size-sm'
  if (screenWidth.value < 1024) return 'size-base'
  return 'size-lg'
})
</script>
```

### 4. 持久化用户偏好

```vue
<script setup lang="ts">
import { useSizeTheme } from '@/composables/useSizeTheme'

// 用户偏好会自动保存到 localStorage
const { setSize, setScale } = useSizeTheme()

// 这些设置会在页面刷新后自动恢复
setSize('lg')
setScale('spacious')
</script>
```

### 5. 重置主题

```vue
<template>
  <button @click="resetToDefault">重置为默认</button>
</template>

<script setup lang="ts">
import { useSizeTheme } from '@/composables/useSizeTheme'

const { resetTheme } = useSizeTheme()

const resetToDefault = () => {
  resetTheme()  // 重置为 base 和 normal
}
</script>
```

## 🎨 实际项目集成

### 在 main.ts 中初始化

```typescript
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 初始化尺寸主题（可选，会自动从 localStorage 加载）
app.mount('#app')
```

### 在布局组件中使用

```vue
<!-- AppLayout.vue -->
<template>
  <div class="app-layout">
    <header class="header">
      <HeaderBar />
    </header>

    <main class="main">
      <RouterView />
    </main>

    <footer class="footer">
      <FooterBar />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSizeTheme } from '@/composables/useSizeTheme'

onMounted(() => {
  // 应用保存的尺寸主题
  useSizeTheme()
})
</script>
```

## 📚 相关文档

- [设计系统完整文档](./design-system.md)
- [设计系统使用示例](./design-system-examples.md)
