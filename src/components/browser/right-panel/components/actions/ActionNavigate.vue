<template>
  <div class="action-navigate rounded-lg border border-[var(--el-border-color-lighter)] overflow-hidden" :class="{ 'opacity-50': disabled }">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--el-border-color-lighter)] bg-blue-50/50">
      <div class="w-6 h-6 rounded flex items-center justify-center bg-blue-100 text-blue-600"><el-icon :size="13"><Position /></el-icon></div>
      <span class="text-xs font-semibold">页面导航</span>
      <el-tag size="small" effect="plain" class="!text-[10px] !ml-auto">navigate</el-tag>
      <el-tag size="small" type="info" effect="plain" class="!text-[10px]">导航</el-tag>
    </div>

    <div :class="compact ? 'p-2 space-y-1.5' : 'p-3 space-y-3'">
      <div>
        <label class="text-[11px] text-[var(--el-text-color-secondary)] font-medium block mb-1">
          目标 URL <span v-if="!compact" class="text-red-400">*</span>
        </label>
        <el-input :model-value="params.url" placeholder="https://example.com" clearable size="small"
          @update:model-value="$emit('update:params', { ...params, url: $event })">
          <template #prefix><el-icon :size="14" class="text-blue-500"><Link /></el-icon></template>
        </el-input>
        <p v-if="!compact" class="text-[10px] text-[var(--l-text-color-placeholder)] m-0 mt-1">输入要导航到的完整 URL 地址</p>
      </div>

      <div v-if="!compact" class="flex items-center gap-2">
        <el-switch :model-value="!!params.new_tab" size="small"
          @change="$emit('update:params', { ...params, new_tab: $event })" />
        <span class="text-xs text-[var(--el-text-color-secondary)]">在新标签页中打开</span>
      </div>

      <el-button v-if="!disabled && (!compact || !params.url)" type="primary" size="small" :loading="executing"
        :class="compact ? 'w-full mt-1' : ''" @click="$emit('execute')">
        <el-icon><VideoPlay /></el-icon> {{ executing ? '导航中...' : '执行导航' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Position, Link, VideoPlay } from '@element-plus/icons-vue'

defineProps<{
  params: Record<string, any>
  disabled?: boolean
  compact?: boolean
  executionResult?: { success: boolean | null; error?: string; result?: any; duration: number } | null
  executing?: boolean
}>()

defineEmits<{ 'update:params': [value: Record<string, any>]; execute: [] }>()
</script>
