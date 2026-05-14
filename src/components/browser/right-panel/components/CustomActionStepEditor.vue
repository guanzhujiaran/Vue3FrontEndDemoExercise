<template>
  <!-- ═══════════════════════════════════════════════════════════════
       CustomActionStepEditor — 自定义操作步骤编排器（共享组件）
       mode="edit"  → 纯编辑模式（CustomActionPanel 编辑弹窗使用）
       mode="debug" → 调试模式（DebugActionPanel 右侧面板使用，额外支持单步/全部执行）
       ═══════════════════════════════════════════════════════════════ -->
  <div class="custom-action-step-editor">

    <!-- ══ 区域 A：工具栏 Toolbar ══ -->
    <div class="flex items-center justify-between px-3 py-2 bg-[var(--el-fill-color-light)] border-b border-[var(--el-border-color-lighter)] shrink-0 rounded-t-lg" :class="{ 'border border-b-0': !embedded }">
      <span class="text-xs font-medium text-[var(--el-text-color-secondary)]">{{ title }}</span>
      <div class="flex items-center gap-1.5">
        <!-- A-1：全部执行按钮（仅 debug 模式） -->
        <el-button v-if="mode === 'debug'" size="small" type="success" :icon="CaretRight" :loading="executingAll" :disabled="!canExecute || validSteps.length === 0" @click="$emit('execute-all', internalSteps)">
          全部执行
        </el-button>
        <!-- A-2：添加步骤按钮 -->
        <el-button size="small" type="primary" :icon="Plus" @click="addStep">添加步骤</el-button>
        <!-- A-3：有效步骤计数标签 -->
        <el-tag size="small" effect="plain" type="info">{{ validSteps.length }}/{{ internalSteps.length }} 有效</el-tag>
        <!-- A-4：全部展开/收起切换 -->
        <el-button v-if="internalSteps.length > 0" size="small" text @click="toggleAllSteps(!allExpanded)" class="!ml-1">
          {{ allExpanded ? '全部收起' : '全部展开' }}
        </el-button>
      </div>
    </div>

    <!-- ══ 区域 B：步骤列表 StepList（手风琴容器） ══ -->
    <div class="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto" :class="{ 'border border-t-0 rounded-b-lg': !embedded }">

      <!-- B-0：空状态占位 -->
      <div v-if="internalSteps.length === 0" class="text-center py-8 text-[var(--el-text-color-placeholder)]">
        <el-icon :size="32"><Plus /></el-icon>
        <p class="text-sm mt-2 m-0 font-medium">{{ emptyText }}</p>
        <p class="text-xs mt-1 m-0">点击上方按钮添加步骤</p>
      </div>

      <!-- B-N：单个步骤卡片 StepCard × N -->
      <div
        v-for="(step, idx) in internalSteps"
        :key="step._uid"
        class="step-card rounded-lg border transition-all overflow-hidden"
        :class="stepResultClass(step)"
      >

        <!-- B-N-1：步骤头部 StepHeader（点击折叠/展开） -->
        <div
          class="step-header flex items-center justify-between px-3 py-2 bg-[var(--el-fill-color-light)] cursor-pointer select-none hover:bg-[var(--el-bg-color)] transition-colors"
          @click="onHeaderClick($event, idx)"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <!-- 折叠箭头 -->
            <el-icon
              class="shrink-0 text-[var(--el-text-color-secondary)] transition-transform duration-200"
              :class="{ 'rotate-90': step._expanded }"
              :size="12"
            ><ArrowRight /></el-icon>

            <!-- 步骤序号 -->
            <span class="text-xs font-mono font-bold text-primary w-5 text-center shrink-0">{{ idx + 1 }}</span>

            <!-- 动作选择器 ActionSelector（el-select） -->
            <el-select
              v-model="step.action_id"
              placeholder="选择动作..."
              filterable
              size="small"
              class="w-[180px] step-action-selector"
              @change="onStepActionChange(idx)"
              :teleported="true"
            >
              <el-option
                v-for="action in actionList"
                :key="action.action_id"
                :value="action.action_id"
                :label="action.name"
              >
                <span class="font-medium">{{ action.name }}</span>
                <span class="text-[10px] text-[var(--el-text-color-placeholder)] ml-2">{{ action.action_id }}</span>
              </el-option>
            </el-select>

            <!-- 收起时的动作名称摘要 -->
            <span v-if="step.action_id && !step._expanded" class="text-xs text-[var(--el-text-color-secondary)] truncate max-w-[120px]">
              {{ actionList.find(a => a.action_id === step.action_id)?.name }}
            </span>

            <!-- 调试结果标签（仅 debug 模式） -->
            <template v-if="mode === 'debug'">
              <el-tag v-if="step._result" size="small" :type="step._result.success ? 'success' : 'danger'" effect="dark">
                {{ step._result.success ? `✓ ${step._result.duration}ms` : `✗ ${step._result.error?.slice(0, 20)}` }}
              </el-tag>
              <el-tag v-else-if="step._executing" size="small" type="warning" effect="dark">执行中...</el-tag>
            </template>
          </div>

          <!-- B-N-1-b：操作按钮组 ActionButtons -->
          <div class="flex items-center gap-0.5 shrink-0 ml-2">
            <!-- 单步执行按钮（仅 debug） -->
            <el-tooltip v-if="mode === 'debug'" content="单步执行此步骤" placement="bottom">
              <el-button
                size="small"
                type="primary"
                :icon="CaretRight"
                :loading="step._executing"
                :disabled="!canExecute || !step.action_id"
                @click.stop="$emit('execute-step', { index: idx, step })"
              />
            </el-tooltip>
            <!-- 上移 / 下移 / 删除 -->
            <el-button size="small" text :disabled="idx === 0 || internalSteps.length <= 1" @click.stop="moveStep(idx, -1)">
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button size="small" text :disabled="idx === internalSteps.length - 1 || internalSteps.length <= 1" @click.stop="moveStep(idx, 1)">
              <el-icon><Bottom /></el-icon>
            </el-button>
            <el-button size="small" text type="danger" :icon="Delete" @click.stop="removeStep(idx)" />
          </div>
        </div>

        <!-- B-N-2：步骤内容区 StepBody（手风琴折叠面板） -->
        <transition name="accordion">
          <div v-show="step._expanded" class="border-t border-[var(--el-border-color-lighter)]">

            <!-- B-N-2-a：参数编辑器 ParamEditor（ActionStepRenderer） -->
            <div v-if="step.action_id" class="p-3">
              <ActionStepRenderer
                :key="step.action_id + '-' + step._uid"
                :action-id="step.action_id"
                v-model="step.params"
                :disabled="disabled || (mode === 'debug' && step._executing)"
                :executing="mode === 'debug' && step._executing"
                :execution-result="mode === 'debug' ? step._result ?? undefined : undefined"
                :validation-errors="step._errors ?? {}"
                @execute="mode === 'debug' ? $emit('execute-step', { index: idx, step }) : () => {}"
                @validate="(name: string) => $emit('validate', { index: idx, name })"
                @pick-selector="(data) => $emit('pick-selector', data)"
              />
            </div>

            <!-- B-N-2-b：执行结果展示 ResultPanel（仅 debug 模式） -->
            <div v-if="mode === 'debug' && step._result && step._result.result" class="px-3 pb-3">
              <div class="rounded border border-[var(--el-border-color-lighter)] p-2 bg-[var(--el-fill-color-blank)] max-h-[200px] overflow-y-auto">
                <div class="text-[10px] font-mono text-[var(--el-text-color-placeholder)] mb-1">执行结果</div>
                <pre class="text-xs m-0 whitespace-pre-wrap break-all leading-relaxed">{{ formatResult(step._result.result) }}</pre>
              </div>
            </div>

            <!-- B-N-2-c：未选动作提示 EmptyHint -->
            <div v-else-if="!step.action_id" class="p-4 text-center text-xs text-[var(--el-text-color-placeholder)]">
              请选择一个动作类型来配置此步骤的参数
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Plus, CaretRight, Top, Bottom, Delete, ArrowRight } from '@element-plus/icons-vue'
import ActionStepRenderer from './ActionStepRenderer.vue'

