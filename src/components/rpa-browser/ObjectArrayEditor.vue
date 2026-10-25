<script setup lang="ts">
/**
 * 对象数组编辑器（通用）
 *
 * 规格见 `docs/frontend_requirements/动作参数数组编辑器.md`。
 * 用于「元素结构已知」的数组：动作参数（如 LLM 的 fallbacks）与
 * 工作流输入变量（声明了 `items_schema` 的 array 变量）共用同一套交互。
 *
 * 只依赖传入的 properties/required，不关心业务字段名：
 * - 字段渲染按 schema 类型（enum / number / boolean / 敏感文本 / 文本）；
 * - 顺序即业务优先级，支持上移/下移；
 * - 失焦后才有字段级错误提示（强校验仍由后端 pydantic 兜底）。
 */
import { computed, nextTick, ref } from 'vue'
import { Bottom, Delete, Plus, Top } from '@element-plus/icons-vue'
import type { JsonSchemaNode } from './debugbox-types'
import { buildDefaultItem, moveItem, validateFieldValue } from '@/utils/actionParamsArray'

interface Props {
  /** 数组值（每个元素是一个对象） */
  modelValue?: Record<string, unknown>[]
  /** 元素子字段（已解析 $ref） */
  properties?: Record<string, JsonSchemaNode>
  /** 元素必填字段 */
  required?: string[]
  emptyText?: string
  addText?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  properties: () => ({}),
  required: () => [],
  emptyText: '暂无条目，点击下方按钮添加',
  addText: '添加一项',
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
}>()

const items = computed<Record<string, unknown>[]>(() => props.modelValue || [])

/** 字段展示顺序：普通字段按 schema 顺序，敏感字段（需掩码）统一排到最后 */
const isSensitiveField = (name: string): boolean =>
  /(api_?key|secret|token|password|passwd|credential)/i.test(name)

const orderedFields = computed<[string, JsonSchemaNode][]>(() => {
  const entries = Object.entries(props.properties || {}) as [string, JsonSchemaNode][]
  const normal = entries.filter(([key]) => !isSensitiveField(key))
  const sensitive = entries.filter(([key]) => isSensitiveField(key))
  return [...normal, ...sensitive]
})

const requiredSet = computed(() => new Set(props.required || []))

// ── 值读写 ────────────────────────────────────────────────
const itemValue = (index: number, key: string): unknown => (items.value[index] || {})[key]

const textValue = (index: number, key: string): string => {
  const value = itemValue(index, key)
  return value === null || value === undefined ? '' : String(value)
}

