<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { TableV2FixedDir, type Column } from 'element-plus'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasRpaAdminPerm } from '@/views/message/messageAdmin'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import { canApprove, canReject, auditStateText, auditStateTagType } from '@/utils/auditStateMachine'
import {
  管理员管理Service,
  type ApprovalItemResp as ApprovalItem,
  type ApprovalListResponse,
} from '@/api/browser/hey-api'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'

const adminStore = useMessageAdminStore()
// RPA 资源域管理员：root 或任一 rpa_* 域持有 查看/审核 位（后端仍强制校验）
const isAdmin = computed(() =>
  hasRpaAdminPerm(adminStore.status.biz_perms, adminStore.status.is_root)
)

// 状态 Tab：待审核 / 已通过 / 已驳回（懒加载 + 按 Tab 缓存）
const STATUS_TABS: Array<{ name: string; label: string }> = [
  { name: 'pending', label: '待审核' },
  { name: 'approved', label: '已通过' },
  { name: 'rejected', label: '已驳回' },
]

const {
  activeTab,
  items,
  total,
  page,
  pageSize,
  loading,
  load,
  onPageChange,
  onPageSizeChange,
  removeRow,
  invalidateOthers,
} = useAuditTabCache<ApprovalItem>(
  async (tab, pageNum, size) => {
    const res = await businessHandler(
      管理员管理Service.listApprovalsApiAdminRpaApprovalListPost({
        body: { page: pageNum, per_page: size, status: tab },
      }) as unknown as Promise<BusinessResponse<ApprovalListResponse | null | undefined>>,
      { showSuccessToast: false, errorMessage: '获取审批列表失败' }
    )
    return { items: (res.data?.items as ApprovalItem[]) || [], total: res.data?.total || 0 }
  },
  { tabs: STATUS_TABS, defaultTab: 'pending' }
)

/** 每行审核意见输入（仅待审核/可操作的审批单可编辑） */
const reviewNoteMap = ref<Record<number, string>>({})

const emptyText = computed(() => {
  const map: Record<string, string> = {
    pending: '暂无待审核申请',
    approved: '暂无已通过申请',
    rejected: '暂无已驳回申请',
  }
  return map[activeTab.value] ?? '暂无数据'
})

// el-table-v2 列定义（与 MomentAuditListView 保持同构；操作列固定右侧）
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 72
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

const columns: Column<ApprovalItem>[] = [
  { key: 'id', title: 'ID', width: 70 },
  { key: 'submitter_mid', title: '提交人', width: 100 },
  { key: 'resource_type', title: '类型', width: 90 },
  { key: 'resource_id', title: '资源ID', width: 130 },
  { key: 'action', title: '动作', width: 90 },
  { key: 'title', title: '标题', width: 150, minWidth: 100 },
  { key: 'description', title: '说明', width: 180, minWidth: 120, flexGrow: 1 },
  { key: 'state', title: '状态', width: 90 },
  { key: 'review', title: '审核意见', width: 170 },
  { key: 'op', title: '操作', width: 150, fixed: TableV2FixedDir.RIGHT },
  { key: 'created_at', title: '提交时间', width: 160 },
]

/** 审核：通过 / 驳回（由审核状态机决定按钮显隐；成功后移除当前行并失效相邻 Tab 缓存） */
const handleReview = async (item: ApprovalItem, status: 'approved' | 'rejected') => {
  try {
    await ElMessageBox.confirm(
      status === 'approved' ? '确定通过该审批？' : '确定驳回该审批？',
      '审核',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning', lockScroll: false }
    )
  } catch {
    return
  }
  const res = await businessHandler(
    管理员管理Service.reviewApprovalApiAdminRpaApprovalReviewPost({
      body: { approval_id: item.id, status, review_note: reviewNoteMap.value[item.id] || '' },
    }) as unknown as Promise<BusinessResponse<ApprovalItem | null | undefined>>,
    { successMessage: '审核完成', errorMessage: '审核失败' }
  )
  if (res.success) {
    reviewNoteMap.value[item.id] = ''
    removeRow((i) => i.id === item.id)
    invalidateOthers()
  }
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) load()
})
</script>

