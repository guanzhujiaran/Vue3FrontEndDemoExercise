<script setup lang="ts">
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'

/**
 * 操作结果反馈面板 —— 执行/预览/验证 的结果展示
 */

export interface PreviewTreeItem {
  type: 'step' | 'label'
  level: number
  variables?: { key: string; value: unknown }[]
  branchLabel?: string
  action_id?: string
  [key: string]: unknown
}

export interface StepResultItem {
  key: string
  success: boolean
  action_name?: string
  execution_time?: number
}

interface Props {
  feedback: {
    kind: 'validate' | 'preview' | 'execute'
    success: boolean
    summary: string
    detail: Record<string, unknown>
    at: number
  }
  /** 执行结果：步骤详情 */
  execSteps?: StepResultItem[]
  /** 预览结果：参数替换 */
  previewReplacedParams?: { key: string; value: unknown }[]
  /** 预览结果：已解析变量 */
  previewFoundParams?: string[]
  /** 预览结果：模拟变量池 */
  previewVariables?: { key: string; value: unknown }[]
  /** 预览结果：嵌套步骤树 */
  previewNestedTree?: PreviewTreeItem[]
  /** 验证结果：缺失参数 */
  validateMissingParams?: string[]
  /** 验证结果：无效参数 */
  validateInvalidParams?: string[]
  /** 验证结果：错误信息 */
  validateErrors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  execSteps: () => [],
  previewReplacedParams: () => [],
  previewFoundParams: () => [],
  previewVariables: () => [],
  previewNestedTree: () => [],
  validateMissingParams: () => [],
  validateInvalidParams: () => [],
  validateErrors: () => [],
})

const emit = defineEmits<{
  close: []
}>()

const KIND_LABEL: Record<string, string> = {
  validate: '验证',
  preview: '预览',
  execute: '执行',
}

