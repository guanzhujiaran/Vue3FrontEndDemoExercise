<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Minus, VideoPlay, Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { 工作流管理Service, 执行引擎Service, 浏览器指纹管理Service, 自定义操作管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import DebugBox from './DebugBox.vue'
import MinimizeBar from './MinimizeBar.vue'
import type { DroppedItem } from './debugbox-types'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

interface Props {
  modelValue: boolean
  /** 工作流详情，null 表示新建 */
  workflowDetail: Record<string, unknown> | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const userNavStore = useUserNavStore()

// ── 表单状态 ─────────────────────────────────────────
const workflowName = ref('')
const workflowDescription = ref('')
const isPublic = ref(false)
const isEnabled = ref(true)
const triggerType = ref<'manual' | 'cron'>('manual')
const cronExpression = ref('')
const saving = ref(false)

// ── 步骤编辑 ─────────────────────────────────────────
const editItems = ref<DroppedItem[]>([])
/** 每次打开弹窗递增，强制 DebugBox 重新挂载以加载 initialSteps */
const dialogKey = ref(0)
const debugBoxRef = ref<InstanceType<typeof DebugBox> | null>(null)

// ── 浏览器选择 ───────────────────────────────────────
interface BrowserOption {
  browser_id: number
  browser_id_str: string
  custom_name: string
}
const browserList = ref<BrowserOption[]>([])
const selectedBrowserId = ref<number | null>(null)

async function loadBrowserList() {
  const result = await businessHandler<{ items?: BrowserOption[] }>(
    浏览器指纹管理Service.listFingerprintRouterApiV1RpaBrowserListFingerprintPost({
      body: { page: 1, per_page: 100 },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取浏览器列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    browserList.value = (result.data.items || []).map((b: any) => ({
      browser_id: b.browser_id,
      browser_id_str: b.browser_id_str || String(b.browser_id),
      custom_name: b.custom_name || `浏览器 ${b.browser_id}`,
    }))
    if (browserList.value.length > 0 && selectedBrowserId.value === null) {
      selectedBrowserId.value = browserList.value[0].browser_id
    }
  }
}

// ── 运行状态 ─────────────────────────────────────────
type RunStatus = 'idle' | 'running' | 'completed' | 'failed'
const runStatus = ref<RunStatus>('idle')

interface StepResult {
  success: boolean
  action_id?: string
  action_name?: string
  error?: string | null
  execution_time?: number
  data?: unknown
  variables?: Record<string, unknown>
  replaced_params?: Record<string, unknown>
}
const stepResults = ref<StepResult[]>([])
const runSummary = ref<{ total: number; success: number; failed: number } | null>(null)
const runError = ref('')

// ── 最小化状态 ───────────────────────────────────────
const isMinimized = ref(false)
const dialogVisible = computed(() => props.modelValue && !isMinimized.value)

// ── 反序列化后端 steps 为前端 DroppedItem[] ──────────
function convertStepsToItems(steps: Record<string, unknown>[]): DroppedItem[] {
  return steps.map((step, i) => {
    const sp = { ...((step.params || {}) as Record<string, unknown>) }
    let trueBranch: DroppedItem[] | undefined
    let falseBranch: DroppedItem[] | undefined
    let loopBody: DroppedItem[] | undefined
    if (sp.TrueBranch && Array.isArray(sp.TrueBranch)) {
      trueBranch = convertStepsToItems(sp.TrueBranch as Record<string, unknown>[])
      delete sp.TrueBranch
    }
    if (sp.FalseBranch && Array.isArray(sp.FalseBranch)) {
      falseBranch = convertStepsToItems(sp.FalseBranch as Record<string, unknown>[])
      delete sp.FalseBranch
    }
    if (sp.loopBranch && Array.isArray(sp.loopBranch)) {
      loopBody = convertStepsToItems(sp.loopBranch as Record<string, unknown>[])
      delete sp.loopBranch
    }
    const actionDetail = step.action_detail as Record<string, unknown> | undefined
    return {
      id: `wf-step-${i}-${Date.now()}`,
      name: (actionDetail?.name as string) || (step.name as string) || (step.action_id as string) || `步骤${i + 1}`,
      action_id: (step.action_id as string) || '',
      action_type: (step.action_type as string) || (step.action_id as string) || '',
      description: (actionDetail?.description as string) || (step.description as string) || '',
      type: 'action',
      formData: { ...sp },
      input_vars: (step.input_vars || {}) as Record<string, unknown>,
      output_vars: (step.output_vars || []) as string[],
      config_params: {},
      trueBranch, falseBranch, loopBody,
      action_detail: actionDetail,
    }
  })
}

// ── 监听打开/关闭 ─────────────────────────────────────
watch(() => props.modelValue, async (visible) => {
  if (visible) {
    isMinimized.value = false
    runStatus.value = 'idle'
    stepResults.value = []
    runSummary.value = null
    runError.value = ''
    await loadBrowserList()
    if (props.workflowDetail) {
      // 编辑模式：加载已有工作流
      workflowName.value = (props.workflowDetail.name as string) || ''
      workflowDescription.value = (props.workflowDetail.description as string) || ''
      isPublic.value = (props.workflowDetail.is_public as boolean) ?? false
      isEnabled.value = (props.workflowDetail.is_enabled as boolean) ?? true
      const tt = (props.workflowDetail.trigger_type as string) || 'manual'
      triggerType.value = tt === 'cron' ? 'cron' : 'manual'
      const tc = props.workflowDetail.trigger_config as Record<string, unknown> | undefined
      cronExpression.value = (tc?.cron as string) || ''
      // 加载关联的自定义操作 steps
      const customActionId = props.workflowDetail.custom_action_id as string | undefined
      if (customActionId) {
        const result = await businessHandler<{ steps?: Record<string, unknown>[] }>(
          自定义操作管理Service.getCustomActionApiV1RpaBrowserControlCustomActionsGetPost({
            body: { action_id: customActionId },
            headers: userNavStore.user_header,
          }) as any,
          { successMessage: '', errorMessage: '加载工作流步骤失败', showSuccessToast: false }
        )
        if (result.success && result.data) {
          const steps = result.data.steps
          editItems.value = steps && Array.isArray(steps) ? convertStepsToItems(steps as Record<string, unknown>[]) : []
        } else {
          editItems.value = []
        }
      } else {
        editItems.value = []
      }
    } else {
      // 新建模式
      workflowName.value = ''
      workflowDescription.value = ''
      isPublic.value = false
      isEnabled.value = true
      triggerType.value = 'manual'
      cronExpression.value = ''
      editItems.value = []
    }
    dialogKey.value++
  }
}, { immediate: true })

// ── 表单验证 ─────────────────────────────────────────
const nameError = computed(() => {
  if (!workflowName.value.trim()) return '工作流名称不能为空'
  if (workflowName.value.length > 50) return '名称不能超过50个字符'
  return ''
})

const cronError = computed(() => {
  if (triggerType.value !== 'cron') return ''
  if (!cronExpression.value.trim()) return 'Cron 表达式不能为空'
  return ''
})

const canSave = computed(() => !nameError.value && !cronError.value && !saving.value)
const canRun = computed(() => !nameError.value && runStatus.value !== 'running' && selectedBrowserId.value !== null)

// ── 最小化控制 ───────────────────────────────────────
function handleMinimize() {
  isMinimized.value = true
}
function handleRestore() {
  isMinimized.value = false
}
function handleClose() {
  isMinimized.value = false
  emit('update:modelValue', false)
}
function handleDialogUpdate(val: boolean) {
  if (!val) {
    if (isMinimized.value) return
    emit('update:modelValue', false)
  }
}

// ── 运行工作流 ───────────────────────────────────────
async function handleRun() {
  if (!canRun.value) return
  if (selectedBrowserId.value === null) {
    biliMessage.warning('请先选择浏览器')
    return
  }
  const steps = debugBoxRef.value?.getSteps() || []
  if (steps.length === 0) {
    biliMessage.warning('请至少添加一个步骤')
    return
  }
  runStatus.value = 'running'
  stepResults.value = []
  runSummary.value = null
  runError.value = ''
  try {
    const response = await 执行引擎Service.executeWorkflowApiV1RpaBrowserControlWorkflowsExecutePost({
      query: { browser_id: String(selectedBrowserId.value) },
      body: {
        steps,
        variables: {},
        input_data: {},
        output_vars: [],
      },
      headers: userNavStore.user_header,
    })
    if (response?.code === 0) {
      const result = response.data as {
        results?: StepResult[]
        summary?: { total: number; success: number; failed: number }
      } | undefined
      stepResults.value = result?.results ?? []
      runSummary.value = result?.summary ?? null
      const failedCount = runSummary.value?.failed ?? 0
      runStatus.value = failedCount > 0 ? 'failed' : 'completed'
      if (failedCount === 0) {
        biliMessage.success(`工作流执行完成，共 ${runSummary.value?.total ?? steps.length} 步全部成功`)
      } else {
        biliMessage.warning(`工作流执行完成，成功 ${runSummary.value?.success ?? 0} 步，失败 ${failedCount} 步`)
      }
    } else {
      runStatus.value = 'failed'
      runError.value = (response?.msg as string) || '执行失败'
      biliMessage.error(runError.value)
    }
  } catch (error: unknown) {
    runStatus.value = 'failed'
    runError.value = error instanceof Error ? error.message : '网络异常，执行失败'
    console.error('[WorkflowEditDialog] 执行工作流异常:', error)
    biliMessage.error(runError.value)
  }
}

// ── 保存工作流（两步：先保存复合操作，再保存工作流） ──
async function handleSave() {
  if (!canSave.value) return
  const steps = debugBoxRef.value?.getSteps() || []
  saving.value = true
  try {
    const isEditing = !!props.workflowDetail
    const existingCustomActionId = props.workflowDetail?.custom_action_id as string | undefined

    // 步骤1：保存/更新复合操作获取 action_id
    let customActionId = existingCustomActionId
    if (existingCustomActionId) {
      const updateResult = await businessHandler<{ action_id: string }>(
        自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
          body: {
            action_id: existingCustomActionId,
            name: workflowName.value,
            description: workflowDescription.value,
            steps,
          },
          headers: userNavStore.user_header,
        }) as any,
        { successMessage: '', errorMessage: '更新步骤失败', showSuccessToast: false }
      )
      if (!updateResult.success) {
        saving.value = false
        return
      }
    } else {
      const createResult = await businessHandler<{ action_id: string }>(
        自定义操作管理Service.createCustomActionApiV1RpaBrowserControlCustomActionsCreatePost({
          body: {
            name: workflowName.value,
            description: workflowDescription.value,
            steps,
            is_public: isPublic.value,
          },
          headers: userNavStore.user_header,
        }) as any,
        { successMessage: '', errorMessage: '创建步骤失败', showSuccessToast: false }
      )
      if (!createResult.success || !createResult.data) {
        saving.value = false
        return
      }
      customActionId = createResult.data.action_id
    }

    // 步骤2：保存/更新工作流
    const triggerConfig = triggerType.value === 'cron' && cronExpression.value
      ? { cron: cronExpression.value }
      : {}

    if (isEditing && props.workflowDetail) {
      const workflowId = props.workflowDetail.id as number
      const wfResult = await businessHandler(
        工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
          body: {
            id: workflowId,
            name: workflowName.value,
            description: workflowDescription.value,
            custom_action_id: customActionId,
            trigger_type: triggerType.value,
            trigger_config: triggerConfig,
            is_enabled: isEnabled.value,
            is_public: isPublic.value,
          },
          headers: userNavStore.user_header,
        }) as any,
        { successMessage: '工作流更新成功', errorMessage: '工作流更新失败' }
      )
      if (wfResult.success) {
        emit('saved')
        emit('update:modelValue', false)
      }
    } else {
      const wfResult = await businessHandler(
        工作流管理Service.createWorkflowApiV1RpaBrowserControlWorkflowsCreatePost({
          body: {
            name: workflowName.value,
            description: workflowDescription.value,
            custom_action_id: customActionId,
            trigger_type: triggerType.value,
            trigger_config: triggerConfig,
            is_public: isPublic.value,
          },
          headers: userNavStore.user_header,
        }) as any,
        { successMessage: '工作流创建成功', errorMessage: '工作流创建失败' }
      )
      if (wfResult.success) {
        emit('saved')
        emit('update:modelValue', false)
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '保存失败'
    console.error('[WorkflowEditDialog] 保存工作流异常:', error)
    biliMessage.error(msg)
  } finally {
    saving.value = false
  }
}

function formatExecTime(t?: number) {
  if (t == null) return '-'
  return `${t.toFixed(2)}s`
}
</script>

<template>
  <el-dialog
    :model-value="dialogVisible"
    width="85%"
    :modal-penetrable="true"
    :modal="false"
    :lock-scroll="false"
    :draggable="true"
    :close-on-click-modal="false"
    @update:model-value="handleDialogUpdate"
  >
    <template #header>
      <div class="relative w-full">
        <span class="font-medium text-sm">{{ workflowDetail ? '编辑工作流' : '新建工作流' }}</span>
        <button
          class="absolute top-1/2 -translate-y-1/2 right-8 w-5 h-5 flex items-center justify-center cursor-pointer hover:text-color-secondary"
          title="最小化"
          @click="handleMinimize"
        >
          <el-icon :size="14"><Minus /></el-icon>
        </button>
      </div>
    </template>

    <div class="flex flex-col gap-3">
      <!-- 元信息表单 -->
      <div class="workflow-meta-form grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-color-secondary">名称 <span class="text-danger">*</span></label>
          <el-input
            v-model="workflowName"
            size="small"
            placeholder="工作流名称"
            maxlength="50"
            show-word-limit
            :class="{ 'is-error': nameError }"
          />
          <div v-if="nameError" class="text-xs text-danger mt-1">{{ nameError }}</div>
        </div>
        <div>
          <label class="text-xs text-color-secondary">描述</label>
          <el-input
            v-model="workflowDescription"
            size="small"
            placeholder="工作流描述（可选）"
            maxlength="200"
            show-word-limit
          />
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">公开</label>
            <el-switch v-model="isPublic" size="small" inline-prompt active-text="是" inactive-text="否" />
          </div>
          <div v-if="workflowDetail" class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">启用</label>
            <el-switch v-model="isEnabled" size="small" inline-prompt active-text="是" inactive-text="否" />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-xs text-color-secondary whitespace-nowrap">触发方式</label>
          <el-radio-group v-model="triggerType" size="small">
            <el-radio value="manual">手动</el-radio>
            <el-radio value="cron">定时</el-radio>
          </el-radio-group>
          <el-input
            v-if="triggerType === 'cron'"
            v-model="cronExpression"
            size="small"
            placeholder="如: */5 * * * *"
            class="flex-1"
          />
        </div>
      </div>
      <div v-if="cronError" class="text-xs text-danger -mt-2">{{ cronError }}</div>

      <!-- 浏览器选择 + 运行按钮 -->
      <div class="workflow-run-bar flex items-center gap-3 py-2 border-y border-border">
        <label class="text-xs text-color-secondary whitespace-nowrap">目标浏览器</label>
        <el-select
          v-model="selectedBrowserId"
          size="small"
          placeholder="选择浏览器"
          class="flex-1"
          :disabled="browserList.length === 0"
        >
          <el-option
            v-for="b in browserList"
            :key="b.browser_id_str"
            :label="b.custom_name"
            :value="b.browser_id"
          />
        </el-select>
        <el-button
          type="primary"
          size="small"
          :icon="runStatus === 'running' ? Loading : VideoPlay"
          :loading="runStatus === 'running'"
          :disabled="!canRun"
          @click="handleRun"
        >
          {{ runStatus === 'running' ? '运行中...' : '运行工作流' }}
        </el-button>
      </div>

      <!-- 运行错误提示 -->
      <el-alert
        v-if="runError"
        class="workflow-run-error"
        :title="runError"
        type="error"
        :effect="themeStore.themeEffectString"
        :closable="false"
        show-icon
      />

      <!-- 步骤编辑器 -->
      <div class="workflow-step-editor h-[50vh] border border-border rounded">
        <DebugBox
          :key="dialogKey"
          ref="debugBoxRef"
          :browser-id="selectedBrowserId !== null ? String(selectedBrowserId) : ''"
          :initial-steps="editItems"
          edit-mode
        />
      </div>

      <!-- 运行结果面板 -->
      <el-collapse v-if="stepResults.length > 0" class="workflow-results-panel">
        <el-collapse-item class="max-h-[30vh] overflow-auto">
          <template #title>
          <span class="font-medium">执行结果</span>
          <div v-if="runSummary" class="text-xs text-color-primary">
            共 {{ runSummary.total }} 步 ·
            <span class="text-success">成功 {{ runSummary.success }}</span> ·
            <span class="text-danger">失败 {{ runSummary.failed }}</span>
          </div>
        </template>
        <div class="flex flex-col gap-2">
          <div
            v-for="(sr, idx) in stepResults"
            :key="idx"
            class="workflow-result-item flex items-start gap-2 p-2 rounded border border-border-lighter"
            :class="sr.success ? 'bg-success-light-9' : 'bg-danger-light-9'"
          >
            <el-icon :size="16" :class="sr.success ? 'text-success' : 'text-danger'">
              <CircleCheck v-if="sr.success" />
              <CircleClose v-else />
            </el-icon>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ sr.action_name || sr.action_id || `步骤 ${idx + 1}` }}</span>
                <el-tag size="small" :type="sr.success ? 'success' : 'danger'">
                  {{ sr.success ? '成功' : '失败' }}
                </el-tag>
                <span class="text-xs text-color-secondary">{{ formatExecTime(sr.execution_time) }}</span>
              </div>
              <div v-if="sr.error" class="text-xs text-danger mt-1 break-all">{{ sr.error }}</div>
              <details v-if="sr.data || sr.variables" class="mt-1">
                <summary class="text-xs text-color-secondary cursor-pointer hover:text-primary">详细信息</summary>
                <pre class="text-xs mt-1 p-2 bg-bg-secondary rounded overflow-auto whitespace-pre-wrap break-all">{{ JSON.stringify({ data: sr.data, variables: sr.variables, replaced_params: sr.replaced_params }, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </div>
        </el-collapse-item>
        
      </el-collapse>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!canSave" @click="handleSave">
        {{ workflowDetail ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>

  <!-- 最小化浮动标签 -->
  <MinimizeBar
    v-if="isMinimized"
    :title="workflowName || '编辑工作流'"
    @restore="handleRestore"
    @close="handleClose"
  />
</template>
