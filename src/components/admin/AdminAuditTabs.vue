<template>
  <div class="admin-audit-tabs flex items-center justify-between">
    <h2 class="admin-audit-tabs__title text-lg font-bold text-text-primary">{{ title }}</h2>
    <div class="admin-audit-tabs__right flex items-center gap-3">
      <!-- 状态 Tab：待审核 / 已过审 / 已驳回（懒加载 + 缓存），具体文案由 tabs prop 决定 -->
      <el-tabs v-model="activeTab" class="admin-audit-tabs__tabs">
        <el-tab-pane
          v-for="tab in tabs"
          :key="tab.name"
          :label="tab.label"
          :name="tab.name"
        />
      </el-tabs>
      <slot name="extra" />
      <el-button
        class="admin-audit-tabs__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="emit('refresh')"
      >
        刷新
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'

defineProps<{
  /** 页面标题（如「动态审核队列」「举报审核」） */
  title: string
  /** 状态 Tab 配置（name 同时作为状态筛选值传给后端） */
  tabs: Array<{ name: string; label: string }>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const activeTab = defineModel<string>({ required: true })
</script>