const fb = computed(() => props.feedback)

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <div
    class="rounded border text-xs overflow-hidden"
    :class="fb.success ? 'border-(--el-color-primary)' : 'border-(--el-color-danger)'"
  >
    <!-- 头部 -->
    <div
      class="flex items-center justify-between px-3 py-2 border-b"
      :class="fb.success
        ? 'bg-(--el-color-primary-light-9) border-(--el-color-primary-light-7)'
        : 'bg-(--el-color-danger-light-9) border-(--el-color-danger-light-7)'"
    >
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xxs font-medium"
          :class="fb.success ? 'bg-(--el-color-primary) text-white' : 'bg-(--el-color-danger) text-white'"
        >{{ fb.success ? '成功' : '失败' }}</span>
        <span class="font-medium">{{ KIND_LABEL[fb.kind] }}结果</span>
      </div>
      <button
        type="button"
        class="p-0.5 rounded shrink-0 hover:bg-(--el-fill-color) transition-colors"
        title="关闭结果"
        @click="emit('close')"
      >
        <el-icon class="text-text-secondary"><Close /></el-icon>
      </button>
    </div>

    <!-- 错误信息 -->
    <div
      v-if="fb.kind === 'execute' && !fb.success && fb.detail?.error"
      class="px-3 py-2 border-b border-(--el-color-danger-light-7) bg-(--el-color-danger-light-9)"
    >
      <div class="flex items-start gap-1.5">
        <span class="text-(--el-color-danger) shrink-0 mt-0.5">⚠</span>
        <div class="min-w-0 flex-1">
          <!-- 有 errors 数组时逐条展示 -->
          <template v-if="Array.isArray(fb.detail.errors) && fb.detail.errors.length">
            <div class="font-medium text-(--el-color-danger) mb-1">{{ fb.detail.error }}</div>
            <ul class="space-y-0.5">
              <li
                v-for="(err, ei) in fb.detail.errors"
                :key="ei"
                class="text-(--el-color-danger) break-all"
              >
                <span class="font-medium">{{ err.name }}</span>: {{ err.error }}
              </li>
            </ul>
          </template>
          <!-- 纯文本错误 -->
          <span v-else class="text-(--el-color-danger) whitespace-pre-wrap break-all">{{ fb.detail.error }}</span>
        </div>
      </div>
    </div>

    <!-- ====== 执行结果 ====== -->
    <template v-if="fb.kind === 'execute'">
      <!-- 执行成功时的 data 结果（如 get_text 返回的 {text: "..."}） -->
      <div
        v-if="fb.success && fb.detail?.data && typeof fb.detail.data === 'object' && Object.keys(fb.detail.data).length > 0"
        class="px-3 py-2 border-b border-(--el-color-primary-light-7)"
      >
        <div class="font-medium text-text-secondary mb-1.5">返回数据</div>
        <div class="space-y-1">
          <div v-for="(val, key) in fb.detail.data as Record<string, unknown>" :key="key" class="flex items-start gap-2">
            <code class="shrink-0 px-1 py-0.5 rounded bg-(--el-color-primary-light-9) text-(--el-color-primary) text-xxs font-mono">{{ key }}</code>
            <span class="text-text-regular break-all">{{ formatValue(val) }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="fb.success && fb.detail?.data != null && (typeof fb.detail.data !== 'object' || Object.keys(fb.detail.data).length === 0)" class="px-3 py-2 border-b">
        <div class="font-medium text-text-secondary mb-1.5">返回数据</div>
        <span class="text-text-regular break-all">{{ formatValue(fb.detail.data) }}</span>
      </div>
      <!-- 执行后的全局变量 -->
      <div
        v-if="fb.success && fb.detail?.variables && typeof fb.detail.variables === 'object' && Object.keys(fb.detail.variables).length > 0"
        class="px-3 py-2 border-b"
      >
        <div class="font-medium text-text-secondary mb-1.5">全局变量 ({{ Object.keys(fb.detail.variables).length }})</div>
        <div class="space-y-1">
          <div v-for="(val, key) in fb.detail.variables as Record<string, unknown>" :key="key" class="flex items-start gap-2">
            <code class="shrink-0 px-1 py-0.5 rounded bg-(--el-color-primary-light-9) text-(--el-color-primary) text-xxs font-mono">{{ key }}</code>
            <span class="text-text-regular break-all">{{ formatValue(val) }}</span>
          </div>
        </div>
      </div>
      <!-- 实际调用参数（变量替换后） -->
      <div
        v-if="fb.success && fb.detail?.replaced_params && typeof fb.detail.replaced_params === 'object' && Object.keys(fb.detail.replaced_params).length > 0"
        class="px-3 py-2 border-b border-(--el-color-primary-light-7) bg-(--el-color-primary-light-9)/30"
      >
        <div class="font-medium text-text-secondary mb-1.5">实际调用参数 ({{ Object.keys(fb.detail.replaced_params).length }})</div>
        <div class="space-y-1">
          <div v-for="(val, key) in fb.detail.replaced_params as Record<string, unknown>" :key="key" class="flex items-start gap-2">
            <code class="shrink-0 px-1 py-0.5 rounded bg-(--el-color-warning-light-9) text-(--el-color-warning) text-xxs font-mono">{{ key }}</code>
            <span class="text-text-regular break-all">{{ formatValue(val) }}</span>
          </div>
        </div>
      </div>
      <div v-if="props.execSteps.length > 0" class="px-3 py-2">
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-medium text-text-secondary">步骤详情 ({{ props.execSteps.length }})</span>
        </div>
        <div class="space-y-1">
          <div
            v-for="step in props.execSteps" :key="step.key"
            class="flex items-center gap-2 py-1 px-2 rounded"
            :class="step.success ? 'bg-(--el-color-primary-light-9)' : 'bg-(--el-color-danger-light-9)'"
          >
            <span class="shrink-0 text-xxs" :class="step.success ? 'text-(--el-color-primary)' : 'text-(--el-color-danger)'">{{ step.success ? '✓' : '✗' }}</span>
            <code class="text-xxs font-mono text-text-secondary shrink-0">{{ step.key }}</code>
            <span v-if="step.action_name" class="text-text-regular truncate">{{ step.action_name }}</span>
            <span v-if="step.execution_time != null" class="text-text-placeholder shrink-0 ml-auto">{{ step.execution_time.toFixed(3) }}s</span>
          </div>
        </div>
      </div>
      <!-- 简单成功态（composite 子步骤等，无 data/variables 详情时兜底显示） -->
      <div v-if="fb.success && (fb.detail?.data === undefined || fb.detail?.data === null) && props.execSteps.length === 0" class="px-3 py-3 text-center">
        <span class="text-(--el-color-primary) text-sm">✓ {{ fb.summary }}</span>
      </div>
    </template>

    <!-- ====== 预览结果 ====== -->
    <template v-if="fb.kind === 'preview'">
      <div v-if="props.previewReplacedParams.length > 0" class="px-3 py-2">
        <div class="font-medium text-text-secondary mb-1.5">参数替换</div>
        <div class="space-y-1">
          <div v-for="p in props.previewReplacedParams" :key="p.key" class="flex items-start gap-2">
            <code class="shrink-0 px-1 py-0.5 rounded bg-(--el-fill-color) text-text-secondary text-xxs font-mono">{{ p.key }}</code>
            <span class="text-text-regular break-all">{{ formatValue(p.value) }}</span>
          </div>
        </div>
      </div>
      <div v-if="props.previewFoundParams.length > 0" class="px-3 py-2">
        <div class="font-medium text-text-secondary mb-1.5">已解析变量</div>
        <div class="flex flex-wrap gap-1">
          <code
            v-for="fp in props.previewFoundParams" :key="fp"
            class="px-1.5 py-0.5 rounded bg-(--el-color-primary-light-9) text-(--el-color-primary) text-xxs font-mono"
          >{{ fp }}</code>
        </div>
      </div>
      <div v-if="props.previewVariables.length > 0" class="px-3 py-2">
        <div class="font-medium text-text-secondary mb-1.5">模拟变量池</div>
        <div class="space-y-1">
          <div v-for="v in props.previewVariables" :key="v.key" class="flex items-start gap-2">
            <code class="shrink-0 px-1 py-0.5 rounded bg-(--el-color-primary-light-9) text-(--el-color-primary) text-xxs font-mono">{{ v.key }}</code>
            <span class="text-text-regular break-all">{{ formatValue(v.value) }}</span>
          </div>
        </div>
      </div>
      <div v-if="props.previewNestedTree.length > 0" class="px-3 py-2 border-t border-border">
        <div class="font-medium text-text-secondary mb-2">步骤展开</div>
        <div
          v-for="(node, ni) in props.previewNestedTree" :key="ni"
          class="mb-1.5"
          :style="{ marginLeft: (node.level - 1) * 14 + 'px' }"
        >
          <div
            v-if="node.type === 'label'"
            class="text-xs font-medium mb-0.5"
            :class="node.branchLabel === 'True 分支' ? 'text-(--el-color-success)' : node.branchLabel === 'False 分支' ? 'text-(--el-color-danger)' : 'text-(--el-color-warning)'"
          >{{ node.branchLabel }}</div>
          <div
            v-else
            class="flex items-start gap-2 text-xs border-l-2 pl-2"
            :class="node.level === 1 ? 'border-border' : 'border-(--el-fill-color-dark)'"
          >
            <code class="shrink-0 px-1 py-0.5 rounded bg-(--el-fill-color) text-text-secondary font-mono" style="font-size: 10px">{{ node.action_id }}</code>
            <div v-if="node.variables && node.variables.length > 0" class="flex flex-wrap gap-x-2 gap-y-0.5">
              <span v-for="v in node.variables" :key="v.key" class="inline-flex items-center gap-1">
                <code class="px-1 py-0 rounded bg-(--el-color-primary-light-9) text-(--el-color-primary) font-mono" style="font-size: 10px">{{ v.key }}</code>
                <span class="text-text-secondary" style="font-size: 10px">={{ formatValue(v.value) }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <!-- 预览成功但无详细数据时的兜底显示 -->
      <div v-if="fb.success && props.previewReplacedParams.length === 0 && props.previewFoundParams.length === 0 && props.previewVariables.length === 0 && props.previewNestedTree.length === 0" class="px-3 py-3 text-center">
        <span class="text-(--el-color-primary) text-sm">✓ {{ fb.summary }}</span>
      </div>
    </template>

    <!-- ====== 验证结果 ====== -->
    <template v-if="fb.kind === 'validate'">
      <div v-if="props.validateMissingParams.length > 0" class="px-3 py-2">
        <div class="font-medium text-(--el-color-warning) mb-1.5">缺失参数</div>
        <div class="flex flex-wrap gap-1">
          <code v-for="mp in props.validateMissingParams" :key="mp" class="px-1.5 py-0.5 rounded bg-(--el-color-warning-light-9) text-(--el-color-warning) text-xxs font-mono">{{ mp }}</code>
        </div>
      </div>
      <div v-if="props.validateInvalidParams.length > 0" class="px-3 py-2">
        <div class="font-medium text-(--el-color-danger) mb-1.5">无效参数</div>
        <div class="flex flex-wrap gap-1">
          <code v-for="ip in props.validateInvalidParams" :key="ip" class="px-1.5 py-0.5 rounded bg-(--el-color-danger-light-9) text-(--el-color-danger) text-xxs font-mono">{{ ip }}</code>
        </div>
      </div>
      <div v-if="props.validateErrors.length > 0" class="px-3 py-2">
        <div class="font-medium text-(--el-color-danger) mb-1.5">错误</div>
        <ul class="space-y-1">
          <li v-for="(err, ei) in props.validateErrors" :key="ei" class="text-(--el-color-danger)">• {{ err }}</li>
        </ul>
      </div>
      <div v-if="fb.success && props.validateMissingParams.length === 0 && props.validateInvalidParams.length === 0 && props.validateErrors.length === 0" class="px-3 py-6 text-center text-text-secondary">
        ✓ 验证通过
      </div>
    </template>
  </div>
</template>
