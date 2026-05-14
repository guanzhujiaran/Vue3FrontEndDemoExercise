<template>
  <div class="action-navigate-back rounded-lg border border-[var(--el-border-color-lighter)] overflow-hidden" :class="{ 'opacity-50': disabled }">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--el-border-color-lighter)] bg-orange-50/50">
      <div class="w-6 h-6 rounded flex items-center justify-center bg-orange-100 text-orange-600"><el-icon :size="13"><Back /></el-icon></div>
      <span class="text-xs font-semibold">返回上一页</span>
      <el-tag size="small" type="warning" effect="plain" class="!text-[10px] !ml-auto">navigate_back</el-tag>
      <el-tag size="small" type="info" effect="plain" class="!text-[10px]">历史</el-tag>
    </div>

    <div :class="compact ? 'p-2 space-y-1.5' : 'p-3 space-y-3'">
      <div v-if="!compact">
        <label class="text-[11px] text-[var(--el-text-color-secondary)] font-medium block mb-1">
          返回步数
        </label>
        <el-input-number :model-value="params.step ?? -1" :min="-100" :max="100" size="small" controls-position="right"
          @change="$emit('update:params', { ...params, step: $event ?? -1 })" />
        <p class="text-[10px] text-[var(--l-text-color-placeholder)] m-0 mt-1">负数表示向后返回，正数表示向前前进</p>
      </div>

      <div v-if="compact" class="flex items-center gap-2">
        <el-select :model-value="params.step ?? -1" size="small" style="width: 120px"
          @change="$emit('update:params', { ...params, step: $event ?? -1 })">
          <el-option label="后退 1 步" :value="-1" />
          <el-option label="后退 2 步" :value="-2" />
          <el-option label="后退 3 步" :value="-3" />
          <el-option label="前进 1 步" :value="1" />
          <el-option label="前进 2 步" :value="2" />
        </el-select>
        <span class="text-xs text-[var(--el-text-color-secondary)]">步</span>
      </div>

      <el-button v-if="!disabled" type="warning" size="small" :loading="executing"
        :class="compact ? 'w-full mt-1' : ''" @click="$emit('execute')">
        <el-icon><Back /></el-icon> {{ executing ? '跳转中...' : '执行返回' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Back, VideoPlay } from '@element-plus/icons-vue'

defineProps<{
  params: Record<string, any>
  disabled?: boolean
  compact?: boolean
  executionResult?: { success: boolean | null; error?: string; result?: any; duration: number } | null
  executing?: boolean
}>()

defineEmits<{ 'update:params': [value: Record<string, any>]; execute: [] }>()
</script>
