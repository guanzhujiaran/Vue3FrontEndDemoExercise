<template>
  <el-card class="module-card" :body-style="{ padding: '0px' }" shadow="hover">
    <template #header style="padding: 0">
      <div class="module-header" :style="{ backgroundColor: module.color }">
        <el-icon :size="24">
          <component :is="module.icon || ''" />
        </el-icon>
        <h3>{{ module.title }}</h3>
      </div>
    </template>

    <div class="module-body">
      <p class="module-description">{{ module.description }}</p>
      <!-- 如果有子项，显示子项列表 -->
      <div v-if="module.children && module.children.length" class="module-children">
        <div
          v-for="(child, childIndex) in module.children"
          :key="childIndex"
          class="child-item"
          @click="handleCardClick(child.path, module.requiresLogin)"
        >
          <div class="child-icon" :style="{ backgroundColor: child.color }">
            <el-icon :size="16">
              <component :is="child.icon || ''" />
            </el-icon>
          </div>
          <div class="child-info">
            <h4>{{ child.title }}</h4>
            <p>{{ child.description }}</p>
          </div>
          <el-icon class="arrow-icon">
            <el-icon-arrow-right />
          </el-icon>
        </div>
      </div>

      <!-- 如果没有子项，显示直接访问按钮 -->
      <div v-else class="module-action">
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
import { ArrowRight as ElIconArrowRight } from '@element-plus/icons-vue'
import type { CustomRouteMeta } from '@/router'

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
</script>

<style scoped>
.module-card {
  overflow: hidden;
  transition: all 0.3s ease;
}

.module-card:hover {
  transform: translateY(5px);
}

.module-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.module-body {
  padding: 20px;
}

.module-description {
  margin-bottom: 20px;
  line-height: 1.5;
}

.module-children {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.child-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
  opacity: 0.5;
}

.child-item:hover {
  opacity: 1;
  transform: translateX(5px);
}

.child-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 12px;
  flex-shrink: 0;
}

.child-info {
  flex: 1;
}

.child-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
}

.child-info p {
  margin: 0;
  font-size: 12px;
}

.arrow-icon {
  color: #c0c4cc;
}

.module-action {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>