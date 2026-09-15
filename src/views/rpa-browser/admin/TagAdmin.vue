<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { TableV2FixedDir, type Column } from 'element-plus'
import { Plus, Check, Close } from '@element-plus/icons-vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasRpaAdminPerm } from '@/views/message/messageAdmin'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import {
  AuditService,
  RpaTagService,
  InteractionBizTypeEnum,
  type RpaTagItemResp as RpaTagItem,
  type RpaTagListResp,
} from '@/api/community/hey-api'
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
// 通用审核接口 be-message 仅放行 role=root；仅 root 可见 待审核/已驳回 维度并可执行审核
const isRoot = computed(() => adminStore.status.is_root)

// 状态 Tab：root 看全部审核维度；非 root 仅普通视图（normal）
const allTags = [
  { name: 'auditing', label: '待审核' },
  { name: 'normal', label: '已通过' },
  { name: 'rejected', label: '已驳回' },
]
const TAG_TABS = computed(() => (isRoot.value ? allTags : [allTags[1]]))

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
} = useAuditTabCache<RpaTagItem>(
  async (tab, pageNum, size) => {
    const res = await businessHandler(
      RpaTagService.listTagsApiV1RpaTagListPost({
        body: { auditStatus: tab, page: pageNum, perPage: size },
      }) as unknown as Promise<BusinessResponse<RpaTagListResp | null | undefined>>,
      { showSuccessToast: false, errorMessage: '获取标签失败' }
    )
    return { items: (res.data?.items as RpaTagItem[]) || [], total: res.data?.total || 0 }
  },
  { tabs: allTags, defaultTab: isRoot.value ? 'auditing' : 'normal', pageSize: 20 }
)

// 新建/编辑标签 → 创建走 be-message（进入待审核），编辑/删除走 RPA 管理员治理
const tagDialogVisible = ref(false)
const tagSubmitting = ref(false)
const tagForm = ref({ id: 0, name: '', color: '#409EFF' })

const openCreateTag = () => {
  tagForm.value = { id: 0, name: '', color: '#409EFF' }
  tagDialogVisible.value = true
}

const openEditTag = (tag: RpaTagItem) => {
  tagForm.value = { id: tag.id, name: tag.name, color: tag.color || '#409EFF' }
  tagDialogVisible.value = true
}

const handleSaveTag = async () => {
  if (!tagForm.value.name) {
    biliMessage.error('请输入标签名称')
    return
  }
  tagSubmitting.value = true
  let res
  if (tagForm.value.id) {
    res = await businessHandler(
      管理员管理Service.updateTagApiAdminRpaTagUpdatePost({
        body: { id: tagForm.value.id, name: tagForm.value.name, color: tagForm.value.color },
      }) as unknown as Promise<BusinessResponse<RpaTagItem | null | undefined>>,
      { showSuccessToast: true, successMessage: '标签已更新', errorMessage: '更新失败' }
    )
  } else {
    res = await businessHandler(
      RpaTagService.createTagApiV1RpaTagCreatePost({
        body: { name: tagForm.value.name, color: tagForm.value.color },
      }) as unknown as Promise<BusinessResponse<RpaTagItem | null | undefined>>,
      { showSuccessToast: true, successMessage: '标签已提交，待审核', errorMessage: '创建失败' }
    )
  }
  tagSubmitting.value = false
  if (res.success) {
    tagDialogVisible.value = false
    load(true)
  }
}

