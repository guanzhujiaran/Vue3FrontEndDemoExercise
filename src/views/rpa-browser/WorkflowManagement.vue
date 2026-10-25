<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Refresh, Search, Plus, SetUp, Upload } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import WorkflowEditDialog from '@/components/rpa-browser/WorkflowEditDialog.vue'
import WorkflowRunLogDialog from '@/components/rpa-browser/WorkflowRunLogDialog.vue'
import WorkflowCard from '@/components/rpa-browser/WorkflowCard.vue'
import type { WorkflowMoreCommand } from '@/components/rpa-browser/WorkflowCard.vue'
import {
  subscribeWorkflowRunProgress,
  resumeWorkflowRun,
  isTerminalRunStatus,
  createPendingRunProgress,
  type WorkflowRunProgress,
} from '@/api/browser/workflow_run_api'
import { useWorkflowRunMessageStore } from '@/stores/workflow_run_messages'
import { 工作流管理Service, 管理员管理Service, 浏览器指纹管理Service } from '@/api/browser/hey-api'
import { client } from '@/api/browser/hey-api/client.gen'
import type { FilterType, SortBy, SortOrder, WorkflowDetailResponse } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import { pickBackendMsg } from '@/utils/backendErrorMsg'
import biliMessage from '@/utils/message'
import { pickJsonFile, errMsg } from '@/utils/rpa/jsonImport'
import { RouteName } from '@/models/router/index.ts'
import type { WorkflowItem } from '@/models/rpa_browser'

const router = useRouter()

const userNavStore = useUserNavStore()
/** 全局运行消息（SSE 订阅在 store 内，切换页面不中断） */
const messageStore = useWorkflowRunMessageStore()

const workflowList = ref<WorkflowItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const searchText = ref('')
const filterType = ref<FilterType>('private')
const sortBy = ref<SortBy>('updated_at')
const sortOrder = ref<SortOrder>('desc')

// ── 编辑对话框 ───────────────────────────────────────
const editDialogVisible = ref(false)
const editDialogLoading = ref(false)
const editDialogDetail = ref<WorkflowDetailResponse | null>(null)

// ── 浏览器名称映射（列表卡片展示目标浏览器用） ──────────
const browserNameMap = ref<Map<number, string>>(new Map())

