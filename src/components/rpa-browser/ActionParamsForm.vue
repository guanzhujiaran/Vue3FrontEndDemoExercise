<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Delete, Setting, Plus } from '@element-plus/icons-vue'
import ActionCard from './ActionCard.vue'

defineOptions({
  name: 'ActionParamsForm'
})

interface JsonSchemaNode {
  type?: string
  description?: string
  default?: unknown
  title?: string
  properties?: Record<string, JsonSchemaNode>
  required?: string[]
  $ref?: string
  $defs?: Record<string, JsonSchemaNode>
  anyOf?: JsonSchemaNode[]
  enum?: unknown[]
  maxLength?: number
  minimum?: number
  maximum?: number
  additionalProperties?: JsonSchemaNode | boolean
  [key: string]: unknown
}

interface Props {
  jsonSchema?: {
    properties?: Record<string, JsonSchemaNode>
    required?: string[]
    $defs?: Record<string, JsonSchemaNode>
  }
  inputVars?: Record<string, unknown>
  outputVars?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  inputVars: () => ({}),
  outputVars: () => []
})

const emit = defineEmits<{
  'update:input-vars': [vars: Record<string, unknown>]
  'update:output-vars': [vars: string[]]
}>()

const formData = defineModel<Record<string, unknown>>('formData', { default: () => ({}) })

const resolveRef = (
  schema: JsonSchemaNode,
  defs: Record<string, JsonSchemaNode>,
  // 跟踪当前正在解析的 $ref 路径，仅用于防止循环引用（A→B→A）。
  // 不同于"已解析集合"，递归返回后会移出，允许同一个 ref 被多个兄弟字段引用。
  visiting: Set<string> = new Set(),
): JsonSchemaNode => {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema as unknown as JsonSchemaNode

  if (schema.$ref) {
    const refPath = schema.$ref
    if (refPath.startsWith('#/$defs/')) {
      const refName = refPath.split('/').pop()
      // 只阻止循环引用（当前路径上正在解析的 ref），允许重复 ref 解析
      if (refName && defs?.[refName] && !visiting.has(refName)) {
        visiting.add(refName)
        const resolved = { ...defs[refName] }
        // 不继承被引用 schema 的 title（如枚举类名 "Time Preset Enum"），
        // 字段标签应回退到外层 schema 的 title 或字段 key
        delete resolved.title
        if (schema.description) {
          resolved.description = schema.description
        }
        if (schema.default !== undefined) {
          resolved.default = schema.default
        }
        if (schema.title) {
          resolved.title = schema.title
        }
        const result = resolveRef(resolved, defs, visiting)
        visiting.delete(refName)
        return result
      }
    }
    return schema
  }

  if (schema.anyOf) {
    const nonNullSchema = schema.anyOf.find((s: JsonSchemaNode) => s.type !== 'null' && !s.type?.includes('null'))
    if (nonNullSchema) {
      const resolved = resolveRef(nonNullSchema, defs, visiting)
      // 不继承被引用 schema 的 title（如枚举类名），字段标签回退到外层 title 或字段 key
      delete resolved.title
      if (schema.default !== undefined) {
        resolved.default = schema.default
      }
      if (schema.description) {
        resolved.description = schema.description
      }
      if (schema.title) {
        resolved.title = schema.title
      }
      return resolved
    }
  }

  // allOf: Pydantic 非空枚举字段使用 allOf: [{"$ref": "#/$defs/EnumName"}]
  if (schema.allOf) {
    const merged: Record<string, unknown> = {}
    for (const subSchema of schema.allOf) {
      const resolved = resolveRef(subSchema as JsonSchemaNode, defs, visiting)
      for (const [k, v] of Object.entries(resolved)) {
        if (k === 'title') continue  // 不继承枚举类名作为 title
        merged[k] = v
      }
    }
    // 合并外层 schema 的属性（default, description, title 等）
    for (const [k, v] of Object.entries(schema)) {
      if (k === 'allOf') continue
      merged[k] = v
    }
    return merged as unknown as JsonSchemaNode
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$ref') continue
    if (Array.isArray(value)) {
      result[key] = value
    } else if (typeof value === 'object' && value !== null) {
      result[key] = resolveRef(value as JsonSchemaNode, defs, visiting)
    } else {
      result[key] = value
    }
  }
  return result as unknown as JsonSchemaNode
}

