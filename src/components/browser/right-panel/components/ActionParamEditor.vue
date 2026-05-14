<template>
  <el-form-item :required="param.required" :error="error" class="mb-0">
    <template #label>
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-medium">{{ param.name }}</span>
      </div>
    </template>

    <!-- 枚举类型 (包括特殊枚举: mousebuttonenum, waituntilenum 等) -->
    <template v-if="isEnumType">
      <el-select
        :model-value="modelValue"
        :placeholder="'请选择 ' + param.name"
        clearable
        class="w-full"
        @change="(val: any) => $emit('update:modelValue', val)"
      >
        <el-option
          v-for="option in param.enum"
          :key="String(option)"
          :label="formatEnumLabel(option)"
          :value="option"
        />
      </el-select>
    </template>

    <!-- 多选枚举类型 (keyboardmodifierenum → modifiers) -->
    <template v-else-if="isMultiEnumType">
      <div class="space-y-1.5">
        <el-select
          :model-value="modelValue || []"
          :placeholder="'选择修饰键...'"
          multiple
          collapse-tags
          collapse-tags-tooltip
          class="w-full"
          @change="(val: any) => $emit('update:modelValue', val)"
        >
          <el-option
            v-for="option in multiEnumOptions"
            :key="String(option)"
            :label="formatMultiEnumLabel(option)"
            :value="option"
          />
        </el-select>
        <div class="text-[10px] text-[var(--el-text-color-placeholder)] m-0">
          {{ param.description }}
        </div>
      </div>
    </template>

    <!-- bool 类型 -->
    <template v-else-if="isBoolType">
      <div class="flex items-center gap-3 py-0.5">
        <el-switch
          :model-value="parseBoolean(modelValue)"
          active-text="是"
          inactive-text="否"
          @change="(val: boolean) => $emit('update:modelValue', val)"
        />
        <span v-if="modelValue !== '' && modelValue !== null && modelValue !== undefined" class="text-xs text-[var(--el-text-color-placeholder)]">
          {{ modelValue }}
        </span>
      </div>
    </template>

    <!-- int / float 数值类型 -->
    <template v-else-if="isNumberType">
      <el-input-number
        :model-value="safeNumberValue"
        :placeholder="placeholder"
        :min="effectiveMin"
        :max="effectiveMax"
        :step="numberStep"
        :precision="param.type === 'float' ? 2 : 0"
        controls-position="right"
        class="w-full"
        @change="(val: any) => $emit('update:modelValue', val ?? '')"
      />
    </template>

    <!-- selector 类型 -->
    <template v-else-if="param.type === 'selector'">
      <div class="flex gap-1.5">
        <el-input
          :model-value="modelValue"
          placeholder="CSS 选择器, 如 #id .class"
          clearable
          class="flex-1"
          @update:model-value="$emit('update:modelValue', $event)"
          @blur="$emit('blur', param.name)"
        >
          <template #prefix><el-icon :size="14" class="text-purple-500"><Aim /></el-icon></template>
        </el-input>
        <el-button size="default" text title="从页面拾取选择器" @click="$emit('pick-selector')">
          <el-icon :size="16"><Pointer /></el-icon>
        </el-button>
      </div>
    </template>

    <!-- url 类型 -->
    <template v-else-if="param.type === 'url'">
      <el-input
        :model-value="modelValue"
        placeholder="https://..."
        clearable
        @update:model-value="$emit('update:modelValue', $event)"
        @blur="$emit('blur', param.name)"
      >
        <template #prefix><el-icon :size="14" class="text-blue-500"><Link /></el-icon></template>
      </el-input>
    </template>

    <!-- code 类型 (多行代码) -->
    <template v-else-if="param.type === 'code'">
      <el-input
        :model-value="modelValue"
        type="textarea"
        :rows="3"
        :placeholder="placeholder || '输入代码...'"
        class="font-mono"
        @update:model-value="$emit('update:modelValue', $event)"
        @blur="$emit('blur', param.name)"
      />
    </template>

    <!-- list 类型 (JSON 数组) -->
    <template v-else-if="param.type === 'list'">
      <el-input
        :model-value="displayArrayValue"
        type="textarea"
        :rows="2"
        placeholder='["item1", "item2"] 或 JSON'
        class="font-mono text-[13px]"
        @update:model-value="handleArrayInput($event)"
        @blur="handleArrayBlur"
      />
    </template>

    <!-- dict/object 类型 (JSON 对象) -->
    <template v-else-if="isDictType">
      <el-input
        :model-value="displayObjectValue"
        type="textarea"
        :rows="2"
        placeholder='{"key": "value"}'
        class="font-mono text-[13px]"
        @update:model-value="handleObjectInput($event)"
        @blur="handleObjectBlur"
      />
    </template>

    <!-- position 类型 (坐标位置 {x, y}) -->
    <template v-else-if="param.type === 'position'">
      <div class="flex gap-2 items-center">
        <div class="flex-1 flex items-center gap-1">
          <span class="text-xs text-[var(--el-text-color-placeholder)] w-4">X</span>
          <el-input-number
            :model-value="modelValue?.x"
            placeholder="0"
            :min="-Infinity"
            :max="Infinity"
            controls-position="right"
            size="default"
            class="flex-1"
            @change="(val: any) => updatePosition('x', val)"
          />
        </div>
        <div class="flex-1 flex items-center gap-1">
          <span class="text-xs text-[var(--el-text-color-placeholder)] w-4">Y</span>
          <el-input-number
            :model-value="modelValue?.y"
            placeholder="0"
            :min="-Infinity"
            :max="Infinity"
            controls-position="right"
            size="default"
            class="flex-1"
            @change="(val: any) => updatePosition('y', val)"
          />
        </div>
      </div>
    </template>

    <!-- str/string/text 默认文本类型 -->
    <template v-else>
      <el-input
        :model-value="modelValue"
        :placeholder="placeholder"
        clearable
        :maxlength="effectiveMaxLength"
        :show-word-limit="!!effectiveMaxLength"
        @input="$emit('update:modelValue', $event)"
        @blur="$emit('blur', param.name)"
      />
    </template>

    <!-- 参数描述和验证提示 -->
    <div class="mt-1 space-y-0.5">
      <div v-if="param.description" class="text-[10px] text-[var(--el-text-color-placeholder)] leading-relaxed m-0">
        {{ param.description }}
      </div>

      <!-- 数值范围提示 -->
      <div v-if="showRangeHint" class="text-[10px] text-[var(--el-color-primary)] font-mono m-0">
        <template v-if="effectiveMin != null && effectiveMax != null">
          范围: {{ effectiveMin }} ~ {{ effectiveMax }}
        </template>
        <template v-else-if="effectiveMin != null">
          最小值: ≥ {{ effectiveMin }}
        </template>
        <template v-else-if="effectiveMax != null">
          最大值: ≤ {{ effectiveMax }}
        </template>
      </div>

      <!-- 字符串长度提示 -->
      <div v-if="showLengthHint" class="text-[10px] text-[var(--el-color-primary)] font-mono m-0">
        <template v-if="param.min_length != null && param.max_length != null">
          长度: {{ param.min_length }} ~ {{ param.max_length }} 字符
        </template>
        <template v-else-if="param.min_length != null">
          最短: ≥ {{ param.min_length }} 字符
        </template>
        <template v-else-if="param.max_length != null">
          最长: ≤ {{ param.max_length }} 字符
        </template>
      </div>

      <!-- 枚举值提示 -->
      <div v-if="isEnumType && param.enum?.length" class="text-[10px] text-[var(--el-color-success)] font-mono m-0 truncate">
        可选: {{ (param.enum || []).map(String).join(', ') }}
      </div>

      <!-- 格式提示 -->
      <div v-if="param.format" class="text-[10px] text-orange-500 font-mono m-0">
        格式: {{ param.format }}
      </div>
    </div>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Aim, Pointer, Link } from '@element-plus/icons-vue'
