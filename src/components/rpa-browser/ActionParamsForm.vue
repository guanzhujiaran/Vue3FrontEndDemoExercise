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
  visited: Set<string> = new Set(),
): JsonSchemaNode => {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema as unknown as JsonSchemaNode

  if (schema.$ref) {
    const refPath = schema.$ref
    if (refPath.startsWith('#/$defs/')) {
      const refName = refPath.split('/').pop()
      if (refName && defs?.[refName] && !visited.has(refName)) {
        visited.add(refName)
        const resolved = { ...defs[refName] }
        if (schema.description) {
          resolved.description = schema.description
        }
        if (schema.default !== undefined) {
          resolved.default = schema.default
        }
        return resolveRef(resolved, defs, visited)
      }
    }
    return schema
  }

  if (schema.anyOf) {
    const nonNullSchema = schema.anyOf.find((s: JsonSchemaNode) => s.type !== 'null' && !s.type?.includes('null'))
    if (nonNullSchema) {
      const resolved = resolveRef(nonNullSchema, defs, visited)
      if (schema.default !== undefined) {
        resolved.default = schema.default
      }
      if (schema.description) {
        resolved.description = schema.description
      }
      return resolved
    }
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$ref') continue
    if (Array.isArray(value)) {
      result[key] = value
    } else if (typeof value === 'object' && value !== null) {
      result[key] = resolveRef(value as JsonSchemaNode, defs, visited)
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

const initFormData = () => {
  const data: Record<string, unknown> = { ...(formData.value || {}) }
  for (const [key, prop] of Object.entries(properties.value)) {
    if (data[key] === undefined || data[key] === null) {
      if (prop.type === 'object' && prop.properties) {
        const nestedObj: Record<string, unknown> = {}
        for (const [subKey, subProp] of Object.entries(prop.properties)) {
          if (subProp.default !== undefined) {
            nestedObj[subKey] = subProp.default
          } else if (subProp.type === 'number') {
            nestedObj[subKey] = null
          } else {
            nestedObj[subKey] = ''
          }
        }
        data[key] = nestedObj
      } else {
        data[key] = prop.default !== undefined ? prop.default : ''
      }
    }
  }
  formData.value = data
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
        <el-button size="small" :icon="Plus" @click="addInputVar" text>添加</el-button>
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
        <el-button size="small" :icon="Delete" @click="removeInputVar(index)" text />
      </div>
    </div>

    <!-- 输出变量部分 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-icon><Setting /></el-icon>
          <span class="text-sm font-medium text-text-regular">输出变量 (output_vars)</span>
        </div>
        <el-button size="small" :icon="Plus" @click="addOutputVar" text>添加</el-button>
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
        <el-button size="small" :icon="Delete" @click="removeOutputVar(index)" text />
      </div>
    </div>

    <!-- 参数部分 -->
    <div v-if="Object.keys(properties).length > 0" class="space-y-3">
      <div class="flex items-center gap-2">
        <el-icon><Setting /></el-icon>
        <span class="text-sm font-medium text-text-regular">参数配置</span>
      </div>
      
      <div 
        v-for="(prop, key) in properties" 
        :key="key"
        class="space-y-2 p-3 bg-[var(--el-fill-color-light)] rounded border border-border"
      >
        <div class="flex items-center gap-1">
          <span class="text-sm font-medium text-text-regular">{{ prop.title || key }}</span>
          <span v-if="requiredFields.has(key)" class="text-red-500 text-sm">*</span>
          <span class="text-xs text-text-secondary ml-2">({{ getTypeLabel(prop.type) }})</span>
        </div>
        
        <div v-if="prop.type === 'object' && prop.properties">
          <div class="flex gap-2">
            <div 
              v-for="(subProp, subKey) in prop.properties" 
              :key="subKey"
              class="flex-1"
            >
              <div class="text-xs text-text-secondary mb-1">{{ subProp.title || subKey }}</div>
              <el-input
                v-if="subProp.type === 'number'"
                :model-value="formData[key]?.[subKey]"
                @update:model-value="val => { if (!formData[key]) formData[key] = {}; formData[key][subKey] = val === '' ? null : Number(val) }"
                type="number"
                size="small"
                style="width: 100%"
                :placeholder="subProp.description"
              />
              <el-input
                v-else
                :model-value="formData[key]?.[subKey]"
                @update:model-value="val => { if (!formData[key]) formData[key] = {}; formData[key][subKey] = val }"
                size="small"
                :placeholder="subProp.description || `请输入${subKey}`"
              />
            </div>
          </div>
        </div>
        
        <div v-else>
          <el-switch
            v-if="prop.type === 'boolean'"
            v-model="formData[key]"
            active-text="是"
            inactive-text="否"
          />
          
          <el-input-number
            v-else-if="prop.type === 'number'"
            v-model="formData[key]"
            :min="prop.minimum"
            :max="prop.maximum"
            style="width: 100%"
          />
          
          <el-select
            v-else-if="prop.enum && prop.enum.length > 0"
            v-model="formData[key]"
            style="width: 100%"
          >
            <el-option 
              v-for="val in prop.enum" 
              :key="val"
              :label="String(val)" 
              :value="val" 
            />
          </el-select>
          
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
          size="small"
        />
        <el-input
          v-else-if="isSimpleValue(formData[key]) && typeof formData[key] !== 'boolean'"
          v-model="formData[key]"
          :placeholder="`请输入 ${key}`"
          size="small"
          type="textarea"
          :rows="1"
        />
        <el-input
          v-else
          :model-value="JSON.stringify(formData[key], null, 2)"
          @update:model-value="(val: string) => { try { formData[key] = JSON.parse(val) } catch { formData[key] = val } }"
          placeholder="JSON 值"
          size="small"
          type="textarea"
          :rows="3"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="Object.keys(properties).length === 0 && fallbackFormKeys.length === 0" class="text-center py-8 text-sm text-text-secondary">
      无参数配置
    </div>
  </div>
</template>
