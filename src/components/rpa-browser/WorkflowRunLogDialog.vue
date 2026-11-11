<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { RouteName } from '@/models/router/index.ts'
import {
  工作流管理Service,
  操作日志管理Service,
  type WorkflowRunLogItemResponse,
} from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import { deleteWorkflowResources } from '@/api/browser/workflow_resource_api'
import { runStatusTagType, runStatusText } from '@/utils/rpa/runDisplay'
import WorkflowRunProgressBar from './WorkflowRunProgressBar.vue'
import {
  subscribeWorkflowRunProgress,
  resumeWorkflowRun,
  isTerminalRunStatus,
  type WorkflowRunProgress,
} from '@/api/browser/workflow_run_api'

/**
 * 工作流运行记录弹窗
 *
 * 展示调度外壳的运行观测：每次运行的触发来源、状态、步骤统计与耗时；
 * 运行中的行通过 SSE 实时展示进度条（循环轮次为主轴）与计时，
 * 展开行可通过 execution_id 下钻到步骤级操作日志（ActionLogRecord）。
 */
interface Props {
  modelValue: boolean
  workflowId: string
  workflowName?: string
  /**
   * 刚发起/刚恢复的运行ID：运行记录由后台 task 创建，紧接着的列表刷新可能查不到，
   * 直接凭该ID订阅并合成临时行，避免弹窗空窗。
   */
  initialRunId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 运行状态发生变化（恢复/终态），父页面据此刷新卡片 */
  'run-changed': []
}>()

const userNavStore = useUserNavStore()
const router = useRouter()

/**
 * 列表行：直接复用后端契约（含资源统计与失败分类字段；SDK 分页 items 已展开）。
 * `workflow_id` / `browser_id` 本地保持 string：与 props / 路由参数比较时避免
 * number 精度问题与来回转换。
 */
type RunItem = Omit<WorkflowRunLogItemResponse, 'workflow_id' | 'browser_id'> & {
  workflow_id: string
  browser_id?: string
}

interface StepLog {
  log_id: string
  action_id: string
  action_name: string
  status: string
  success: boolean
  execution_time: number
  error_message?: string | null
}

const PER_PAGE = 10
/** 步骤日志每页条数：一次运行可达数千条，必须分页加载 */
const STEP_LOG_PAGE_SIZE = 50

const loading = ref(false)
const runs = ref<RunItem[]>([])
const total = ref(0)
const currentPage = ref(1)
/** 展开行对应的步骤日志（按 run_id 缓存，只存当前页） */
const stepLogs = ref<Record<string, StepLog[]>>({})
/** 各运行的步骤日志总数与当前页码 */
const stepLogTotals = ref<Record<string, number>>({})
const stepLogPages = ref<Record<string, number>>({})
const stepLogsLoading = ref<Record<string, boolean>>({})
/** SSE 实时进度（按 run_id 缓存；终态帧保留，供该行展示最终耗时与轮次） */
const progressMap = ref<Record<string, WorkflowRunProgress>>({})
/** 进行中的 SSE 订阅（run_id -> 取消函数） */
const subscriptions = new Map<string, () => void>()
const resumingRunId = ref<string | null>(null)
/** 正在清理资源记录的行（run_id）：dry_run 预览 + 实际删除期间禁止重复点击 */
const clearingRunId = ref<string | null>(null)
/** 资源清理确认弹窗（层级由 el-dialog 的 useZIndex 保证在运行记录弹窗之上） */
const clearConfirmVisible = ref(false)
/** 待确认清理的运行行与预览到的条数 */
const pendingClearRun = ref<RunItem | null>(null)
const clearAffected = ref(0)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const triggerLabel: Record<string, string> = {
  manual: '手动',
  schedule: '定时',
}
/**
 * 状态列文案：不再给成功/失败结论。
 * 过程状态照旧（运行中 / 排队中 / 已中断 / 已停止），终态展示可数结果：
 * 有资源 = 成功循环 N 轮；无资源 = 成功 N 步。
 */
