<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { TableV2FixedDir, type Column } from 'element-plus'
import { Plus, CollectionTag, Check, Close } from '@element-plus/icons-vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasRpaAdminPerm } from '@/views/message/messageAdmin'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import {
  管理员管理Service,
  type TagItemResp as TagItem,
  type TagListResponse,
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
const TAG_TABS: Array<{ name: string; label: string }> = [{ name: 'all', label: '全部' }]

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
} = useAuditTabCache<TagItem>(
  async (_tab, pageNum, size) => {
    const res = await businessHandler(
      管理员管理Service.listTagsApiAdminRpaTagListPost({
        body: { page: pageNum, per_page: size },
      }) as unknown as Promise<BusinessResponse<TagListResponse | null | undefined>>,
      { showSuccessToast: false, errorMessage: '获取标签失败' }
    )
    return { items: (res.data?.items as TagItem[]) || [], total: res.data?.total || 0 }
  },
  { tabs: TAG_TABS, defaultTab: 'all', pageSize: 100 }
)

// 标签编辑弹窗（id=0 表示新建）
const tagDialogVisible = ref(false)
const tagSubmitting = ref(false)
const tagForm = ref({ id: 0, name: '', color: '#409EFF' })

const openCreateTag = () => {
  tagForm.value = { id: 0, name: '', color: '#409EFF' }
  tagDialogVisible.value = true
}

const openEditTag = (tag: TagItem) => {
  tagForm.value = { id: tag.id, name: tag.name, color: tag.color }
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
      }) as unknown as Promise<BusinessResponse<TagItem | null | undefined>>,
      { successMessage: '标签已更新', errorMessage: '更新失败' }
    )
  } else {
    res = await businessHandler(
      管理员管理Service.createTagApiAdminRpaTagCreatePost({
        body: { name: tagForm.value.name, color: tagForm.value.color },
      }) as unknown as Promise<BusinessResponse<TagItem | null | undefined>>,
      { successMessage: '标签已创建', errorMessage: '创建失败' }
    )
  }
  tagSubmitting.value = false
  if (res.success) {
    tagDialogVisible.value = false
    load(true)
  }
}

const handleDeleteTag = async (tag: TagItem) => {
  try {
    await ElMessageBox.confirm(`确定删除标签「${tag.name}」吗？关联也会一并清除。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
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

// 关联标签弹窗
const attachDialogVisible = ref(false)
const attachSubmitting = ref(false)
const attachForm = ref({ tag_id: 0, target_type: 'action', target_id: '' })

const openAttach = () => {
  attachForm.value = { tag_id: items.value[0]?.id || 0, target_type: 'action', target_id: '' }
  attachDialogVisible.value = true
}

const handleAttach = async () => {
  if (!attachForm.value.tag_id || !attachForm.value.target_id) {
    biliMessage.error('请选择标签并填写资源 ID')
    return
  }
  attachSubmitting.value = true
  const res = await businessHandler(
    管理员管理Service.attachTagApiAdminRpaTagAttachPost({
      body: {
        tag_id: attachForm.value.tag_id,
        target_type: attachForm.value.target_type,
        target_id: attachForm.value.target_id,
      },
    }) as unknown as Promise<BusinessResponse<Record<string, unknown> | null | undefined>>,
    { successMessage: '已关联标签', errorMessage: '关联失败' }
  )
  attachSubmitting.value = false
  if (res.success) attachDialogVisible.value = false
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

const columns: Column<TagItem>[] = [
  { key: 'color', title: '颜色', width: 80 },
  { key: 'name', title: '名称', width: 160, minWidth: 120, flexGrow: 1 },
  { key: 'created_by', title: '创建者', width: 110 },
  { key: 'created_at', title: '创建时间', width: 170 },
  { key: 'op', title: '操作', width: 140, fixed: TableV2FixedDir.RIGHT },
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
          <el-button :icon="CollectionTag" @click="openAttach">关联标签到资源</el-button>
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

                  <!-- 创建时间 -->
                  <template v-else-if="column.key === 'created_at'">
                    <span class="text-sm text-text-placeholder">
                      {{ rowData.created_at ? new Date(rowData.created_at).toLocaleString('zh-CN') : '-' }}
                    </span>
                  </template>

                  <!-- 操作 -->
                  <template v-else-if="column.key === 'op'">
                    <div class="flex gap-2">
                      <el-button :icon="Check" text size="small" @click="openEditTag(rowData as TagItem)">编辑</el-button>
                      <el-button :icon="Close" type="danger" text size="small" @click="handleDeleteTag(rowData as TagItem)">删除</el-button>
                    </div>
                  </template>

                  <!-- 其余默认列 -->
                  <template v-else>
                    <span class="text-sm text-text-primary">
                      {{ rowData[column.key as keyof TagItem] }}
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

      <!-- 标签编辑弹窗 -->
      <el-dialog v-model="tagDialogVisible" title="标签" width="420px">
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

      <!-- 关联标签弹窗 -->
      <el-dialog v-model="attachDialogVisible" title="关联标签到资源" width="420px">
        <el-form label-position="top">
          <el-form-item label="标签">
            <el-select v-model="attachForm.tag_id" class="w-full">
              <el-option v-for="t in items" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源类型">
            <el-select v-model="attachForm.target_type" class="w-full">
              <el-option label="复合操作" value="action" />
              <el-option label="工作流" value="workflow" />
              <el-option label="插件" value="plugin" />
            </el-select>
          </el-form-item>
          <el-form-item label="资源 ID">
            <el-input v-model="attachForm.target_id" placeholder="资源 ID" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="attachDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="attachSubmitting" @click="handleAttach">关联</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>
