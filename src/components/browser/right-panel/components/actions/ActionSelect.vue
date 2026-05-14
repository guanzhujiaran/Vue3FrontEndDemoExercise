<template>
  <div class="action-select" :class="{ 'compact-mode': compact }">
    <div class="action-header bg-purple-500/10 border-b border-purple-500/20 px-3 py-2 flex items-center gap-2 rounded-t-md" :class="compact ? '!py-1 !px-2' : ''">
      <span class="text-lg">📋</span>
      <span class="font-semibold text-purple-600 text-sm" :class="compact ? '!text-xs' : ''">下拉选择</span>
    </div>

    <div class="action-body p-3 space-y-3 bg-white dark:bg-gray-800 rounded-b-md border border-t-0 border-gray-200 dark:border-gray-700" :class="compact ? '!p-2 !space-y-2' : ''">

      <div class="flex gap-1.5 items-start">
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

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-placeholder)] mb-1 block font-mono">value (选中值)</label>
        <el-input v-model="params.value" placeholder="要选中的选项值" clearable size="default" />
      </div>

      <div v-if="compact">
        <el-input v-model="params.value" placeholder="选中值..." size="small" />
      </div>

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-placeholder)] mb-1 block font-mono">option (选项文本或定位)</label>
        <el-input
          v-model="params.option"
          type="textarea"
          :rows="2"
          placeholder="可输入多行，用于匹配选项..."
          resize="vertical"
        />
      </div>

      <div v-if="compact">
        <el-input v-model="params.option" placeholder="选项..." size="small" />
      </div>

      <div v-if="executionResult" class="mt-2 p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs font-mono overflow-auto max-h-20" :class="compact ? '!mt-1 !p-1.5 !max-h-12' : ''">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(executionResult, null, 2) }}</pre>
      </div>

      <el-button
        type="primary"
        :loading="executing"
        :disabled="disabled || !params.selector || !params.value"
        @click="$emit('execute')"
        class="w-full"
        size="default"
        :class="compact ? '!h-7 !text-xs' : ''"
      >
        {{ executing ? '执行中...' : '执行选择' }}
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