const numberValue = (index: number, key: string): number | null => {
  const value = itemValue(index, key)
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

const selectValue = (index: number, key: string): string | number | null => {
  const value = itemValue(index, key)
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

const booleanValue = (index: number, key: string): boolean => itemValue(index, key) === true

const updateField = (index: number, key: string, value: unknown) => {
  const next = [...items.value]
  next[index] = { ...(next[index] || {}), [key]: value }
  emit('update:modelValue', next)
}

// ── 增删排序 ──────────────────────────────────────────────
const rowRefs = new Map<number, { $el?: HTMLElement }>()
const setRowRef = (index: number, el: { $el?: HTMLElement } | null) => {
  if (el) rowRefs.set(index, el)
  else rowRefs.delete(index)
}

const addItem = async () => {
  const next = [...items.value, buildDefaultItem(props.properties || {})]
  emit('update:modelValue', next)
  await nextTick()
  rowRefs.get(next.length - 1)?.$el?.scrollIntoView({ block: 'nearest' })
}

const removeItem = (index: number) => {
  const next = [...items.value]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

const moveBy = (index: number, delta: number) => {
  emit('update:modelValue', moveItem(items.value, index, delta))
}

// ── 校验（失焦后提示） ────────────────────────────────────
const touched = ref<Record<string, boolean>>({})
const fieldId = (index: number, key: string) => `${index}:${key}`
const markTouched = (index: number, key: string) => {
  touched.value = { ...touched.value, [fieldId(index, key)]: true }
}

const fieldError = (index: number, key: string, field: JsonSchemaNode): string => {
  if (!touched.value[fieldId(index, key)]) return ''
  return validateFieldValue({
    value: itemValue(index, key),
    required: requiredSet.value.has(key),
    format: String(field.format ?? ''),
    maxLength: typeof field.maxLength === 'number' ? field.maxLength : undefined,
  })
}
</script>

<template>
  <!-- 根节点用 form：敏感字段（api_key/secret/token 等）渲染为密码输入框，
       Chromium 要求密码字段位于 form 内（否则控制台告警、密码管理器不生效）；
       @submit.prevent 防止在输入框内回车触发表单提交/页面跳转 -->
  <form
    class="action-params-form__array flex flex-col gap-3"
    @submit.prevent
  >
    <div
      v-if="items.length === 0"
      class="action-params-form__array-empty text-center py-2 text-text-secondary bg-fill-light rounded border border-dashed border-border"
    >
      {{ emptyText }}
    </div>

    <div
      v-for="(_, idx) in items"
      :key="idx"
      :ref="el => setRowRef(idx, el as { $el?: HTMLElement } | null)"
      class="action-params-form__array-row flex flex-col gap-2 p-3 bg-fill-light rounded border border-border"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <el-text class="action-params-form__array-index font-medium">#{{ idx + 1 }}</el-text>
        <div class="flex flex-wrap items-center gap-1">
          <el-button
            class="action-params-form__array-up"
            :icon="Top"
            text
            :disabled="idx === 0"
            @click="moveBy(idx, -1)"
          >
            上移
          </el-button>
          <el-button
            class="action-params-form__array-down"
            :icon="Bottom"
            text
            :disabled="idx === items.length - 1"
            @click="moveBy(idx, 1)"
          >
            下移
          </el-button>
          <el-button
            class="action-params-form__array-remove"
            :icon="Delete"
            text
            type="danger"
            @click="removeItem(idx)"
          >
            删除
          </el-button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <div
          v-for="[fieldKey, field] in orderedFields"
          :key="fieldKey"
          class="action-params-form__array-field flex flex-col gap-1"
        >
          <el-text type="info">
            {{ field.title || fieldKey }}
            <span v-if="requiredSet.has(fieldKey)" class="text-danger">*</span>
          </el-text>

          <el-select
            v-if="field.enum && field.enum.length > 0"
            class="action-params-form__array-enum w-full"
            :model-value="selectValue(idx, fieldKey)"
            :placeholder="field.description || `请选择${fieldKey}`"
            clearable
            @update:model-value="
              val => {
                updateField(idx, fieldKey, val === '' || val === undefined ? null : val)
                markTouched(idx, fieldKey)
              }
            "
          >
            <el-option
              v-for="option in field.enum"
              :key="option"
              :label="String(option)"
              :value="option"
            />
          </el-select>

          <el-input
            v-else-if="field.type === 'number' || field.type === 'integer'"
            class="action-params-form__array-number w-full"
            :model-value="numberValue(idx, fieldKey)"
            type="number"
            :min="field.minimum"
            :max="field.maximum"
            :placeholder="field.description || `请输入${fieldKey}`"
            @update:model-value="
              val => updateField(idx, fieldKey, val === '' ? null : Number(val))
            "
            @blur="markTouched(idx, fieldKey)"
          />

          <el-switch
            v-else-if="field.type === 'boolean'"
            class="action-params-form__array-boolean"
            :model-value="booleanValue(idx, fieldKey)"
            active-text="是"
            inactive-text="否"
            @update:model-value="val => updateField(idx, fieldKey, val)"
          />

          <el-input
            v-else
            class="action-params-form__array-text w-full"
            :model-value="textValue(idx, fieldKey)"
            :type="isSensitiveField(fieldKey) ? 'password' : 'text'"
            :show-password="isSensitiveField(fieldKey)"
            :maxlength="field.maxLength"
            :title="textValue(idx, fieldKey)"
            :placeholder="field.description || `请输入${fieldKey}`"
            @update:model-value="val => updateField(idx, fieldKey, val)"
            @blur="markTouched(idx, fieldKey)"
          />

          <el-text
            v-if="fieldError(idx, fieldKey, field)"
            class="action-params-form__array-error text-danger"
          >
            {{ fieldError(idx, fieldKey, field) }}
          </el-text>
        </div>
      </div>
    </div>

    <el-button
      class="action-params-form__array-add w-full sm:w-auto"
      :icon="Plus"
      text
      @click="addItem"
    >
      {{ addText }}
    </el-button>
  </form>
</template>