const resolvedProperties = computed(() => {
  const defs = props.jsonSchema?.$defs || {}
  const rawProperties = props.jsonSchema?.properties || {}
  const resolved: Record<string, JsonSchemaNode> = {}
  
  for (const [key, prop] of Object.entries(rawProperties)) {
    resolved[key] = resolveRef(prop, defs)
  }
  
  return resolved
})

const properties = computed(() => {
  return resolvedProperties.value
})

const requiredFields = computed(() => {
  return new Set(props.jsonSchema?.required || [])
})

/** 解析嵌套对象属性的 $ref/anyOf，确保 enum 等字段信息可见 */
const resolveNestedProperties = (prop: JsonSchemaNode): Record<string, JsonSchemaNode> => {
  const defs = props.jsonSchema?.$defs || {}
  const rawNested = prop.properties || {}
  const resolved: Record<string, JsonSchemaNode> = {}
  for (const [subKey, subProp] of Object.entries(rawNested)) {
    resolved[subKey] = resolveRef(subProp, defs)
  }
  return resolved
}

/** 判断字段是否为 Unix 时间戳（用于渲染 datetime picker） */
const isTimestampField = (key: string, prop: JsonSchemaNode): boolean => {
  if (prop.type !== 'integer' && prop.type !== 'number') return false
  const desc = prop.description || ''
  return (/_start$|_end$/.test(key) && /Unix|时间|timestamp/i.test(desc))
}

/** Unix 时间戳（秒）→ Date（用于 el-date-picker 显示） */
const tsToDate = (val: unknown): Date | null => {
  if (val === null || val === undefined || val === '') return null
  const num = typeof val === 'number' ? val : Number(val)
  if (!num || isNaN(num)) return null
  return new Date(num * 1000)
}

/** Date → Unix 时间戳（秒）（用于 el-date-picker 更新） */
const dateToTs = (date: Date | null): number | null => {
  if (!date) return null
  return Math.floor(date.getTime() / 1000)
}

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    string: '文本',
    number: '数字',
    boolean: '布尔',
    object: '对象',
    array: '数组'
  }
  return map[type] || type
}

const getEnumOptionLabel = (val: unknown): string => {
  if (val === '' || val === null || val === undefined) return '无'
  return String(val)
}

const initFormData = () => {
  const data: Record<string, unknown> = { ...(formData.value || {}) }
  for (const [key, prop] of Object.entries(properties.value)) {
    if (data[key] === undefined || data[key] === null) {
      if (prop.type === 'object' && prop.properties) {
        const nestedObj: Record<string, unknown> = {}
        const resolvedNested = resolveNestedProperties(prop)
        for (const [subKey, subProp] of Object.entries(resolvedNested)) {
          if (subProp.default !== undefined) {
            nestedObj[subKey] = subProp.default
          } else if (subProp.type === 'number' || subProp.type === 'integer') {
            nestedObj[subKey] = null
          } else if (subProp.enum && subProp.enum.length > 0) {
            nestedObj[subKey] = null
          } else if (subProp.type === 'boolean') {
            nestedObj[subKey] = false
          } else {
            nestedObj[subKey] = ''
          }
        }
        data[key] = nestedObj
      } else if (prop.type === 'object' && prop.additionalProperties) {
        // Dict 类型（如 headers/params/body_form）：初始化为空对象
        data[key] = prop.default !== undefined ? prop.default : {}
      } else {
        data[key] = prop.default !== undefined ? prop.default : ''
      }
    }
  }
  formData.value = data
}

// ─── 键值对编辑辅助方法（Dict 类型对象） ───────────────
const getDictEntries = (key: string): Array<[string, string]> => {
  const obj = formData.value[key]
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
}

