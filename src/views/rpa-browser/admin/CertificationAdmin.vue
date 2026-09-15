<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { TableV2FixedDir, type Column } from 'element-plus'
import { Medal } from '@element-plus/icons-vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasRpaAdminPerm } from '@/views/message/messageAdmin'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import {
  管理员管理Service,
  type CertificationItemResp as CertificationItem,
  type CertificationListResponse,
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

// 单 Tab 列表（后端无状态维度，统一「全部」）
const CERT_TABS: Array<{ name: string; label: string }> = [{ name: 'all', label: '全部' }]

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
} = useAuditTabCache<CertificationItem>(
  async (_tab, pageNum, size) => {
    const res = await businessHandler(
      管理员管理Service.listCertificationsApiAdminRpaCertificationListPost({
        body: { page: pageNum, per_page: size },
      }) as unknown as Promise<BusinessResponse<CertificationListResponse | null | undefined>>,
      { showSuccessToast: false, errorMessage: '获取认证列表失败' }
    )
    return { items: (res.data?.items as CertificationItem[]) || [], total: res.data?.total || 0 }
  },
  { tabs: CERT_TABS, defaultTab: 'all', pageSize: 20 }
)

// 标注认证弹窗
const certDialogVisible = ref(false)
const certSubmitting = ref(false)
const certForm = ref({ target_type: 'action', target_id: '', note: '' })

const handleCertify = async () => {
  if (!certForm.value.target_id) {
    biliMessage.error('请输入资源 ID')
    return
  }
  certSubmitting.value = true
  const res = await businessHandler(
    管理员管理Service.certifyApiAdminRpaCertificationCertifyPost({
      body: {
        target_type: certForm.value.target_type,
        target_id: certForm.value.target_id,
        note: certForm.value.note,
      },
    }) as unknown as Promise<BusinessResponse<CertificationItem | null | undefined>>,
    { successMessage: '已标注官方认证', errorMessage: '认证失败' }
  )
  certSubmitting.value = false
  if (res.success) {
    certDialogVisible.value = false
    certForm.value = { target_type: 'action', target_id: '', note: '' }
    load(true)
  }
}

const handleRevokeCert = async (item: CertificationItem) => {
  try {
    await ElMessageBox.confirm('确定撤销该资源的官方认证吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      lockScroll: false,
    })
  } catch {
    return
  }
  const res = await businessHandler(
    管理员管理Service.revokeCertificationApiAdminRpaCertificationRevokePost({
      body: { target_type: item.target_type, target_id: item.target_id },
    }) as unknown as Promise<BusinessResponse<Record<string, unknown> | null | undefined>>,
    { successMessage: '已撤销官方认证', errorMessage: '撤销失败' }
  )
  if (res.success) load(true)
}

// el-table-v2 列定义（与 MomentAuditListView 保持同构；操作列固定右侧）
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 56
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

const columns: Column<CertificationItem>[] = [
  { key: 'id', title: 'ID', width: 70 },
  { key: 'target_type', title: '类型', width: 100 },
  { key: 'target_id', title: '资源ID', width: 160, minWidth: 120 },
  { key: 'certified_by', title: '认证人', width: 110 },
  { key: 'note', title: '备注', width: 220, minWidth: 140, flexGrow: 1 },
  { key: 'created_at', title: '认证时间', width: 170 },
  { key: 'op', title: '操作', width: 100, fixed: TableV2FixedDir.RIGHT },
]

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) load()
})
</script>

<template>
  <div class="rpa-cert-admin flex flex-col gap-4">
    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <template v-else>
      <AdminAuditTabs
        v-model="activeTab"
        title="官方认证"
        :tabs="CERT_TABS"
        :loading="loading"
        @refresh="load(true)"
      >
        <template #extra>
          <el-button type="primary" :icon="Medal" @click="certDialogVisible = true">标注认证</el-button>
        </template>
      </AdminAuditTabs>

      <LoadingWrap :loading="loading" :rows="6">
        <EmptyState v-if="!loading && items.length === 0" text="暂无已认证资源" />
        <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height -->
        <div v-else class="rpa-cert-admin__table h-[calc(100vh-320px)] min-h-105">
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
                  <!-- 备注 -->
                  <template v-if="column.key === 'note'">
                    <span class="block truncate text-sm text-text-secondary">{{ rowData.note || '-' }}</span>
                  </template>

                  <!-- 认证时间 -->
                  <template v-else-if="column.key === 'created_at'">
                    <span class="text-sm text-text-placeholder">
                      {{ rowData.created_at ? new Date(rowData.created_at).toLocaleString('zh-CN') : '-' }}
                    </span>
                  </template>

                  <!-- 操作 -->
                  <template v-else-if="column.key === 'op'">
                    <el-button type="danger" link @click="handleRevokeCert(rowData as CertificationItem)">
                      撤销
                    </el-button>
                  </template>

                  <!-- 其余默认列 -->
                  <template v-else>
                    <span class="text-sm text-text-primary">
                      {{ rowData[column.key as keyof CertificationItem] }}
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
                    class="rpa-cert-admin__pagination"
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

      <!-- 标注官方认证弹窗 -->
      <el-dialog v-model="certDialogVisible" title="标注官方认证" width="420px" :lock-scroll="false">
        <el-form label-position="top">
          <el-form-item label="资源类型">
            <el-select v-model="certForm.target_type" class="w-full">
              <el-option label="复合操作" value="action" />
              <el-option label="工作流" value="workflow" />
              <el-option label="插件" value="plugin" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源 ID">
            <el-input v-model="certForm.target_id" placeholder="资源 ID" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="certForm.note" type="textarea" :rows="3" placeholder="认证备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="certDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="certSubmitting" @click="handleCertify">标注认证</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>
