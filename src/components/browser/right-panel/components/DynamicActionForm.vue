<template>
  <div class="dynamic-action-form space-y-3" :class="{ 'ml-3 pl-3 border-l-2 border-blue-300 dark:border-blue-700': depth > 0 }">
    <!-- 头部信息 -->
    <div class="flex items-center gap-2 mb-1">
      <span class="text-xs font-mono font-medium text-[var(--el-text-color-secondary)]">{{ actionId }}</span>
      <el-tag size="small" type="info" effect="plain" class="!text-[10px]">动态表单</el-tag>
      <el-tag v-if="isControlFlow" size="small" type="danger" effect="plain" class="!text-[10px]">控制流</el-tag>
      <el-tag v-if="safeParameters.length > 0 && !isControlFlow" size="small" effect="plain" type="warning" class="!text-[10px]">{{ safeParameters.length }} 参数</el-tag>
      <el-tag v-if="depth > 0" size="small" effect="plain" class="!text-[9px] !py-0 !px-1 font-mono">L{{ depth }}</el-tag>
    </div>

    <!-- 普通参数区域 -->
    <div v-if="safeParameters.length > 0" class="space-y-2">
      <!-- Loop 特殊提示 -->
      <div v-if="actionId === 'loop'" class="rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
        <div class="font-medium flex items-center gap-1">
          <el-icon :size="14"><InfoFilled /></el-icon> 循环控制流
        </div>
        <div class="text-blue-600/80 dark:text-blue-400/80">count（固定次数）与 items（遍历列表）二选一，可在下方「循环体」中添加子步骤</div>
      </div>

      <!-- IfElse 特殊提示 -->
      <div v-if="actionId === 'if_else'" class="rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-3 py-2 text-[11px] text-purple-700 dark:text-purple-300 space-y-1.5">
        <div class="font-medium flex items-center gap-1">
          <el-icon :size="14"><InfoFilled /></el-icon> 条件分支控制流
        </div>
        <div>condition 支持模板变量：</div>
        <div class="flex flex-wrap gap-1">
          <el-tag size="small" class="!text-[10px] font-mono cursor-pointer hover:!bg-purple-100" @click="insertVariable('state.loop.index')">{{ '{' }}{state.loop.index}{{ '}' }}</el-tag>
          <el-tag size="small" class="!text-[10px] font-mono cursor-pointer hover:!bg-purple-100" @click="insertVariable('state.loop.current_item')">{{ '{' }}{state.loop.current_item}{{ '}' }}</el-tag>
          <el-tag size="small" class="!text-[10px] font-mono cursor-pointer hover:!bg-purple-100" @click="insertVariable('state.last_result')">{{ '{' }}{state.last_result}{{ '}' }}</el-tag>
        </div>
      </div>

      <ActionParamEditor
        v-for="param in safeParameters"
        :key="param.name"
        :param="param"
        :model-value="getParamValue(param.name)"
        :error="errors[param.name]"
        @update:model-value="(val) => updateParam(param.name, val)"
        @blur="validateSingle(param.name)"
        @pick-selector="$emit('pick-selector', param.name)"
      />

      <!-- loop 补充字段：delay_between -->
      <div v-if="actionId === 'loop'" class="mt-1">
        <el-form-item label="delay_between" class="mb-0">
          <template #label>
            <div class="flex items-center gap-1">
              <span class="text-xs font-medium">delay_between</span>
              <el-tag size="small" effect="plain" class="!text-[9px] !py-0 !px-1 !h-4 text-orange-500 border-orange-300">扩展</el-tag>
            </div>
          </template>
          <el-input-number
            :model-value="params.delay_between ?? 0"
            :min="0"
            :max="60000"
            :step="100"
            controls-position="right"
            class="w-full"
            placeholder="ms"
            @change="(val: any) => updateParam('delay_between', val ?? 0)"
          />
          <div class="text-[10px] text-[var(--el-text-color-placeholder)] mt-0.5 m-0">每次迭代间的延迟时间（毫秒），默认 0</div>
        </el-form-item>
      </div>
    </div>

    <!-- 控制流子步骤编辑区 - 递归渲染 -->
    <div v-if="isControlFlow" class="control-flow-children rounded-lg border border-dashed overflow-hidden" :class="depth === 0 ? 'border-[var(--el-border-color)]' : 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'">

      <!-- Loop 循环体 -->
      <template v-if="actionId === 'loop'">
        <div class="bg-[var(--el-fill-color-light)] px-3 py-1.5 flex items-center justify-between border-b border-[var(--el-border-color-lighter)]">
          <div class="flex items-center gap-1.5">
            <el-icon :size="14" class="text-blue-500"><RefreshRight /></el-icon>
            <span class="text-xs font-medium text-blue-600 dark:text-blue-400">循环体 (children)</span>
            <el-tag size="small" type="info" effect="plain" class="!text-[10px]">{{ localChildren.length }} 步骤</el-tag>
          </div>
          <el-button size="small" text type="primary" :disabled="depth >= MAX_DEPTH" @click="addChildStep">
            <el-icon :size="12"><Plus /></el-icon> 添加步骤
          </el-button>
        </div>

        <!-- 最大嵌套深度警告 -->
        <div v-if="depth >= MAX_DEPTH" class="mx-3 mt-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
          <el-icon :size="13"><WarningFilled /></el-icon>
          已达最大嵌套深度 ({{ MAX_DEPTH }} 层)，无法继续添加子控制流
        </div>

        <div class="p-2 space-y-2 min-h-[60px] max-h-[500px] overflow-y-auto">
          <div v-if="localChildren.length === 0" class="text-center py-6 text-[11px] text-[var(--el-text-color-placeholder)]">
            <el-icon :size="24" class="mb-1 text-[var(--el-text-color-placeholder)]"><FolderAdd /></el-icon>
            <p class="m-0">循环体为空，点击上方按钮添加子步骤</p>
            <p class="m-0 mt-0.5 text-[10px]">每次循环将依次执行以下步骤</p>
          </div>

          <!-- 递归：每个子步骤渲染完整 DynamicActionForm -->
          <div
            v-for="(child, idx) in localChildren"
            :key="idx"
            class="group relative rounded-lg border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-blank)] overflow-hidden hover:border-blue-300 transition-colors"
          >
            <!-- 子步骤头部工具栏 -->
            <div class="flex items-center justify-between px-3 py-1 bg-[var(--el-fill-color-light)] border-b border-[var(--el-border-color-lighter)]">
              <div class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center font-bold shrink-0">{{ idx + 1 }}</span>
                <el-select
                  :model-value="child.action_id"
                  placeholder="选择操作..."
                  size="small"
                  filterable
                  class="w-[160px]"
                  @change="(val: string) => updateChildAction(idx, val)"
                >
                  <el-option
                    v-for="opt in availableActions"
                    :key="opt.id || opt.action_id"
                    :value="opt.id || opt.action_id"
                    :label="opt.name || opt.action_id"
                  />
                </el-select>
                <el-tag v-if="child.action_id" size="small" effect="plain" class="!text-[9px] !py-0 !px-1">{{ getChildParamCount(child) }} 参数</el-tag>
              </div>
              <el-button size="small" text type="danger" class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" @click="removeChildStep(idx)">
                <el-icon :size="14"><Close /></el-icon>
              </el-button>
            </div>

            <!-- 递归渲染子步骤的完整表单 -->
            <div v-if="child.action_id" class="p-2">
              <DynamicActionForm
                :action-id="child.action_id"
                :params="child.params || {}"
                :parameters="getChildParameters(child.action_id)"
                :raw-action="getChildRawAction(child.action_id)"
                :depth="depth + 1"
                @update:params="(val: Record<string, any>) => updateChildParams(idx, val)"
                @validate="$emit('validate', $event)"
                @pick-selector="$emit('pick-selector', $event)"
              />
            </div>
            <div v-else class="p-4 text-center text-[11px] text-[var(--el-text-color-placeholder)]">
              请先选择一个操作类型
            </div>
          </div>
        </div>
      </template>

      <!-- IfElse 条件分支 -->
      <template v-if="actionId === 'if_else'">
        <div class="bg-[var(--el-fill-color-light)] px-3 py-1.5 flex items-center justify-between border-b border-[var(--el-border-color-lighter)]">
          <div class="flex items-center gap-1.5">
            <el-icon :size="14" class="text-purple-500"><Switch /></el-icon>
            <span class="text-xs font-medium text-purple-600 dark:text-purple-400">条件分支 (children)</span>
            <el-tag size="small" type="info" effect="plain" class="!text-[10px]">{{ localChildren.length }} 分支</el-tag>
          </div>
        </div>

        <div v-if="depth >= MAX_DEPTH" class="mx-3 mt-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
          <el-icon :size="13"><WarningFilled /></el-icon>
          已达最大嵌套深度 ({{ MAX_DEPTH }} 层)，无法继续添加子控制流
        </div>

        <div class="p-2 space-y-2 min-h-[80px] max-h-[500px] overflow-y-auto">
          <!-- True 分支 -->
          <div class="rounded border border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div class="bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 flex items-center gap-1.5 border-b border-emerald-200 dark:border-emerald-800">
              <el-icon :size="12" class="text-emerald-500"><CircleCheck /></el-icon>
              <span class="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">True 分支</span>
              <el-tag size="small" effect="plain" class="!text-[9px] !py-0 !px-1">{{ (localChildren[0] || []).length }} 步骤</el-tag>
              <el-button size="small" text type="primary" class="ml-auto !text-[10px]" :disabled="depth >= MAX_DEPTH" @click="addIfElseStep(0)">
                <el-icon :size="10"><Plus /></el-icon>
              </el-button>
            </div>
            <div class="p-1.5 space-y-2">
              <div v-if="!localChildren[0]?.length" class="text-center py-3 text-[10px] text-[var(--al-text-color-placeholder)]">空分支</div>
              <div
                v-for="(step, sIdx) in (localChildren[0] || [])"
                :key="'t-' + sIdx"
                class="group relative rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 bg-[var(--el-fill-color-blank)] overflow-hidden"
              >
                <div class="flex items-center justify-between px-2.5 py-1 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-200/40 dark:border-emerald-800/40">
                  <div class="flex items-center gap-1.5">
                    <span class="w-4 h-4 rounded bg-emerald-100 text-emerald-600 text-[9px] flex items-center justify-center font-bold shrink-0">{{ sIdx + 1 }}</span>
                    <el-select
                      :model-value="step.action_id"
                      size="small"
                      filterable
                      class="w-[140px]"
                      @change="(val: string) => updateIfElseStep(0, sIdx, val)"
                    >
                      <el-option v-for="opt in availableActions" :key="opt.id || opt.action_id" :value="opt.id || opt.action_id" :label="opt.name || opt.action_id" />
                    </el-select>
                  </div>
                  <el-button size="small" text type="danger" class="opacity-0 group-hover:opacity-100 !p-0.5 shrink-0" @click="removeIfElseStep(0, sIdx)">
                    <el-icon :size="12"><Close /></el-icon>
                  </el-button>
                </div>
                <div v-if="step.action_id" class="p-1.5">
                  <DynamicActionForm
                    :action-id="step.action_id"
                    :params="step.params || {}"
                    :parameters="getChildParameters(step.action_id)"
                    :raw-action="getChildRawAction(step.action_id)"
                    :depth="depth + 1"
                    @update:params="(val: Record<string, any>) => updateIfElseParams(0, sIdx, val)"
                    @validate="$emit('validate', $event)"
                    @pick-selector="$emit('pick-selector', $event)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- False 分支 -->
          <div class="rounded border border-red-200 dark:border-red-800 overflow-hidden">
            <div class="bg-red-50 dark:bg-red-900/20 px-2.5 py-1 flex items-center gap-1.5 border-b border-red-200 dark:border-red-800">
              <el-icon :size="12" class="text-red-500"><CircleClose /></el-icon>
              <span class="text-[11px] font-medium text-red-700 dark:text-red-400">False 分支</span>
              <el-tag size="small" effect="plain" class="!text-[9px] !py-0 !px-1">{{ (localChildren[1] || []).length }} 步骤</el-tag>
              <el-button size="small" text type="primary" class="ml-auto !text-[10px]" :disabled="depth >= MAX_DEPTH" @click="addIfElseStep(1)">
                <el-icon :size="10"><Plus /></el-icon>
              </el-button>
            </div>
            <div class="p-1.5 space-y-2">
              <div v-if="!localChildren[1]?.length" class="text-center py-3 text-[10px] text-[var(--el-text-color-placeholder)]">空分支（可选）</div>
              <div
                v-for="(step, sIdx) in (localChildren[1] || [])"
                :key="'f-' + sIdx"
                class="group relative rounded-lg border border-red-200/60 dark:border-red-800/60 bg-[var(--el-fill-color-blank)] overflow-hidden"
              >
                <div class="flex items-center justify-between px-2.5 py-1 bg-red-50/50 dark:bg-red-900/10 border-b border-red-200/40 dark:border-red-800/40">
                  <div class="flex items-center gap-1.5">
                    <span class="w-4 h-4 rounded bg-red-100 text-red-600 text-[9px] flex items-center justify-center font-bold shrink-0">{{ sIdx + 1 }}</span>
                    <el-select
                      :model-value="step.action_id"
                      size="small"
                      filterable
                      class="w-[140px]"
                      @change="(val: string) => updateIfElseStep(1, sIdx, val)"
                    >
                      <el-option v-for="opt in availableActions" :key="opt.id || opt.action_id" :value="opt.id || opt.action_id" :label="opt.name || opt.action_id" />
                    </el-select>
                  </div>
                  <el-button size="small" text type="danger" class="opacity-0 group-hover:opacity-100 !p-0.5 shrink-0" @click="removeIfElseStep(1, sIdx)">
                    <el-icon :size="12"><Close /></el-icon>
                  </el-button>
                </div>
                <div v-if="step.action_id" class="p-1.5">
                  <DynamicActionForm
                    :action-id="step.action_id"
                    :params="step.params || {}"
                    :parameters="getChildParameters(step.action_id)"
                    :raw-action="getChildRawAction(step.action_id)"
                    :depth="depth + 1"
                    @update:params="(val: Record<string, any>) => updateIfElseParams(1, sIdx, val)"
                    @validate="$emit('validate', $event)"
                    @pick-selector="$emit('pick-selector', $event)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 空状态（非控制流且无参数） -->
    <div v-else-if="safeParameters.length === 0" class="text-center py-4 text-[11px] bg-[var(--el-fill-color-light)] rounded">
      <el-icon :size="24" class="text-[var(--el-text-color-placeholder)] mb-1"><Document /></el-icon>
      <p class="m-0">此操作无需参数</p>
      <div v-if="rawAction" class="mt-2 text-left mx-3 space-y-1">
        <div class="text-[9px] text-orange-400/70 font-mono break-all max-h-32 overflow-auto leading-relaxed">
          <div>keys: {{ Object.keys(rawAction).join(', ') }}</div>
          <div v-if="rawAction.json_schema" class="text-emerald-400/80">✓ json_schema | props: {{ Object.keys(rawAction.json_schema.properties || {}).join(', ') || 'none' }}</div>
          <div v-else class="text-red-400/80">✗ no json_schema</div>
          <div>params prop: {{ Array.isArray(parameters) ? parameters.length : typeof parameters }} items</div>
          <div v-if="Array.isArray(parameters) && parameters.length > 0" class="text-blue-300/80">first: {{ parameters[0]?.name }}={{ parameters[0]?.type }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, inject, watch, type Ref } from 'vue'