const addDictEntry = (key: string) => {
  if (!formData.value[key] || typeof formData.value[key] !== 'object') {
    formData.value[key] = {}
  }
  const obj = formData.value[key] as Record<string, string>
  let newKey = 'new_key'
  let i = 1
  while (newKey in obj) {
    newKey = `new_key_${i++}`
  }
  obj[newKey] = ''
}

const updateDictKey = (key: string, oldKey: string, newKey: string) => {
  if (oldKey === newKey) return
  const obj = formData.value[key] as Record<string, string> | undefined
  if (!obj) return
  const value = obj[oldKey] ?? ''
  delete obj[oldKey]
  obj[newKey] = value
}

const updateDictValue = (key: string, entryKey: string, value: string) => {
  const obj = formData.value[key] as Record<string, string> | undefined
  if (!obj) return
  obj[entryKey] = value
}

const removeDictEntry = (key: string, entryKey: string) => {
  const obj = formData.value[key] as Record<string, string> | undefined
  if (!obj) return
  delete obj[entryKey]
}

watch(
  () => props.jsonSchema,
  () => initFormData(),
  { immediate: true, deep: true },
)

const localInputVarKeys = ref<string[]>(Object.keys(props.inputVars))
const localInputVarValues = ref<unknown[]>(Object.values(props.inputVars))
const localOutputVars = ref<string[]>([...props.outputVars])

const localInputVars = computed(() => {
  const result: Record<string, unknown> = {}
  localInputVarKeys.value.forEach((key, index) => {
    result[key] = localInputVarValues.value[index]
  })
  return result
})

watch(
  () => props.inputVars,
  (newVal) => {
    const keys = Object.keys(newVal)
    const values = Object.values(newVal)
    if (JSON.stringify(keys) !== JSON.stringify(localInputVarKeys.value) || 
        JSON.stringify(values) !== JSON.stringify(localInputVarValues.value)) {
      localInputVarKeys.value = keys
      localInputVarValues.value = values
    }
  },
  { deep: true }
)

watch(
  () => props.outputVars,
  (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(localOutputVars.value)) {
      localOutputVars.value = [...newVal]
    }
  },
  { deep: true }
)

watch(
  localInputVars,
  (newVal) => {
    emit('update:input-vars', { ...newVal })
  },
  { deep: true }
)

watch(
  localOutputVars,
  (newVal) => {
    emit('update:output-vars', [...newVal])
  },
  { deep: true }
)

const addInputVar = () => {
  const key = `var_${localInputVarKeys.value.length + 1}`
  localInputVarKeys.value = [...localInputVarKeys.value, key]
  localInputVarValues.value = [...localInputVarValues.value, '']
}

const removeInputVar = (index: number) => {
  localInputVarKeys.value = localInputVarKeys.value.filter((_, i) => i !== index)
  localInputVarValues.value = localInputVarValues.value.filter((_, i) => i !== index)
}

const addOutputVar = () => {
  localOutputVars.value = [...localOutputVars.value, `out_${localOutputVars.value.length + 1}`]
}

const removeOutputVar = (index: number) => {
  const newVars = [...localOutputVars.value]
  newVars.splice(index, 1)
  localOutputVars.value = newVars
}

/** 无需作为通用参数展示的保留键（由分支/条件编辑器单独处理） */
const RESERVED_KEYS = new Set(['TrueBranch', 'FalseBranch', 'loopBranch', 'condition', 'step_children'])

/** 当 json_schema 缺失时，回退为展示 formData 中已有的键 */
const fallbackFormKeys = computed(() => {
  if (Object.keys(properties.value).length > 0) return []
  return Object.keys(formData.value || {}).filter(k => k && !RESERVED_KEYS.has(k))
})

/** 值是否为可简单编辑的类型 */
const isSimpleValue = (v: unknown): v is string | number | boolean | null | undefined =>
  v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

/** HTTP 请求 body 字段根据 body_type 条件显示 */
const BODY_FIELD_VISIBILITY: Record<string, string> = {
  body_json: 'json',
  body_form: 'form',
  body_raw: 'raw',
  raw_content_type: 'raw',
}

