<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Plus, Refresh, Promotion, Delete, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import {
  管理员管理Service,
  type ApprovalItemResp as ApprovalItem,
  type ResourceSearchItemResp,
} from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'

// ── 路由带入预填（从资源行内「申请发布」跳转时自动带出） ──
const route = useRoute()
const preResourceType = typeof route.query.resource_type === 'string' ? route.query.resource_type : ''
const preResourceId = typeof route.query.resource_id === 'string' ? route.query.resource_id : ''

// 管理后台（BiliSideNavLayout）已自带页面标题，故此处不再重复渲染页头；
// 仅在 rpa-browser 布局（无页头）下渲染「审批中心」页头
const isAdminRoute = route.name === 'ADMIN_APPROVAL_CENTER'

const userNavStore = useUserNavStore()

const loading = ref(false)
const submitLoading = ref(false)
const approvalList = ref<ApprovalItem[]>([])
const approvalTotal = ref(0)
const approvalPage = ref(1)
const approvalStatusFilter = ref('')

const submitForm = ref({
  resource_type: (preResourceType || 'action') as string,
  resource_id: preResourceId || '',
  action: 'publish',
  title: '',
  description: '',
})

// ── 资源名称搜索（下拉选择，附带资源 id / 创建时间等信息） ──
const resourceLoading = ref(false)
const resourceList = ref<ResourceSearchItemResp[]>([])

const resourceOptionLabel = (item: ResourceSearchItemResp) => {
  const created = item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '未知时间'
  return `${item.name || item.resource_id}（ID: ${item.resource_id} · 创建于 ${created}）`
}

// 搜索当前用户自己的资源（按名称模糊匹配）
const searchResources = async (keyword?: string) => {
  if (!submitForm.value.resource_type) return
  resourceLoading.value = true
  try {
    const response = await 管理员管理Service.searchResourcesApiAdminRpaApprovalResourcesPost({
      body: {
        resource_type: submitForm.value.resource_type,
        keyword: keyword || '',
        per_page: 50,
      },
      headers: { ...userNavStore.user_header },
    })
    if (response?.code === 0 && response?.data) {
      resourceList.value = response.data.items || []
    } else {
      biliMessage.error(response?.msg || '查询资源失败')
    }
  } catch {
    biliMessage.error('查询资源失败')
  } finally {
    resourceLoading.value = false
  }
}

// 切换资源类型时重新加载该类型下自己的资源
const handleResourceTypeChange = () => {
  submitForm.value.resource_id = ''
  resourceList.value = []
  searchResources('')
}

// 打开下拉时也加载一次（remote 模式下仅在输入时才会触发 remote-method，这里保证点击也能拉取自己的资源）
const handleResourceDropdownOpen = (visible: boolean) => {
  if (visible) searchResources('')
}

const loadApprovals = async () => {
  loading.value = true
  try {
    const response = await 管理员管理Service.listApprovalsApiAdminRpaApprovalListPost({
      body: {
        page: approvalPage.value,
        per_page: 20,
        status: approvalStatusFilter.value || undefined,
        only_mine: true,
      },
      headers: { ...userNavStore.user_header },
    })
    if (response?.code === 0 && response?.data) {
      approvalList.value = (response.data.items || []) as ApprovalItem[]
      approvalTotal.value = response.data.total || 0
    } else {
      biliMessage.error(response?.msg || '获取我的申请列表失败')
    }
  } catch {
    biliMessage.error('获取我的申请列表失败')
  } finally {
    loading.value = false
  }
}

const handleSubmitApproval = async () => {
  if (!submitForm.value.resource_id) {
    biliMessage.error('请先搜索并选择要提交的资源')
    return
  }
  submitLoading.value = true
  try {
    const response = await 管理员管理Service.submitApprovalApiAdminRpaApprovalSubmitPost({
      body: {
        resource_type: submitForm.value.resource_type,
        resource_id: submitForm.value.resource_id,
        action: submitForm.value.action,
        title: submitForm.value.title,
        description: submitForm.value.description,
      },
      headers: { ...userNavStore.user_header },
    })
    if (response?.code === 0) {
      biliMessage.success('审批申请已提交')
      submitForm.value.resource_id = ''
      submitForm.value.title = ''
      submitForm.value.description = ''
      approvalPage.value = 1
      loadApprovals()
    } else {
      biliMessage.error(response?.msg || '提交失败')
    }
  } catch {
    biliMessage.error('提交失败')
  } finally {
    submitLoading.value = false
  }
}