import {
  Document,
  InfoFilled,
  Plus,
  Close,
  RefreshRight,
  Switch,
  CircleCheck,
  CircleClose,
  FolderAdd,
  WarningFilled
} from '@element-plus/icons-vue'
import ActionParamEditor from './ActionParamEditor.vue'
import type { ActionParameterDef } from '@/types/browser-automation-api'

const CONTROL_FLOW_ACTIONS = ['loop', 'if_else']
const MAX_DEPTH = 10

const props = withDefaults(defineProps<{
  actionId: string
  params: Record<string, any>
  parameters?: ActionParameterDef[]
  errors?: Record<string, string>
  compact?: boolean
  rawAction?: any
  depth?: number
}>(), {
  parameters: () => [],
  errors: () => ({}),
  compact: false,
  depth: 0
})

const emit = defineEmits<{
  'update:params': [value: Record<string, any>]
  validate: [name: string]
  'pick-selector': [name: string]
}>()

const registeredActions = inject<Ref<any[]>>('registeredActions', { value: [] })

const isControlFlow = computed(() => CONTROL_FLOW_ACTIONS.includes(props.actionId))

const safeParameters = computed(() => {
  return (props.parameters || []).filter((p): p is ActionParameterDef => p != null && p != undefined && p.name)
})

const availableActions = computed(() => {
  return (registeredActions.value || [])
})