// fetch_external_data 专用：HTTP 模式与 RPC 模式参数完全分离
// HTTP 模式（method_name 为空）：仅展示 HTTP 专属字段
// RPC 模式（method_name 有值）：仅展示 RPC 专属字段，隐藏所有 HTTP 字段
const HTTP_ONLY_FIELDS = new Set([
  'url', 'method', 'headers', 'params',
  'body_type', 'body_json', 'body_form', 'body_raw', 'raw_content_type',
  'follow_redirects', 'proxy',
])

// method_name → 对应的强类型参数字段名（与后端 RPC_METHOD_PARAMS_FIELD_MAP 一一对应）
const RPC_METHOD_PARAMS_FIELD_MAP: Record<string, string> = {
  'get_reserve_lottery': 'get_reserve_lottery_params',
  'get_official_lottery': 'get_official_lottery_params',
  'get_charge_lottery': 'get_charge_lottery_params',
  'get_topic_lottery': 'get_topic_lottery_params',
  'get_all_lottery': 'get_all_lottery_params',
  'get_others_lot_dyn_list': 'get_others_lot_dyn_list_params',
}
// 所有 RPC 方法参数字段名集合
const RPC_PARAMS_FIELDS = new Set(Object.values(RPC_METHOD_PARAMS_FIELD_MAP))

const isFetchExternalDataForm = computed(() => 'method_name' in (properties.value || {}))

const isRpcMode = computed(() => {
  if (!isFetchExternalDataForm.value) return false
  const v = formData.value['method_name']
  return v !== null && v !== undefined && v !== ''
})

// 当前选中的 RPC 方法名
const currentMethodName = computed(() => {
  const v = formData.value['method_name']
  return (v !== null && v !== undefined && v !== '') ? String(v) : ''
})

/** 切换 RPC 方法名时清空上一个方法的参数，并自动加载新方法的默认值 */
watch(
  () => formData.value['method_name'],
  (newVal, oldVal) => {
    if (newVal === oldVal) return
    // 清空上一个方法的参数，避免残留数据混入新方法
    if (oldVal) {
      const oldParamsField = RPC_METHOD_PARAMS_FIELD_MAP[oldVal as string]
      if (oldParamsField && oldParamsField in formData.value) {
        delete formData.value[oldParamsField]
      }
    }
    // 强制清空新方法的参数字段，确保 initFormData 用最新 schema default 重新初始化
    // （首次 initFormData 会把所有 xxx_params 字段初始化为对象，切换方法时若不清空，
    //   initFormData 的 if (data[key] === undefined || null) 判断会跳过已有值字段，
    //   导致后端新加的 default 值无法填入）
    if (newVal) {
      const newParamsField = RPC_METHOD_PARAMS_FIELD_MAP[newVal as string]
      if (newParamsField && newParamsField in formData.value) {
        delete formData.value[newParamsField]
      }
    }
    // 自动加载新方法的后端定义默认值（如 page_num=1, page_size=1000 等）
    // newVal 为空（取消选择）时也调用，以重建表单默认值
    initFormData()
  }
)

const isFieldVisible = (key: string): boolean => {
  // body 字段根据 body_type 控制
  const expectedBodyType = BODY_FIELD_VISIBILITY[key]
  if (expectedBodyType && formData.value['body_type'] !== expectedBodyType) {
    return false
  }

  // fetch_external_data 模式控制
  if (isFetchExternalDataForm.value) {
    // RPC 模式下隐藏所有 HTTP 专属字段
    if (isRpcMode.value && HTTP_ONLY_FIELDS.has(key)) return false
    // HTTP 模式下隐藏所有 RPC 参数字段
    if (!isRpcMode.value && RPC_PARAMS_FIELDS.has(key)) return false
    // RPC 模式下仅展示当前选中方法名对应的参数字段，其余 RPC 参数字段隐藏
    if (isRpcMode.value && RPC_PARAMS_FIELDS.has(key)) {
      const expectedField = RPC_METHOD_PARAMS_FIELD_MAP[currentMethodName.value]
      return key === expectedField
    }
  }

  return true
}

