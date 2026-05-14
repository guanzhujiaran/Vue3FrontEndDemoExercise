<template>
  <div class="workflow-debug-workspace flex flex-col h-full p-2 gap-2 overflow-auto">
    <!-- 工作流控制栏 -->
    <section class="workflow-controls bg-white rounded-lg border border-[var(--el-border-color-lighter)] p-3 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">工作流步骤</label>
          <el-tag size="small" type="info" effect="plain">{{ workflowSteps.length }} 步骤</el>
        </div>

        <!-- 状态指示器 -->
        <div class="flex items-center gap-2">
          <div
            class="w-2.5 h-2.5 rounded-full transition-all duration-300"
            :class="statusDotClass"
          />
          <span :class="statusTextClass" class="text-xs font-medium">{{ statusText }}</span>

          <span v-if="currentStepIndex >= 0" class="text-[10px] text-[var(--el-text-color-placeholder)] ml-2">
            步骤 {{ currentStepIndex + 1 }}/{{ workflowSteps.length }}
          </span>
        </div>
      </div>
    </section>

    <!-- 流程图/步骤列表 -->
    <section class="steps-list bg-white rounded-lg border border-[var(--el-border-color-lighter)] shadow-sm flex-1 overflow-hidden flex flex-col">
      <div class="px-3 py-2 border-b border-[var(--el-border-color-lighter)] flex items-center justify-between shrink-0">
        <span class="text-xs font-medium text-[var(--el-text-color-secondary)]">流程追踪</span>
        <div class="flex items-center gap-3 text-[10px] text-[var(--el-text-color-placeholder)]">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-green-500"></span> 成功: {{ successCount }}
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-red-500"></span> 失败: {{ failedCount }}
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-gray-300"></span> 待执行: {{ pendingCount }}
          </span>
        </div>
      </div>

      <div ref="stepsContainerRef" class="flex-1 overflow-y-auto p-3 space-y-2">
        <transition-group name="step-list" tag="div" class="space-y-2">
          <div
            v-for="(step, index) in workflowSteps"
            :key="index"
            class="step-node relative pl-6 transition-all duration-300 cursor-pointer group"
            :class="{ 'opacity-50': stepStatuses[index] === 'skipped' }"
            @click="selectStep(index)"
          >
            <!-- 连接线 -->
            <div
              v-if="index > 0"
              class="absolute left-[11px] -top-2 w-0.5 h-2"
              :class="connectorClass(index)"
            />

            <!-- 状态圆点 -->
            <div
              class="absolute left-0 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300"
              :class="getStatusDotClass(index)"
            >
              <span v-if="stepStatuses[index] === 'success'" class="text-white text-[10px] font-bold">✓</span>
              <span v-else-if="stepStatuses[index] === 'failed'" class="text-white text-[10px] font-bold">✗</span>
              <span v-else-if="stepStatuses[index] === 'running'" class="animate-spin-slow">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 0l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48 0l2.83-2.83" />
                </svg>
              </span>
              <span v-else-if="stepStatuses[index] === 'paused'" class="text-white text-[10px]">⏸</span>
              <span v-else class="text-[var(--el-text-color-placeholder)] text-[10px] font-bold">{{ index + 1 }}</span>
            </div>

            <!-- 断点标记 -->
            <button
              class="absolute left-[-2px] top-3.5 w-2.5 h-2.5 rounded-full border-2 transition-all hover:scale-125 z-20"
              :class="hasBreakpoint(index) ? 'border-red-500 bg-red-500' : 'border-gray-300 bg-transparent hover:border-red-400'"
              @click.stop="toggleBreakpoint(index)"
            />

            <!-- 步骤内容卡片 -->
            <div
              class="ml-2 p-2.5 rounded-lg border transition-all"
              :class="getStepCardClass(index)"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs font-semibold truncate">{{ getActionName(step.action_id) }}</span>
                  <el-tag size="small" type="info" effect="plain" class="!text-[10px] truncate max-w-[80px]">{{ step.action_id }}</el-tag>
                </div>

                <span v-if="getStepDuration(index) > 0" class="text-[10px] text-[var(--el-text-color-placeholder)] shrink-0">
                  {{ getStepDuration(index) }}ms
                </span>
              </div>

              <!-- 当前步骤参数编辑 -->
              <div
                v-if="currentStepIndex === index && !compactMode && getActionParams(step.action_id)?.length > 0"
                class="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-dashed border-[var(--el-border-color-lighter)]"
              >
                <el-input
                  v-for="param in getActionParams(step.action_id)"
                  :key="param.name"
                  v-model="step.params[param.name]"
                  :placeholder="param.name"
                  size="small"
                />
              </div>

              <!-- 错误信息 -->
              <div v-if="getStepError(index)" class="mt-2 px-2 py-1.5 rounded bg-red-50 text-red-700 text-xs break-all">
                {{ getStepError(index) }}
              </div>
            </div>
          </div>
        </transition-group>

        <!-- 添加步骤按钮 -->
        <div v-if="debugStatus !== 'running'" class="flex gap-2 pt-2">
          <el-select
            v-model="newStepType"
            placeholder="+ 添加步骤..."
            class="flex-1"
            size="small"
            filterable
          >
            <el-option
              v-for="action in registeredActions"
              :key="action.id"
              :label="action.name"
              :value="action.id"
            />
          </el-select>
          <el-button size="small" type="primary" @click="addStep" :icon="Plus" />
        </div>

        <!-- 空状态 -->
        <div v-if="workflowSteps.length === 0" class="text-center py-8 text-xs text-[var(--el-text-color-placeholder)]">
          请添加步骤以构建工作流
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import debugApi from '@/api/browser/debug_api'

