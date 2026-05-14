<template>
  <div class="action-keyboard" :class="{ 'compact-mode': compact }">
    <div class="action-header bg-gray-500/10 border-b border-gray-400/30 px-3 py-2 flex items-center gap-2 rounded-t-md" :class="compact ? '!py-1 !px-2' : ''">
      <span class="text-lg">⌨</span>
      <span class="font-semibold text-gray-600 text-sm" :class="compact ? '!text-xs' : ''">键盘操作</span>
    </div>

    <div class="action-body p-3 space-y-3 bg-white dark:bg-gray-800 rounded-b-md border border-t-0 border-gray-200 dark:border-gray-700" :class="compact ? '!p-2 !space-y-2' : ''">

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-placeholder)] mb-1 block font-mono">key (按键)</label>
        <el-input v-model="params.key" placeholder="如 Enter, Tab, A, F1..." clearable size="default" />
      </div>

      <div v-if="compact">
        <el-input v-model="params.key" placeholder="按键..." size="small" />
      </div>

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-secondary)] mb-1.5 block">修饰键</label>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5">
            <el-tag size="small" effect="plain" class="font-mono !text-xs">Ctrl</el-tag>
            <el-switch v-model="params.ctrl" active-text="" inactive-text="" size="small" />
          </div>
          <div class="flex items-center gap-1.5">
            <el-tag size="small" effect="plain" class="font-mono !text-xs">Shift</el-tag>
            <el-switch v-model="params.shift" active-text="" inactive-text="" size="small" />
          </div>
          <div class="flex items-center gap-1.5">
            <el-tag size="small" effect="plain" class="font-mono !text-xs">Alt</el-tag>
            <el-switch v-model="params.alt" active-text="" inactive-text="" size="small" />
          </div>
        </div>
      </div>

      <div v-if="compact" class="flex items-center gap-2">
        <el-switch v-model="params.ctrl" size="small" /><span class="text-xs font-mono">Ctrl</span>
        <el-switch v-model="params.shift" size="small" /><span class="text-xs font-mono">Shift</span>
        <el-switch v-model="params.alt" size="small" /><span class="text-xs font-mono">Alt</span>
      </div>

      <div v-if="!compact">
        <label class="text-xs text-[var(--el-text-color-placeholder)] mb-1 block">action (动作)</label>
        <el-select v-model="params.action" placeholder="选择动作" class="w-full" size="default">
          <el-option label="按下并释放 (press)" value="press" />
          <el-option label="按下 (down)" value="down" />
          <el-option label="释放 (up)" value="up" />
        </el-select>
      </div>

      <div v-if="compact">
        <el-select v-model="params.action" placeholder="动作" class="w-full" size="small">
          <el-option label="press" value="press" />
          <el-option label="down" value="down" />
          <el-option label="up" value="up" />
        </el-select>
      </div>

      <div v-if="executionResult" class="mt-2 p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs font-mono overflow-auto max-h-20" :class="compact ? '!mt-1 !p-1.5 !max-h-12' : ''">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(executionResult, null, 2) }}</pre>
      </div>

      <el-button
        type="primary"
        :loading="executing"
        :disabled="disabled || !params.key"
        @click="$emit('execute')"
        class="w-full"
        size="default"
        :class="compact ? '!h-7 !text-xs' : ''"
      >
        {{ executing ? '执行中...' : '执行按键' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">

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
}>()
</script>
