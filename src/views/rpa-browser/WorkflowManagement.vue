<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete, Edit, Refresh, Search, Loading, Plus, CopyDocument, Promotion, SetUp } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import WorkflowEditDialog from '@/components/rpa-browser/WorkflowEditDialog.vue'
import { 工作流管理Service, 管理员管理Service } from '@/api/browser/hey-api'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'

const router = useRouter()

interface WorkflowItem {
  id: number
  workflow_id: string
  name: string
  custom_action_id: string | null
  description: string
  is_enabled: boolean
  is_public: boolean
  likes_count: number
  reports_count: number
  is_verified: boolean
  forks_count: number
  forked_from_id: number | null
  created_at: string | null
  updated_at: string | null
}

const userNavStore = useUserNavStore()

const workflowList = ref<WorkflowItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const loadingMore = ref(false)
const searchText = ref('')
const filterType = ref<FilterType>('private')
const sortBy = ref<SortBy>('updated_at')
const sortOrder = ref<SortOrder>('desc')

const hasMore = computed(() => workflowList.value.length < total.value)

// ── 编辑对话框 ───────────────────────────────────────
const editDialogVisible = ref(false)
const editDialogLoading = ref(false)
const editDialogDetail = ref<Record<string, unknown> | null>(null)

const getTooltipContent = (item: WorkflowItem) => {
  const parts: string[] = []
  if (item.description) parts.push(item.description)
  parts.push(`触发: 手动`)
  parts.push(`可见性: ${item.is_public ? '公开' : '私有'}`)
  parts.push(`点赞: ${item.likes_count}`)
  parts.push(`Fork: ${item.forks_count}`)
  if (item.custom_action_id) parts.push(`关联动作: ${item.custom_action_id}`)
  parts.push(`工作流ID: ${item.workflow_id}`)
  return parts.join('<br/>')
}

const getTooltipEffect = (item: WorkflowItem): 'dark' | 'light' => {
  return item.is_public ? 'light' : 'dark'
}

const loadWorkflows = async (append = false) => {
  if (append) {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    currentPage.value++
  } else {
    loading.value = true
    currentPage.value = 1
  }

  const result = await businessHandler<{ items?: WorkflowItem[]; total?: number }>(
    工作流管理Service.listWorkflowsApiV1RpaBrowserControlWorkflowsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value,
      },
    }) as any,
    { successMessage: '', errorMessage: '获取工作流列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const items = result.data.items || []
    // 前端搜索过滤（名称）
    const filtered = searchText.value
      ? items.filter((w: WorkflowItem) => w.name.includes(searchText.value))
      : items
    if (append) {
      workflowList.value.push(...filtered)
    } else {
      workflowList.value = filtered
    }
    total.value = result.data.total || 0
  } else if (append) {
    currentPage.value--
  }
  loading.value = false
  loadingMore.value = false
}

const loadMore = () => {
  loadWorkflows(true)
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
  const result = await businessHandler<Record<string, unknown>>(
    工作流管理Service.getWorkflowDetailApiV1RpaBrowserControlWorkflowsGetPost({
      body: { id: item.id },
    }) as any,
    { successMessage: '', errorMessage: '获取工作流详情失败', showSuccessToast: false }
  )
  editDialogLoading.value = false
  if (result.success && result.data) {
    editDialogDetail.value = result.data as Record<string, unknown>
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
    })
    newName = result.value
  } catch {
    return
  }
  const result = await businessHandler(
    工作流管理Service.duplicateWorkflowApiV1RpaBrowserControlWorkflowsDuplicatePost({
      body: { id: item.id, new_name: newName },
    }) as any,
    { successMessage: '复制成功', errorMessage: '复制失败' }
  )
  if (result.success) {
    loadWorkflows()
  }
}

const handleTogglePublic = async (item: WorkflowItem) => {
  const result = await businessHandler(
    工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
      body: { id: item.id, is_public: item.is_public },
    }) as any,
    {
      successMessage: item.is_public ? '已设为公开' : '已设为私有',
      errorMessage: '修改可见性失败',
    }
  )
  if (!result.success) {
    item.is_public = !item.is_public
  }
}

const handleToggleEnabled = async (item: WorkflowItem) => {
  const result = await businessHandler(
    工作流管理Service.updateWorkflowApiV1RpaBrowserControlWorkflowsUpdatePost({
      body: { id: item.id, is_enabled: item.is_enabled },
    }) as any,
    {
      successMessage: item.is_enabled ? '已启用' : '已禁用',
      errorMessage: '修改状态失败',
    }
  )
  if (!result.success) {
    item.is_enabled = !item.is_enabled
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
    }),
    { successMessage: '审批申请已提交，等待管理员审核', errorMessage: '提交失败' }
  )
  if (res.success) {
    ElMessage.success('可在「审批中心」查看审核进度')
  }
}

