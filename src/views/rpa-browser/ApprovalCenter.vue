<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Refresh, Promotion } from '@element-plus/icons-vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import {
  管理员管理Service,
  type ApprovalItemResp as ApprovalItem,
} from '@/api/browser/hey-api'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'

// ── 路由带入预填（从资源行内「申请发布」跳转时自动带出） ──
const route = useRoute()
const preResourceType = typeof route.query.resource_type === 'string' ? route.query.resource_type : ''
const preResourceId = typeof route.query.resource_id === 'string' ? route.query.resource_id : ''

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

const loadApprovals = async () => {
  loading.value = true
  const res = await businessHandler(
    管理员管理Service.listApprovalsApiAdminRpaApprovalListPost({
      body: {
        page: approvalPage.value,
        per_page: 20,
        status: approvalStatusFilter.value || undefined,
      },
    }),
    { showSuccessToast: false, errorMessage: '获取我的申请列表失败' }
  )
  if (res.success && res.data) {
    approvalList.value = res.data.items || []
    approvalTotal.value = res.data.total || 0
  }
  loading.value = false
}

const handleSubmitApproval = async () => {
  if (!submitForm.value.resource_id) {
    biliMessage.error('请输入资源 ID')
    return
  }
  submitLoading.value = true
  const res = await businessHandler(
    管理员管理Service.submitApprovalApiAdminRpaApprovalSubmitPost({
      body: {
        resource_type: submitForm.value.resource_type,
        resource_id: submitForm.value.resource_id,
        action: submitForm.value.action,
        title: submitForm.value.title,
        description: submitForm.value.description,
      },
    }),
    { successMessage: '审批申请已提交', errorMessage: '提交失败' }
  )
  submitLoading.value = false
  if (res.success) {
    submitForm.value.resource_id = ''
    submitForm.value.title = ''
    submitForm.value.description = ''
    approvalPage.value = 1
    loadApprovals()
  }
}

const statusTagType = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

onMounted(async () => {
  loadApprovals()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="审批中心" description="申请将 RPA 资源公开到社区，并查看我的申请进度">
      <template #extra>
        <el-button :icon="Refresh" @click="loadApprovals">刷新</el-button>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <el-card class="rpa-approval-card" shadow="never">
        <template #header>
          <div class="approval-center__submit-title flex items-center gap-2 text-base font-bold">
            <el-icon><Promotion /></el-icon>
            <span>提交审批申请（公开到社区）</span>
          </div>
        </template>
        <el-form label-position="top">
          <el-form-item label="资源类型">
            <el-select v-model="submitForm.resource_type" class="w-full">
              <el-option label="复合操作" value="action" />
              <el-option label="工作流" value="workflow" />
              <el-option label="插件" value="plugin" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源 ID">
            <el-input v-model="submitForm.resource_id" placeholder="资源 ID（从资源管理行内「申请发布」跳转会带出）" />
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
    </FlexContainer>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="approval-center__list-title flex items-center gap-2 text-base font-bold">
          <el-icon><Promotion /></el-icon>
          <span>我的申请</span>
        </div>
        <el-select v-model="approvalStatusFilter" class="w-32" @change="loadApprovals">
          <el-option label="全部" value="" />
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
      </div>
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
      </el-table>
      <el-pagination
        v-model:current-page="approvalPage"
        :page-size="20"
        :total="approvalTotal"
        layout="prev, pager, next, total"
        class="mt-3"
        @current-change="loadApprovals"
      />
    </FlexContainer>
  </FlexContainer>
</template>