export interface StepItem {
  _uid: number
  action_id: string
  params: Record<string, any>
  _expanded?: boolean
  _executing?: boolean
  _result?: { success: boolean; error?: string; result?: any; duration: number }
  _errors?: Record<string, string>
}

const props = withDefaults(defineProps<{
  modelValue: StepItem[]
  actionList: { action_id: string; name: string; description?: string; parameters?: any[] }[]
  mode?: 'edit' | 'debug'
  disabled?: boolean
  canExecute?: boolean
  title?: string
  emptyText?: string
  embedded?: boolean
}>(), {
  actionList: () => [],
  mode: 'edit',
  disabled: false,
  canExecute: true,
  title: '步骤列表',
  emptyText: '暂无步骤',
  embedded: false
})

const emit = defineEmits<{
  'update:modelValue': [steps: StepItem[]]
  'execute-step': [payload: { index: number; step: StepItem }]
  'execute-all': [steps: StepItem[]]
  'validate': [payload: { index: number; name: string }]
  'pick-selector': [data: { actionType: string; paramName: string }]
}>()

let uidCounter = 0
const executingAll = ref(false)

function makeStep(raw: Partial<StepItem> = {}): StepItem {
  return {
    _uid: ++uidCounter,
    action_id: '',
    params: {},
    _expanded: true,
    ...raw
  }
}

