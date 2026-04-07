<template>
  <div class="size-theme-switcher">
    <div class="switcher-header">
      <span class="switcher-title">尺寸主题</span>
      <span class="current-size">{{ currentSizeLabel }}</span>
    </div>

    <div class="size-options">
      <button
        v-for="option in sizeOptions"
        :key="option.value"
        :class="['size-option', { active: currentSize === option.value }]"
        :title="option.label"
        @click="setSize(option.value)"
      >
        <span class="size-dot" :class="option.value"></span>
        <span class="size-name">{{ option.label }}</span>
      </button>
    </div>

    <div class="scale-options" v-if="showScaleOptions">
      <div class="scale-header">全局缩放</div>
      <div class="scale-buttons">
        <button
          :class="['scale-btn', { active: currentScale === 'normal' }]"
          @click="setScale('normal')"
        >
          正常
        </button>
        <button
          :class="['scale-btn', { active: currentScale === 'compact' }]"
          @click="setScale('compact')"
        >
          紧凑
        </button>
        <button
          :class="['scale-btn', { active: currentScale === 'spacious' }]"
          @click="setScale('spacious')"
        >
          宽松
        </button>
      </div>
    </div>

    <div class="preview-area">
      <div class="preview-label">预览</div>
      <div :class="['preview-content', currentSizeClass, currentScaleClass]">
        <el-button type="primary">按钮</el-button>
        <el-input placeholder="输入框" style="width: 150px; margin-left: 8px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import biliMessage from '@/utils/message'

interface SizeOption {
  value: string
  label: string
}

const sizeOptions: SizeOption[] = [
  { value: 'xxs', label: '超超小' },
  { value: 'xs', label: '超小' },
  { value: 'sm', label: '小' },
  { value: 'md', label: '中' },
  { value: 'base', label: '标准' },
  { value: 'lg', label: '大' },
  { value: 'xl', label: '超大' },
  { value: '2xl', label: '超超大' }
]

const currentSize = ref('base')
const currentScale = ref('normal')
const showScaleOptions = ref(true)

const currentSizeLabel = computed(() => {
  const option = sizeOptions.find(opt => opt.value === currentSize.value)
  return option?.label || '标准'
})

const currentSizeClass = computed(() => `size-${currentSize.value}`)
const currentScaleClass = computed(() => {
  return currentScale.value === 'normal' ? '' : `size-${currentScale.value}`
})

const setSize = (size: string) => {
  currentSize.value = size
  document.documentElement.classList.remove(
    'size-xxs',
    'size-xs',
    'size-sm',
    'size-md',
    'size-base',
    'size-lg',
    'size-xl',
    'size-2xl'
  )
  document.documentElement.classList.add(`size-${size}`)
  localStorage.setItem('size-theme', size)
  biliMessage.success(`已切换到${sizeOptions.find(opt => opt.value === size)?.label}尺寸`)
}

const setScale = (scale: 'normal' | 'compact' | 'spacious') => {
  currentScale.value = scale
  document.documentElement.classList.remove('size-compact', 'size-spacious')
  if (scale !== 'normal') {
    document.documentElement.classList.add(`size-${scale}`)
  }
  localStorage.setItem('size-scale', scale)
  biliMessage.success(`已切换到${scale === 'normal' ? '正常' : scale === 'compact' ? '紧凑' : '宽松'}模式`)
}

onMounted(() => {
  // 从 localStorage 恢复设置
  const savedSize = localStorage.getItem('size-theme')
  if (savedSize && sizeOptions.some(opt => opt.value === savedSize)) {
    setSize(savedSize)
  }

  const savedScale = localStorage.getItem('size-scale')
  if (savedScale && ['normal', 'compact', 'spacious'].includes(savedScale)) {
    setScale(savedScale as 'normal' | 'compact' | 'spacious')
  }
})
</script>

<style scoped>
.size-theme-switcher {
  width: 280px;
  padding: var(--spacing-5);
  background: var(--el-bg-color);
  border-radius: var(--size-radius-base);
  box-shadow: var(--el-box-shadow-light);
  border: 1px solid var(--el-border-color-light);
}

.switcher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.switcher-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.current-size {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-secondary);
  padding: var(--spacing-1) var(--spacing-3);
  background: var(--el-fill-color-light);
  border-radius: var(--size-radius-base);
}

.size-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.size-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-3);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--size-radius-base);
  cursor: pointer;
  transition: all var(--transition-fast) var(--transition-timing);
}

.size-option:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.size-option.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.size-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
  transition: all var(--transition-fast) var(--transition-timing);
}

.size-option.active .size-dot {
  background: var(--el-color-primary);
}

.size-option .size-xxs { width: 4px; height: 4px; }
.size-option .size-xs { width: 6px; height: 6px; }
.size-option .size-sm { width: 8px; height: 8px; }
.size-option .size-md { width: 10px; height: 10px; }
.size-option .size-base { width: 12px; height: 12px; }
.size-option .size-lg { width: 14px; height: 14px; }
.size-option .size-xl { width: 16px; height: 16px; }
.size-option .size-2xl { width: 18px; height: 18px; }

.size-name {
  font-size: var(--font-size-xs);
  color: var(--el-text-color-regular);
}

.size-option.active .size-name {
  color: var(--el-color-primary);
  font-weight: 500;
}

.scale-options {
  margin-bottom: var(--spacing-5);
}

.scale-header {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--el-text-color-secondary);
  margin-bottom: var(--spacing-3);
}

.scale-buttons {
  display: flex;
  gap: var(--spacing-2);
}

.scale-btn {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--size-radius-base);
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast) var(--transition-timing);
}

.scale-btn:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.scale-btn.active {
  background: var(--el-color-primary);
  color: var(--el-color-white);
  border-color: var(--el-color-primary);
}

.preview-area {
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--el-border-color-light);
}

.preview-label {
  font-size: var(--font-size-sm);
  color: var(--el-text-color-secondary);
  margin-bottom: var(--spacing-3);
}

.preview-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--el-fill-color-lighter);
  border-radius: var(--size-radius-base);
  transition: all var(--transition-base) var(--transition-timing);
}
</style>