type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'paused'
type DebugStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

const props = defineProps<{
  browserId: string
  browserRunning: boolean
  registeredActions: Array<any>
  loadingActions: boolean
  compactMode?: boolean
}>()

const emit = defineEmits<{
  log: [message: string, type: 'info' | 'success' | 'warning' | 'error']
  screenshotUpdated: [url: string]
  variablesUpdated: [vars: Record<string, any>]
  statusChanged: [status: DebugStatus]
}>()

const addGlobalLog = inject('addGlobalLog') as (level: any, message: string, source?: string) => void

// 状态
const debugStatus = ref<DebugStatus>('idle')
const stepsContainerRef = ref<HTMLElement | null>(null)
const workflowSteps = reactive<Array<{ action_id: string; params: Record<string, any> }>>([])
const stepStatuses = ref<StepStatus[]>([])
const breakpoints = ref<Set<number>>(new Set())
const currentStepIndex = ref(-1)
const newStepType = ref('')

// 执行追踪
interface ExecutionTrace {
  step_index: number
  action_id: string
  status: string
  duration: number
  error?: string
}
const executionTrace = ref<ExecutionTrace[]>([])

// 计算属性
const successCount = computed(() => stepStatuses.value.filter(s => s === 'success').length)
const failedCount = computed(() => stepStatuses.value.filter(s => s === 'failed').length)
const pendingCount = computed(() => stepStatuses.value.filter(s => s === 'pending').length)

const statusDotClass = computed(() => {
  const map: Record<string, string> = {
    idle: 'bg-gray-300',
    running: 'bg-blue-500 animate-pulse',
    paused: 'bg-yellow-500',
    completed: 'bg-green-500',
    error: 'bg-red-500'
  }
  return map[debugStatus.value] || 'bg-gray-300'
})

const statusTextClass = computed(() => {
  const map: Record<string, string> = {
    idle: 'text-gray-400',
    running: 'text-blue-600',
    paused: 'text-yellow-600',
    completed: 'text-green-600',
    error: 'text-red-600'
  }
  return map[debugStatus.value] || 'text-gray-400'
})

const statusText = computed(() => ({
  idle: '就绪',
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
  error: '出错'
}[debugStatus.value] || '未知'))

