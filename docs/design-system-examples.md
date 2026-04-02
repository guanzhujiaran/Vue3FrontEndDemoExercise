# 设计系统使用示例

本文档提供设计系统的实际使用示例，帮助您快速上手。

## 基础用法

### 使用 CSS 变量

```vue
<template>
  <div class="my-component">
    这是一个使用设计系统变量的组件
  </div>
</template>

<style scoped>
.my-component {
  /* 使用间距变量 */
  padding: var(--spacing-4);
  margin: var(--spacing-5);

  /* 使用字体大小变量 */
  font-size: var(--font-size-base);

  /* 使用行高变量 */
  line-height: var(--line-height-normal);

  /* 使用圆角变量 */
  border-radius: var(--size-radius-base);

  /* 使用颜色变量 */
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}
</style>
```

## 尺寸主题类使用

### 在容器上应用尺寸主题

```vue
<template>
  <div class="size-lg">
    <!-- 这里的所有组件都使用大尺寸 -->
    <el-button>大按钮</el-button>
    <el-input placeholder="大输入框" />
  </div>

  <div class="size-sm">
    <!-- 这里的所有组件都使用小尺寸 -->
    <el-button>小按钮</el-button>
    <el-input placeholder="小输入框" />
  </div>
</template>
```

### 动态切换尺寸

```vue
<template>
  <div :class="currentSizeClass">
    <el-button>动态尺寸按钮</el-button>
  </div>

  <div>
    <el-button @click="setSize('xs')">超小</el-button>
    <el-button @click="setSize('sm')">小</el-button>
    <el-button @click="setSize('base')">默认</el-button>
    <el-button @click="setSize('lg')">大</el-button>
    <el-button @click="setSize('xl')">超大</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const size = ref('base')

const currentSizeClass = computed(() => `size-${size.value}`)

const setSize = (newSize: string) => {
  size.value = newSize
}
</script>
```

## Element Plus 组件自定义

### 按钮组件

```vue
<template>
  <div>
    <!-- 使用 Element Plus 原生尺寸 -->
    <el-button size="small">小按钮</el-button>
    <el-button>默认按钮</el-button>
    <el-button size="large">大按钮</el-button>

    <!-- 使用设计系统样式 -->
    <el-button class="custom-button">自定义按钮</el-button>
  </div>
</template>

<style scoped>
.custom-button {
  height: var(--component-height-lg);
  padding: 0 var(--component-padding-x-lg);
  font-size: var(--component-font-size-lg);
  border-radius: var(--size-radius-large);
}
</style>
```

### 输入框组件

```vue
<template>
  <div>
    <el-input
      v-model="inputValue"
      placeholder="使用设计系统样式的输入框"
      class="custom-input"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputValue = ref('')
</script>

<style scoped>
.custom-input {
  height: var(--component-height-base);
  border-radius: var(--size-radius-base);
  font-size: var(--component-font-size-base);
}

.custom-input:deep(.el-input__wrapper) {
  border-radius: var(--size-radius-base);
}
</style>
```

### 对话框组件

```vue
<template>
  <el-button @click="dialogVisible = true">打开对话框</el-button>

  <el-dialog
    v-model="dialogVisible"
    title="对话框标题"
    class="custom-dialog"
  >
    <p>这是一个使用设计系统的对话框</p>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="dialogVisible = false">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const dialogVisible = ref(false)
</script>

<style scoped>
.custom-dialog :deep(.el-dialog) {
  border-radius: var(--size-radius-large);
}

.custom-dialog :deep(.el-dialog__header) {
  padding: var(--spacing-5) var(--spacing-6);
}

.custom-dialog :deep(.el-dialog__body) {
  padding: var(--spacing-5) var(--spacing-6);
}
</style>
```

### 卡片组件

```vue
<template>
  <el-card class="custom-card">
    <template #header>
      <div class="card-header">卡片标题</div>
    </template>
    <p>卡片内容</p>
  </el-card>
</template>

<style scoped>
.custom-card {
  border-radius: var(--size-radius-large);
}

.custom-card :deep(.el-card__header) {
  padding: var(--spacing-5) var(--spacing-6);
}

.custom-card :deep(.el-card__body) {
  padding: var(--spacing-6);
}

.card-header {
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: var(--line-height-tight);
}
</style>
```

## 综合示例

### 用户信息卡片