const internalSteps = ref<StepItem[]>(props.modelValue.map(s => makeStep(s)))

let prevUidList = ''
let syncingFromParent = false

watch(() => props.modelValue, (val) => {
  const uidList = val.map(s => s._uid).join(',')
  if (uidList !== prevUidList) {
    prevUidList = uidList
    syncingFromParent = true
    internalSteps.value = val.map(s => makeStep(s))
    initExpanded()
    nextTick(() => { syncingFromParent = false })
  } else {
    syncingFromParent = true
    val.forEach((s, i) => {
      const target = internalSteps.value[i]
      if (target) {
        target.action_id = s.action_id
        target.params = s.params
        target._executing = s._executing
        target._result = s._result
        target._errors = s._errors
      }
    })
    nextTick(() => { syncingFromParent = false })
  }
}, { deep: true })

watch(internalSteps, (val) => {
  if (syncingFromParent) return
  emit('update:modelValue', val.map(({ _expanded, ...rest }) => rest))
}, { deep: true })

const validSteps = computed(() => internalSteps.value.filter(s => s.action_id))
const allExpanded = computed(() => internalSteps.value.length > 0 && internalSteps.value.every(s => s._expanded))

function initExpanded() {
  if (internalSteps.value.length <= 3) {
    internalSteps.value.forEach(s => { s._expanded = true })
  } else {
    internalSteps.value.forEach((s, i) => { s._expanded = i === 0 })
  }
}

function toggleStep(idx: number) {
  internalSteps.value[idx]._expanded = !internalSteps.value[idx]._expanded
}

function toggleAllSteps(expand: boolean) {
  internalSteps.value.forEach(s => { s._expanded = expand })
}

function onHeaderClick(event: MouseEvent, idx: number) {
  const target = event.target as HTMLElement
  if (target.closest('.step-action-selector')) return
  toggleStep(idx)
}



initExpanded()

function addStep() {
  const step = makeStep()
  internalSteps.value.push(step)
}

function removeStep(idx: number) {
  internalSteps.value.splice(idx, 1)
}

function moveStep(idx: number, direction: -1 | 1) {
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= internalSteps.value.length) return
  const temp = internalSteps.value[idx]
  internalSteps.value[idx] = internalSteps.value[newIdx]
  internalSteps.value[newIdx] = temp
}

async function onStepActionChange(idx: number) {
  const step = internalSteps.value[idx]
  step.params = {}
  step._result = undefined
  step._errors = {}
  const meta = props.actionList.find(a => a.action_id === step.action_id)
  if (meta?.parameters) {
    for (const param of meta.parameters) {
      if (param.default !== undefined && param.default !== null) {
        step.params[param.name] = param.default
      }
    }
  }
  step._expanded = true
  await nextTick()
}

function stepResultClass(step: StepItem): string {
  if (props.mode !== 'debug') return 'border-[var(--el-border-color)] bg-white'
  if (step._executing) return 'border-primary ring-2 ring-primary/20 bg-white'
  if (step._result) {
    return step._result.success
      ? 'border-green-300 bg-green-50/30'
      : 'border-red-300 bg-red-50/30'
  }
  return 'border-[var(--el-border-color)] bg-white'
}

function formatResult(result: any): string {
  if (!result) return ''
  try {
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

defineExpose({
  addStep,
  removeStep,
  getSteps: () => internalSteps.value,
  setSteps: (steps: StepItem[]) => { internalSteps.value = steps.map(s => makeStep(s)); initExpanded() },
  clearResults: () => {
    internalSteps.value.forEach(s => { s._result = undefined; s._executing = false })
  },
  setExecutingAll: (v: boolean) => { executingAll.value = v }
})
</script>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.accordion-enter-to,
.accordion-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