async function loadBrowserNames() {
  const result = await businessHandler<{ items?: Array<Record<string, unknown>> }>(
    浏览器指纹管理Service.listFingerprintRouterApiV1RpaBrowserListFingerprintPost({
      body: { page: 1, per_page: 100 },
      headers: userNavStore.user_header,
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '', errorMessage: '获取浏览器列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const map = new Map<number, string>()
    for (const b of result.data.items || []) {
      const id = b.browser_id as number
      map.set(id, (b.custom_name as string) || `浏览器 ${id}`)
    }
    browserNameMap.value = map
  }
}

// ── 跳转浏览器详情（从工作流反查浏览器） ──────────────
function openBrowserDetail(item: WorkflowItem) {
  if (item.browser_id === null || item.browser_id === undefined) return
  router.push({
    name: RouteName.RPA_BROWSER_DETAIL,
    params: { browserId: String(item.browser_id) }
  })
}

/**
 * 拉取工作流列表（分页，非追加）。
 *
 * 刷新类操作（搜索 / 筛选 / 增删改后）统一取第 1 页；分页器翻页时传目标页码。
 * 纵向滚动由最外层 BiliSideNavLayout 内容区的 BiliScrollbar 承接，
 * 页面内不再放滚动容器，也不做触底追加。
 */
const loadWorkflows = async (page = 1) => {
  loading.value = true
  currentPage.value = page

  const result = await businessHandler<{ items?: WorkflowItem[]; total?: number }>(
    工作流管理Service.listWorkflowsApiV1RpaBrowserControlWorkflowsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value,
      },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '', errorMessage: '获取工作流列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const items = result.data.items || []
    // 前端搜索过滤（名称）
    const filtered = searchText.value
      ? items.filter((w: WorkflowItem) => w.name.includes(searchText.value))
      : items
    workflowList.value = filtered
    total.value = result.data.total || 0
  } else {
    workflowList.value = []
    total.value = 0
  }
  loading.value = false
  syncCardSubscriptions()
}

/** 分页器翻页：el-pagination 的 current-change 携带目标页码 */
const handlePageChange = (page: number) => {
  loadWorkflows(page)
}

/** 从 JSON 文件直接导入并保存为一个新工作流（后端生成新的 workflow_id） */
const importing = ref(false)
const handleImportJson = async () => {
  let data: Record<string, unknown> | null
  try {
    data = await pickJsonFile()
  } catch (e) {
    ElMessage.error(`导入失败：${errMsg(e)}`)
    return
  }
  if (!data) return // 用户取消

  importing.value = true
  try {
    const res = await client.post({
      url: '/api/v1/rpa/browser/control/workflows/import',
      body: data,
      headers: { 'Content-Type': 'application/json', ...userNavStore.user_header },
      // 失败走非 2xx 响应，开启 throwOnError 以便 catch 直接拿到后端 { code, msg, data }
      throwOnError: true,
    }) as { code?: number; msg?: string; data?: { workflow_id?: string; name?: string } | null }
    if (res?.code === 0) {
      ElMessage.success(`导入成功${res.data?.name ? `：${res.data.name}` : ''}`)
      await loadWorkflows()
    } else {
      ElMessage.error(res?.msg || '导入失败')
    }
  } catch (e) {
    // 优先直接展示后端 msg；无 msg 或默认 500 才用兜底文案
    const backendMsg = pickBackendMsg(e)
    console.error('[WorkflowManagement] 导入工作流异常:', e)
    ElMessage.error(backendMsg || `导入失败：${errMsg(e)}`)
  } finally {
    importing.value = false
  }
}

const handleSearch = useDebounceFn(() => {
  loadWorkflows()
}, 400)

const handleFilterChange = () => {
  loadWorkflows()
}

const handleCreate = () => {
  editDialogDetail.value = null
  editDialogVisible.value = true
}

const handleEdit = async (item: WorkflowItem) => {
  editDialogLoading.value = true
  const result = await businessHandler<WorkflowDetailResponse>(
    工作流管理Service.getWorkflowDetailApiV1RpaBrowserControlWorkflowsGetPost({
      body: { id: item.id },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '', errorMessage: '获取工作流详情失败', showSuccessToast: false }
  )
  editDialogLoading.value = false
  if (result.success && result.data) {
    editDialogDetail.value = result.data
    editDialogVisible.value = true
  }
}

const handleDuplicate = async (item: WorkflowItem) => {
  let newName: string
  try {
    const result = await ElMessageBox.prompt('请输入新工作流名称', '复制工作流', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: `${item.name} 副本`,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空',
      lockScroll: false,
    })
    newName = result.value
  } catch {
    return
  }
  const result = await businessHandler(
    工作流管理Service.duplicateWorkflowApiV1RpaBrowserControlWorkflowsDuplicatePost({
      body: { id: item.id, new_name: newName },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '复制成功', errorMessage: '复制失败' }
  )
  if (result.success) {
    loadWorkflows()
  }
}

const handleTogglePublic = async (item: WorkflowItem, next: boolean) => {
  // 卡片开关只透传变更意图，这里先本地落值（保持原来的乐观更新），失败再回弹
  item.is_public = next
  // 与后端对齐：update 直接支持 is_public 切换，但私有 → 公开受 publish 审批强制
  // （assert_approved：无已通过审批单时 403 拒绝）。因此统一走 update：
  // - 公开 → 私有 / 已有有效审批单的私有 → 公开：直接成功；
  // - 无审批单的私有 → 公开：失败（后端 403），回弹开关并引导去「申请公开」
  const goingPublic = next
  const result = await businessHandler(
    工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
      body: { id: item.id, is_public: item.is_public },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    {
      successMessage: goingPublic ? '已设为公开' : '已设为私有',
      // 失败提示由下方审批引导接管，避免「修改可见性失败」与引导文案重复弹窗
      showErrorToast: false,
      errorMessage: '修改可见性失败',
    }
  )
  if (!result.success) {
    item.is_public = !item.is_public
    if (goingPublic) {
      try {
        await ElMessageBox.confirm(
          '公开到社区需要先提交申请并通过管理员审核，是否现在提交申请？',
          '需要审批',
          { confirmButtonText: '去申请', cancelButtonText: '取消', type: 'info', lockScroll: false }
        )
      } catch {
        return
      }
      await handleApplyPublish(item)
    } else {
      biliMessage.error('修改可见性失败')
    }
  }
}

const handleToggleEnabled = async (item: WorkflowItem, next: boolean) => {
  // 卡片开关只透传变更意图，这里先本地落值，失败再回弹
  item.is_enabled = next
  const result = await businessHandler(
    工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
      body: { id: item.id, is_enabled: next },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    {
      successMessage: next ? '已启用' : '已禁用',
      errorMessage: '修改状态失败',
    }
  )
  if (!result.success) {
    item.is_enabled = !next
  }
}

const handleApplyPublish = async (item: WorkflowItem) => {
  let desc: string
  try {
    const result = await ElMessageBox.prompt(
      `提交后需管理员审核通过，工作流才会公开到社区（审核前保持私有）。`,
      `申请公开「${item.name}」`,
      {
        confirmButtonText: '提交申请',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入申请说明（可选）',
        inputValue: '',
        lockScroll: false,
      }
    )
    desc = result.value || ''
  } catch {
    return
  }
  const res = await businessHandler(
    管理员管理Service.submitApprovalApiAdminRpaApprovalSubmitPost({
      body: {
        resource_type: 'workflow',
        resource_id: item.workflow_id,
        action: 'publish',
        title: item.name,
        description: desc,
      },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '审批申请已提交，等待管理员审核', errorMessage: '提交失败' }
  )
  if (res.success) {
    ElMessage.success('可在「审批中心」查看审核进度')
  }
}

const goApprovalCenter = () => {
  router.push({ name: 'RPA_BROWSER_APPROVAL_CENTER' })
}

// ── 同步上游最新版本（仅 Fork 副本可用） ──
const syncLoadingId = ref<number | null>(null)

/** 「更多」下拉菜单命令分发（次级操作收纳，减少卡片按钮数量；命令类型见 WorkflowCard） */
const handleMoreCommand = (command: WorkflowMoreCommand, item: WorkflowItem) => {
  if (command === 'edit') handleEdit(item)
  else if (command === 'duplicate') handleDuplicate(item)
  else if (command === 'publish') handleApplyPublish(item)
  else handleDelete(item)
}

const handleSyncUpstream = async (item: WorkflowItem) => {
  try {
    await ElMessageBox.confirm(
      `确定将「${item.name}」同步到上游原作者的最新版本吗？工作流配置与关联的动作依赖都会被上游最新内容覆盖。`,
      '同步上游',
      { confirmButtonText: '同步', cancelButtonText: '取消', type: 'warning', lockScroll: false }
    )
  } catch {
    return
  }
  syncLoadingId.value = item.id
  try {
    const res = await 工作流管理Service.syncWorkflowApiV1RpaBrowserControlWorkflowsSyncPost({
      body: { id: item.id },
      // 失败走非 2xx 响应，开启 throwOnError 以便 catch 直接拿到后端 { code, msg, data }
      throwOnError: true,
    }) as { code?: number; msg?: string; data?: { updated?: string[]; created?: string[]; unavailable?: number[]; workflow_config_updated?: boolean; local_overwritten?: boolean } | null }
    if (res?.code === 0) {
      const overwritten = res.data?.local_overwritten ? '（已覆盖本地修改）' : ''
      ElMessage.success((res.msg || '同步完成') + overwritten)
      loadWorkflows()
    } else {
      ElMessage.error(res?.msg || '同步失败')
    }
  } catch (e) {
    // 优先直接展示后端 msg；无 msg 或默认 500 才用兜底文案
    const backendMsg = pickBackendMsg(e)
    console.error('[WorkflowManagement] 同步上游异常:', e)
    ElMessage.error(backendMsg || `同步失败：${errMsg(e)}`)
  } finally {
    syncLoadingId.value = null
  }
}

// ── 上游自动同步开关（仅 Fork 副本；走更新接口透传） ──
const autoSyncLoadingId = ref<number | null>(null)
const handleToggleAutoSync = async (item: WorkflowItem, next: boolean) => {
  // 卡片开关只透传变更意图，这里先本地落值，失败再回滚
  item.auto_sync_upstream = next
  autoSyncLoadingId.value = item.id
  try {
    const result = await businessHandler(
      工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
        body: { id: item.id, auto_sync_upstream: next },
        // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
        throwOnError: true,
      }) as any,
      {
        successMessage: next ? '已开启上游自动同步' : '已关闭上游自动同步',
        errorMessage: '自动同步开关设置失败',
      }
    )
    if (!result.success) {
      // 失败回滚开关状态
      item.auto_sync_upstream = !next
    }
  } finally {
    autoSyncLoadingId.value = null
  }
}

const handleDelete = async (item: WorkflowItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除工作流「${item.name}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning', lockScroll: false }
    )
  } catch {
    return
  }
  const result = await businessHandler(
    工作流管理Service.deleteWorkflowApiV1RpaBrowserControlWorkflowsDeletePost({
      body: { id: item.id },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '删除成功', errorMessage: '删除失败' }
  )
  if (result.success) {
    loadWorkflows()
  }
}

