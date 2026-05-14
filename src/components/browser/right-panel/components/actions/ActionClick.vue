<template>
  <div class="action-click" :class="{ 'compact-mode': compact }">
    <div class="action-header bg-green-500/10 border-b border-green-500/20 px-3 py-2 flex items-center gap-2 rounded-t-md" :class="compact ? '!py-1 !px-2' : ''">
      <span class="text-lg">🖱</span>
      <span class="font-semibold text-green-600 text-sm" :class="compact ? '!text-xs' : ''">点击元素</span>
    </div>

    <div class="action-body p-3 space-y-3 bg-white dark:bg-gray-800 rounded-b-md border border-t-0 border-gray-200 dark:border-gray-700" :class="compact ? '!p-2 !space-y-2' : ''">

      <div v-if="!compact || true" class="flex gap-1.5 items-start">
        <el-input
          v-model="params.selector"
          placeholder="CSS 选择器, 如 #id .class"
          clearable
          size="default"
          :class="compact ? 'flex-1 !text-xs' : 'flex-1'"
        >
          <template #prefix><el-icon :size="14" class="text-purple-500"><Aim /></el-icon></template>
        </el-input>
        <el-button size="default" text title="从页面拾取选择器" @click="$emit('pick-selector')">
          <el-icon :size="16"><Pointer /></el-icon>
        </el-button>
      </div>

      <div v-if="!compact" class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs text-[var(--el-text-color-placeholder)] mb-0.5 block font-mono">x</label>
          <el-input-number
            v-model="params.x"
            placeholder="X 坐标"
            controls-position="right"
            class="w-full"
            size="small"
          />
        </div>
        <div>
          <label class="text-xs text-[var(--el-text-color-placeholder)] mb-0.5 block font-mono">y</label>
          <el-input-number
            v-model="params.y"
            placeholder="Y 坐标"
            controls-position="right"
            class="w-full"
            size="small"
          />
        </div>
      </div>

      <div v-if="compact" class="grid grid-cols-2 gap-1.5">
        <el-input-number v-model="params.x" placeholder="X" controls-position="right" class="w-full" size="small" />
        <el-input-number v-model="params.y" placeholder="Y" controls-position="right" class="w-full" size="small" />
      </div>

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-placeholder)] mb-1 block">按钮</label>
        <el-radio-group v-model="params.button" size="small">
          <el-radio value="left">左键</el-radio>
          <el-radio value="right">右键</el-radio>
          <el-radio value="middle">中键</el-radio>
        </el-radio-group>
      </div>

      <div v-if="!compact" class="flex items-center justify-between">
        <label class="text-xs text-[var(--el-text-color-secondary)]">双击</label>
        <el-switch v-model="params.double" active-text="" inactive-text="" size="small" />
      </div>

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-placeholder)] mb-1 block font-mono">count (点击次数)</label>
        <el-input-number v-model="params.count" :min="1" controls-position="right" class="w-full" size="small" />
      </div>

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-placeholder)] mb-1 block font-mono">hold_ms (保持时长 ms)</label>
        <el-input-number v-model="params.hold_ms" :min="0" controls-position="right" class="w-full" size="small" />
      </div>

      <div v-if="executionResult" class="mt-2 p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs font-mono overflow-auto max-h-20" :class="compact ? '!mt-1 !p-1.5 !max-h-12' : ''">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(executionResult, null, 2) }}</pre>
      </div>

      <el-button
        type="primary"
        :loading="executing"
        :disabled="disabled || !params.selector"
        @click="$emit('execute')"
        class="w-full"
        size="default"
        :class="compact ? '!h-7 !text-xs' : ''"
      >
        {{ executing ? '执行中...' : '执行点击' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Aim, Pointer } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  params: Record<string, any>
  disabled?: boolean
  compact?: boolean
  executionResult?: object | null
  executing?: boolean
}>(), {
  disabled: false,
  compact: false,
  executionResult: null,
  executing: false
})

const emit = defineEmits<{
  'update:params': [value: Record<string, any>]
  execute: []
  'pick-selector': []
}>()
</script>
