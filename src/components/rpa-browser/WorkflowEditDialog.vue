<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Minus, Monitor, Delete, Timer, Switch } from '@element-plus/icons-vue'
import { 工作流管理Service, 浏览器指纹管理Service, 自定义操作管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import ActionCard from './ActionCard.vue'
import ActionPickerDialog from './ActionPickerDialog.vue'
import MinimizeBar from './MinimizeBar.vue'
import { useThemeStore } from '@/stores/theme'
import { RouteName } from '@/models/router/index.ts'

/**
 * 工作流编辑弹窗（调度外壳配置面板）
 *
 * 工作流 = 「引用一个已有动作」+「触发配置」+「执行目标浏览器」+「可见性/启用」。
 * 不在此处编辑步骤：步骤的编辑与调试在动作侧（BrowserStream 调试页）完成。
 * 保存只写工作流（create/update），绝不创建或覆盖被引用的动作。
 */
const themeStore = useThemeStore()
const router = useRouter()

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

// ── 引用的动作 ───────────────────────────────────────
interface SelectedAction {
  action_id: string
  name?: string
  description?: string
  tags?: string[]
  steps_count?: number
  is_public?: boolean
}
const selectedAction = ref<SelectedAction | null>(null)
const pickerVisible = ref(false)

// ── 浏览器选择 ───────────────────────────────────────
interface BrowserOption {
  browser_id: number
  browser_id_str: string
  custom_name: string
}
const browserList = ref<BrowserOption[]>([])
const selectedBrowserId = ref<number | null>(null)

// ── 最小化状态 ───────────────────────────────────────
const isMinimized = ref(false)
const dialogVisible = computed(() => props.modelValue && !isMinimized.value)

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
  }
}

/** 按 action_id 拉取动作摘要（编辑已有工作流时回显引用信息） */
async function loadActionSummary(actionId: string) {
  const result = await businessHandler<Record<string, unknown>>(
    自定义操作管理Service.getCustomActionApiV1RpaBrowserControlCustomActionsGetPost({
      body: { action_id: actionId },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '加载引用动作失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const data = result.data
    const steps = Array.isArray(data.steps) ? (data.steps as unknown[]) : []
    selectedAction.value = {
      action_id: (data.action_id as string) || actionId,
      name: (data.name as string) || actionId,
      description: (data.description as string) || '',
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      steps_count: steps.length,
      is_public: (data.is_public as boolean) ?? false,
    }
  } else {
    selectedAction.value = { action_id: actionId, name: actionId, steps_count: 0 }
  }
}

// ── 校验 ─────────────────────────────────────────────
const nameError = computed(() => {
  if (!workflowName.value.trim()) return '工作流名称不能为空'
  if (workflowName.value.length > 50) return '名称不能超过50个字符'
  return ''
})

const actionError = computed(() => (selectedAction.value?.action_id ? '' : '必须选择一个要执行的动作'))

const cronError = computed(() => {
  if (triggerType.value !== 'cron') return ''
  const expr = cronExpression.value.trim()
  if (!expr) return 'Cron 表达式不能为空'
  if (expr.split(/\s+/).length !== 5) return 'Cron 表达式需为 5 段，例如 */5 * * * *'
  return ''
})

const browserError = computed(() => {
  if (triggerType.value !== 'cron') return ''
  return selectedBrowserId.value === null ? '定时触发必须指定执行目标浏览器' : ''
})

const formError = computed(
  () => nameError.value || actionError.value || cronError.value || browserError.value
)
const canSave = computed(() => !formError.value && !saving.value)

/** 运行状态展示 */
const nextRunAt = computed(() => (props.workflowDetail?.next_run_at as string) || '')
const lastRunAt = computed(() => (props.workflowDetail?.last_run_at as string) || '')
const lastRunStatus = computed(() => (props.workflowDetail?.last_run_status as string) || '')

const runStatusLabel: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
}
const runStatusType: Record<string, 'success' | 'danger' | 'warning'> = {
  success: 'success',
  failed: 'danger',
  running: 'warning',
}

// ── 监听打开/关闭 ─────────────────────────────────────
watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    isMinimized.value = false
    saving.value = false
    pickerVisible.value = false

    await loadBrowserList()

    if (props.workflowDetail) {
      // 编辑模式
      workflowName.value = (props.workflowDetail.name as string) || ''
      workflowDescription.value = (props.workflowDetail.description as string) || ''
      isPublic.value = (props.workflowDetail.is_public as boolean) ?? false
      isEnabled.value = (props.workflowDetail.is_enabled as boolean) ?? true
      const tt = (props.workflowDetail.trigger_type as string) || 'manual'
      triggerType.value = tt === 'cron' ? 'cron' : 'manual'
      const tc = props.workflowDetail.trigger_config as Record<string, unknown> | undefined
      cronExpression.value = (tc?.cron as string) || ''
      const bid = props.workflowDetail.browser_id as number | null | undefined
      selectedBrowserId.value = bid ?? null
      const actionId = props.workflowDetail.custom_action_id as string | undefined
      selectedAction.value = actionId ? { action_id: actionId, name: actionId, steps_count: 0 } : null
      if (actionId) await loadActionSummary(actionId)
    } else {
      // 新建模式
      workflowName.value = ''
      workflowDescription.value = ''
      isPublic.value = false
      isEnabled.value = true
      triggerType.value = 'manual'
      cronExpression.value = ''
      selectedBrowserId.value = browserList.value.length > 0 ? browserList.value[0].browser_id : null
      selectedAction.value = null
    }
  },
  { immediate: true }
)