const handleRefresh = () => {
  loadWorkflows()
}

const handleSaved = () => {
  loadWorkflows()
}

// ── 调度外壳：立即运行 / 停止 / 继续运行 / 运行记录 ─────────────────
const runningId = ref<number | null>(null)
const runLogVisible = ref(false)
const runLogWorkflowId = ref('')
const runLogWorkflowName = ref('')
/** 刚发起/恢复的运行ID：弹窗可先订阅它，不必等运行记录落库 */
const runLogRunId = ref('')

/** 卡片实时进度（按工作流数据库ID缓存；终态帧保留，卡片可继续显示最终耗时） */
const workflowProgress = ref<Record<number, WorkflowRunProgress>>({})
/** 卡片级 SSE 订阅（workflow.id -> 取消函数） */
const cardSubscriptions = new Map<number, () => void>()
// 运行消息由全局 store（useWorkflowRunMessageStore）统一收集，本页只负责发起订阅
/** 仅保留最近 200 条，避免长循环把内存和渲染拖垮 */
const LIVE_MESSAGE_LIMIT = 200
/**
 * 本页已知的进行中运行（workflow.id -> run_id）。
 *
 * 不能只依赖列表的 `running_run_id`：后端运行记录由后台 task 创建，紧接着的
 * 列表刷新可能还查不到该记录，若据此关闭订阅会把刚建立的 SSE 连接误杀。
 */