// 方法
const getActionParams = (actionId: string) =>
  props.registeredActions.find(a => a.id === actionId)?.parameters || []

const getActionName = (actionId: string) =>
  props.registeredActions.find(a => a.id === actionId)?.name || actionId

const getStatusDotClass = (index: number): string => {
  const status = stepStatuses.value[index]
  const map: Record<string, string> = {
    pending: 'border-gray-300 bg-white',
    running: 'border-blue-500 bg-blue-500 animate-pulse shadow-md shadow-blue-200',
    success: 'border-green-500 bg-green-500',
    failed: 'border-red-500 bg-red-500',
    skipped: 'border-gray-300 bg-gray-300',
    paused: 'border-yellow-500 bg-yellow-500'
  }
  return map[status] || 'border-gray-300 bg-white'
}

const connectorClass = (index: number): string => {
  const prev = stepStatuses.value[index - 1]
  return prev === 'success' ? 'bg-green-400' : prev === 'failed' ? 'bg-red-400' : 'bg-gray-200'
}

const getStepCardClass = (index: number): string => {
  const status = stepStatuses.value[index]
  if (status === 'success') return 'border-green-300 bg-green-50/50'
  if (status === 'failed') return 'border-red-300 bg-red-50/50'
  if (status === 'running') return 'border-blue-300 bg-blue-50/50 shadow-sm'
  if (status === 'paused') return 'border-yellow-300 bg-yellow-50/50'
  if (status === 'skipped') return 'border-dashed border-gray-300 opacity-60'
  return 'border-base-200 hover:border-primary/50 hover:shadow-sm'
}

const hasBreakpoint = (index: number) => breakpoints.value.has(index)
const toggleBreakpoint = (index: number) =>
  breakpoints.value.has(index) ? breakpoints.value.delete(index) : breakpoints.value.add(index)

const selectStep = (index: number) => { currentStepIndex.value = index }

const getStepDuration = (index: number) =>
  executionTrace.value.find(t => t.step_index === index)?.duration || 0

const getStepError = (index: number) =>
  executionTrace.value.find(t => t.step_index === index)?.error

const addStep = () => {
  if (!newStepType.value) return

  const params: Record<string, any> = {}
  const action = props.registeredActions.find(a => a.id === newStepType.value)

  if (action?.parameters) {
    action.parameters.forEach((p: any) => {
      if (p.default !== undefined) params[p.name] = p.default
    })
  }

  workflowSteps.push({ action_id: newStepType.value, params })
  stepStatuses.value.push('pending')
  newStepType.value = ''
}

// 调试控制方法
const toggleExecution = async () => {
  if (debugStatus.value === 'idle') await startDebug()
  else if (debugStatus.value === 'running') pauseDebug()
  else if (debugStatus.value === 'paused') resumeDebug()
}

const startDebug = async () => {
  if (!props.browserRunning || workflowSteps.length === 0) return

  debugStatus.value = 'running'
  stepStatuses.value = workflowSteps.map(() => 'pending')
  executionTrace.value = []
  currentStepIndex.value = -1

  emit('statusChanged', 'running')
  addGlobalLog?.('info', `▶ 开始调试工作流 (${workflowSteps.length} 步)`)

  for (let i = 0; i < workflowSteps.length; i++) {
    if (debugStatus.value !== 'running') break

    // 检查断点
    if (breakpoints.value.has(i)) {
      await pauseAtStep(i)
      if (debugStatus.value !== 'running') break
    }

    await executeStep(i)

    if (stepStatuses.value[i] === 'failed') {
      debugStatus.value = 'error'
      emit('statusChanged', 'error')
      break
    }
  }

  if (debugStatus.value === 'running') {
    debugStatus.value = 'completed'
    emit('statusChanged', 'completed')
    addGlobalLog?.('success', '✓ 工作流执行完成')
  }
}

