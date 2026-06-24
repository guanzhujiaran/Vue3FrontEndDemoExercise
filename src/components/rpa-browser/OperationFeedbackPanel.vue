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
  <el-card
    shadow="never"
    class="feedback-panel"
    :class="fb.success
      ? 'border-primary [&_.el-card\\_\\_header]:bg-primary-light-9 [&_.el-card\\_\\_header]:border-primary-light-7'
      : 'border-danger [&_.el-card\\_\\_header]:bg-danger-light-9 [&_.el-card\\_\\_header]:border-danger-light-7'"
  >
    <template #header>
      <div class="feedback-panel__header flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-tag
            :type="fb.success ? 'primary' : 'danger'"
            size="small"
            effect="dark"
          >
            <el-text size="small">{{ fb.success ? '成功' : '失败' }}</el-text>
          </el-tag>
          <el-text size="small" class="font-medium">{{ KIND_LABEL[fb.kind] }}结果</el-text>
        </div>
        <el-button :icon="Close" text size="small" @click="emit('close')" />
      </div>
    </template>

    <!-- ====== 执行错误信息 ====== -->
    <el-alert
      v-if="fb.kind === 'execute' && !fb.success && fb.detail?.error"
      type="error"
      :title="String(fb.detail.error)"
      show-icon
      :closable="false"
      class="mb-3"
    >
      <template
        v-if="Array.isArray(fb.detail.errors) && fb.detail.errors.length"
        #default
      >
        <div
          v-for="(err, ei) in fb.detail.errors"
          :key="ei"
        >
          <el-text size="small" class="font-medium">{{ err.name }}</el-text>
          <el-text size="small">: {{ err.error }}</el-text>
        </div>
      </template>
    </el-alert>

    <!-- ====== 执行结果 ====== -->
    <template v-if="fb.kind === 'execute'">
      <!-- 返回数据 -->
      <el-descriptions
        v-if="fb.success && fb.detail?.data != null"
        title="返回数据"
        :column="1"
        border
        size="small"
        class="mb-3"
      >
        <template
          v-if="typeof fb.detail.data === 'object' && Object.keys(fb.detail.data as Record<string, unknown>).length > 0"
        >
          <el-descriptions-item
            v-for="(val, key) in fb.detail.data as Record<string, unknown>"
            :key="String(key)"
            :label="String(key)"
          >
            <el-text size="small">{{ formatValue(val) }}</el-text>
          </el-descriptions-item>
        </template>
        <el-descriptions-item v-else label="value">
          <el-text size="small">{{ formatValue(fb.detail.data) }}</el-text>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 全局变量 -->
      <el-descriptions
        v-if="fb.success && fb.detail?.variables && typeof fb.detail.variables === 'object' && Object.keys(fb.detail.variables as Record<string, unknown>).length > 0"
        :title="`全局变量 (${Object.keys(fb.detail.variables as Record<string, unknown>).length})`"
        :column="1"
        border
        size="small"
        class="mb-3"
      >
        <el-descriptions-item
          v-for="(val, key) in fb.detail.variables as Record<string, unknown>"
          :key="String(key)"
          :label="String(key)"
        >
          <el-text size="small">{{ formatValue(val) }}</el-text>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 实际调用参数 -->
      <el-descriptions
        v-if="fb.success && fb.detail?.replaced_params && typeof fb.detail.replaced_params === 'object' && Object.keys(fb.detail.replaced_params as Record<string, unknown>).length > 0"
        :title="`实际调用参数 (${Object.keys(fb.detail.replaced_params as Record<string, unknown>).length})`"
        :column="1"
        border
        size="small"
        class="mb-3"
      >
        <el-descriptions-item
          v-for="(val, key) in fb.detail.replaced_params as Record<string, unknown>"
          :key="String(key)"
          :label="String(key)"
        >
          <el-text size="small">{{ formatValue(val) }}</el-text>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 步骤详情 -->
      <div v-if="props.execSteps.length > 0" class="mb-3">
        <el-text size="small" class="font-medium text-secondary block mb-2">
          步骤详情 ({{ props.execSteps.length }})
        </el-text>
        <el-table :data="props.execSteps" size="small" stripe>
          <el-table-column width="50">
            <template #default="{ row }">
              <el-tag
                :type="row.success ? 'primary' : 'danger'"
                size="small"
              >
                <el-text size="small">{{ row.success ? '✓' : '✗' }}</el-text>
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="key" label="Key" min-width="120" />
          <el-table-column prop="action_name" label="操作" min-width="120" />
          <el-table-column label="耗时" width="100">
            <template #default="{ row }">
              <el-text size="small">{{ row.execution_time != null ? row.execution_time.toFixed(3) + 's' : '-' }}</el-text>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 简单成功态 -->
      <el-result
        v-if="fb.success && (fb.detail?.data === undefined || fb.detail?.data === null) && props.execSteps.length === 0"
        icon="success"
        :title="fb.summary"
      />
    </template>

    <!-- ====== 预览结果 ====== -->
    <template v-if="fb.kind === 'preview'">
      <!-- 参数替换 -->
      <el-descriptions
        v-if="props.previewReplacedParams.length > 0"
        title="参数替换"
        :column="1"
        border
        size="small"
        class="mb-3"
      >
        <el-descriptions-item
          v-for="p in props.previewReplacedParams"
          :key="p.key"
          :label="p.key"
        >
          <el-text size="small">{{ formatValue(p.value) }}</el-text>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 已解析变量 -->
      <div v-if="props.previewFoundParams.length > 0" class="mb-3">
        <el-text size="small" class="font-medium text-secondary block mb-2">已解析变量</el-text>
        <el-tag
          v-for="fp in props.previewFoundParams"
          :key="fp"
          class="mr-1 mb-1"
          size="small"
        >
          <el-text size="small">{{ fp }}</el-text>
        </el-tag>
      </div>

      <!-- 模拟变量池 -->
      <el-descriptions
        v-if="props.previewVariables.length > 0"
        title="模拟变量池"
        :column="1"
        border
        size="small"
        class="mb-3"
      >
        <el-descriptions-item
          v-for="v in props.previewVariables"
          :key="v.key"
          :label="v.key"
        >
          <el-text size="small">{{ formatValue(v.value) }}</el-text>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 步骤展开 -->
      <div v-if="props.previewNestedTree.length > 0" class="mb-3">
        <el-text size="small" class="font-medium text-secondary block mb-2">步骤展开</el-text>
        <el-timeline>
          <el-timeline-item
            v-for="(node, ni) in props.previewNestedTree"
            :key="ni"
            :color="node.branchLabel === 'True 分支' ? '#67c23a' : node.branchLabel === 'False 分支' ? '#f56c6c' : '#e6a23c'"
            :hollow="node.type === 'label'"
            size="large"
          >
            <template v-if="node.type === 'label'">
              <el-tag
                :type="node.branchLabel === 'True 分支' ? 'success' : node.branchLabel === 'False 分支' ? 'danger' : 'warning'"
                size="small"
              >
                <el-text size="small">{{ node.branchLabel }}</el-text>
              </el-tag>
            </template>
            <template v-else>
              <div class="flex items-center gap-2 flex-wrap">
                <el-tag size="small" type="info">
                  <el-text size="small">{{ node.action_id }}</el-text>
                </el-tag>
                <template v-if="node.variables && node.variables.length > 0">
                  <span
                    v-for="v in node.variables"
                    :key="v.key"
                    class="inline-flex items-center gap-1"
                  >
                    <el-tag size="small">
                      <el-text size="small">{{ v.key }}</el-text>
                    </el-tag>
                    <el-text size="small" type="info">= {{ formatValue(v.value) }}</el-text>
                  </span>
                </template>
              </div>
            </template>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- 预览成功但无详细数据 -->
      <el-result
        v-if="fb.success && props.previewReplacedParams.length === 0 && props.previewFoundParams.length === 0 && props.previewVariables.length === 0 && props.previewNestedTree.length === 0"
        icon="success"
        :title="fb.summary"
      />
    </template>

    <!-- ====== 验证结果 ====== -->
    <template v-if="fb.kind === 'validate'">
      <!-- 缺失参数 -->
      <div v-if="props.validateMissingParams.length > 0" class="mb-3">
        <el-text size="small" class="font-medium text-warning block mb-2">缺失参数</el-text>
        <el-tag
          v-for="mp in props.validateMissingParams"
          :key="mp"
          type="warning"
          class="mr-1 mb-1"
          size="small"
        >
          <el-text size="small">{{ mp }}</el-text>
        </el-tag>
      </div>

      <!-- 无效参数 -->
      <div v-if="props.validateInvalidParams.length > 0" class="mb-3">
        <el-text size="small" class="font-medium text-danger block mb-2">无效参数</el-text>
        <el-tag
          v-for="ip in props.validateInvalidParams"
          :key="ip"
          type="danger"
          class="mr-1 mb-1"
          size="small"
        >
          <el-text size="small">{{ ip }}</el-text>
        </el-tag>
      </div>

      <!-- 错误列表 -->
      <el-alert
        v-if="props.validateErrors.length > 0"
        type="error"
        title="错误"
        :closable="false"
        show-icon
        class="mb-3"
      >
        <ul class="list-none p-0 m-0">
          <li
            v-for="err in props.validateErrors"
            :key="err"
          >
            <el-text size="small">{{ err }}</el-text>
          </li>
        </ul>
      </el-alert>

      <!-- 验证通过 -->
      <el-result
        v-if="fb.success && props.validateMissingParams.length === 0 && props.validateInvalidParams.length === 0 && props.validateErrors.length === 0"
        icon="success"
        title="验证通过"
      />
    </template>
  </el-card>
</template>