const activeRunIds = ref<Record<number, string>>({})

const progressOf = (item: WorkflowItem): WorkflowRunProgress | null =>
  workflowProgress.value[item.id] ?? null

/** 清除某卡片的进度缓存（连接异常 / 列表显示已结束时调用，避免计时器继续跑） */
function clearItemProgress(workflowId: number) {
  if (!(workflowId in workflowProgress.value)) return
  const next = { ...workflowProgress.value }
  delete next[workflowId]
  workflowProgress.value = next
}

function closeCardSubscription(workflowId: number) {
  const close = cardSubscriptions.get(workflowId)
  if (close) {
    close()
    cardSubscriptions.delete(workflowId)
  }
}

function closeAllCardSubscriptions() {
  for (const close of cardSubscriptions.values()) close()
  cardSubscriptions.clear()
}

/** 运行结束提示：成功/失败/中断/停止分别给出结论与可恢复提示 */
function notifyRunFinished(item: WorkflowItem, progress: WorkflowRunProgress) {
  const summary = `成功 ${progress.success_count} / 失败 ${progress.failed_count} / 共 ${progress.total_steps} 步`
  if (progress.status === 'success') {
    ElMessage.success(`「${item.name}」运行成功（${summary}）`)
  } else if (progress.status === 'failed') {
    ElMessage.warning(`「${item.name}」运行失败：${progress.error_message || '未知错误'}`)
  } else if (progress.status === 'interrupted') {
    ElMessage.warning(`「${item.name}」运行被中断，可在运行记录中继续运行`)
  } else if (progress.status === 'cancelled') {
    ElMessage.info(`「${item.name}」已停止（${summary}）`)
  }
}

function markActiveRun(workflowId: number, runId: string) {
  activeRunIds.value = { ...activeRunIds.value, [workflowId]: runId }
}

function clearActiveRun(workflowId: number) {
  if (!(workflowId in activeRunIds.value)) return
  const next = { ...activeRunIds.value }
  delete next[workflowId]
  activeRunIds.value = next
}

