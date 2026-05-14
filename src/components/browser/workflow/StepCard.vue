<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\workflow\StepCard.vue
 * @Description: 工作流步骤卡片 - 支持编辑参数、嵌套子步骤、插件配置、执行结果
-->
<template>
  <div
    :class="[
      'rounded-lg border transition-all duration-200',
      isControlFlow
        ? 'border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10'
        : 'border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-blank)]',
      executionError ? '!border-red-400 dark:!border-red-600' : '',
      'hover:shadow-sm'
    ]"
  >
    <!-- 步骤头部 -->
    <div class="flex items-center gap-2 px-3 py-2">
      <!-- 序号 -->
      <span class="text-xs font-mono text-[var(--el-text-color-secondary)] w-6 text-center shrink-0">
        {{ index + 1 }}
      </span>

      <!-- 动作标识 -->
      <el-tag
        :type="actionTagType"
        size="small"
        effect="plain"
        class="shrink-0"
      >
        {{ actionDef?.name || step.action_id }}
      </el-tag>

      <!-- 简要参数预览 -->
      <span class="text-xs text-[var(--el-text-color-secondary)] truncate flex-1 min-w-0">
        {{ paramsPreview }}
      </span>

      <!-- output_var 标记 -->
      <el-tag v-if="step.output_var" size="small" type="info" effect="plain" class="shrink-0">
        → {{ step.output_var }}
      </el-tag>

      <!-- 错误提示 -->
      <el-tooltip v-if="executionError" :content="executionError" placement="top">
        <el-icon class="text-red-500 shrink-0"><WarningFilled /></el-icon>
      </el-tooltip>

      <!-- 操作按钮 -->
      <div class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <el-button size="small" text :icon="Top" @click="$emit('moveUp')" :disabled="index === 0" />
        <el-button size="small" text :icon="Bottom" @click="$emit('moveDown')" />
        <el-button v-if="isControlFlow" size="small" text @click="toggleCollapse">
          <el-icon><component :is="step._collapsed ? ArrowRight : ArrowDown" /></el-icon>
        </el-button>
        <el-button size="small" text :icon="Delete" class="!text-red-400" @click="$emit('remove')" />
      </div>
    </div>

    <!-- 参数编辑区（可折叠） -->
    <div v-if="!step._collapsed" class="px-3 pb-2 pt-0">
      <!-- 参数表单 -->
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <template v-for="param in actionDef?.parameters" :key="param.name">
          <div :class="param.type === 'text' || param.type === 'code' ? 'col-span-2' : ''">
            <label class="text-[11px] text-[var(--el-text-color-secondary)] mb-0.5 block">
              {{ param.name }}{{ param.required ? ' *' : '' }}
            </label>
            <!-- 布尔类型 -->
            <el-switch
              v-if="param.type === 'boolean'"
              v-model="step.params[param.name]"
              size="small"
              @change="emitUpdate"
            />
            <!-- 数值类型 -->
            <el-input-number
              v-else-if="param.type === 'number' || param.type === 'int' || param.type === 'float'"
              v-model="step.params[param.name]"
              size="small"
              controls-position="right"
              class="w-full"
              @change="emitUpdate"
            />
            <!-- 多行文本 -->
            <el-input
              v-else-if="param.type === 'text' || param.type === 'code'"
              v-model="step.params[param.name]"
              type="textarea"
              :rows="3"
              size="small"
              :placeholder="param.description"
              @change="emitUpdate"
            />
            <!-- 普通输入 (带变量补全) -->
            <VariableInput
              v-else
              v-model="step.params[param.name]"
              :variables="availableVariables"
              :placeholder="param.description || param.name"
              size="small"
              @change="emitUpdate"
            />
          </div>
        </template>
      </div>

      <!-- output_var 输入 -->
      <div class="mt-2 flex items-center gap-2" v-if="!isControlFlow">
        <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0">输出变量</label>
        <el-input
          v-model="step.output_var"
          size="small"
          placeholder="例: reply (留空则不保存)"
          class="flex-1"
          @change="emitUpdate"
        />
      </div>

      <!-- 控制流字段编辑区 -->
      <div class="mt-3 border-t border-dashed border-[var(--el-border-color-lighter)] pt-3">
        <div
          class="flex items-center gap-1.5 cursor-pointer select-none mb-2"
          @click="showControlFlow = !showControlFlow"
        >
          <el-icon :size="14" class="text-amber-500 transition-transform" :class="{ 'rotate-90': showControlFlow }">
            <ArrowRight />
          </el-icon>
          <span class="text-[11px] font-medium text-amber-600 dark:text-amber-400">控制流</span>
          <el-tag
            v-if="hasControlFlowFields"
            size="small"
            type="warning"
            effect="plain"
            round
            class="!text-[10px] !px-1.5"
          >
            {{ activeControlFlowCount }}
          </el-tag>
        </div>

        <div v-if="showControlFlow" class="space-y-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-2.5">
          <!-- condition 条件执行 -->
          <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0 flex items-center gap-1">
              <el-icon :size="12" class="text-blue-500"><Connection /></el-icon>
              条件
            </label>
            <VariableInput
              v-model="step.condition"
              :variables="availableVariables"
              placeholder="{{variable}} == true"
              size="small"
              @change="emitUpdate"
            />
          </div>

          <!-- loop_count 固定循环 -->
          <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0 flex items-center gap-1">
              <el-icon :size="12" class="text-purple-500"><RefreshRight /></el-icon>
              循环N次
            </label>
            <el-input-number
              v-model="step.loop_count"
              :min="1"
              :max="9999"
              size="small"
              controls-position="right"
              placeholder="10"
              class="w-full"
              @change="emitUpdate"
            />
          </div>

          <!-- loop_while While循环 -->
          <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0 flex items-center gap-1">
              <el-icon :size="12" class="text-green-500"><VideoPlay /></el-icon>
              While
            </label>
            <VariableInput
              v-model="step.loop_while"
              :variables="availableVariables"
              placeholder="{{count}} < 100"
              size="small"
              @change="emitUpdate"
            />
          </div>

          <!-- loop Until循环 -->
          <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
            <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0 flex items-center gap-1">
              <el-icon :size="12" class="text-orange-500"><CircleCheck /></el-icon>
              Until
            </label>
            <VariableInput
              v-model="step.loop_until"
              :variables="availableVariables"
              placeholder="{{exists}} == true"
              size="small"
              @change="emitUpdate"
            />
          </div>

          <!-- retry 重试次数 -->
          <div class="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 gap-y-1 items-center">
            <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0 flex items-center gap-1">
              <el-icon :size="12" class="text-red-500"><WarningFilled /></el-icon>
              重试
            </label>
            <el-input-number
              v-model="step.retry"
              :min="0"
              :max="100"
              size="small"
              controls-position="right"
              placeholder="3"
              @change="emitUpdate"
            />
            <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0">间隔(s)</label>
            <el-input-number
              v-model="step.retry_delay"
              :min="0"
              :max="60"
              :step="0.5"
              size="small"
              controls-position="right"
              placeholder="1.0"
              @change="emitUpdate"
            />
          </div>

          <!-- description 描述 -->
          <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-start pt-1 border-t border-amber-200/40 dark:border-amber-800/30">
            <label class="text-[11px] text-[var(--el-text-color-secondary)] shrink-0 mt-1">描述</label>
            <el-input
              v-model="step.description"
              type="textarea"
              :rows="1"
              size="small"
              placeholder="步骤说明（可选）"
              resize="none"
              @change="emitUpdate"
            />
          </div>
        </div>
      </div>

      <!-- 插件配置区域 -->
      <div class="mt-3 border-t border-[var(--el-border-color-lighter)] pt-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <el-icon><Clock /></el-icon>
            <span class="text-[11px] text-[var(--el-text-color-secondary)]">已启用插件</span>
            <el-tag v-if="step.enabled_plugins?.length" size="small" type="info" effect="plain">
              {{ step.enabled_plugins.length }}
            </el-tag>
          </div>
          <el-button size="small" text :icon="Plus" @click="showPluginSelector = true">
            添加插件
          </el-button>
        </div>

        <div v-if="step.enabled_plugins?.length" class="flex flex-wrap gap-1.5">
          <el-tag
            v-for="(plugin, pIndex) in step.enabled_plugins"
            :key="plugin.plugin_id + '_' + pIndex"
            size="small"
            effect="plain"
            closable
            @close="removePlugin(pIndex)"
          >
            {{ plugin.plugin_id }}
          </el-tag>
        </div>

        <div v-else class="text-xs text-[var(--el-text-color-placeholder)] text-center py-2">
          暂无插件
        </div>
      </div>

      <!-- 子步骤区域 -->
      <div v-if="isControlFlow" class="mt-3">
        <!-- Loop 子步骤 -->
        <template v-if="step.action_id === 'loop'">
          <div class="text-[11px] text-[var(--el-text-color-secondary)] mb-1.5 flex items-center gap-1.5">
            <el-icon><RefreshRight /></el-icon>
            循环体
            <el-button size="small" text :icon="Plus" @click="addChildToBranch(0)">添加步骤</el-button>
          </div>
          <div class="ml-4 space-y-1.5 border-l-2 border-amber-200/60 pl-3">
            <StepCard
              v-for="(child, ci) in (step.children || [])"
              :key="child._uid"
              :step="child"
              :index="ci"
              :available-variables="availableVariables"
              @remove="$emit('removeChild', { parentUid: step._uid, branchIndex: 0, childUid: child._uid })"
              @move-up="swapChildren(0, ci, ci - 1)"
              @move-down="swapChildren(0, ci, ci + 1)"
              @add-child="$emit('addChild', $event)"
              @remove-child="$emit('removeChild', $event)"
              @update:step="replaceChild(0, ci, $event)"
            />
            <div v-if="!step.children?.length" class="text-xs text-[var(--el-text-color-placeholder)] py-2 text-center">
              循环体为空，点击上方「添加步骤」
            </div>
          </div>
        </template>

        <!-- IfElse 子步骤 -->
        <template v-if="step.action_id === 'if_else'">
          <div class="space-y-3">
            <!-- True 分支 -->
            <div>
              <div class="text-[11px] text-[var(--el-text-color-secondary)] mb-1.5 flex items-center gap-1.5">
                <el-tag size="small" type="success" effect="plain">True</el-tag>
                条件成立时
                <el-button size="small" text :icon="Plus" @click="addChildToBranch(0)">添加</el-button>
              </div>
              <div class="ml-4 space-y-1.5 border-l-2 border-green-200/60 pl-3">
                <StepCard
                  v-for="(child, ci) in trueBranch"
                  :key="child._uid"
                  :step="child"
                  :index="ci"
                  :available-variables="availableVariables"
                  @remove="$emit('removeChild', { parentUid: step._uid, branchIndex: 0, childUid: child._uid })"
                  @add-child="$emit('addChild', $event)"
                  @remove-child="$emit('removeChild', $event)"
                  @update:step="replaceChild(0, ci, $event)"
                />
              </div>
            </div>
            <!-- False 分支 -->
            <div>
              <div class="text-[11px] text-[var(--el-text-color-secondary)] mb-1.5 flex items-center gap-1.5">
                <el-tag size="small" type="danger" effect="plain">False</el-tag>
                条件不成立时
                <el-button size="small" text :icon="Plus" @click="addChildToBranch(1)">添加</el-button>
              </div>
              <div class="ml-4 space-y-1.5 border-l-2 border-red-200/60 pl-3">
                <StepCard
                  v-for="(child, ci) in falseBranch"
                  :key="child._uid"
                  :step="child"
                  :index="ci"
                  :available-variables="availableVariables"
                  @remove="$emit('removeChild', { parentUid: step._uid, branchIndex: 1, childUid: child._uid })"
                  @add-child="$emit('addChild', $event)"
                  @remove-child="$emit('removeChild', $event)"
                  @update:step="replaceChild(1, ci, $event)"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Delete, Top, Bottom, RefreshRight, ArrowRight, ArrowDown, WarningFilled, Clock, Connection, VideoPlay, CircleCheck } from '@element-plus/icons-vue'