const runStatusTextOf = (row: RunItem) =>
  runStatusText({
    status: row.status,
    success_count: row.success_count,
    total_steps: row.total,
    resource_total: row.resource_total,
    resource_success: row.resource_success,
  })

/** 用进度帧同步列表行（步骤统计/当前步骤需实时变化，不必等重新拉列表） */
function applyProgressToRow(progress: WorkflowRunProgress) {
  let row = runs.value.find(r => r.run_id === progress.run_id)
  if (!row) {
    // 运行记录尚未落库 / 列表尚未刷新：先合成一行，终态刷新列表时替换为真实记录
    row = {
      id: 0,
      run_id: progress.run_id,
      workflow_id: String(progress.workflow_id ?? props.workflowId),
      browser_id: String(progress.browser_id ?? ''),
      trigger_source: progress.trigger_source,
      status: progress.status,
      total: progress.total_steps,
      success_count: progress.success_count,
      failed_count: progress.failed_count,
      started_at: progress.started_at
        ? new Date(progress.started_at * 1000).toISOString()
        : null,
      finished_at: null,
      duration_ms: progress.duration_ms,
    }
    runs.value = [row, ...runs.value]
  }
  row.status = progress.status
  row.total = progress.total_steps
  row.success_count = progress.success_count
  row.failed_count = progress.failed_count
  row.completed_steps = progress.completed_steps
  row.current_step_index = progress.current_step_index
  row.current_step_name = progress.current_step_name
  row.loop_action_name = progress.loop_action_name
  row.loop_index = progress.loop_index
  row.loop_total = progress.loop_total
  row.loop_body_completed = progress.loop_body_completed
  row.loop_body_total = progress.loop_body_total
  row.loop_body_step_name = progress.loop_body_step_name
  row.progress_updated_at = progress.updated_at
  row.duration_ms = progress.duration_ms
  row.error_message = progress.error_message
  row.finished_at = progress.finished_at
    ? new Date(progress.finished_at * 1000).toISOString()
    : row.finished_at
}

/** 订阅一次运行；终态帧到达后自动关闭连接并刷新该行 */
function subscribeRunById(runId: string, status = 'running') {
  if (subscriptions.has(runId) || isTerminalRunStatus(status)) return
  const close = subscribeWorkflowRunProgress(runId, userNavStore.user_header, {
    onProgress: (progress) => {
      progressMap.value = { ...progressMap.value, [progress.run_id]: progress }
      applyProgressToRow(progress)
      if (isTerminalRunStatus(progress.status)) {
        closeRunSubscription(progress.run_id)
        // 终态后补拉一次列表，拿到执行批次ID、错误信息等完整字段
        loadRuns(currentPage.value)
        emit('run-changed')
      }
    },
    // SSE 断开不弹错：列表本身仍能通过刷新看到最终状态，避免后台刷新打扰用户
    onError: () => closeRunSubscription(runId),
  })
  subscriptions.set(runId, close)
}

function closeRunSubscription(runId: string) {
  const close = subscriptions.get(runId)
  if (close) {
    close()
    subscriptions.delete(runId)
  }
}

function closeAllSubscriptions() {
  for (const close of subscriptions.values()) close()
  subscriptions.clear()
}

/** 列表刷新后重算订阅集合：只订阅仍在运行的行 */
function syncSubscriptions() {
  const runningIds = new Set(runs.value.filter(r => r.status === 'running').map(r => r.run_id))
  for (const runId of [...subscriptions.keys()]) {
    if (!runningIds.has(runId)) closeRunSubscription(runId)
  }
  for (const run of runs.value) {
    if (run.status === 'running') subscribeRunById(run.run_id, run.status)
  }
}

