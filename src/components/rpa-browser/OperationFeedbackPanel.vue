<script setup lang="ts">
import { computed, ref } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

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

const activeNames = ref<string[]>(['feedback'])

/** 内层分类结果 collapse 默认全部展开，用户可按需折叠 */
const innerActiveNames = ref<string[]>([
  'exec_data',
  'exec_variables',
  'exec_replaced_params',
  'exec_steps',
  'preview_replaced_params',
  'preview_found_params',
  'preview_variables',
  'preview_nested_tree',
  'validate_missing',
  'validate_invalid',
  'validate_errors',
])

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <el-collapse
    v-model="activeNames"
    class="feedback-panel"
    :class="fb.kind === 'preview'
      ? 'border-info'
      : fb.success
        ? 'border-primary'
        : 'border-danger'"
  >
    <el-collapse-item name="feedback">
      <template #title>
        <div class="feedback-panel__header flex items-center justify-between w-full pr-2">
          <div class="flex items-center gap-2">
            <el-tag
              :type="fb.kind === 'preview' ? 'info' : fb.success ? 'primary' : 'danger'"
              size="small"
              effect="dark"
            >
              <el-text size="small">{{ fb.kind === 'preview' ? '预览' : fb.success ? '成功' : '失败' }}</el-text>
            </el-tag>
            <el-text size="small" class="font-medium">{{ KIND_LABEL[fb.kind] }}结果</el-text>
          </div>
          <el-button :icon="Close" text size="small" @click.stop="emit('close')" />
        </div>
      </template>

      <!-- ====== 执行错误信息 ====== -->
      <el-alert
        v-if="fb.kind === 'execute' && !fb.success && fb.detail?.error"
        type="error"
        :effect="themeStore.themeEffectString"
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

      <!-- ====== 分类结果（可折叠） ====== -->
      <el-collapse v-model="innerActiveNames" class="feedback-panel__inner">
        <!-- ====== 执行结果 ====== -->
        <template v-if="fb.kind === 'execute'">
          <!-- 返回数据 -->
          <el-collapse-item
            v-if="fb.success && fb.detail?.data != null"
            name="exec_data"
          >
            <template #title>
              <el-text size="small" class="font-medium">返回数据</el-text>
            </template>
            <el-descriptions :column="1" border size="small">
              <template v-if="typeof fb.detail.data === 'object' && Object.keys(fb.detail.data as Record<string, unknown>).length > 0">
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
          </el-collapse-item>

          <!-- 全局变量 -->
          <el-collapse-item
            v-if="fb.success && fb.detail?.variables && typeof fb.detail.variables === 'object' && Object.keys(fb.detail.variables as Record<string, unknown>).length > 0"
            name="exec_variables"
          >
            <template #title>
              <el-text size="small" class="font-medium">
                全局变量 ({{ Object.keys(fb.detail.variables as Record<string, unknown>).length }})
              </el-text>
            </template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item
                v-for="(val, key) in fb.detail.variables as Record<string, unknown>"
                :key="String(key)"
                :label="String(key)"
              >
                <el-text size="small">{{ formatValue(val) }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>

          <!-- 实际调用参数 -->
          <el-collapse-item
            v-if="fb.success && fb.detail?.replaced_params && typeof fb.detail.replaced_params === 'object' && Object.keys(fb.detail.replaced_params as Record<string, unknown>).length > 0"
            name="exec_replaced_params"
          >
            <template #title>
              <el-text size="small" class="font-medium">
                实际调用参数 ({{ Object.keys(fb.detail.replaced_params as Record<string, unknown>).length }})
              </el-text>
            </template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item
                v-for="(val, key) in fb.detail.replaced_params as Record<string, unknown>"
                :key="String(key)"
                :label="String(key)"
              >
                <el-text size="small">{{ formatValue(val) }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>

          <!-- 步骤详情 -->
          <el-collapse-item
            v-if="props.execSteps.length > 0"
            name="exec_steps"
          >
            <template #title>
              <el-text size="small" class="font-medium">
                步骤详情 ({{ props.execSteps.length }})
              </el-text>
            </template>
            <el-table :data="props.execSteps" size="small" stripe>
              <el-table-column width="50">
                <template #default="{ row }">
                  <el-tag :type="row.success ? 'primary' : 'danger'" size="small">
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
          </el-collapse-item>
        </template>

        <!-- ====== 预览结果 ====== -->
        <template v-if="fb.kind === 'preview'">
          <!-- 参数替换 -->
          <el-collapse-item
            v-if="props.previewReplacedParams.length > 0"
            name="preview_replaced_params"
          >
            <template #title>
              <el-text size="small" class="font-medium">
                参数替换 ({{ props.previewReplacedParams.length }})
              </el-text>
            </template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item
                v-for="p in props.previewReplacedParams"
                :key="p.key"
                :label="p.key"
              >
                <el-text size="small">{{ formatValue(p.value) }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>

          <!-- 已解析变量 -->
          <el-collapse-item
            v-if="props.previewFoundParams.length > 0"
            name="preview_found_params"
          >
            <template #title>
              <el-text size="small" class="font-medium">
                已解析变量 ({{ props.previewFoundParams.length }})
              </el-text>
            </template>
            <div class="flex flex-wrap gap-1">
              <el-tag v-for="fp in props.previewFoundParams" :key="fp" size="small">
                <el-text size="small">{{ fp }}</el-text>
              </el-tag>
            </div>
          </el-collapse-item>

          <!-- 模拟变量池 -->
          <el-collapse-item
            v-if="props.previewVariables.length > 0"
            name="preview_variables"
          >
            <template #title>
              <el-text size="small" class="font-medium">
                模拟变量池 ({{ props.previewVariables.length }})
              </el-text>
            </template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item
                v-for="v in props.previewVariables"
                :key="v.key"
                :label="v.key"
              >
                <el-text size="small">{{ formatValue(v.value) }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </el-collapse-item>

          <!-- 步骤展开 -->
          <el-collapse-item
            v-if="props.previewNestedTree.length > 0"
            name="preview_nested_tree"
          >
            <template #title>
              <el-text size="small" class="font-medium">
                步骤展开 ({{ props.previewNestedTree.length }})
              </el-text>
            </template>
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
          </el-collapse-item>
        </template>

        <!-- ====== 验证结果 ====== -->
        <template v-if="fb.kind === 'validate'">
          <!-- 缺失参数 -->
          <el-collapse-item
            v-if="props.validateMissingParams.length > 0"
            name="validate_missing"
          >
            <template #title>
              <el-text size="small" class="font-medium text-warning">
                缺失参数 ({{ props.validateMissingParams.length }})
              </el-text>
            </template>
            <div class="flex flex-wrap gap-1">
              <el-tag v-for="mp in props.validateMissingParams" :key="mp" type="warning" size="small">
                <el-text size="small">{{ mp }}</el-text>
              </el-tag>
            </div>
          </el-collapse-item>

          <!-- 无效参数 -->
          <el-collapse-item
            v-if="props.validateInvalidParams.length > 0"
            name="validate_invalid"
          >
            <template #title>
              <el-text size="small" class="font-medium text-danger">
                无效参数 ({{ props.validateInvalidParams.length }})
              </el-text>
            </template>
            <div class="flex flex-wrap gap-1">
              <el-tag v-for="ip in props.validateInvalidParams" :key="ip" type="danger" size="small">
                <el-text size="small">{{ ip }}</el-text>
              </el-tag>
            </div>
          </el-collapse-item>

          <!-- 错误列表 -->
          <el-collapse-item
            v-if="props.validateErrors.length > 0"
            name="validate_errors"
          >
            <template #title>
              <el-text size="small" class="font-medium text-danger">
                错误 ({{ props.validateErrors.length }})
              </el-text>
            </template>
            <el-alert
              type="error"
              :effect="themeStore.themeEffectString"
              title="错误"
              :closable="false"
              show-icon
            >
              <ul class="list-none p-0 m-0">
                <li v-for="err in props.validateErrors" :key="err">
                  <el-text size="small">{{ err }}</el-text>
                </li>
              </ul>
            </el-alert>
          </el-collapse-item>
        </template>
      </el-collapse>

      <!-- ====== 简单成功态（无分类数据时） ====== -->
      <el-result
        v-if="fb.kind === 'execute' && fb.success && (fb.detail?.data === undefined || fb.detail?.data === null) && props.execSteps.length === 0"
        icon="success"
        :title="fb.summary"
      />
      <el-result
        v-if="fb.kind === 'preview' && fb.success && props.previewReplacedParams.length === 0 && props.previewFoundParams.length === 0 && props.previewVariables.length === 0 && props.previewNestedTree.length === 0"
        icon="success"
        :title="fb.summary"
      />
      <el-result
        v-if="fb.kind === 'validate' && fb.success && props.validateMissingParams.length === 0 && props.validateInvalidParams.length === 0 && props.validateErrors.length === 0"
        icon="success"
        title="验证通过"
      />
    </el-collapse-item>
  </el-collapse>
</template>