import type { ActionParameterDef } from '@/types/browser-automation-api'

export interface ParamDef {
  name: string
  type: string
  required?: boolean
  default?: any
  description?: string
  min?: number | null
  max?: number | null
  min_length?: number | null
  max_length?: number | null
  enum?: any[] | null
  format?: string | null
  items?: ParamDef | null
}

const props = defineProps<{
  param: ParamDef | ActionParameterDef
  modelValue: any
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
  blur: [name: string]
  'pick-selector': []
}>()

const ENUM_TYPES = ['mousebuttonenum', 'waituntilenum', 'elementstateenum', 'screenshottypeenum']
const MULTI_ENUM_TYPES = ['keyboardmodifierenum']

const isEnumType = computed(() => {
  return ENUM_TYPES.includes(props.param.type) || (props.param.enum && props.param.enum.length > 0 && !MULTI_ENUM_TYPES.includes(props.param.type))
})

const isMultiEnumType = computed(() => {
  return MULTI_ENUM_TYPES.includes(props.param.type) || (props.param.items?.enum && props.param.items.enum.length > 0)
})

const isBoolType = computed(() => props.param.type === 'bool')

const isNumberType = computed(() => props.param.type === 'int' || props.param.type === 'float')

const isDictType = computed(() => props.param.type === 'dict' || props.param.type === 'object')

const safeNumberValue = computed(() => {
  const val = props.modelValue
  if (val === undefined || val === null || val === '') return undefined
  return Number(val)
})

const displayArrayValue = computed(() => {
  if (typeof props.modelValue === 'object' && Array.isArray(props.modelValue)) {
    return JSON.stringify(props.modelValue, null, 2)
  }
  return props.modelValue ?? ''
})

const displayObjectValue = computed(() => {
  if (typeof props.modelValue === 'object' && props.modelValue !== null && !Array.isArray(props.modelValue)) {
    return JSON.stringify(props.modelValue, null, 2)
  }
  return props.modelValue ?? ''
})

