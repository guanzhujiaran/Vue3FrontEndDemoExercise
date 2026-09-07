<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Check, Close, Stamp } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { businessHandler } from '@/utils/businessHandler'
import {
  管理员管理Service,
  type ApprovalItemResp as ApprovalItem,
} from '@/api/browser/hey-api'

const adminStore = useRpaAdminStore()
const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

const loading = ref(false)
const approvalList = ref<ApprovalItem[]>([])
const approvalTotal = ref(0)
const approvalPage = ref(1)
const approvalStatusFilter = ref('')
const reviewNoteMap = ref<Record<number, string>>({})

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
    { showSuccessToast: false, errorMessage: '获取审批列表失败' }
  )
  if (res.success && res.data) {
    approvalList.value = res.data.items || []
    approvalTotal.value = res.data.total || 0
  }
  loading.value = false
}

const handleReview = async (item: ApprovalItem, status: 'approved' | 'rejected') => {
  try {
    await ElMessageBox.confirm(
      status === 'approved' ? '确定通过该审批？' : '确定驳回该审批？',
      '审核',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  await businessHandler(
    管理员管理Service.reviewApprovalApiAdminRpaApprovalReviewPost({
      body: { approval_id: item.id, status, review_note: reviewNoteMap.value[item.id] || '' },
    }),
    { successMessage: '审核完成', errorMessage: '审核失败' }
  )
  reviewNoteMap.value[item.id] = ''
  loadApprovals()
}

const statusTagType = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) loadApprovals()
})
</script>

<template>
  <div class="rpa-approval-admin">
    <h2 class="mb-4 text-lg font-bold text-text-primary">审批审核</h2>

    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <el-card v-else class="rpa-admin-card" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-base font-bold">
            <el-icon><Stamp /></el-icon>
            <span>审批列表</span>
          </div>
          <el-select v-model="approvalStatusFilter" class="w-32" @change="loadApprovals">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </div>
      </template>
      <el-table :data="approvalList" v-loading="loading" class="rpa-admin-table" size="large">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="submitter_mid" label="提交人" width="100" />
        <el-table-column prop="resource_type" label="类型" width="90" />
        <el-table-column prop="resource_id" label="资源ID" min-width="120" />
        <el-table-column prop="action" label="操作" width="90" />
        <el-table-column prop="title" label="标题" min-width="120" show-overflow-tooltip />
        <el-table-column prop="description" label="说明" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核" min-width="180">
          <template #default="{ row }">
            <div v-if="row.status === 'pending'" class="flex flex-col gap-2">
              <el-input v-model="reviewNoteMap[row.id]" placeholder="审核意见" />
              <div class="flex gap-2">
                <el-button :icon="Check" type="success" @click="handleReview(row, 'approved')">通过</el-button>
                <el-button :icon="Close" type="danger" @click="handleReview(row, 'rejected')">驳回</el-button>
              </div>
            </div>
            <span v-else class="text-sm text-gray-400">{{ row.review_note || '-' }}</span>
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
    </el-card>
  </div>
</template>