/** JSON 字段编辑与校验 */
const jsonErrorState = ref<Record<string, string>>({})
const jsonDisplayValues = ref<Record<string, string>>({})

const getJsonDisplayValue = (key: string): string => {
  if (key in jsonDisplayValues.value) return jsonDisplayValues.value[key]
  const val = formData.value[key]
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

const handleJsonInput = (key: string, val: string) => {
  jsonDisplayValues.value[key] = val
  if (val.trim() === '') {
    formData.value[key] = null
    delete jsonErrorState.value[key]
    return
  }
  try {
    formData.value[key] = JSON.parse(val)
    delete jsonErrorState.value[key]
  } catch (e) {
    jsonErrorState.value[key] = (e as Error).message
  }
}

const isJsonField = (key: string, prop: JsonSchemaNode): boolean => {
  if (key === 'body_json') return true
  return !prop.type && !isSimpleValue(formData.value[key]) && typeof formData.value[key] !== 'boolean'
}
</script>

<template>
  <div class="space-y-4">
    <!-- 输入变量部分 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-icon><Setting /></el-icon>
          <span class="text-sm font-medium text-text-regular">输入变量 (input_vars)</span>
        </div>
        <el-button :icon="Plus" @click="addInputVar" text>添加</el-button>
      </div>
      <div class="text-xs text-text-secondary">
        传入外部变量值，在参数中通过 <code class="px-1 py-0.5 bg-[var(--el-fill-color)] rounded">&#123;&#123;变量名&#125;&#125;</code> 引用
      </div>
      
      <div v-if="localInputVarKeys.length === 0" class="text-center py-3 text-sm text-text-secondary bg-[var(--el-fill-color-light)] rounded border border-dashed border-border">
        暂无输入变量
      </div>
      
      <div 
        v-for="(key, index) in localInputVarKeys" 
        :key="index"
        class="flex items-center gap-2 p-2 bg-[var(--el-fill-color-light)] rounded border border-border"
      >
        <el-input
          v-model="localInputVarKeys[index]"
          placeholder="变量名"
          style="width: 120px"
        />
        <span class="text-xs text-text-secondary shrink-0">→</span>
        <el-input
          v-model="localInputVarValues[index]"
          placeholder="变量值"
        />
        <el-button :icon="Delete" @click="removeInputVar(index)" text />
      </div>
    </div>

    <!-- 输出变量部分 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-icon><Setting /></el-icon>
          <span class="text-sm font-medium text-text-regular">输出变量 (output_vars)</span>
        </div>
        <el-button :icon="Plus" @click="addOutputVar" text>添加</el-button>
      </div>
      <div class="text-xs text-text-secondary">
        声明当前步骤执行后需要保存的变量名，后续步骤可通过 <code class="px-1 py-0.5 bg-[var(--el-fill-color)] rounded">&#123;&#123;变量名&#125;&#125;</code> 引用
      </div>
      
      <div v-if="localOutputVars.length === 0" class="text-center py-3 text-sm text-text-secondary bg-[var(--el-fill-color-light)] rounded border border-dashed border-border">
        暂无输出变量
      </div>
      
      <div 
        v-for="(varName, index) in localOutputVars" 
        :key="index"
        class="flex items-center gap-2 p-2 bg-[var(--el-fill-color-light)] rounded border border-border"
      >
        <span class="text-xs text-text-secondary shrink-0">变量{{ index + 1 }}</span>
        <el-input
          v-model="localOutputVars[index]"
          placeholder="变量名"
        />
        <el-button :icon="Delete" @click="removeOutputVar(index)" text />
      </div>
    </div>

    <!-- 参数部分 -->
    <div v-if="Object.keys(properties).length > 0" class="space-y-3">
      <div class="flex items-center gap-2">
        <el-icon><Setting /></el-icon>
        <span class="text-sm font-medium text-text-regular">参数配置</span>
      </div>
      
      <template v-for="(prop, key) in properties" :key="key">
      <div
        v-if="isFieldVisible(String(key))"
        class="space-y-2 p-3 bg-[var(--el-fill-color-light)] rounded border border-border"
      >
        <div class="flex items-center gap-1">
          <span class="text-sm font-medium text-text-regular">{{ prop.title || key }}</span>
          <span v-if="requiredFields.has(key)" class="text-red-500 text-sm">*</span>
          <span class="text-xs text-text-secondary ml-2">({{ getTypeLabel(prop.type) }})</span>
        </div>
        
        <div v-if="prop.type === 'object' && prop.properties">
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="(subProp, subKey) in resolveNestedProperties(prop)"
              :key="subKey"
              class="flex flex-col gap-1"
            >
              <el-text size="small" type="info" class="action-params-form__sub-label">
                {{ subProp.title || subKey }}
              </el-text>
              <!-- 枚举字段：下拉选择 -->
              <el-select
                v-if="subProp.enum && subProp.enum.length > 0"
                :model-value="formData[key]?.[subKey] ?? null"
                @update:model-value="val => { if (!formData[key]) formData[key] = {}; formData[key][subKey] = (val === '' || val === undefined) ? null : val }"
                style="width: 100%"
                :clearable="!(prop.required || []).includes(String(subKey))"
                :placeholder="subProp.description || `请选择${subKey}`"
              >
                <el-option
                  v-for="val in subProp.enum"
                  :key="val"
                  :label="getEnumOptionLabel(val)"
                  :value="val"
                />
              </el-select>
              <!-- 时间戳字段：datetime picker -->
              <el-date-picker
                v-else-if="isTimestampField(String(subKey), subProp)"
                :model-value="tsToDate(formData[key]?.[subKey])"
                @update:model-value="val => { if (!formData[key]) formData[key] = {}; formData[key][subKey] = dateToTs(val) }"
                type="datetime"
                style="width: 100%"
                :placeholder="subProp.description || `请选择${subKey}`"
                clearable
              />
              <!-- 数字字段 -->
              <el-input
                v-else-if="subProp.type === 'number' || subProp.type === 'integer'"
                :model-value="formData[key]?.[subKey]"
                @update:model-value="val => { if (!formData[key]) formData[key] = {}; formData[key][subKey] = val === '' ? null : Number(val) }"
                type="number"
                :placeholder="subProp.description"
              />
              <!-- 布尔字段 -->
              <el-switch
                v-else-if="subProp.type === 'boolean'"
                :model-value="formData[key]?.[subKey] ?? false"
                @update:model-value="val => { if (!formData[key]) formData[key] = {}; formData[key][subKey] = val }"
                active-text="是"
                inactive-text="否"
              />
              <!-- 文本字段 -->
              <el-input
                v-else
                :model-value="formData[key]?.[subKey]"
                @update:model-value="val => { if (!formData[key]) formData[key] = {}; formData[key][subKey] = val }"
                :placeholder="subProp.description || `请输入${subKey}`"
              />
            </div>
          </div>
        </div>

        <!-- Dict 类型对象（additionalProperties）：键值对编辑器 -->
        <div v-else-if="prop.type === 'object' && prop.additionalProperties" class="action-params-form__kv-editor space-y-2">
          <div v-if="getDictEntries(key).length === 0" class="text-center py-2 text-sm text-text-secondary bg-[var(--el-fill-color-light)] rounded border border-dashed border-border">
            暂无键值对，点击下方按钮添加
          </div>
          <div
            v-for="([entryKey, entryValue], idx) in getDictEntries(key)"
            :key="idx"
            class="flex items-center gap-2 action-params-form__kv-row"
          >
            <el-input
              :model-value="entryKey"
              @update:model-value="newKey => updateDictKey(key, entryKey, newKey)"
              placeholder="键名"
              class="flex-1"
            />
            <el-text size="small" type="info" class="shrink-0">:</el-text>
            <el-input
              :model-value="entryValue"
              @update:model-value="val => updateDictValue(key, entryKey, val)"
              placeholder="键值"
              class="flex-1"
            />
            <el-button :icon="Delete" @click="removeDictEntry(key, entryKey)" text />
          </div>
          <el-button :icon="Plus" @click="addDictEntry(key)" text>添加键值对</el-button>
        </div>

        <div v-else>
          <el-switch
            v-if="prop.type === 'boolean'"
            v-model="formData[key]"
            active-text="是"
            inactive-text="否"
          />
          
          <el-date-picker
            v-else-if="isTimestampField(String(key), prop)"
            :model-value="tsToDate(formData[key])"
            @update:model-value="val => formData[key] = dateToTs(val)"
            type="datetime"
            style="width: 100%"
            :placeholder="prop.description || `请选择${key}`"
            clearable
          />

          <el-select
            v-else-if="prop.enum && prop.enum.length > 0"
            :model-value="formData[key]"
            @update:model-value="val => formData[key] = (val === '' || val === undefined) ? null : val"
            style="width: 100%"
            :clearable="!requiredFields.has(String(key))"
          >
            <el-option
              v-for="val in prop.enum"
              :key="val"
              :label="getEnumOptionLabel(val)"
              :value="val"
            />
          </el-select>

          <el-input-number
            v-else-if="prop.type === 'number' || prop.type === 'integer'"
            v-model="formData[key]"
            :min="prop.minimum"
            :max="prop.maximum"
            style="width: 100%"
          />

          <template v-else-if="isJsonField(String(key), prop)">
            <el-input
              :model-value="getJsonDisplayValue(String(key))"
              @update:model-value="val => handleJsonInput(String(key), val)"
              placeholder='请输入 JSON，如 {"key": "value"}'
              type="textarea"
              :rows="4"
              :class="jsonErrorState[String(key)] ? '[&_.el-textarea__inner]:border-danger' : ''"
            />
            <el-text v-if="jsonErrorState[String(key)]" size="small" type="danger" class="block mt-1">
              JSON 格式错误: {{ jsonErrorState[String(key)] }}
            </el-text>
          </template>

          <el-input
            v-else
            v-model="formData[key]"
            type="textarea"
            :rows="prop.maxLength && prop.maxLength > 500 ? 3 : 1"
            :placeholder="prop.description || `请输入${key}`"
            :maxlength="prop.maxLength"
            show-word-limit
          />
        </div>
        
        <div v-if="prop.description" class="text-xs text-text-secondary">
          {{ prop.description }}
        </div>
      </div>
      </template>

    </div>

    <!-- 无 json_schema 时的回退展示 -->
    <div v-if="Object.keys(properties).length === 0 && fallbackFormKeys.length > 0" class="space-y-3">
      <div class="flex items-center gap-2">
        <el-icon><Setting /></el-icon>
        <span class="text-sm font-medium text-text-regular">参数配置</span>
      </div>
      <div
        v-for="key in fallbackFormKeys"
        :key="key"
        class="space-y-1 p-3 bg-[var(--el-fill-color-light)] rounded border border-border"
      >
        <span class="text-sm font-medium text-text-regular">{{ key }}</span>
        <el-switch
          v-if="typeof formData[key] === 'boolean'"
          v-model="formData[key]"
          active-text="是"
          inactive-text="否"
        />
        <el-input
          v-else-if="isSimpleValue(formData[key]) && typeof formData[key] !== 'boolean'"
          v-model="formData[key]"
          :placeholder="`请输入 ${key}`"
          type="textarea"
          :rows="1"
        />
        <template v-else>
          <el-input
            :model-value="getJsonDisplayValue(key)"
            @update:model-value="val => handleJsonInput(key, val)"
            placeholder="JSON 值"
            type="textarea"
            :rows="3"
            :class="jsonErrorState[key] ? '[&_.el-textarea__inner]:border-danger' : ''"
          />
          <el-text v-if="jsonErrorState[key]" size="small" type="danger" class="block mt-1">
            JSON 格式错误: {{ jsonErrorState[key] }}
          </el-text>
        </template>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="Object.keys(properties).length === 0 && fallbackFormKeys.length === 0" class="text-center py-8 text-sm text-text-secondary">
      无参数配置
    </div>
  </div>
</template>
