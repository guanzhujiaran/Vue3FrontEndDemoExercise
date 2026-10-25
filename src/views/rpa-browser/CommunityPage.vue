<script setup lang="ts">
import { h, ref, onMounted } from 'vue'
import { Warning, Goods } from '@element-plus/icons-vue'
import { ElCheckbox, ElMessageBox } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import { 工作流管理Service, 自定义操作管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import { pickBackendMsg } from '@/utils/backendErrorMsg'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import { InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'

type TabType = 'actions' | 'workflows'

const userNavStore = useUserNavStore()

const activeTab = ref<TabType>('actions')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

const actionsList = ref<unknown[]>([])
const workflowsList = ref<unknown[]>([])

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
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response?.code === 0 && response?.data) {
      const data = response.data as { items?: unknown[]; total?: number }
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
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response?.code === 0 && response?.data) {
      const data = response.data as { items?: unknown[]; total?: number }
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
        'onUpdate:modelValue': (v: boolean) => {
          forkAutoSync.value = v
        },
      },
      () => '开启上游自动同步（上游更新后自动同步到我的副本；有本地修改时会跳过并通知）'
    ),
  ])

const handleForkAction = async (actionId: string) => {
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
      body: { action_id: actionId, auto_sync_upstream: forkAutoSync.value },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      },
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
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      },
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
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="item in actionsList" :key="item.action_id"
            class="rounded-xl  p-5 border border-border-light hover:border-primary transition-all duration-300">
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <el-text class="text-lg font-semibold truncate flex-1 mr-2">{{ item.name }}</el-text>
                <el-tag size="small" type="info">{{ item.action_type || 'custom' }}</el-tag>
              </div>

              <el-text class="text-sm text-text-secondary line-clamp-2">
                {{ item.description || '无描述' }}
              </el-text>

              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <ResourceInteractionBar biz-type="rpa_action" :biz-id="String(item.id)" />
                <div class="flex items-center gap-1">
                  <el-icon><ForkSpoon /></el-icon>
                  <span>{{ item.forks_count || 0 }}</span>
                </div>
                <div class="flex-1"></div>
                <span class="text-xs">{{ new Date(item.created_at).toLocaleDateString() }}</span>
              </div>

              <div class="flex items-center gap-2 mt-2">
                <el-button size="small" type="primary" @click="handleForkAction(item.action_id)">Fork</el-button>
                <el-button size="small" type="warning" @click="handleReport(item, 'action')">举报</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'workflows' && workflowsList.length > 0" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="item in workflowsList" :key="item.id"
            class="rounded-xl  p-5 border border-border-light hover:border-primary transition-all duration-300">
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <el-text class="text-lg font-semibold truncate flex-1 mr-2">{{ item.name }}</el-text>
                <el-tag size="small" type="info">工作流</el-tag>
              </div>

              <el-text class="text-sm text-text-secondary line-clamp-2">
                {{ item.description || '无描述' }}
              </el-text>

              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <ResourceInteractionBar biz-type="rpa_workflow" :biz-id="String(item.id)" />
                <div class="flex items-center gap-1">
                  <el-icon><Goods /></el-icon>
                  <span>{{ item.forks_count || 0 }}</span>
                </div>
                <div class="flex-1"></div>
                <span class="text-xs">{{ new Date(item.created_at).toLocaleDateString() }}</span>
              </div>

              <div class="flex items-center gap-2 mt-2">
                <el-button size="small" type="primary" @click="handleForkWorkflow(item.id)">Fork</el-button>
                <el-button size="small" type="warning" @click="handleReport(item, 'workflow')">举报</el-button>
              </div>
            </div>
          </div>
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

    <ReportDialog
      v-model="reportDialogVisible"
      :biz-type="reportTarget.bizType"
      :biz-id="reportTarget.bizId"
    />
  </FlexContainer>
</template>