/** 订阅某次运行并在终态时收尾（同一卡片同时只保留一条订阅） */
function subscribeItemRun(item: WorkflowItem, runId: string) {
  const previousRunId = activeRunIds.value[item.id]
  // 换了新的一次运行：先断开旧连接，避免旧运行的迟到帧覆盖新状态
  if (previousRunId && previousRunId !== runId) closeCardSubscription(item.id)
  markActiveRun(item.id, runId)
  // 运行消息统一由全局 store 收集（SSE 订阅在 store 内，切页面不中断）
  messageStore.attachRun(runId, item.name, userNavStore.user_header)
  if (cardSubscriptions.has(item.id)) return
  const close = subscribeWorkflowRunProgress(runId, userNavStore.user_header, {
    onProgress: (progress) => {
      // 只接受当前活跃运行的帧
      if (activeRunIds.value[item.id] !== progress.run_id) return
      workflowProgress.value = { ...workflowProgress.value, [item.id]: progress }
      if (!isTerminalRunStatus(progress.status)) return
      closeCardSubscription(item.id)
      clearActiveRun(item.id)
      notifyRunFinished(item, progress)
      loadWorkflows()
    },
    // 连接彻底不可用时回落列表状态（内部已优先走轮询兜底）
    onError: () => {
      closeCardSubscription(item.id)
      clearActiveRun(item.id)
      clearItemProgress(item.id)
      loadWorkflows()
    },
  })
  cardSubscriptions.set(item.id, close)
}

/** 列表刷新后同步卡片订阅：本地记录优先，避免「记录尚未落库」时误杀刚建立的连接 */
function syncCardSubscriptions() {
  for (const workflowId of [...cardSubscriptions.keys()]) {
    const item = workflowList.value.find(w => w.id === workflowId)
    const stillRunning = !!activeRunIds.value[workflowId] || !!item?.running_run_id
    if (!item || stillRunning) continue
    closeCardSubscription(workflowId)
    clearActiveRun(workflowId)
    clearItemProgress(workflowId)
  }
  for (const item of workflowList.value) {
    const runId = activeRunIds.value[item.id] || item.running_run_id
    if (runId) subscribeItemRun(item, runId)
  }
}

interface RunBrief {
  run_id: string
  status: string
  resumable?: boolean
  resume_of?: string | null
  resume_count?: number
}

