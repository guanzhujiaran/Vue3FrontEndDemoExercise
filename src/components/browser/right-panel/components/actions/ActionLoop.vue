<template>
  <div class="action-loop" :class="{ compact }">
    <div class="action-header bg-orange-500 text-white px-3 py-2 rounded-t-lg flex items-center gap-2">
      <span class="text-lg">🔄</span>
      <span class="font-semibold text-sm">循环控制 / Loop</span>
    </div>
    <div class="action-body border border-t-0 border-orange-200 rounded-b-lg p-3 space-y-3">
      <div class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">循环模式</label>
        <el-segmented
          v-model="loopMode"
          :disabled="disabled"
          :options="[
            { label: '固定次数', value: 'count' },
            { label: 'While', value: 'while' },
            { label: 'Until', value: 'until' }
          ]"
          size="small"
          block
        />
      </div>

      <div v-if="loopMode === 'count'" class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">循环次数</label>
        <el-input-number
          v-model="localParams.count"
          :min="1"
          :max="99999"
          :step="1"
          :disabled="disabled"
          controls-position="right"
          size="small"
          class="w-full"
        />
      </div>

      <div v-if="loopMode === 'while'" class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          While 条件表达式
        </label>
        <el-input
          v-model="localParams.while_expr"
          placeholder="例如: i < 10 && hasMoreData()"
          :disabled="disabled"
          clearable
          size="small"
        />
        <p class="text-[10px] text-gray-400 mt-1">条件为 true 时继续循环</p>
      </div>

      <div v-if="loopMode === 'until'" class="form-item">
        <label class="block text-xs font-medium text-gray-600 mb-1">
          Until 条件表达式
        </label>
        <el-input
          v-model="localParams.until_expr"
          placeholder="例如: document.querySelector('.no-more')"
          :disabled="disabled"
          clearable
          size="small"
        />
        <p class="text-[10px] text-gray-400 mt-1">条件为 true 时停止循环</p>
      </div>

      <el-button
        type="warning"
        size="small"
        :loading="executing"
        :disabled="disabled || !isValidLoop"
        @click="$emit('execute')"
        class="w-full !bg-orange-500 hover:!bg-orange-600"
      >
        {{ executing ? '循环执行中...' : '启动循环' }}
      </el-button>

      <div v-if="executionResult" class="result-area mt-2 p-2 bg-gray-50 rounded text-xs">
        <div class="text-gray-500 font-medium mb-1">循环结果:</div>
        <pre class="text-green-700 whitespace-pre-wrap break-all">{{ JSON.stringify(executionResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElSegmented, ElInputNumber, ElInput, ElButton } from 'element-plus'

const props = defineProps<{
  params: Record<string, any>
  disabled?: boolean
  compact?: boolean
  executionResult?: object | null
  executing?: boolean
}>()

const emit = defineEmits<{
  'update:params': [value: Record<string, any>]
  execute: []
}>()

const localParams = computed({
  get: () => props.params,
  set: (val) => emit('update:params', val)
})

const loopMode = ref<'count' | 'while' | 'until'>(
  props.params.count !== undefined ? 'count'
  : props.params.while_expr ? 'while'
  : props.params.until_expr ? 'until'
  : 'count'
)

watch(loopMode, (mode) => {
  const base = { ...props.params }
  if (mode === 'count') {
    delete base.while_expr
    delete base.until_expr
    base.count = base.count ?? 1
  } else if (mode === 'while') {
    delete base.count
    delete base.until_expr
  } else {
    delete base.count
    delete base.while_expr
  }
  emit('update:params', base)
})

const isValidLoop = computed(() => {
  if (loopMode.value === 'count') return !!localParams.value.count
  if (loopMode.value === 'while') return !!localParams.value.while_expr?.trim()
  if (loopMode.value === 'until') return !!localParams.value.until_expr?.trim()
  return false
})
</script>

<style scoped>
.action-loop {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.action-loop.compact .form-item {
  margin-bottom: 8px;
}
.action-loop.compact .form-item:last-of-type {
  margin-bottom: 0;
}
.form-item {
  margin-bottom: 12px;
}
.result-area {
  max-height: 150px;
  overflow-y: auto;
}
</style>