import { PREDEFINED_ACTIONS, CATEGORY_CONFIG, CONTROL_FLOW_FIELDS, type StepNode } from '@/composables/useWorkflowEditor'
import VariableInput from './VariableInput.vue'
import type { EnabledPlugin } from '@/types/browser-automation-api'

const props = defineProps<{
  step: StepNode
  index: number
  availableVariables: string[]
  executionError?: string | null
  executionTime?: number | null
}>()

const emit = defineEmits<{
  remove: []
  'move-up': []
  'move-down': []
  'add-child': [payload: { parentUid: string; branchIndex: number; actionId: string }]
  'remove-child': [payload: { parentUid: string; branchIndex: number; childUid: string }]
  'update:step': [step: StepNode]
}>()

const actionDef = computed(() =>
  PREDEFINED_ACTIONS.find(a => a.id === props.step.action_id)
)

const isControlFlow = computed(() =>
  props.step.action_id === 'loop' || props.step.action_id === 'if_else'
)

const actionTagType = computed(() => {
  const cat = actionDef.value?.category
  const map: Record<string, string> = {
    navigation: 'primary',
    interaction: '',
    control_flow: 'warning',
    data: 'success',
    utility: 'info'
  }
  return map[cat || ''] || 'info'
})

const paramsPreview = computed(() => {
  const params = props.step.params
  if (!params || Object.keys(params).length === 0) return ''
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .slice(0, 2)
  return entries.map(([k, v]) => `${k}=${typeof v === 'string' ? v.substring(0, 30) : v}`).join(', ')
})