/** 列表接口不带 run_id，按需取该工作流最近一条运行记录 */
async function fetchLatestRun(workflowId: string): Promise<RunBrief | undefined> {
  const latest = await businessHandler<{ items?: RunBrief[] }>(
    工作流管理Service.listWorkflowRunsApiV1RpaBrowserControlWorkflowsRunsPost({
      body: { workflow_id: workflowId as unknown as number, page: 1, per_page: 1 },
      headers: userNavStore.user_header,
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '', errorMessage: '获取运行记录失败', showSuccessToast: false }
  )
  return latest.success ? (latest.data?.items || [])[0] : undefined
}

const openRunLog = (item: WorkflowItem, runId = '') => {
  runLogWorkflowId.value = String(item.workflow_id ?? '')
  runLogWorkflowName.value = item.name
  runLogRunId.value = runId
  runLogVisible.value = true
}

/** 已处理数据：跳转到独立页面（带 workflow_id 预选） */
const openResourceRecords = (item: WorkflowItem) => {
  router.push({
    name: RouteName.RPA_BROWSER_RESOURCE_RECORD,
    query: { workflow_id: String(item.workflow_id ?? '') },
  })
}

const handleRun = async (item: WorkflowItem) => {
  if (!item.custom_action_id) {
    ElMessage.warning('该工作流未关联动作，请先编辑配置')
    return
  }
  if (item.browser_id === null || item.browser_id === undefined) {
    ElMessage.warning('该工作流未配置目标浏览器，请先编辑配置')
    return
  }
  runningId.value = item.id
  try {
    // 后端为异步执行：接口立即返回 run_id（status=running），真实进度走 SSE
    const result = await businessHandler<{ run_id?: string; status?: string }>(
      工作流管理Service.runSavedWorkflowApiV1RpaBrowserControlWorkflowsRunPost({
        query: { browser_id: item.browser_id },
        body: { id: item.id },
        headers: userNavStore.user_header,
        // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
        throwOnError: true,
      }) as any,
      { successMessage: '', errorMessage: '运行工作流失败', showSuccessToast: false }
    )
    const runId = result.success ? result.data?.run_id : undefined
    if (!runId) return
    ElMessage.success('已开始运行，进度见卡片与运行记录')
    // 占位快照：计时从点击起立即开始，真实进度随后由 SSE / 轮询补齐
    workflowProgress.value = {
      ...workflowProgress.value,
      [item.id]: createPendingRunProgress({
        runId,
        workflowId: item.workflow_id,
        workflowName: item.name,
        triggerSource: item.trigger_type === 'cron' ? 'schedule' : 'manual',
        browserId: item.browser_id,
      }),
    }
    messageStore.attachRun(runId, item.name, userNavStore.user_header, true)
    subscribeItemRun(item, runId)
    openRunLog(item, runId)
    loadWorkflows()
  } finally {
    runningId.value = null
  }
}

// ── 手动停止（借鉴 Docker stop：运行中显示「停止」，停止后恢复「立即运行」）──
const stoppingId = ref<number | null>(null)

/** 是否处于运行中：本页刚发起的手动运行，或后端带回来的进行中运行（含定时/其他入口触发） */
const isRunning = (item: WorkflowItem) =>
  runningId.value === item.id ||
  !!item.running_run_id ||
  item.last_run_status === 'running' ||
  progressOf(item)?.status === 'running'

const handleStopRun = async (item: WorkflowItem) => {
  if (stoppingId.value !== null) return

  // 停止是不可逆的：会立刻中断当前运行，并关掉该工作流的定期执行（需重新启用才能恢复）
  try {
    await ElMessageBox.confirm(
      '将立即停止当前运行，并同时关闭该工作流的定期执行（定时任务）；之后需要重新启用才能继续定时运行。',
      '停止工作流',
      { type: 'warning', confirmButtonText: '立即停止', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  stoppingId.value = item.id
  try {
    const run = await fetchLatestRun(item.workflow_id)
    if (!run) {
      ElMessage.warning('没有找到运行记录，无需停止')
      loadWorkflows()
      return
    }

    const res = await businessHandler<{
      status?: string
      stopping?: boolean
      forced?: boolean
      already_finished?: boolean
      schedule_stopped?: boolean
      cancelled_runs?: string[]
    }>(
      工作流管理Service.stopWorkflowRunApiV1RpaBrowserControlWorkflowsRunsStopPost({
        body: { run_id: run.run_id },
        headers: userNavStore.user_header,
        // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
        throwOnError: true,
      }) as any,
      { successMessage: '', errorMessage: '停止工作流失败', showSuccessToast: false }
    )
    if (res.success) {
      const scheduleSuffix = res.data?.schedule_stopped ? '，并已关闭定期执行' : ''
      if (res.data?.already_finished) {
        ElMessage.success(`该运行已结束${scheduleSuffix}`)
      } else {
        ElMessage.success(`已立即停止当前运行${scheduleSuffix}`)
      }
      loadWorkflows()
    }
  } finally {
    stoppingId.value = null
  }
}

// ── 继续运行（断点恢复）：列表不返回 resumable，先取最近一条运行记录再决定 ──
const resumingId = ref<number | null>(null)

const handleResumeRun = async (item: WorkflowItem) => {
  if (resumingId.value !== null) return
  const latest = await fetchLatestRun(item.workflow_id)
  if (!latest) {
    ElMessage.warning('没有找到可恢复的运行记录')
    return
  }
  if (latest.status !== 'interrupted' || !latest.resumable) {
    ElMessage.info('该工作流最近一次运行不可继续（可能已完成、已取消或已被恢复）')
    loadWorkflows()
    return
  }
  resumingId.value = item.id
  try {
    const res = await resumeWorkflowRun(latest.run_id, userNavStore.user_header)
    if (!res.success) return
    const newRunId = res.data?.run_id
    if (newRunId) {
      workflowProgress.value = {
        ...workflowProgress.value,
        [item.id]: createPendingRunProgress({
          runId: newRunId,
          workflowId: item.workflow_id,
          workflowName: item.name,
          triggerSource: item.trigger_type === 'cron' ? 'schedule' : 'manual',
          browserId: item.browser_id,
        }),
      }
      messageStore.attachRun(newRunId, item.name, userNavStore.user_header, true)
      subscribeItemRun(item, newRunId)
    }
    openRunLog(item, newRunId ?? '')
    loadWorkflows()
  } finally {
    resumingId.value = null
  }
}

/** 秒级时间戳（后端统一口径）转本地时间展示；null/0 视为从未同步 */
const formatTimestamp = (ts: number | null | undefined) => {
  if (!ts) return '从未同步'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

onMounted(() => {
  loadBrowserNames()
  loadWorkflows()
})

onBeforeUnmount(closeAllCardSubscriptions)
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="工作流管理" hide-title description="创建、配置和管理工作流" tagText="工作流">
      <template #extra>
        <div class="workflow-toolbar-extra flex items-center gap-2">
          <el-button :icon="Upload" :loading="importing" @click="handleImportJson">从 JSON 导入</el-button>
          <el-button :icon="SetUp" @click="goApprovalCenter">审批中心</el-button>
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
          <el-button :icon="Plus" type="primary" @click="handleCreate">新建工作流</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <!-- 搜索栏 -->
      <div class="workflow-toolbar flex items-center gap-3 mb-4 flex-wrap">
        <el-input v-model="searchText" placeholder="搜索工作流名称" :prefix-icon="Search" clearable style="width: 240px"
          @input="handleSearch" @clear="handleSearch" />
        <el-select v-model="filterType" placeholder="筛选类型" style="width: 140px" @change="handleFilterChange">
          <el-option label="私有" value="private" />
          <el-option label="公开" value="public" />
          <el-option label="全部" value="all" />
        </el-select>
        <el-select v-model="sortBy" placeholder="排序字段" style="width: 140px" @change="handleFilterChange">
          <el-option label="更新时间" value="updated_at" />
          <el-option label="创建时间" value="created_at" />
          <el-option label="名称" value="name" />
          <el-option label="点赞数" value="likes_count" />
          <el-option label="Fork数" value="forks_count" />
        </el-select>
        <el-select v-model="sortOrder" placeholder="排序方向" style="width: 120px" @change="handleFilterChange">
          <el-option label="降序" value="desc" />
          <el-option label="升序" value="asc" />
        </el-select>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <div v-for="i in 6" :key="i" class="rounded-xl p-5 border border-border-light">
            <el-skeleton :rows="4" animated />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="workflowList.length === 0" class="flex flex-col items-center justify-center my-20 text-gray-400">
        <el-empty description="暂无工作流">
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建工作流</el-button>
        </el-empty>
      </div>

      <!-- 工作流卡片列表：自然高度堆叠，纵向滚动由最外层 BiliSideNavLayout 内容区的
           BiliScrollbar 承接（页面内不再放滚动容器，翻页走分页器而非触底追加） -->
      <div v-else class="workflow-list w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <WorkflowCard
            v-for="item in workflowList"
            :key="item.id"
            :item="item"
            :browser-name-map="browserNameMap"
            :progress="progressOf(item)"
            :running="isRunning(item)"
            :run-loading="runningId === item.id"
            :stopping="stoppingId === item.id"
            :resuming="resumingId === item.id"
            :sync-loading="syncLoadingId === item.id"
            :auto-sync-loading="autoSyncLoadingId === item.id"
            @toggle-public="(v: boolean) => handleTogglePublic(item, v)"
            @toggle-enabled="(v: boolean) => handleToggleEnabled(item, v)"
            @toggle-auto-sync="(v: boolean) => handleToggleAutoSync(item, v)"
            @sync-upstream="handleSyncUpstream(item)"
            @stop-run="handleStopRun(item)"
            @run="handleRun(item)"
            @resume-run="handleResumeRun(item)"
            @open-run-log="openRunLog(item)"
            @open-resource-records="openResourceRecords(item)"
            @open-browser-detail="openBrowserDetail(item)"
            @more-command="(cmd) => handleMoreCommand(cmd, item)"
          />
        </div>
      </div>

      <!-- 分页：翻页由分页器驱动，滚动交由最外层 BiliSideNavLayout 的 BiliScrollbar -->
      <div v-if="total > 0" class="workflow-pagination mt-6 flex justify-center">
        <BiliPagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="handlePageChange"
        />
      </div>
    </FlexContainer>

    <!-- 编辑对话框 -->
    <WorkflowEditDialog v-model="editDialogVisible" :workflow-detail="editDialogDetail" @saved="handleSaved" />

    <!-- 运行记录对话框 -->
    <WorkflowRunLogDialog
      v-model="runLogVisible"
      :workflow-id="runLogWorkflowId"
      :workflow-name="runLogWorkflowName"
      :initial-run-id="runLogRunId"
      @run-changed="loadWorkflows"
    />


  </FlexContainer>
</template>