// ── 动作选择 ─────────────────────────────────────────
function openActionPicker() {
  pickerVisible.value = true
}

async function handleActionPicked(actionId: string) {
  await loadActionSummary(actionId)
}

function clearAction() {
  selectedAction.value = null
}

// ── 去调试页（动作的调试在动作侧完成） ───────────────
function goDebugPage() {
  if (selectedBrowserId.value === null) {
    biliMessage.warning('请先选择目标浏览器，再前往调试页')
    return
  }
  router.push({
    name: RouteName.RPA_BROWSER_STREAM,
    params: { browserId: String(selectedBrowserId.value) },
  })
}

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

// ── 保存（只写工作流，不改动被引用的动作） ───────────
async function handleSave() {
  if (!canSave.value) return
  saving.value = true
  try {
    const triggerConfig = triggerType.value === 'cron' ? { cron: cronExpression.value.trim() } : {}
    const isEditing = !!props.workflowDetail

    const body: Record<string, unknown> = {
      name: workflowName.value,
      description: workflowDescription.value,
      custom_action_id: selectedAction.value?.action_id ?? null,
      browser_id: selectedBrowserId.value,
      trigger_type: triggerType.value,
      trigger_config: triggerConfig,
      is_public: isPublic.value,
    }

    const result = isEditing
      ? await businessHandler(
          工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
            body: {
              id: props.workflowDetail?.id as number,
              ...body,
              is_enabled: isEnabled.value,
            } as any,
            headers: userNavStore.user_header,
          }) as any,
          { successMessage: '工作流更新成功', errorMessage: '工作流更新失败' }
        )
      : await businessHandler(
          工作流管理Service.createWorkflowApiV1RpaBrowserControlWorkflowsCreatePost({
            body: body as any,
            headers: userNavStore.user_header,
          }) as any,
          { successMessage: '工作流创建成功', errorMessage: '工作流创建失败' }
        )

    if (result.success) {
      emit('saved')
      emit('update:modelValue', false)
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '保存失败'
    console.error('[WorkflowEditDialog] 保存工作流异常:', error)
    biliMessage.error(msg)
  } finally {
    saving.value = false
  }
}

function formatTime(t: string | null) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}
</script>