<template>
  <div class="rpa-approval-admin flex flex-col gap-4">
    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <template v-else>
      <AdminAuditTabs
        v-model="activeTab"
        title="操作审批"
        :tabs="STATUS_TABS"
        :loading="loading"
        @refresh="load(true)"
      />

      <LoadingWrap :loading="loading" :rows="6">
        <EmptyState v-if="!loading && items.length === 0" :text="emptyText" />
        <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height -->
        <div v-else class="rpa-approval-admin__table h-[calc(100vh-320px)] min-h-105">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2
                :columns="columns"
                :data="items"
                :width="width"
                :height="fitTableHeight(height)"
                :row-height="TABLE_ROW_H"
                :header-height="TABLE_HEADER_H"
                :footer-height="total > pageSize ? TABLE_FOOTER_H : 0"
                row-key="id"
                fixed
              >
                <template #header-cell="{ column }">
                  <span class="text-sm font-medium text-text-secondary">{{ column.title }}</span>
                </template>

                <template #cell="{ column, rowData }">
                  <!-- 标题 -->
                  <template v-if="column.key === 'title'">
                    <span class="block truncate text-sm text-text-primary">{{ rowData.title }}</span>
                  </template>

                  <!-- 说明 -->
                  <template v-else-if="column.key === 'description'">
                    <span class="block truncate text-sm text-text-secondary">{{ rowData.description }}</span>
                  </template>

                  <!-- 状态 -->
                  <template v-else-if="column.key === 'state'">
                    <el-tag :type="auditStateTagType(rowData.status)" effect="light">
                      {{ auditStateText(rowData.status) }}
                    </el-tag>
                  </template>

                  <!-- 审核意见 -->
                  <template v-else-if="column.key === 'review'">
                    <el-input
                      v-if="canApprove(rowData.status) || canReject(rowData.status)"
                      v-model="reviewNoteMap[rowData.id]"
                      size="small"
                      placeholder="审核意见"
                    />
                    <span v-else class="text-sm text-text-placeholder">{{ rowData.review_note || '-' }}</span>
                  </template>

                  <!-- 操作：由审核状态机决定（待审核=通过/驳回；已通过=仅驳回撤回；已驳回=仅通过恢复） -->
                  <template v-else-if="column.key === 'op'">
                    <div class="flex gap-2">
                      <el-button
                        v-if="canApprove(rowData.status)"
                        size="small"
                        type="success"
                        @click="handleReview(rowData as ApprovalItem, 'approved')"
                      >
                        通过
                      </el-button>
                      <el-button
                        v-if="canReject(rowData.status)"
                        size="small"
                        type="danger"
                        @click="handleReview(rowData as ApprovalItem, 'rejected')"
                      >
                        驳回
                      </el-button>
                      <span
                        v-if="!canApprove(rowData.status) && !canReject(rowData.status)"
                        class="text-sm text-text-placeholder"
                      >
                        -
                      </span>
                    </div>
                  </template>

                  <!-- 提交时间 -->
                  <template v-else-if="column.key === 'created_at'">
                    <span class="text-sm text-text-placeholder">
                      {{ rowData.created_at ? new Date(rowData.created_at).toLocaleString('zh-CN') : '-' }}
                    </span>
                  </template>

                  <!-- 其余默认列 -->
                  <template v-else>
                    <span class="text-sm text-text-primary">
                      {{ rowData[column.key as keyof ApprovalItem] }}
                    </span>
                  </template>
                </template>

                <template #empty>
                  <div class="flex h-full items-center justify-center">
                    <el-empty description="暂无数据" :image-size="80" />
                  </div>
                </template>

                <template #footer>
                  <PaginationBar
                    class="rpa-approval-admin__pagination"
                    :total="total"
                    :page-size="pageSize"
                    :current-page="page"
                    @update:current-page="onPageChange"
                    @update:page-size="onPageSizeChange"
                  />
                </template>
              </el-table-v2>
            </template>
          </el-auto-resizer>
        </div>
      </LoadingWrap>
    </template>
  </div>
</template>