const executeStep = async (index: number) => {
  const step = workflowSteps[index]
  stepStatuses.value[index] = 'running'
  currentStepIndex.value = index

  const trace: ExecutionTrace = {
    step_index: index,
    action_id: step.action_id,
    status: 'running',
    duration: 0,
    start_time: Date.now()
  }

  addGlobalLog?.('info', `[步骤 ${index + 1}] ▶ ${getActionName(step.action_id)}`)

  try {
    const res = await debugApi.executeStep({
      browser_id: props.browserId,
      action_id: step.action_id,
      params: step.params,
      page_index: 0
    })

    trace.duration = Date.now() - trace.start_time
    trace.status = res.data?.success ? 'success' : 'failed'
    trace.error = res.data?.error

    executionTrace.value.push(trace)

    // 处理结果
    if (res.data?.logs?.length) {
      res.data.logs.forEach((log: any) => {
        addGlobalLog?.(log.level === 'error' ? 'error' : 'success', log.message, log.source)
      })
    }

    if (res.data?.screenshot) {
      emit('screenshotUpdated', res.data.screenshot)
    }

    if (res.data?.user_data) {
      emit('variablesUpdated', res.data.user_data)
    }

    stepStatuses.value[index] = trace.status

    if (!res.data?.success) {
      addGlobalLog?.('error', `[步骤 ${index + 1}] ✗ ${trace.error}`)
    } else {
      addGlobalLog?.('success', `[步骤 ${index + 1}] ✓ 完成 (${trace.duration}ms)`)
    }
  } catch (e: any) {
    trace.duration = Date.now() - trace.start_time
    trace.status = 'failed'
    trace.error = e.message
    executionTrace.value.push(trace)
    stepStatuses.value[index] = 'failed'
    addGlobalLog?.('error', `[步骤 ${index + 1}] 异常: ${e.message}`)
  }
}

const pauseAtStep = async (index: number) => {
  debugStatus.value = 'paused'
  stepStatuses.value[index] = 'paused'
  currentStepIndex.value = index
  emit('statusChanged', 'paused')

  addGlobalLog?.('warn', `⏸ 在步骤 ${index + 1} 前暂停 (断点)`)

  await new Promise<void>(resolve => {
    const check = () => {
      if (debugStatus.value !== 'paused') resolve()
      else setTimeout(check, 100)
    }
    check()
  })
}

const pauseDebug = () => {
  debugStatus.value = 'paused'
  emit('statusChanged', 'paused')
  addGlobalLog?.('warn', '⏸ 手动暂停')
}

const resumeDebug = () => {
  debugStatus.value = 'running'
  emit('statusChanged', 'running')
  addGlobalLog?.('info', '▶ 继续执行')
}

const stopDebug = () => {
  debugStatus.value = 'idle'
  stepStatuses.value = []
  currentStepIndex.value = -1
  emit('statusChanged', 'idle')
  addGlobalLog?.('info', '⏹ 已停止')
}

const stepOver = async () => {
  if (debugStatus.value !== 'paused') return

  const nextIdx = Math.min(currentStepIndex.value + 1, workflowSteps.length - 1)
  if (nextIdx >= workflowSteps.length) return

  debugStatus.value = 'running'
  await executeStep(nextIdx)
  debugStatus.value = stepStatuses.value[nextIdx] === 'failed' ? 'error' : 'paused'
  emit('statusChanged', debugStatus.value)
}

const reset = () => {
  stopDebug()
  workflowSteps.splice(0, workflowSteps.length)
  stepStatuses.value = []
  executionTrace.value = []
}

const loadData = () => {
  addGlobalLog?.('info', '工作流调试工作区已就绪')
}

defineExpose({ toggleExecution, stepOver, stop, reset: stopDebug, loadData })
</script>

<style scoped>
.workflow-debug-workspace {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-spin-slow {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.step-list-enter-active {
  animation: slideIn 0.3s ease-out;
}

.step-list-leave-active {
  animation: slideOut 0.2s ease-in;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(12px); }
}
</style>