function findActionById(actionId: string): any {
  return (registeredActions.value || []).find((a: any) =>
    (a.id === actionId || a.action_id === actionId)
  )
}

function getChildParameters(actionId: string): ActionParameterDef[] {
  const action = findActionById(actionId)
  return action?.parameters || []
}

function getChildRawAction(actionId: string): any {
  return findActionById(actionId)
}

function getChildParamCount(child: any): number {
  if (!child.action_id) return 0
  const action = findActionById(child.actionId)
  return action?.parameters?.length || 0
}

const localChildren = ref<any[]>([])

watch(() => props.params, (newParams) => {
  const children = newParams?.children
  if (props.actionId === 'if_else') {
    if (Array.isArray(children) && children.length >= 2) {
      localChildren.value = [children[0] || [], children[1] || []]
    } else if (Array.isArray(children) && children.length === 1) {
      localChildren.value = [children[0], []]
    } else {
      localChildren.value = [[], []]
    }
  } else {
    localChildren.value = Array.isArray(children) ? [...children] : []
  }
}, { immediate: true, deep: true })

function getParamValue(name: string): any {
  if (!name || !props.params) return undefined
  return props.params[name]
}

function updateParam(name: string, value: any): void {
  if (!name) return
  const newParams = { ...(props.params || {}), [name]: value }
  emit('update:params', newParams)
}

