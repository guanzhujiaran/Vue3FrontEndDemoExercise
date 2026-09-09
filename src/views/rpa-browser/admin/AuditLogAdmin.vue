<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TableV2FixedDir, type Column } from 'element-plus'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasRpaAdminPerm } from '@/views/message/messageAdmin'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import { 管理员管理Service } from '@/api/browser/hey-api'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'

const adminStore = useMessageAdminStore()
// RPA 资源域管理员：root 或任一 rpa_* 域持有 查看/审核 位（后端仍强制校验）
const isAdmin = computed(() =>
  hasRpaAdminPerm(adminStore.status.biz_perms, adminStore.status.is_root)
)

interface AuditItem {
  id: number
  admin_mid: number
  action: string
  target_type: string
  target_id: string
  detail: string
  created_at: string
}

// 单 Tab 列表（后端无状态维度，统一「全部」+ 操作类型筛选）
const AUDIT_TABS: Array<{ name: string; label: string }> = [{ name: 'all', label: '全部' }]

const auditActionFilter = ref('')

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
} = useAuditTabCache<AuditItem>(
  async (_tab, pageNum, size) => {
    const res = await businessHandler(
      管理员管理Service.listAuditApiAdminRpaAuditListPost({
        body: {
          page: pageNum,
          per_page: size,
          action: auditActionFilter.value || undefined,
        },
      }) as unknown as Promise<BusinessResponse<{ items?: AuditItem[]; total?: number } | null | undefined>>,
      { showSuccessToast: false, errorMessage: '获取审计日志失败' }
    )
    return { items: res.data?.items || [], total: res.data?.total || 0 }
  },
  { tabs: AUDIT_TABS, defaultTab: 'all', pageSize: 50 }
)

const onActionFilterChange = () => {
  // 重置全部 Tab 缓存后重载（单 Tab 场景等价于回到第 1 页）
  onPageChange(1)
}

const auditActionName = (a: string) => {
  return (
    {
      'cert:certify': '官方认证',
      'cert:revoke': '撤销认证',
      'tag:create': '创建标签',
      'tag:update': '更新标签',
      'tag:delete': '删除标签',
      'approval:review': '审批审核',
    } as Record<string, string>
  )[a] ?? a
}

// el-table-v2 列定义（与 MomentAuditListView 保持同构）
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 56
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

const columns: Column<AuditItem>[] = [
  { key: 'id', title: 'ID', width: 70 },
  { key: 'admin_mid', title: '管理员mid', width: 120 },
  { key: 'action', title: '操作', width: 130 },
  { key: 'target_type', title: '目标类型', width: 110 },
  { key: 'target_id', title: '目标ID', width: 130 },
  { key: 'detail', title: '详情', width: 240, minWidth: 160, flexGrow: 1 },
  { key: 'created_at', title: '时间', width: 180, fixed: TableV2FixedDir.RIGHT },
]

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) load()
})
</script>

<template>
  <div class="rpa-audit-admin flex flex-col gap-4">
    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <template v-else>
      <AdminAuditTabs
        v-model="activeTab"
        title="操作审计"
        :tabs="AUDIT_TABS"
        :loading="loading"
        @refresh="load(true)"
      >
        <template #extra>
          <el-select
            v-model="auditActionFilter"
            class="w-44"
            placeholder="全部操作"
            clearable
            @change="onActionFilterChange"
          >
            <el-option label="全部操作" value="" />
            <el-option label="官方认证" value="cert:certify" />
            <el-option label="撤销认证" value="cert:revoke" />
            <el-option label="创建标签" value="tag:create" />
            <el-option label="更新标签" value="tag:update" />
            <el-option label="删除标签" value="tag:delete" />
            <el-option label="审批审核" value="approval:review" />
          </el-select>
        </template>
      </AdminAuditTabs>

      <LoadingWrap :loading="loading" :rows="6">
        <EmptyState v-if="!loading && items.length === 0" :text="auditActionFilter ? '暂无该操作类型的审计记录' : '暂无审计记录'" />
        <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height -->
        <div v-else class="rpa-audit-admin__table h-[calc(100vh-320px)] min-h-105">
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
                  <!-- 操作（动作 → 中文文案） -->
                  <template v-if="column.key === 'action'">
                    <span class="text-sm text-text-primary">{{ auditActionName(rowData.action) }}</span>
                  </template>

                  <!-- 详情 -->
                  <template v-else-if="column.key === 'detail'">
                    <span class="block truncate text-sm text-text-secondary">{{ rowData.detail }}</span>
                  </template>

                  <!-- 其余默认列 -->
                  <template v-else>
                    <span class="text-sm text-text-primary">
                      {{ rowData[column.key as keyof AuditItem] }}
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
                    class="rpa-audit-admin__pagination"
                    :total="total"
                    :page-size="pageSize"
                    :page-sizes="[20, 50, 100]"
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
