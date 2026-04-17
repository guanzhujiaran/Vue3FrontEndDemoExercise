<template>
  <el-card class="module-card w-full h-full pb-50 overflow-hidden transition-all duration-300 ease-in-out hover:translate-y-1" :body-style="{ padding: '0px' }" shadow="hover">
    <template #header style="padding: 0">
      <div class="module-header flex items-center gap-6 p-8" :class="getGradientClass(module.color)">
        <el-icon :size="24">
          <component :is="module.icon || ''" />
        </el-icon>
        <h3 class="m-0 text-lg font-semibold">{{ module.title }}</h3>
      </div>
    </template>

    <div class="module-body p-8">
      <p class="module-description mb-8 leading-normal">{{ module.description }}</p>
      <!-- 如果有子项，显示子项列表 -->
      <div v-if="module.children && module.children.length" class="module-children flex flex-col gap-6">
        <div
          v-for="(child, childIndex) in module.children"
          :key="childIndex"
          class="child-item flex items-center rounded p-6 border cursor-pointer transition-all duration-200 ease-in-out border-[var(--el-border-color)]/50 hover:border-[var(--el-border-color)] hover:translate-x-2"
          @click="handleCardClick(child.path, module.requiresLogin)"
        >
          <div class="child-icon flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-white mr-6" :class="getGradientClass(child.color)">
            <el-icon :size="16">
              <component :is="child.icon || ''" />
            </el-icon>
          </div>
          <div class="child-info flex-1">
            <h4 class="m-0 mb-2 text-base font-medium text-current">{{ child.title }}</h4>
            <p class="m-0 text-sm text-current">{{ child.description }}</p>
          </div>
          <el-icon class="arrow-icon text-[var(--el-text-color-placeholder)]">
            <el-icon-arrow-right />
          </el-icon>
        </div>
      </div>

      <!-- 如果没有子项，显示直接访问按钮 -->
      <div v-else class="module-action mt-8 flex justify-center">
        <el-button
          type="primary"
          :plain="true"
          @click="handleCardClick(module.path, module.requiresLogin)"
        >
          立即访问
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ElCard, ElIcon, ElButton } from 'element-plus'
import type { CustomRouteMeta } from '@/models/router'

interface Props {
  module: CustomRouteMeta & {
    path?: string
    children?: (CustomRouteMeta & { path?: string; order?: number })[]
    order?: number
  }
}

interface Emits {
  (e: 'cardClick', path: string | undefined, requiresLogin: boolean | undefined): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleCardClick = (
  path: string | undefined,
  requiresLogin: boolean | undefined = false
) => {
  emit('cardClick', path, requiresLogin)
}

// 将 CSS 变量转换为 Tailwind class
const getGradientClass = (colorValue: string | undefined): string => {
  if (!colorValue) return ''
  
  // 映射 CSS 变量到 Tailwind class
  const gradientMap: Record<string, string> = {
    'var(--gradient-hero-cool)': 'bg-gradient-hero-cool',
    'var(--gradient-hero-vibrant)': 'bg-gradient-hero-vibrant',
    'var(--gradient-hero-warm)': 'bg-gradient-hero-warm',
    'var(--gradient-hero-elegant)': 'bg-gradient-hero-elegant',
    'var(--gradient-hero-primary)': 'bg-gradient-hero-primary',
    'var(--gradient-bili-data)': 'bg-gradient-bili-data',
    'var(--gradient-lottery-item)': 'bg-gradient-lottery-item',
    'var(--gradient-shopping)': 'bg-gradient-shopping',
    'var(--gradient-module-primary)': 'bg-gradient-module-primary',
    'var(--gradient-module-danger)': 'bg-gradient-module-danger',
    'var(--gradient-module-success)': 'bg-gradient-module-success',
    'var(--gradient-module-warning)': 'bg-gradient-module-warning',
    'var(--gradient-module-info)': 'bg-gradient-module-info',
    'var(--gradient-badge-success)': 'bg-gradient-badge-success',
    'var(--gradient-badge-warning)': 'bg-gradient-badge-warning',
    'var(--gradient-badge-info)': 'bg-gradient-badge-info',
    'var(--gradient-badge-primary)': 'bg-gradient-badge-primary',
    'var(--gradient-drawer-dark)': 'bg-gradient-drawer-dark',
    'var(--gradient-text-primary)': 'bg-gradient-text-primary',
    'var(--gradient-text-primary-light)': 'bg-gradient-text-primary-light'
  }
  
  return gradientMap[colorValue] || ''
}
</script>