<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { 工作流管理Service, 操作日志管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
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

interface RunItem {
  id: number
  run_id: string
  workflow_id: string
  browser_id?: string
  trigger_source: string
  status: string
  total?: number
  success_count?: number
  failed_count?: number
  execution_id?: string
  error_message?: string | null
  duration_ms?: number
  started_at?: string | null
  finished_at?: string | null
  /** 运行期进度（SSE 未覆盖时作为兜底展示） */
  completed_steps?: number
  current_step_index?: number
  current_step_name?: string
  loop_action_name?: string
  loop_index?: number
  loop_total?: number
  /** 本轮循环体内的动作进度（第二条进度条） */
  loop_body_completed?: number
  loop_body_total?: number
  loop_body_step_name?: string
  progress_updated_at?: number | null
  /** 断点恢复：是否可继续、来源运行、已恢复次数、检查点 */
  resumable?: boolean
  resume_of?: string | null
  resume_count?: number
  checkpoint_step?: number
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

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const triggerLabel: Record<string, string> = {
  manual: '手动',
  schedule: '定时',
}
const statusLabel: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  interrupted: '已中断',
  cancelled: '已取消',
}
const statusType: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  failed: 'danger',
  running: 'warning',
  interrupted: 'info',
  cancelled: 'info',
}

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
          共 {{ total }} 条运行记录；「步骤」为顶层步骤数（循环体每轮单独记日志、不重复计步骤），
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
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType[row.status] || 'info'">
              {{ statusLabel[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发" width="90">
          <template #default="{ row }">{{ triggerLabel[row.trigger_source] || row.trigger_source }}</template>
        </el-table-column>
        <el-table-column label="目标浏览器" width="120">
          <template #default="{ row }">{{ row.browser_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="步骤" width="140">
          <template #default="{ row }">
            <span class="text-success">{{ row.success_count ?? 0 }}</span>
            /
            <span class="text-danger">{{ row.failed_count ?? 0 }}</span>
            / {{ row.total ?? 0 }}
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
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
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
            <span v-else class="text-xs text-color-secondary">-</span>
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

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>