async function loadRuns(page = 1) {
  if (!props.workflowId) return
  loading.value = true
  const result = await businessHandler<{ items?: RunItem[]; total?: number }>(
    工作流管理Service.listWorkflowRunsApiV1RpaBrowserControlWorkflowsRunsPost({
      // 雪花 ID 以字符串透传：19 位整数超出 JS Number 安全范围，由后端自行转 int
      body: { workflow_id: props.workflowId as unknown as number, page, per_page: PER_PAGE },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取运行记录失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    runs.value = (result.data.items || []) as RunItem[]
    total.value = result.data.total || 0
    currentPage.value = page
  } else {
    runs.value = []
    total.value = 0
  }
  loading.value = false
}

/**
 * 跳「已处理数据」并只看本轮批次。
 *
 * 资源记录的 execution_id 与运行的 execution_id 同名同值，`?execution_id=` 直接在
 * 表格的「执行批次」筛选里生效，无需任何映射；顺带带上 workflow_id 定位到本工作流。
 */
function openResourceRecords(row: RunItem) {
  const executionId = row.execution_id
  if (!executionId) return
  dialogVisible.value = false
  router.push({
    name: RouteName.RPA_BROWSER_RESOURCE_RECORD,
    query: {
      workflow_id: String(row.workflow_id || props.workflowId || ''),
      execution_id: executionId,
    },
  })
}

async function loadStepLogs(run: RunItem, targetPage = 1) {
  if (!run.execution_id) return
  stepLogsLoading.value = { ...stepLogsLoading.value, [run.run_id]: true }
  const result = await businessHandler<{ items?: StepLog[]; total?: number }>(
    操作日志管理Service.listActionLogsApiV1RpaBrowserControlActionLogsListPost({
      body: {
        execution_id: run.execution_id,
        page: targetPage,
        per_page: STEP_LOG_PAGE_SIZE,
        // 升序 = 写入顺序，便于按执行先后阅读
        order_desc: false,
      },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取步骤日志失败', showSuccessToast: false }
  )
  stepLogs.value = {
    ...stepLogs.value,
    [run.run_id]: result.success ? result.data?.items || [] : [],
  }
  stepLogTotals.value = { ...stepLogTotals.value, [run.run_id]: result.data?.total || 0 }
  stepLogPages.value = { ...stepLogPages.value, [run.run_id]: targetPage }
  stepLogsLoading.value = { ...stepLogsLoading.value, [run.run_id]: false }
}

/** 展开行内的分页器回传 row 为宽松类型，收窄后再走业务逻辑 */
function handleStepLogPageChange(row: unknown, targetPage: number) {
  loadStepLogs(row as RunItem, targetPage)
}

function handleExpandChange(row: unknown, expanded: unknown[]) {
  const target = row as RunItem
  const isExpanded = expanded.some(r => (r as RunItem).run_id === target.run_id)
  // 已加载过就保留当前页，避免每次展开都重新请求
  if (isExpanded && !stepLogs.value[target.run_id]) loadStepLogs(target, 1)
}

/** el-table 插槽 row 为宽松类型，收窄后再走业务逻辑 */
function handleResumeRow(row: unknown) {
  return handleResume(row as RunItem)
}

/** el-table 的 expand-change 声明为函数重载交叉类型，直接绑定会类型不兼容 */
const expandChangeHandler: any = handleExpandChange

/** 清空步骤日志缓存（含分页状态），下次展开从第 1 页重新拉 */
function resetStepLogs() {
  stepLogs.value = {}
  stepLogTotals.value = {}
  stepLogPages.value = {}
  stepLogsLoading.value = {}
}

function handleRefresh() {
  resetStepLogs()
  progressMap.value = {}
  closeAllSubscriptions()
  loadRuns(currentPage.value)
}

/** 继续运行（断点恢复）：恢复成功后刷新列表并订阅新运行 */
async function handleResume(row: RunItem) {
  if (resumingRunId.value !== null) return
  resumingRunId.value = row.run_id
  const res = await resumeWorkflowRun(row.run_id, userNavStore.user_header)
  resumingRunId.value = null
  if (!res.success) return
  await loadRuns(1)
  emit('run-changed')
  const nextRunId = res.data?.run_id
  // 记录可能尚未落库：直接按 run_id 订阅并合成行，终态时再刷新列表
  if (nextRunId) subscribeRunById(nextRunId)
}

/**
 * 清理本轮运行写入的已处理资源记录（判定逻辑修正后，让误记为终态的资源重新被捞起）。
 *
 * 资源记录的 execution_id 与运行 run_id 同名同值，所以按 execution_id 精确清理即可命中本轮；
 * 先 `dry_run` 预览影响面，再用本组件内的确认弹窗二次确认后才真正删除。
 *
 * 确认用 el-dialog 而不是 ElMessageBox：MessageBox 的 overlay 层级（2003）会低于
 * 已打开的运行记录弹窗（z-index 由 useZIndex 递增到 2017+），导致确认框被遮罩挡住点不到。
 */
async function handleClearRunResources(row: RunItem) {
  const executionId = row.execution_id || row.run_id
  if (clearingRunId.value) return
  if (!executionId) {
    ElMessage.warning('该运行没有执行批次，无法按批次清理资源记录')
    return
  }
  clearingRunId.value = row.run_id
  try {
    const preview = await deleteWorkflowResources(
      { workflow_id: Number(row.workflow_id), execution_id: executionId, dry_run: true },
      userNavStore.user_header
    )
    if (!preview.success) return
    const affected = preview.data?.deleted ?? 0
    if (affected === 0) {
      ElMessage.info('本轮没有写入任何已处理资源记录')
      return
    }
    pendingClearRun.value = row
    clearAffected.value = affected
    clearConfirmVisible.value = true
  } finally {
    clearingRunId.value = null
  }
}

/** 确认弹窗：执行真正的删除（dry_run=false） */
async function confirmClearResources() {
  const row = pendingClearRun.value
  if (!row) return
  const executionId = row.execution_id || row.run_id
  clearingRunId.value = row.run_id
  try {
    const done = await deleteWorkflowResources(
      { workflow_id: Number(row.workflow_id), execution_id: executionId, dry_run: false },
      userNavStore.user_header
    )
    if (done.success) {
      ElMessage.success(`已清理 ${done.data?.deleted ?? clearAffected.value} 条资源记录`)
      clearConfirmVisible.value = false
      pendingClearRun.value = null
      emit('run-changed')
    }
  } finally {
    clearingRunId.value = null
  }
}

/** el-table 插槽 row 为宽松类型，收窄后再走业务逻辑 */
function handleClearRunResourcesRow(row: unknown) {
  return handleClearRunResources(row as RunItem)
}

function handleClose() {
  emit('update:modelValue', false)
}

function formatTime(t?: string | null) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

function formatDuration(ms?: number) {
  if (ms === undefined || ms === null) return '-'
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      // 关闭弹窗即断开 SSE，避免后台常驻连接
      closeAllSubscriptions()
      return
    }
    resetStepLogs()
    progressMap.value = {}
    loadRuns(1)
    // 刚发起的运行：记录可能还没落库，直接凭 run_id 订阅（首帧/轮询会合成临时行）
    if (props.initialRunId) subscribeRunById(props.initialRunId)
  },
  { immediate: true }
)

onBeforeUnmount(closeAllSubscriptions)
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="workflowName ? `运行记录 - ${workflowName}` : '运行记录'"
    width="80%"
    :append-to-body="true"
    :close-on-click-modal="false"
    class="workflow-run-log-dialog"
  >
    <div class="workflow-run-log flex flex-col gap-3">
      <div class="workflow-run-log__toolbar flex items-center justify-between">
        <span class="text-xs text-color-secondary">
          共 {{ total }} 条运行记录；「结果」只给可数成果——有资源记录时按成功循环轮次，
          无资源记录时按成功步骤数；「步骤」为顶层步骤数（循环体每轮单独记日志、不重复计步骤），
          展开可下钻动作日志
        </span>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="runs"
        class="workflow-run-log__table"
        row-key="run_id"
        max-height="56vh"
        @expand-change="expandChangeHandler"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div v-loading="stepLogsLoading[row.run_id]" class="workflow-run-log__steps p-3">
              <template v-if="(stepLogs[row.run_id] || []).length > 0">
                <div
                  v-for="log in stepLogs[row.run_id]"
                  :key="log.log_id"
                  class="workflow-run-log__step flex items-start gap-2 py-1 flex-wrap"
                >
                  <el-tag :type="log.success ? 'success' : 'danger'" effect="plain">
                    {{ log.success ? '成功' : '失败' }}
                  </el-tag>
                  <span class="text-sm">{{ log.action_name || log.action_id }}</span>
                  <span class="text-xs text-color-secondary font-mono">{{ log.action_id }}</span>
                  <span class="text-xs text-color-secondary">{{ formatDuration(log.execution_time * 1000) }}</span>
                  <span v-if="log.error_message" class="text-xs text-danger break-all">{{ log.error_message }}</span>
                </div>
              </template>
              <div v-else class="workflow-run-log__empty text-xs text-color-secondary">
                {{
                  row.execution_id
                    ? '暂无步骤日志：该工作流未开启「执行日志」开关，或日志已超过 7 天保留期被自动清理'
                    : '该次运行没有执行批次'
                }}
              </div>
              <!-- 步骤日志分页：一次运行可达数千条，只渲染当前页 -->
              <BiliPagination
                v-if="(stepLogTotals[row.run_id] || 0) > STEP_LOG_PAGE_SIZE"
                :current-page="stepLogPages[row.run_id] || 1"
                class="workflow-run-log__steps-pagination mt-2"
                :page-size="STEP_LOG_PAGE_SIZE"
                :total="stepLogTotals[row.run_id] || 0"
                layout="total, prev, pager, next"
                background
                @current-change="handleStepLogPageChange(row, $event)"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="140">
          <template #default="{ row }">
            <el-tag :type="runStatusTagType(row.status)">
              {{ runStatusTextOf(row as RunItem) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发" width="90">
          <template #default="{ row }">{{ triggerLabel[row.trigger_source] || row.trigger_source }}</template>
        </el-table-column>
        <el-table-column label="目标浏览器" width="120">
          <template #default="{ row }">{{ row.browser_id || '-' }}</template>
        </el-table-column>
        <!-- 执行批次：与「已处理数据」的资源记录同值，点击按批次查看本轮产出的数据 -->
        <el-table-column label="执行批次" width="120">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.execution_id"
              :content="`查看该批次已处理数据（${row.execution_id}）`"
              placement="top"
            >
              <el-link
                class="workflow-run-log__execution-link font-mono"
                type="primary"
                :underline="false"
                @click="openResourceRecords(row as RunItem)"
              >
                {{ String(row.execution_id).slice(0, 8) }}
              </el-link>
            </el-tooltip>
            <span v-else class="text-xs text-color-secondary">-</span>
          </template>
        </el-table-column>
        <el-table-column label="步骤" width="140">
          <template #default="{ row }">
            <span class="text-success">{{ row.success_count ?? 0 }}</span>
            /
            <span class="text-danger">{{ row.failed_count ?? 0 }}</span>
            / {{ row.total ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="资源结果" min-width="190">
          <template #default="{ row }">
            <div
              v-if="(row.resource_total ?? 0) > 0"
              class="workflow-run-log__resource flex flex-col"
            >
              <div class="workflow-run-log__resource-summary text-xs">
                <span class="text-success">{{ row.resource_success ?? 0 }}</span>
                /
                <span
                  :class="(row.resource_failed ?? 0) > 0 ? 'text-danger' : 'text-color-secondary'"
                >{{ row.resource_failed ?? 0 }}</span>
                /
                <span class="text-color-secondary">{{ row.resource_skipped ?? 0 }}</span>
                <span class="text-color-secondary">（共 {{ row.resource_total }}）</span>
              </div>
              <el-tooltip
                v-if="(row.resource_failed ?? 0) > 0"
                content="致命失败达到阈值会把整次运行判为失败；可重试失败只留痕，下一轮重新捞起"
                placement="top"
              >
                <div class="workflow-run-log__resource-detail text-xs">
                  <span class="text-warning">可重试 {{ row.resource_soft_failed ?? 0 }}</span>
                  <span class="text-color-secondary"> / </span>
                  <span class="text-danger">致命 {{ row.resource_fatal_failed ?? 0 }}</span>
                </div>
              </el-tooltip>
            </div>
            <span v-else class="text-xs text-color-secondary">-</span>
          </template>
        </el-table-column>
        <!-- 实时进度：循环体内按轮次展示（用户最关心「第几条/共几条」），否则按步骤 -->
        <el-table-column label="进度" min-width="260">
          <template #default="{ row }">
            <WorkflowRunProgressBar
              v-if="progressMap[row.run_id] || row.status === 'running'"
              :progress="progressMap[row.run_id] || null"
              :started-at="row.started_at"
              :duration-ms="row.duration_ms"
              compact
            />
            <span v-else class="text-xs text-color-secondary">
              {{ row.completed_steps ?? 0 }}/{{ row.total ?? 0 }} 步
            </span>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="110">
          <template #default="{ row }">{{ formatDuration(row.duration_ms) }}</template>
        </el-table-column>
        <el-table-column label="开始时间" min-width="180">
          <template #default="{ row }">{{ formatTime(row.started_at) }}</template>
        </el-table-column>
        <el-table-column label="错误信息" min-width="200">
          <template #default="{ row }">
            <span class="text-xs text-danger break-all">{{ row.error_message || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <div class="workflow-run-log__row-actions flex items-center gap-1">
              <el-tooltip
                v-if="row.status === 'interrupted' && row.resumable"
                content="从检查点继续执行：当前步骤会重跑，循环内已处理的资源自动跳过"
                placement="top"
              >
                <el-button
                  class="workflow-run-log__resume"
                  type="primary"
                  plain
                  :icon="RefreshRight"
                  :loading="resumingRunId === row.run_id"
                  @click="handleResumeRow(row)"
                >
                  继续
                </el-button>
              </el-tooltip>
              <el-tooltip
                content="删除本轮写入的已处理资源记录，让这些资源重新参与下一轮取数（先预览条数再确认）"
                placement="top"
              >
                <el-button
                  class="workflow-run-log__clear-resources"
                  text
                  type="danger"
                  :icon="Delete"
                  :loading="clearingRunId === row.run_id"
                  @click="handleClearRunResourcesRow(row)"
                >
                  清理资源
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="workflow-run-log__pagination flex justify-center">
        <BiliPagination
          layout="prev, pager, next"
          :current-page="currentPage"
          :page-size="PER_PAGE"
          :total="total"
          @current-change="loadRuns"
        />
      </div>
    </div>

    <!-- 资源清理确认：删除后这些资源会在下一轮取数时重新被抓取 -->
    <el-dialog
      v-model="clearConfirmVisible"
      title="清理本轮资源记录"
      width="440px"
      append-to-body
      :lock-scroll="false"
      class="workflow-run-log__clear-confirm"
    >
      <el-text class="workflow-run-log__clear-confirm-text text-sm text-text-regular" tag="p">
        将删除本轮运行写入的
        <span class="workflow-run-log__clear-confirm-count font-semibold text-danger">{{ clearAffected }}</span>
        条已处理资源记录，这些资源会在下次运行时重新被抓取。
      </el-text>
      <template #footer>
        <el-button class="workflow-run-log__clear-cancel" @click="clearConfirmVisible = false">
          取消
        </el-button>
        <el-button
          class="workflow-run-log__clear-submit"
          type="danger"
          :loading="clearingRunId !== null"
          @click="confirmClearResources"
        >
          删除 {{ clearAffected }} 条
        </el-button>
      </template>
    </el-dialog>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>