const goApprovalCenter = () => {
  router.push({ name: 'RPA_BROWSER_APPROVAL_CENTER' })
}

const handleDelete = async (item: WorkflowItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除工作流「${item.name}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  const result = await businessHandler(
    工作流管理Service.deleteWorkflowApiV1RpaBrowserControlWorkflowsDeletePost({
      body: { id: item.id },
    }) as any,
    { successMessage: '删除成功', errorMessage: '删除失败' }
  )
  if (result.success) {
    loadWorkflows()
  }
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollHeight - scrollTop - clientHeight < 100 && hasMore.value && !loadingMore.value) {
    loadMore()
  }
}

const handleRefresh = () => {
  loadWorkflows()
}

const handleSaved = () => {
  loadWorkflows()
}

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(() => {
  loadWorkflows()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="工作流管理" description="创建、配置和管理工作流" tagText="工作流">
      <template #extra>
        <div class="workflow-toolbar-extra flex items-center gap-2">
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
      <div v-else-if="workflowList.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <el-empty description="暂无工作流">
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建工作流</el-button>
        </el-empty>
      </div>

      <!-- 工作流卡片列表（滚动容器） -->
      <div v-else class="overflow-auto" style="max-height: calc(100vh - 280px)" @scroll="handleScroll">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <el-tooltip v-for="item in workflowList" :key="item.id" :content="getTooltipContent(item)"
            :effect="getTooltipEffect(item)" raw-content placement="top" :show-after="500"
            popper-class="toolbox-tooltip">
            <div
              class="workflow-card rounded-xl p-5 border border-border-light hover:border-primary transition-colors flex flex-col gap-3">
              <!-- 名称行 -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <h3 class="text-base font-semibold truncate" :title="item.name">{{ item.name }}</h3>
                  <p class="text-sm text-gray-400 mt-1 line-clamp-2" style="min-height: 2.5em">
                    {{ item.description || '暂无描述' }}
                  </p>
                </div>
                <el-tag size="small" :type="item.is_public ? 'success' : 'info'">
                  {{ item.is_public ? '公开' : '私有' }}
                </el-tag>
              </div>

              <!-- 元信息 -->
              <div class="flex items-center gap-4 text-xs text-gray-400">
                <span>点赞: {{ item.likes_count }}</span>
                <span>Fork: {{ item.forks_count }}</span>
                <span>更新: {{ formatTime(item.updated_at) }}</span>
              </div>

              <!-- 收藏/点赞（2.17.0：工作流走 be-message 通用互动） -->
              <div class="flex items-center pt-1">
                <ResourceInteractionBar biz-type="rpa_workflow" :biz-id="item.workflow_id" />
              </div>

              <!-- 操作栏 -->
              <div
                class="workflow-card__actions flex items-center gap-2 pt-2 border-t border-border-lighter">
                <el-button size="small" :icon="Edit" :loading="editDialogLoading"
                  @click="handleEdit(item)">编辑</el-button>
                <el-button size="small" :icon="CopyDocument" @click="handleDuplicate(item)">复制</el-button>
                <el-button v-if="!item.is_public" size="small" type="primary" plain :icon="Promotion"
                  @click="handleApplyPublish(item)">申请发布</el-button>
                <el-switch v-model="item.is_public" size="small" inline-prompt active-text="公开" inactive-text="私有"
                  @change="handleTogglePublic(item)" />
                <el-switch v-model="item.is_enabled" size="small" inline-prompt active-text="启用" inactive-text="禁用"
                  @change="handleToggleEnabled(item)" />
                <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(item)">删除</el-button>
              </div>
            </div>
          </el-tooltip>
        </div>

        <!-- 加载更多状态 -->
        <div v-if="loadingMore" class="flex justify-center py-6">
          <el-icon class="is-loading" :size="24">
            <Loading />
          </el-icon>
          <span class="ml-2 text-sm text-gray-400">加载中...</span>
        </div>
        <div v-else-if="!hasMore && workflowList.length > 0" class="flex justify-center py-6 text-sm text-gray-400">
          没有更多了
        </div>
      </div>
    </FlexContainer>

    <!-- 编辑对话框 -->
    <WorkflowEditDialog v-model="editDialogVisible" :workflow-detail="editDialogDetail" @saved="handleSaved" />
  </FlexContainer>
</template>
