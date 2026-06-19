<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Delete, QuestionFilled } from '@element-plus/icons-vue'

/**
 * ConditionEditor —— 条件判断专用编辑器（v2）
 *
 * UI 数据模型（扁平列表）:
 *   ConditionItem = { field, conditionValueType, conditionValue, logic, negate }
 *     - logic: 当前条件与下一个条件之间的连接逻辑
 *     - negate: 是否对当前条件取反 (NOT)
 *
 * 后端 ConditionRule:
 *   - 单原子条件: { logic, condition: ParamsCondition }
 *   - NOT 包装:    { logic: "NOT", rules: [ConditionRule] }
 *   - 组合规则:    { logic: AND/OR, rules: [ConditionRule, ...] }
 */

// ======================== 类型定义 ========================

type ConditionValueType = 'BOOLEAN' | 'NULL' | 'STRING'
type LogicOp = 'AND' | 'OR'

interface ConditionItem {
  id: string
  field: string
  conditionValueType: ConditionValueType
  conditionValue: boolean | null | string
  /** 与下一个条件的连接逻辑（最后一项的 logic 无实际作用） */
  logic: LogicOp
  /** 是否 NOT 取反 */
  negate: boolean
}

interface ParamsCondition {
  field: string
  condition_value_type: ConditionValueType
  condition_value: boolean | null | string
  description?: string | null
}

interface ConditionRule {
  logic: string
  condition?: ParamsCondition | null
  rules?: ConditionRule[] | null
  description?: string | null
}

// ======================== Props & Emit ========================

const props = defineProps<{
  modelValue?: ConditionRule | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ConditionRule | null]
}>()

// ======================== 状态 ========================

let idCounter = 0
const genId = () => `cond_${++idCounter}`

const conditionItems = ref<ConditionItem[]>([])

// ======================== 序列化 ========================

/** 构造原子条件叶子 */
function buildLeaf(item: ConditionItem): ConditionRule {
  const cond: ConditionRule = {
    logic: item.logic,
    condition: {
      field: item.field,
      condition_value_type: item.conditionValueType,
      condition_value: item.conditionValue,
    },
    rules: null,
    description: null,
  }
  // NOT 取反包装
  if (item.negate) {
    return {
      logic: 'NOT',
      condition: null,
      rules: [cond],
      description: null,
    }
  }
  return cond
}

/** 将 UI 列表序列化为后端 ConditionRule（按连续相同 logic 分组） */
function serialize(items: ConditionItem[]): ConditionRule | null {
  if (items.length === 0) return null

  // 单条件：直接返回叶子节点
  if (items.length === 1) {
    return buildLeaf(items[0])
  }

  // 多个条件：按连续相同 logic 分组
  type Group = { logic: string; items: ConditionItem[] }
  const groups: Group[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.logic === item.logic) {
      last.items.push(item)
    } else {
      groups.push({ logic: item.logic, items: [item] })
    }
  }

  // 单组
  if (groups.length === 1) {
    const g = groups[0]
    return {
      logic: g.logic,
      condition: null,
      rules: g.items.map(buildLeaf),
      description: null,
    }
  }

  // 多组：顶层用 AND 连接各组
  return {
    logic: 'AND',
    condition: null,
    rules: groups.map((g) => ({
      logic: g.logic,
      condition: null,
      rules: g.items.map(buildLeaf),
      description: null,
    })),
    description: null,
  }
}

// ======================== 反序列化 ========================

/** 递归将 ConditionRule 摊平为 ConditionItem 列表 */
function flattenRule(rule: ConditionRule, inheritLogic: LogicOp): ConditionItem[] {
  const items: ConditionItem[] = []

  // 原子条件（叶子）
  if (rule.condition) {
    items.push({
      id: genId(),
      field: rule.condition.field || '',
      conditionValueType: rule.condition.condition_value_type || 'BOOLEAN',
      conditionValue: rule.condition.condition_value ?? false,
      logic: inheritLogic,
      negate: false,
    })
    return items
  }

  // NOT 包装
  if (rule.logic === 'NOT' && rule.rules && rule.rules.length === 1) {
    const inner = rule.rules[0]
    if (inner.condition) {
      items.push({
        id: genId(),
        field: inner.condition.field || '',
        conditionValueType: inner.condition.condition_value_type || 'BOOLEAN',
        conditionValue: inner.condition.condition_value ?? false,
        logic: inheritLogic,
        negate: true,
      })
    } else if (inner.rules) {
      // NOT of a group: 每个子规则都带上 negate
      const subs = flattenRule(inner, inheritLogic)
      subs.forEach((s) => { s.negate = !s.negate })
      items.push(...subs)
    }
    return items
  }

  // AND/OR 分组
  if (rule.rules && rule.rules.length > 0) {
    const groupLogic = (rule.logic === 'AND' || rule.logic === 'OR') ? rule.logic as LogicOp : 'AND'
    for (const sub of rule.rules) {
      items.push(...flattenRule(sub, groupLogic))
    }
  }

  return items
}