// if_else 分支
const trueBranch = computed<StepNode[]>(() => {
  if (props.step.action_id !== 'if_else') return []
  const children = props.step.children as any
  return (children?.[0] || []) as StepNode[]
})

const falseBranch = computed<StepNode[]>(() => {
  if (props.step.action_id !== 'if_else') return []
  const children = props.step.children as any
  return (children?.[1] || []) as StepNode[]
})

const toggleCollapse = () => {
  props.step._collapsed = !props.step._collapsed
}

const addChildToBranch = (branchIndex: number) => {
  // 弹出动作选择框 - 这里简单使用 dropdown
  emit('add-child', { parentUid: props.step._uid, branchIndex, actionId: 'click' })
}

const swapChildren = (branchIndex: number, fromIndex: number, toIndex: number) => {
  const children = getChildrenArray(branchIndex)
  if (!children || toIndex < 0 || toIndex >= children.length) return
  const [moved] = children.splice(fromIndex, 1)
  children.splice(toIndex, 0, moved)
  emitUpdate()
}

const replaceChild = (branchIndex: number, childIndex: number, updated: StepNode) => {
  const children = getChildrenArray(branchIndex)
  if (children) {
    children[childIndex] = updated
    emitUpdate()
  }
}

const getChildrenArray = (branchIndex: number): StepNode[] | null => {
  if (props.step.action_id === 'if_else') {
    const children = props.step.children as any[]
    return children?.[branchIndex] as StepNode[]
  }
  return props.step.children as StepNode[]
}

const showPluginSelector = ref(false)
const showControlFlow = ref(false)

// 控制流字段状态
const hasControlFlowFields = computed(() => {
  const s = props.step
  return !!(
    s.condition ||
    s.loop_count != null && s.loop_count > 0 ||
    s.loop_while ||
    s.loop_until ||
    s.retry != null && s.retry > 0 ||
    s.retry_delay != null && s.retry_delay > 0
  )
})

const activeControlFlowCount = computed(() => {
  const s = props.step
  let count = 0
  if (s.condition) count++
  if (s.loop_count != null && s.loop_count > 0) count++
  if (s.loop_while) count++
  if (s.loop_until) count++
  if (s.retry != null && s.retry > 0) count++
  if (s.retry_delay != null && s.retry_delay > 0) count++
  return count
})

const removePlugin = (index: number) => {
  if (props.step.enabled_plugins) {
    const newPlugins = [...props.step.enabled_plugins]
    newPlugins.splice(index, 1)
    props.step.enabled_plugins = newPlugins
    emitUpdate()
  }
}

const emitUpdate = () => {
  emit('update:step', { ...props.step })
}
</script>
