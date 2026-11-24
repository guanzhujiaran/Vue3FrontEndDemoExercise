<script setup lang="ts">
import { h, ref, computed, inject, onMounted } from 'vue'
import { ElCheckbox, ElMessageBox } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import { 工作流管理Service, 自定义操作管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import { pickBackendMsg } from '@/utils/backendErrorMsg'
import ActionManageCard from '@/components/rpa-browser/ActionManageCard.vue'
import ActionDetailDialog from '@/components/rpa-browser/ActionDetailDialog.vue'
import WorkflowCard from '@/components/rpa-browser/WorkflowCard.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import { InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'
import type { WorkflowItem } from '@/models/rpa_browser'
import { useHydrated } from '@/composables/useHydrated'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'

type TabType = 'actions' | 'workflows'

/**
 * 社区动作卡片项
 *
 * 与动作管理页共用 ActionManageCard，字段与列表接口
 * （list_custom_actions）返回的 item 对齐。
 */
interface CommunityActionItem {
  id: number
  action_id: string
  name: string
  description: string
  action_type: string
  icon_series?: number
  icon_id?: number
  steps_count: number
  tags: string[]
  is_enabled: boolean
  is_public: boolean
  likes_count: number
  forks_count: number
  forked_from_id: number | null
  version?: string
  content_hash?: string
  has_upstream_update?: boolean
  upstream_version?: string | null
  auto_sync_upstream?: boolean
  local_steps_modified?: boolean
  created_at: string | null
  updated_at: string | null
}

const userNavStore = useUserNavStore()

// 社区广场对游客开放：登录态按水合后判定，避免 SSR/首帧与客户端不一致
const isHydrated = useHydrated()
const isLoggedIn = computed(() => isHydrated.value && !!userNavStore.user_nav.uid)
const openGlobalLoginModal = inject(openGlobalLoginModalKey, () => {})

const activeTab = ref<TabType>('actions')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

const actionsList = ref<CommunityActionItem[]>([])
const workflowsList = ref<WorkflowItem[]>([])

/** 请求头：x-bili-level 必须是字符串（后端按 "0"~"6" 解析等级） */
const authHeaders = computed(() => ({
  'x-bili-mid': userNavStore.user_nav.uid,
  'x-bili-level': String(userNavStore.user_nav.level_info.current_level ?? ''),
}))

const sortBy = ref<SortBy>('updated_at')
const sortOrder = ref<SortOrder>('desc')
const filterType = ref<FilterType>('community')

const sortOptions = [
  { label: '更新时间', value: 'updated_at' },
  { label: '点赞数', value: 'likes_count' },
  { label: 'Fork数', value: 'forks_count' },
  { label: '创建时间', value: 'created_at' },
  { label: '名称', value: 'name' }
]

const loadActionsList = async () => {
  loading.value = true
  try {
    const response = await 自定义操作管理Service.listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value
      },
      headers: authHeaders.value
    })

    if (response?.code === 0 && response?.data) {
      const data = response.data as unknown as { items?: CommunityActionItem[]; total?: number }
      actionsList.value = data.items || []
      total.value = data.total || 0
    }
  } catch (error) {
    biliMessage.error('获取动作列表失败')
  } finally {
    loading.value = false
  }
}

const loadWorkflowsList = async () => {
  loading.value = true
  try {
    const response = await 工作流管理Service.listWorkflowsApiV1RpaBrowserControlWorkflowsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value
      },
      headers: authHeaders.value
    })

    if (response?.code === 0 && response?.data) {
      const data = response.data as unknown as { items?: WorkflowItem[]; total?: number }
      workflowsList.value = data.items || []
      total.value = data.total || 0
    }
  } catch (error) {
    biliMessage.error('获取工作流列表失败')
  } finally {
    loading.value = false
  }
}

const loadData = async () => {
  switch (activeTab.value) {
    case 'actions':
      await loadActionsList()
      break
    case 'workflows':
      await loadWorkflowsList()
      break
  }
}

/** Fork 时是否开启上游自动同步（弹窗内勾选，随 Fork 请求提交） */
const forkAutoSync = ref(false)

/** Fork 确认弹窗内的自动同步勾选项（VNode 形式挂在 confirm 的 message 上） */
const forkAutoSyncNode = () =>
  h('div', { class: 'fork-auto-sync mt-2' }, [
    h(
      ElCheckbox,
      {
        modelValue: forkAutoSync.value,
        // el-checkbox 的事件值是联合类型（boolean | string | number），这里统一收敛成布尔
        'onUpdate:modelValue': (v: string | number | boolean) => {
          forkAutoSync.value = Boolean(v)
        },
      },
      () => '开启上游自动同步（上游更新后自动同步到我的副本；有本地修改时会跳过并通知）'
    ),
  ])

const handleForkAction = async (actionId: string) => {
  // SDK 的 ActionForkRequest.action_id 是雪花 int，列表项里是字符串
  const numericActionId = Number(actionId)
  if (!Number.isFinite(numericActionId) || numericActionId <= 0) {
    biliMessage.error('无效的操作标识')
    return
  }
  forkAutoSync.value = false
  try {
    await ElMessageBox.confirm(
      forkAutoSyncNode(),
      'Fork 动作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
        lockScroll: false
      }
    )

    const response = await 自定义操作管理Service.forkCustomActionApiV1RpaBrowserControlCustomActionsForkPost({
      body: { action_id: numericActionId, auto_sync_upstream: forkAutoSync.value },
      headers: authHeaders.value,
      // 失败走非 2xx 响应，开启 throwOnError 以便 catch 直接拿到后端 { code, msg, data }
      throwOnError: true,
    })

    if (response?.code === 0) {
      biliMessage.success('Fork成功')
      loadData()
    } else {
      biliMessage.error(response?.msg || 'Fork失败')
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      // 优先直接展示后端 msg；无 msg 或默认 500 才用兜底文案
      biliMessage.error(pickBackendMsg(error) || 'Fork失败')
    }
  }
}