function deserialize(rule: ConditionRule | null | undefined): void {
  conditionItems.value = []
  if (!rule) return

  const items = flattenRule(rule, 'AND')
  conditionItems.value = items
}

// ======================== 更新模型 ========================

const isInternalUpdate = ref(false)

const updateModel = () => {
  const rule = serialize(conditionItems.value)
  isInternalUpdate.value = true
  emit('update:modelValue', rule)
  Promise.resolve().then(() => { isInternalUpdate.value = false })
}

watch(
  () => props.modelValue,
  (val) => { if (!isInternalUpdate.value) deserialize(val) },
  { immediate: true },
)

watch(conditionItems, () => updateModel(), { deep: true })

// ======================== 操作方法 ========================

const addCondition = () => {
  conditionItems.value.push({
    id: genId(),
    field: '',
    conditionValueType: 'BOOLEAN',
    conditionValue: false,
    logic: 'AND',
    negate: false,
  })
}

const removeCondition = (index: number) => {
  conditionItems.value.splice(index, 1)
}

const onTypeChange = (index: number, type: ConditionValueType) => {
  const item = conditionItems.value[index]
  item.conditionValueType = type
  switch (type) {
    case 'BOOLEAN': item.conditionValue = false; break
    case 'NULL': item.conditionValue = null; break
    case 'STRING': item.conditionValue = ''; break
  }
}

const toggleNegate = (index: number) => {
  conditionItems.value[index].negate = !conditionItems.value[index].negate
}

const setLogic = (index: number, logic: LogicOp) => {
  conditionItems.value[index].logic = logic
}

// ======================== 计算属性 ========================

const hasConditions = computed(() => conditionItems.value.length > 0)

/** 预览文本 */
const previewText = computed(() => {
  if (conditionItems.value.length === 0) return '无条件'
  const parts: string[] = []
  for (let i = 0; i < conditionItems.value.length; i++) {
    const item = conditionItems.value[i]
    let valStr = ''
    switch (item.conditionValueType) {
      case 'BOOLEAN': valStr = item.conditionValue ? 'True' : 'False'; break
      case 'NULL': valStr = 'null'; break
      case 'STRING': valStr = `"${item.conditionValue}"`; break
    }
    let condText = `\`${item.field || '?'}\` == ${valStr}`
    if (item.negate) condText = `NOT(${condText})`

    if (i < conditionItems.value.length - 1) {
      // 只在 logic 变化或最后一项时显示分组
      const next = conditionItems.value[i + 1]
      if (item.logic === next.logic && item.negate === next.negate && i < conditionItems.value.length - 2) {
        // 同一组内，先积累
        parts.push(condText)
      } else {
        parts.push(condText)
        parts.push(` ${item.logic} `)
      }
    } else {
      parts.push(condText)
    }
  }
  return parts.join('')
})
</script>