const effectiveMin = computed(() => {
  const min = props.param.min
  return (min != null && typeof min === 'number') ? min : undefined
})

const effectiveMax = computed(() => {
  const max = props.param.max
  return (max != null && typeof max === 'number') ? max : undefined
})

const effectiveMaxLength = computed(() => {
  const len = props.param.max_length
  return (len != null && typeof len === 'number' && len > 0) ? len : undefined
})

const showRangeHint = computed(() => effectiveMin.value != null || effectiveMax.value != null)

const showLengthHint = computed(() => props.param.min_length != null || props.param.max_length != null)

const numberStep = computed(() => props.param.type === 'float' ? 0.1 : 1)

const placeholder = computed(() => {
  if (props.param.default !== undefined && props.param.default !== null && props.param.default !== '') {
    return `默认: ${props.param.default}`
  }
  return ''
})

const multiEnumOptions = computed(() => {
  if (props.param.items?.enum) return props.param.items.enum
  if (props.param.enum) return props.param.enum
  const typeMap: Record<string, any[]> = {
    keyboardmodifierenum: ['Alt', 'Control', 'Meta', 'Shift']
  }
  return typeMap[props.param.type] || []
})

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    str: 'str', int: 'int', float: 'float',
    bool: 'bool', list: 'lst', dict: 'dict',
    selector: 'sel', url: 'url', code: 'code', position: 'pos',
    keyboardmodifierenum: 'key'
  }
  if (map[props.param.type]) return map[props.param.type]
  if (ENUM_TYPES.includes(props.param.type)) return props.param.type.replace('enum', '')
  if (MULTI_ENUM_TYPES.includes(props.param.type)) return props.param.type.replace('enum', '')
  return props.param.type.substring(0, 4)
})

const typeTagClass = computed(() => {
  const base = '!py-0 !px-1 !h-4 !text-[13px] font-mono'
  const colorMap: Record<string, string> = {
    str: '', int: '!text-blue-600', float: '!text-cyan-600',
    bool: '!text-green-600', list: '!text-orange-600', dict: '!text-purple-600',
    selector: '!text-purple-500 !border-purple-300', url: '!text-blue-500 !border-blue-300',
    code: '!text-gray-600 !bg-gray-100', mousebuttonenum: '!text-indigo-600',
    waituntilenum: '!text-teal-600', elementstateenum: '!text-amber-600',
    screenshottypeenum: '!text-pink-600', position: '!text-emerald-600',
    keyboardmodifierenum: '!text-violet-600'
  }
  return base + ' ' + (colorMap[props.param.type] || '')
})

function formatEnumLabel(option: any): string {
  const labelMap: Record<string, string> = {
    left: '左键', middle: '中键', right: '右键',
    load: '加载完成', domcontentloaded: 'DOM就绪', networkidle: '网络空闲', commit: '提交',
    visible: '可见', hidden: '隐藏', attached: '已挂载', detached: '已分离',
    enabled: '启用', disabled: '禁用', editable: '可编辑', readonly: '只读',
    png: 'PNG', jpeg: 'JPEG'
  }
  const key = String(option)
  return labelMap[key] || key
}

function formatMultiEnumLabel(option: any): string {
  const labelMap: Record<string, string> = {
    Alt: 'Alt (Alt)',
    Control: 'Control (Ctrl)',
    Meta: 'Meta (Win/Cmd)',
    Shift: 'Shift (Shift)'
  }
  const key = String(option)
  return labelMap[key] || key
}

function parseBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val
  if (val === 'true' || val === '1' || val === 1) return true
  if (val === 'false' || val === '0' || val === 0) return false
  return !!val
}

function handleArrayInput(val: string): void {
  try {
    const parsed = JSON.parse(val)
    Array.isArray(parsed)
      ? emit('update:modelValue', parsed)
      : emit('update:modelValue', val)
  } catch {
    emit('update:modelValue', val)
  }
}

function handleArrayBlur(): void {
  emit('blur', props.param.name)
  if (typeof props.modelValue === 'string' && props.modelValue.trim()) {
    try { emit('update:modelValue', JSON.parse(props.modelValue)) } catch { /* ignore */ }
  }
}

function handleObjectInput(val: string): void {
  try {
    const parsed = JSON.parse(val)
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? emit('update:modelValue', parsed)
      : emit('update:modelValue', val)
  } catch {
    emit('update:modelValue', val)
  }
}

function handleObjectBlur(): void {
  emit('blur', props.param.name)
  if (typeof props.modelValue === 'string' && props.modelValue.trim()) {
    try { emit('update:modelValue', JSON.parse(props.modelValue)) } catch { /* ignore */ }
  }
}

function updatePosition(axis: 'x' | 'y', value: any): void {
  const current = (typeof props.modelValue === 'object' && props.modelValue !== null)
    ? props.modelValue
    : { x: undefined, y: undefined }
  emit('update:modelValue', { ...current, [axis]: value ?? undefined })
}
</script>