const handleForkWorkflow = async (workflowId: number) => {
  forkAutoSync.value = false
  try {
    await ElMessageBox.confirm(
      forkAutoSyncNode(),
      'Fork 工作流',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
        lockScroll: false
      }
    )

    const response = await 工作流管理Service.forkWorkflowApiV1RpaBrowserControlWorkflowsForkPost({
      body: { id: workflowId, auto_sync_upstream: forkAutoSync.value },
      headers: authHeaders.value,
      // 失败走非 2xx 响应，开启 throwOnError 以便 catch 直接拿到后端 { code, msg, data }
      throwOnError: true,
    })

    if (response?.code === 0) {
      biliMessage.success('Fork成功')
      loadData()
    } else {
      biliMessage.error(response?.msg || 'Fork失败')
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      // 优先直接展示后端 msg；无 msg 或默认 500 才用兜底文案
      biliMessage.error(pickBackendMsg(error) || 'Fork失败')
    }
  }
}

/** 统一举报：打开 be-message 统一举报弹窗（rpa_action / rpa_workflow） */
const reportDialogVisible = ref(false)
const reportTarget = ref<{ bizType: InteractionBizTypeEnum; bizId: string }>({
  bizType: InteractionBizTypeEnum.RPA_ACTION,
  bizId: '',
})

const handleReport = (item: unknown, type: 'action' | 'workflow') => {
  const obj = item as { id?: number | string }
  let bizType: InteractionBizTypeEnum
  // action 与 workflow 的互动态 / 举报统一以数字主键 id 为 bizId
  // （action 的 action_id 形如 ca_xxx，是业务键，非互动体系的 bizId）
  const bizId = String(obj.id ?? '')
  if (type === 'action') {
    bizType = InteractionBizTypeEnum.RPA_ACTION
  } else {
    bizType = InteractionBizTypeEnum.RPA_WORKFLOW
  }
  if (!bizId) {
    biliMessage.error('举报资源信息缺失，无法举报')
    return
  }
  reportTarget.value = { bizType, bizId }
  reportDialogVisible.value = true
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadData()
}

// ── 动作详情（复用动作管理页的只读结构流程图弹窗） ──
const detailVisible = ref(false)
const detailActionId = ref<string | null>(null)

/** 详情接口要求登录，游客先走登录引导 */
const openActionDetail = (item: CommunityActionItem) => {
  if (!isLoggedIn.value) {
    openGlobalLoginModal()
    return
  }
  detailActionId.value = item.action_id
  detailVisible.value = true
}

const handleSortChange = () => {
  currentPage.value = 1
  loadData()
}

const handleTabChange = () => {
  currentPage.value = 1
  total.value = 0
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="社区广场" hide-title description="发现和分享自定义动作与工作流">
    </BiliPageHeader>

    <div class="mt-4 flex items-center gap-4 flex-wrap">
      <el-radio-group v-model="activeTab" @change="handleTabChange">
        <el-radio-button value="actions">自定义动作</el-radio-button>
        <el-radio-button value="workflows">工作流</el-radio-button>
      </el-radio-group>

      <el-select v-model="sortBy" class="w-32" @change="handleSortChange">
        <el-option v-for="option in sortOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>

      <el-radio-group v-model="sortOrder" @change="handleSortChange">
        <el-radio-button value="desc">降序</el-radio-button>
        <el-radio-button value="asc">升序</el-radio-button>
      </el-radio-group>
    </div>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="i in 6" :key="i" class="rounded-xl  p-5 border border-border-light">
            <el-skeleton :rows="4" animated></el-skeleton>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'actions' && actionsList.length > 0" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <ActionManageCard
            v-for="item in actionsList"
            :key="item.action_id"
            :item="item"
            variant="community"
            @view="openActionDetail(item)"
          >
            <template #actions>
              <template v-if="isLoggedIn">
                <el-button type="primary" @click="handleForkAction(item.action_id)">Fork</el-button>
                <el-button type="warning" @click="handleReport(item, 'action')">举报</el-button>
              </template>
              <el-button v-else type="primary" plain @click="openGlobalLoginModal()">登录后可 Fork</el-button>
            </template>
          </ActionManageCard>
        </div>
      </div>

      <div v-else-if="activeTab === 'workflows' && workflowsList.length > 0" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <WorkflowCard
            v-for="item in workflowsList"
            :key="item.id"
            :item="item"
            variant="community"
          >
            <template #actions>
              <template v-if="isLoggedIn">
                <el-button type="primary" @click="handleForkWorkflow(item.id)">Fork</el-button>
                <el-button type="warning" @click="handleReport(item, 'workflow')">举报</el-button>
              </template>
              <el-button v-else type="primary" plain @click="openGlobalLoginModal()">登录后可 Fork</el-button>
            </template>
          </WorkflowCard>
        </div>
      </div>

      <CenteredContainer v-else class="my-20">
        <el-empty description="暂无内容">
          <el-button type="primary">成为第一个分享者</el-button>
        </el-empty>
      </CenteredContainer>

      <div v-if="total > 0" class="mt-6 flex justify-center">
        <BiliPagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="handlePageChange"
        />
      </div>
    </FlexContainer>

    <!-- 动作详情：复用动作管理页的只读结构流程图弹窗 -->
    <ActionDetailDialog v-model="detailVisible" :action-id="detailActionId" />

    <ReportDialog
      v-model="reportDialogVisible"
      :biz-type="reportTarget.bizType"
      :biz-id="reportTarget.bizId"
    />
  </FlexContainer>
</template>