function validateSingle(name: string): void {
  if (!name) return
  emit('validate', name)
}

function insertVariable(varName: string): void {
  const current = getParamValue('condition') || ''
  const inserted = current + '{{' + varName + '}}'
  updateParam('condition', inserted)
}

function syncChildren(): void {
  let children: any
  if (props.actionId === 'if_else') {
    children = [localChildren.value[0] || [], localChildren.value[1] || []]
  } else {
    children = localChildren.value
  }
  updateParam('children', children)
}

// ========== Loop 子步骤操作 ==========

function addChildStep(): void {
  const firstAction = availableActions.value[0]
  localChildren.value.push({
    action_id: firstAction?.id || firstAction?.action_id || '',
    params: {}
  })
  syncChildren()
}

function removeChildStep(idx: number): void {
  localChildren.value.splice(idx, 1)
  syncChildren()
}

function updateChildAction(idx: number, actionId: string): void {
  if (localChildren.value[idx]) {
    localChildren.value[idx].action_id = actionId
    localChildren.value[idx].params = {}
  }
  syncChildren()
}

function updateChildParams(idx: number, params: Record<string, any>): void {
  if (localChildren.value[idx]) {
    localChildren.value[idx].params = params
  }
  syncChildren()
}

// ========== IfElse 分支操作 ==========

function addIfElseStep(branchIndex: number): void {
  const firstAction = availableActions.value[0]
  if (!localChildren.value[branchIndex]) {
    localChildren.value[branchIndex] = []
  }
  localChildren.value[branchIndex].push({
    action_id: firstAction?.id || firstAction?.action_id || '',
    params: {}
  })
  syncChildren()
}

function removeIfElseStep(branchIndex: number, stepIdx: number): void {
  if (localChildren.value[branchIndex]) {
    localChildren.value[branchIndex].splice(stepIdx, 1)
  }
  syncChildren()
}

function updateIfElseStep(branchIndex: number, stepIdx: number, actionId: string): void {
  if (localChildren.value[branchIndex]?.[stepIdx]) {
    localChildren.value[branchIndex][stepIdx].action_id = actionId
    localChildren.value[branchIndex][stepIdx].params = {}
  }
  syncChildren()
}

function updateIfElseParams(branchIndex: number, stepIdx: number, params: Record<string, any>): void {
  if (localChildren.value[branchIndex]?.[stepIdx]) {
    localChildren.value[branchIndex][stepIdx].params = params
  }
  syncChildren()
}
</script>