<template>
  <div class="condition-editor space-y-3">
    <!-- 头部 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-(--el-text-color-primary)">条件规则</span>
        <span class="text-xs text-(--el-text-color-secondary)">({{ conditionItems.length }} 项)</span>
      </div>
      <el-button size="small" :icon="Plus" @click="addCondition" type="primary" plain>添加条件</el-button>
    </div>

    <!-- 条件列表 -->
    <div v-if="hasConditions" class="space-y-0">
      <div
        v-for="(item, index) in conditionItems"
        :key="item.id"
      >
        <!-- 条件间逻辑连接符（非首项） -->
        <div v-if="index > 0" class="flex items-center justify-center py-1">
          <div class="flex items-center gap-1">
            <span class="text-xxs text-(--el-text-color-placeholder) px-2">—</span>
            <el-select
              :model-value="conditionItems[index - 1].logic"
              @update:model-value="setLogic(index - 1, $event as LogicOp)"
              size="small"
              class="logic-connector"
            >
              <el-option value="AND">
                <span class="text-xs font-bold text-(--el-color-success)">AND</span>
                <span class="text-xxs text-(--el-text-color-secondary) ml-1">且</span>
              </el-option>
              <el-option value="OR">
                <span class="text-xs font-bold text-(--el-color-warning)">OR</span>
                <span class="text-xxs text-(--el-text-color-secondary) ml-1">或</span>
              </el-option>
            </el-select>
            <span class="text-xxs text-(--el-text-color-placeholder) px-2">—</span>
          </div>
        </div>

        <!-- 条件卡片 -->
        <div
          class="p-3 rounded border transition-colors"
          :class="[
            item.negate
              ? 'border-(--el-color-danger-light-5) bg-(--el-color-danger-light-9)'
              : 'border-border bg-(--el-fill-color-lighter)',
            !item.negate ? 'hover:border-(--el-color-primary-light-5)' : '',
          ]"
        >
          <!-- 顶部操作栏 -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5">
              <span
                class="inline-flex items-center justify-center w-5 h-5 rounded-full text-xxs font-bold text-white shrink-0"
                :class="item.negate ? 'bg-(--el-color-danger)' : index % 2 === 0 ? 'bg-(--el-color-primary)' : 'bg-(--el-color-success)'"
              >{{ index + 1 }}</span>
              <span class="text-xs font-medium text-(--el-text-color-regular)">条件 {{ index + 1 }}</span>
              <!-- 逻辑标签 -->
              <span
                class="text-xxs font-mono px-1.5 py-0.5 rounded"
                :class="item.logic === 'AND'
                  ? 'bg-(--el-color-success-light-9) text-(--el-color-success)'
                  : 'bg-(--el-color-warning-light-9) text-(--el-color-warning)'"
              >{{ item.logic }}</span>
              <!-- NOT 标签 -->
              <span
                v-if="item.negate"
                class="text-xxs font-mono px-1.5 py-0.5 rounded bg-(--el-color-danger-light-9) text-(--el-color-danger)"
              >NOT</span>
            </div>
            <div class="flex items-center gap-1">
              <!-- NOT 切换 -->
              <el-tooltip content="取反 (NOT)：条件为假时走 True 分支" placement="top">
                <el-button
                  size="small"
                  @click="toggleNegate(index)"
                  :type="item.negate ? 'danger' : 'default'"
                  plain
                  class="text-xxs"
                >NOT</el-button>
              </el-tooltip>
              <el-button size="small" :icon="Delete" @click="removeCondition(index)" text type="danger" />
            </div>
          </div>

          <!-- 字段名 -->
          <div class="mb-2">
            <label class="text-xs text-(--el-text-color-secondary) block mb-1">变量字段名</label>
            <el-input v-model="item.field" size="small" placeholder="例如: is_logged_in, status_code" @input="updateModel" />
          </div>

          <!-- 条件类型 + 条件值 -->
          <div class="flex gap-2 items-start">
            <div class="flex-1">
              <label class="text-xs text-(--el-text-color-secondary) block mb-1">判断类型</label>
              <el-select
                :model-value="item.conditionValueType"
                @update:model-value="onTypeChange(index, $event as ConditionValueType)"
                size="small"
                style="width: 100%"
              >
                <el-option label="布尔值 (True/False)" value="BOOLEAN" />
                <el-option label="空值 (Null)" value="NULL" />
                <el-option label="字符串 (精确匹配)" value="STRING" />
              </el-select>
            </div>
            <div class="flex-1">
              <label class="text-xs text-(--el-text-color-secondary) block mb-1">期望值</label>
              <el-switch
                v-if="item.conditionValueType === 'BOOLEAN'"
                v-model="(item.conditionValue as boolean)"
                active-text="True"
                inactive-text="False"
                @change="updateModel"
              />
              <el-input
                v-else-if="item.conditionValueType === 'NULL'"
                model-value="null"
                disabled
                size="small"
                style="width: 100%"
              />
              <el-input
                v-else
                v-model="(item.conditionValue as string)"
                size="small"
                placeholder="期望的字符串值"
                @input="updateModel"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-if="!hasConditions"
      class="text-center py-6 text-sm text-(--el-text-color-placeholder) bg-(--el-fill-color-light) rounded border border-dashed border-border"
    >
      <el-icon size="24" class="mb-1 opacity-30"><QuestionFilled /></el-icon>
      <p>暂未设置条件</p>
      <p class="text-xs mt-1">点击 "添加条件" 创建条件规则</p>
      <div class="mt-3 p-2 rounded bg-(--el-color-warning-light-9) border border-(--el-color-warning-light-5) text-xs text-(--el-color-warning) text-left">
        <p class="font-medium mb-0.5">后端默认行为：</p>
        <p>未设置条件 → 默认走 <b>False 分支</b></p>
        <p>分支无步骤 → <b>跳过执行</b>，视为成功</p>
      </div>
    </div>

    <!-- 预览 -->
    <div v-if="hasConditions" class="p-2 rounded bg-(--el-color-primary-light-9) border border-(--el-color-primary-light-7)">
      <span class="text-xs font-mono text-(--el-color-primary) whitespace-pre-wrap">{{ previewText }}</span>
    </div>
  </div>
</template>

<style scoped>
.logic-connector {
  width: 110px;
}
</style>