<template>
  <el-dialog
    :model-value="dialogVisible"
    width="80%"
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

    <div class="workflow-config-panel flex flex-col gap-4">
      <!-- 元信息表单 -->
      <div class="workflow-meta-form grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-color-secondary">名称 <span class="text-danger">*</span></label>
          <el-input
            v-model="workflowName"
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
            placeholder="工作流描述（可选）"
            maxlength="200"
            show-word-limit
          />
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">公开</label>
            <el-switch v-model="isPublic" inline-prompt active-text="是" inactive-text="否" />
          </div>
          <div v-if="workflowDetail" class="flex items-center gap-2">
            <label class="text-xs text-color-secondary">启用</label>
            <el-switch v-model="isEnabled" inline-prompt active-text="是" inactive-text="否" />
          </div>
        </div>
        <div class="workflow-run-state flex items-center gap-4 text-xs text-color-secondary flex-wrap">
          <span>上次运行：{{ formatTime(lastRunAt) }}</span>
          <el-tag v-if="lastRunStatus" :type="runStatusType[lastRunStatus] || 'info'" effect="plain">
            {{ runStatusLabel[lastRunStatus] || lastRunStatus }}
          </el-tag>
          <span v-if="triggerType === 'cron'">下次运行：{{ formatTime(nextRunAt) }}</span>
        </div>
      </div>

      <!-- 引用的动作 -->
      <div class="workflow-action-section border border-border rounded p-3 flex flex-col gap-2">
        <div class="workflow-action-section__header flex items-center justify-between">
          <div class="flex items-center gap-2">
            <el-icon class="text-primary"><Switch /></el-icon>
            <span class="text-sm font-medium">执行动作 <span class="text-danger">*</span></span>
            <span class="text-xs text-color-secondary">引用已有动作，多个工作流可共享同一动作</span>
          </div>
          <div class="flex items-center gap-2">
            <el-button :icon="Monitor" @click="goDebugPage">去调试页</el-button>
            <el-button type="primary" @click="openActionPicker">
              {{ selectedAction ? '更换动作' : '选择动作' }}
            </el-button>
          </div>
        </div>

        <div v-if="selectedAction" class="workflow-action-section__card flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <ActionCard
              :action="{
                action_id: selectedAction.action_id,
                name: selectedAction.name,
                description: selectedAction.description,
              }"
              :action-detail="{ tags: selectedAction.tags, is_public: selectedAction.is_public } as any"
            />
          </div>
          <div class="flex flex-col items-end gap-2 shrink-0">
            <el-tag type="info" effect="plain">{{ selectedAction.steps_count ?? 0 }} 步</el-tag>
            <el-button type="danger" plain :icon="Delete" @click="clearAction">移除</el-button>
          </div>
        </div>
        <el-alert
          v-else
          class="workflow-action-section__empty"
          type="info"
          :effect="themeStore.themeEffectString"
          :closable="false"
          show-icon
          title="尚未选择动作，请点击右上角「选择动作」"
        />
        <div v-if="actionError" class="text-xs text-danger">{{ actionError }}</div>
      </div>

      <!-- 触发配置 -->
      <div class="workflow-trigger-section border border-border rounded p-3 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <el-icon class="text-primary"><Timer /></el-icon>
          <span class="text-sm font-medium">触发配置</span>
        </div>
        <div class="flex items-center gap-4 flex-wrap">
          <el-radio-group v-model="triggerType">
            <el-radio value="manual">手动运行</el-radio>
            <el-radio value="cron">定时运行</el-radio>
          </el-radio-group>
          <template v-if="triggerType === 'cron'">
            <el-input
              v-model="cronExpression"
              placeholder="Cron 表达式，例如 */5 * * * *"
              class="workflow-trigger-section__cron w-70"
            />
            <span class="text-xs text-color-secondary">5 段：分 时 日 月 周（保存后由服务端计算下次运行时间）</span>
          </template>
        </div>
        <div v-if="cronError" class="text-xs text-danger">{{ cronError }}</div>

        <div class="workflow-trigger-section__browser flex items-center gap-3 flex-wrap">
          <label class="text-xs text-color-secondary whitespace-nowrap">
            目标浏览器 <span v-if="triggerType === 'cron'" class="text-danger">*</span>
          </label>
          <el-select
            v-model="selectedBrowserId"
            placeholder="选择执行目标浏览器"
            class="workflow-trigger-section__browser-select w-80"
            :disabled="browserList.length === 0"
            clearable
          >
            <el-option
              v-for="b in browserList"
              :key="b.browser_id_str"
              :label="b.custom_name"
              :value="b.browser_id"
            />
          </el-select>
          <span class="text-xs text-color-secondary">
            定时运行时若浏览器未启动，服务端会自动拉起会话
          </span>
        </div>
        <div v-if="browserError" class="text-xs text-danger">{{ browserError }}</div>
      </div>

      <el-alert
        class="workflow-debug-tip"
        type="info"
        :effect="themeStore.themeEffectString"
        :closable="false"
        show-icon
        title="工作流不提供步骤编辑器：步骤的编辑与调试请在动作侧完成，工作流只负责「何时、用哪个浏览器跑哪个动作」。"
      />
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!canSave" @click="handleSave">
        {{ workflowDetail ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>

  <!-- 动作选择器 -->
  <ActionPickerDialog
    v-model="pickerVisible"
    :selected-action-id="selectedAction?.action_id"
    @select="handleActionPicked"
  />

  <!-- 最小化浮动标签 -->
  <MinimizeBar
    v-if="isMinimized"
    :title="workflowName || '编辑工作流'"
    @restore="handleRestore"
    @close="handleClose"
  />
</template>