// ── 我的审批：撤回 / 删除 / 重新申请 ──
const handleCancelApproval = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定撤回该审批申请（#${row.id}：${row.title || row.resource_id}）吗？`,
      '撤回审批',
      { confirmButtonText: '撤回', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    const response = await 管理员管理Service.cancelApprovalApiAdminRpaApprovalCancelPost({
      body: { approval_id: row.id },
      headers: { ...userNavStore.user_header },
    })
    if (response?.code === 0) {
      biliMessage.success('审批已撤回')
      loadApprovals()
    } else {
      biliMessage.error(response?.msg || '撤回失败')
    }
  } catch {
    biliMessage.error('撤回失败')
  }
}

const handleDeleteApproval = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定删除该审批记录（#${row.id}：${row.title || row.resource_id}）吗？删除后不可恢复。`,
      '删除审批',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    const response = await 管理员管理Service.deleteApprovalApiAdminRpaApprovalDeletePost({
      body: { approval_id: row.id },
      headers: { ...userNavStore.user_header },
    })
    if (response?.code === 0) {
      biliMessage.success('审批已删除')
      loadApprovals()
    } else {
      biliMessage.error(response?.msg || '删除失败')
    }
  } catch {
    biliMessage.error('删除失败')
  }
}

// 重新申请：将资源回填到提交表单，便于重填说明后再次提交
const handleReApply = async (row: any) => {
  submitForm.value.resource_type = row.resource_type
  submitForm.value.resource_id = row.resource_id
  submitForm.value.title = row.title
  submitForm.value.description = ''
  await searchResources('')
  biliMessage.info('已回填资源，请补充说明后重新提交')
  document.querySelector('.rpa-approval-center')?.scrollIntoView({ behavior: 'smooth' })
}

const statusTagType = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

onMounted(async () => {
  loadApprovals()
  searchResources('')
})
</script>

<template>
  <div class="rpa-approval-center">
    <BiliPageHeader
      v-if="!isAdminRoute"
      title="审批中心"
      description="申请将 RPA 资源公开到社区，并查看我的审批进度"
    >
      <template #extra>
        <el-button :icon="Refresh" @click="loadApprovals">刷新</el-button>
      </template>
    </BiliPageHeader>

    <el-card class="rpa-admin-card mb-4" shadow="never">
      <template #header>
        <div class="approval-center__submit-title flex items-center gap-2 text-base font-bold">
          <el-icon><Promotion /></el-icon>
          <span>提交审批申请（公开到社区）</span>
        </div>
      </template>
      <el-form label-position="top">
        <el-form-item label="资源类型">
          <el-select v-model="submitForm.resource_type" class="w-full" @change="handleResourceTypeChange">
            <el-option label="复合操作" value="action" />
            <el-option label="工作流" value="workflow" />
            <el-option label="插件" value="plugin" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择资源（按名称搜索）">
          <el-select
            v-model="submitForm.resource_id"
            class="w-full"
            filterable
            remote
            clearable
            :remote-method="searchResources"
            :loading="resourceLoading"
            @visible-change="handleResourceDropdownOpen"
            placeholder="输入资源名称搜索，选择你的资源"
          >
            <el-option
              v-for="item in resourceList"
              :key="item.resource_id"
              :label="resourceOptionLabel(item)"
              :value="item.resource_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="submitForm.title" placeholder="申请标题" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="submitForm.description" type="textarea" :rows="3" placeholder="请描述该资源的内容与公开理由" />
        </el-form-item>
        <el-button type="primary" :icon="Plus" :loading="submitLoading" class="w-full" @click="handleSubmitApproval">
          提交审批
        </el-button>
      </el-form>
    </el-card>

    <el-card class="rpa-admin-card" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="approval-center__list-title flex items-center gap-2 text-base font-bold">
            <el-icon><Promotion /></el-icon>
            <span>我的申请</span>
          </div>
          <div class="flex items-center gap-2">
            <el-button :icon="Refresh" @click="loadApprovals">刷新</el-button>
            <el-select v-model="approvalStatusFilter" class="w-32" @change="loadApprovals">
              <el-option label="全部" value="" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="approvalList" v-loading="loading" class="approval-center__table" size="large">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="resource_type" label="类型" width="90" />
        <el-table-column prop="resource_id" label="资源ID" min-width="120" />
        <el-table-column prop="action" label="操作" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column prop="description" label="说明" min-width="160" show-overflow-tooltip />
        <el-table-column prop="review_note" label="审核意见" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.review_note || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" min-width="160">
          <template #default="{ row }">
            <span>{{ row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              link
              type="warning"
              :icon="RefreshRight"
              @click="handleCancelApproval(row)"
            >
              撤回
            </el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDeleteApproval(row)">删除</el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="primary"
              :icon="RefreshLeft"
              @click="handleReApply(row)"
            >
              重新申请
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="approvalPage"
        :page-size="20"
        :total="approvalTotal"
        layout="prev, pager, next, total"
        class="mt-3"
        @current-change="loadApprovals"
      />
    </el-card>
  </div>
</template>