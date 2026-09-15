<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { 工作流管理Service, 操作日志管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'

/**
 * 工作流运行记录弹窗
 *
 * 展示调度外壳的运行观测：每次运行的触发来源、状态、步骤统计与耗时；
 * 展开行可通过 execution_id 下钻到步骤级操作日志（ActionLogRecord）。
 */
interface Props {
  modelValue: boolean
  workflowId: string
  workflowName?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

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

const loading = ref(false)
const runs = ref<RunItem[]>([])
const total = ref(0)
const currentPage = ref(1)
/** 展开行对应的步骤日志（按 run_id 缓存） */
const stepLogs = ref<Record<string, StepLog[]>>({})
const stepLogsLoading = ref<Record<string, boolean>>({})

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
}
const statusType: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  failed: 'danger',
  running: 'warning',
}

async function loadRuns(page = 1) {
  if (!props.workflowId) return
  loading.value = true
  const result = await businessHandler<{ items?: RunItem[]; total?: number }>(
    工作流管理Service.listWorkflowRunsApiV1RpaBrowserControlWorkflowsRunsPost({
      body: { workflow_id: props.workflowId, page, per_page: PER_PAGE },
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

async function loadStepLogs(run: RunItem) {
  if (!run.execution_id) return
  if (stepLogs.value[run.run_id]) return
  stepLogsLoading.value = { ...stepLogsLoading.value, [run.run_id]: true }
  const result = await businessHandler<StepLog[]>(
    操作日志管理Service.listActionLogsByExecutionApiV1RpaBrowserControlActionLogsByExecutionPost({
      body: { execution_id: run.execution_id },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取步骤日志失败', showSuccessToast: false }
  )
  stepLogs.value = {
    ...stepLogs.value,
    [run.run_id]: result.success && Array.isArray(result.data) ? result.data : [],
  }
  stepLogsLoading.value = { ...stepLogsLoading.value, [run.run_id]: false }
}

function handleExpandChange(row: RunItem, expanded: RunItem[]) {
  const isExpanded = expanded.some(r => r.run_id === row.run_id)
  if (isExpanded) loadStepLogs(row)
}

function handleRefresh() {
  stepLogs.value = {}
  stepLogsLoading.value = {}
  loadRuns(currentPage.value)
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
    if (!visible) return
    stepLogs.value = {}
    stepLogsLoading.value = {}
    loadRuns(1)
  },
  { immediate: true }
)
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
          共 {{ total }} 条运行记录；展开某次运行可下钻步骤级日志
        </span>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="runs"
        class="workflow-run-log__table"
        row-key="run_id"
        max-height="56vh"
        @expand-change="handleExpandChange"
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
              <div v-else class="text-xs text-color-secondary">
                {{ row.execution_id ? '暂无步骤日志（该动作未开启日志采集）' : '该次运行没有执行批次' }}
              </div>
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
      </el-table>

      <div class="workflow-run-log__pagination flex justify-center">
        <el-pagination
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
