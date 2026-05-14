<template>
  <div class="action-new-page rounded-lg border border-[var(--el-border-color-lighter)] overflow-hidden" :class="{ 'opacity-50': disabled }">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--el-border-color-lighter)] bg-emerald-50/50">
      <div class="w-6 h-6 rounded flex items-center justify-center bg-emerald-100 text-emerald-600"><el-icon :size="13"><Document /></el-icon></div>
      <span class="text-xs font-semibold">新建页面</span>
      <el-tag size="small" type="success" effect="plain" class="!text-[10px] !ml-auto">new_page</el-tag>
      <el-tag size="small" type="info" effect="plain" class="!text-[10px]">标签页</el-tag>
    </div>

    <div :class="compact ? 'p-2 space-y-1.5' : 'p-3 space-y-3'">
      <div>
        <label class="text-[11px] text-[var(--el-text-color-secondary)] font-medium block mb-1">
          打开 URL
        </label>
        <el-input :model-value="params.url" placeholder="https://example.com（可选）" clearable size="small"
          @update:model-value="$emit('update:params', { ...params, url: $event })">
          <template #prefix><el-icon :size="14" class="text-emerald-500"><Link /></el-icon></template>
        </el-input>
        <p v-if="!compact" class="text-[10px] text-[var(--l-text-color-placeholder)] m-0 mt-1">输入要在新标签页中打开的 URL，留空则创建空白页</p>
      </div>

      <el-button v-if="!disabled && (!compact || !params.url)" type="success" size="small" :loading="executing"
        :class="compact ? 'w-full mt-1' : ''" @click="$emit('execute')">
        <el-icon><VideoPlay /></el-icon> {{ executing ? '创建中...' : '新建页面' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Document, Link, VideoPlay } from '@element-plus/icons-vue'

defineProps<{
  params: Record<string, any>
  disabled?: boolean
  compact?: boolean
  executionResult?: { success: boolean | null; error?: string; result?: any; duration: number } | null
  executing?: boolean
}>()

defineEmits<{ 'update:params': [value: Record<string, any>]; execute: [] }>()
</script>