```vue
<template>
  <el-card class="user-card">
    <template #header>
      <div class="user-card-header">
        <div class="user-avatar"></div>
        <div class="user-info">
          <div class="user-name">用户名称</div>
          <div class="user-title">用户职位</div>
        </div>
      </div>
    </template>
    <div class="user-card-body">
      <div class="user-stat">
        <div class="stat-value">128</div>
        <div class="stat-label">关注</div>
      </div>
      <div class="user-stat">
        <div class="stat-value">1.2k</div>
        <div class="stat-label">粉丝</div>
      </div>
      <div class="user-stat">
        <div class="stat-value">56</div>
        <div class="stat-label">动态</div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.user-card {
  border-radius: var(--size-radius-large);
  max-width: 24rem;
}

.user-card :deep(.el-card__header) {
  padding: var(--spacing-5) var(--spacing-6);
}

.user-card :deep(.el-card__body) {
  padding: var(--spacing-6);
}

.user-card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.user-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: var(--size-radius-full);
  background-color: var(--el-fill-color-light);
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: var(--line-height-tight);
  color: var(--el-text-color-primary);
}

.user-title {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  color: var(--el-text-color-secondary);
  margin-top: var(--spacing-1);
}

.user-card-body {
  display: flex;
  justify-content: space-around;
}

.user-stat {
  text-align: center;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 600;
  line-height: var(--line-height-tight);
  color: var(--el-text-color-primary);
}

.stat-label {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  color: var(--el-text-color-secondary);
  margin-top: var(--spacing-1);
}
</style>
```

### 表单区域

```vue
<template>
  <div class="form-container size-lg">
    <h2 class="form-title">用户注册</h2>
    <el-form :model="form" label-width="6rem">
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" type="email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
        />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="submit-button">注册</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})
</script>

<style scoped>
.form-container {
  max-width: 32rem;
  margin: var(--spacing-10) auto;
  padding: var(--spacing-8);
  border-radius: var(--size-radius-large);
  background-color: var(--el-bg-color);
  box-shadow: var(--el-box-shadow);
}

.form-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: var(--line-height-tight);
  color: var(--el-text-color-primary);
  margin: 0 0 var(--spacing-6);
  text-align: center;
}

.submit-button {
  width: 100%;
  height: var(--component-height-lg);
  font-size: var(--component-font-size-lg);
  border-radius: var(--size-radius-base);
}
</style>
```

### 按钮组

```vue
<template>
  <div class="button-group">
    <el-button class="size-xs">超小</el-button>
    <el-button class="size-sm">小</el-button>
    <el-button class="size-base">默认</el-button>
    <el-button class="size-lg">大</el-button>
    <el-button class="size-xl">超大</el-button>
  </div>
</template>

<style scoped>
.button-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}
</style>
```

## 响应式设计

```vue
<template>
  <div :class="sizeClass">
    <el-button>响应式按钮</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const screenWidth = ref(0)

const sizeClass = computed(() => {
  if (screenWidth.value < 768) return 'size-sm'
  if (screenWidth.value < 1024) return 'size-base'
  return 'size-lg'
})

const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth
}

onMounted(() => {
  updateScreenWidth()
  window.addEventListener('resize', updateScreenWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenWidth)
})
</script>
```

## 动画过渡

```vue
<template>
  <div class="animated-box" @click="isExpanded = !isExpanded">
    {{ isExpanded ? '收起' : '展开' }}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isExpanded = ref(false)
</script>

<style scoped>
.animated-box {
  width: 10rem;
  padding: var(--spacing-4);
  background-color: var(--el-color-primary);
  color: var(--el-color-white);
  border-radius: var(--size-radius-base);
  cursor: pointer;
  transition: all var(--transition-base) var(--transition-timing);
}

.animated-box:hover {
  background-color: var(--el-color-primary-dark-2);
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow-light);
}

.animated-box:active {
  transform: translateY(0);
}
</style>
```

## 最佳实践

1. **始终使用 CSS 变量**，避免硬编码像素值
2. **使用尺寸主题类**来统一管理组件尺寸
3. **遵循 4px 基准**，确保视觉一致性
4. **注意响应式**，在不同屏幕尺寸下使用合适的尺寸
5. **保持可访问性**，确保最小点击目标尺寸
6. **使用过渡动画**提升用户体验