const handleDeleteTag = async (tag: RpaTagItem) => {
  try {
    await ElMessageBox.confirm(`确定删除标签「${tag.name}」吗？关联也会一并清除。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      lockScroll: false,
    })
  } catch {
    return
  }
  const res = await businessHandler(
    管理员管理Service.deleteTagApiAdminRpaTagDeletePost({ body: { id: tag.id } }) as unknown as Promise<
      BusinessResponse<Record<string, unknown> | null | undefined>
    >,
    { successMessage: '标签已删除', errorMessage: '删除失败' }
  )
  if (res.success) load(true)
}

// 审核：通过 / 驳回（复用 be-message 通用审核，bizType=RPA_TAG）
const handleApprove = async (tag: RpaTagItem) => {
  const res = await businessHandler(
    AuditService.auditApproveApiV1AuditApprovePost({
      body: { bizType: InteractionBizTypeEnum.RPA_TAG, bizId: String(tag.id), remark: '' },
    }) as unknown as Promise<BusinessResponse<unknown>>,
    { successMessage: '已通过审核', errorMessage: '审核失败' }
  )
  if (res.success) load(true)
}

const handleReject = async (tag: RpaTagItem) => {
  let reason: string
  try {
    const { value } = await ElMessageBox.prompt(
      `确定驳回标签「${tag.name}」吗？`,
      '驳回确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入驳回原因（将通知创建者）',
        inputValidator: (v) => (v ? true : '驳回原因不能为空'),
        lockScroll: false,
      }
    )
    reason = value || ''
  } catch {
    return
  }
  const res = await businessHandler(
    AuditService.auditRejectApiV1AuditRejectPost({
      body: {
        bizType: InteractionBizTypeEnum.RPA_TAG,
        bizId: String(tag.id),
        rejectReason: reason,
        remark: reason,
      },
    }) as unknown as Promise<BusinessResponse<unknown>>,
    { successMessage: '已驳回', errorMessage: '驳回失败' }
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

const columns: Column<RpaTagItem>[] = [
  { key: 'color', title: '颜色', width: 80 },
  { key: 'name', title: '名称', width: 160, minWidth: 120, flexGrow: 1 },
  { key: 'createdBy', title: '创建者', width: 110 },
  { key: 'createdAt', title: '创建时间', width: 170 },
  { key: 'op', title: '操作', width: 200, fixed: TableV2FixedDir.RIGHT },
]

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) load()
})
</script>

<template>
  <div class="rpa-tag-admin flex flex-col gap-4">
    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <template v-else>
      <AdminAuditTabs
        v-model="activeTab"
        title="标签管理"
        :tabs="TAG_TABS"
        :loading="loading"
        @refresh="load(true)"
      >
        <template #extra>
          <el-button type="primary" :icon="Plus" @click="openCreateTag">新建标签</el-button>
        </template>
      </AdminAuditTabs>

      <LoadingWrap :loading="loading" :rows="6">
        <EmptyState v-if="!loading && items.length === 0" text="暂无标签" />
        <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height -->
        <div v-else class="rpa-tag-admin__table h-[calc(100vh-320px)] min-h-105">
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
                  <!-- 颜色 -->
                  <template v-if="column.key === 'color'">
                    <span class="inline-block h-5 w-5 rounded" :style="{ backgroundColor: rowData.color }"></span>
                  </template>

                  <!-- 名称 -->
                  <template v-else-if="column.key === 'name'">
                    <span class="truncate text-sm text-text-primary">{{ rowData.name }}</span>
                  </template>

                  <!-- 创建者 -->
                  <template v-else-if="column.key === 'createdBy'">
                    <span class="text-sm text-text-placeholder">{{ rowData.createdBy ?? '-' }}</span>
                  </template>

                  <!-- 创建时间 -->
                  <template v-else-if="column.key === 'createdAt'">
                    <span class="text-sm text-text-placeholder">
                      {{ rowData.createdAt ? new Date(rowData.createdAt).toLocaleString('zh-CN') : '-' }}
                    </span>
                  </template>

                  <!-- 操作：待审核 → 通过/驳回；其余 → 编辑/删除（管理员治理） -->
                  <template v-else-if="column.key === 'op'">
                    <div class="flex gap-2">
                      <template v-if="isRoot && activeTab === 'auditing'">
                        <el-button :icon="Check" type="success" text size="small" @click="handleApprove(rowData as RpaTagItem)">通过</el-button>
                        <el-button :icon="Close" type="danger" text size="small" @click="handleReject(rowData as RpaTagItem)">驳回</el-button>
                      </template>
                      <el-button text size="small" @click="openEditTag(rowData as RpaTagItem)">编辑</el-button>
                      <el-button :icon="Close" type="danger" text size="small" @click="handleDeleteTag(rowData as RpaTagItem)">删除</el-button>
                    </div>
                  </template>

                  <!-- 其余默认列 -->
                  <template v-else>
                    <span class="text-sm text-text-primary">
                      {{ (rowData as Record<string, unknown>)[column.key as string] }}
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
                    class="rpa-tag-admin__pagination"
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

      <!-- 标签新建/编辑弹窗 -->
      <el-dialog v-model="tagDialogVisible" :title="tagForm.id ? '编辑标签' : '新建标签'" width="420px" :lock-scroll="false">
        <el-form label-position="top">
          <el-form-item label="名称">
            <el-input v-model="tagForm.name" placeholder="标签名称" />
          </el-form-item>
          <el-form-item label="颜色">
            <el-color-picker v-model="tagForm.color" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="tagDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="tagSubmitting" @click="handleSaveTag">保存</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>