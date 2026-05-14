<template>
  <div class="generic-action-editor space-y-2">
    <div class="flex items-center gap-2">
      <span class="text-xs font-mono font-medium text-[var(--el-text-color-secondary)]">{{ actionId }}</span>
      <el-tag size="small" type="info" effect="plain" class="!text-[10px]">通用</el-tag>
    </div>

    <div v-if="paramKeys.length > 0" class="space-y-1.5">
      <div v-for="key in paramKeys" :key="key" class="space-y-0.5">
        <label class="text-[11px] text-[var(--el-text-color-placeholder)] font-mono block">{{ key }}</label>
        <el-input
          :model-value="params[key]"
          :placeholder="'输入 ' + key"
          size="small"
          clearable
          @update:model-value="updateParam(key, $event)"
        />
      </div>
    </div>

    <div v-else class="text-center py-2 text-[11px] text-[var(--el-text-color-placeholder)]">
      无参数
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  actionId: string
  params: Record<string, any>
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:params': [value: Record<string, any>]
}>()

const paramKeys = computed(() => Object.keys(props.params || {}))

function updateParam(key: string, value: any): void {
  emit('update:params', { ...props.params, [key]: value })
}
</script>
