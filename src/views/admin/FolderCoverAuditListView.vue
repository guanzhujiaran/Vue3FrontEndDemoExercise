<template>
  <div class="folder-cover-audit-list h-full flex flex-col">
    <!-- 审核总览统计（通用组件） -->
    <AuditOverviewCard
      :statistics="statistics"
      total-label="封面申请总数"

    />
    <!-- 工具栏（通用组件：标题 + 状态 Tabs + 刷新） -->
    <AdminAuditTabs
      v-model="activeTab"
      title="收藏夹封面审核队列"
      :tabs="AUDIT_TABS"
      :loading="loading"
      @refresh="load(true)"
    />

    <LoadingWrap :loading="loading" class="folder-cover-audit-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="!loading && items.length === 0" text="暂无待审核封面" />
      <div v-else class="folder-cover-audit-list__table-wrap">
        <el-table
          :data="items"
          class="folder-cover-audit-list__table w-full"
          size="default"
          stripe
          :header-cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text)' }"
          :cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text-active)' }"
        >
          <el-table-column prop="pk" label="ID" width="80" />
          <el-table-column label="申请者" width="160">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-avatar :size="28" :src="BiliImg.face.noface" />
                <span class="truncate text-sm">{{ row.authorName || row.mid || '未知' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="所属收藏夹" width="130">
            <template #default="{ row }">
              <span class="text-sm">{{ row.folderId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="旧封面" width="120">
            <template #default="{ row }">
              <el-image
                v-if="row.oldCover"
                class="folder-cover-audit-list__cover-preview w-24 h-13.5 rounded"
                :src="row.oldCover"
                fit="cover"
                :preview-src-list="[row.oldCover]"
                preview-teleported
              />
              <span v-else class="text-xs text-text-secondary">无</span>
            </template>
          </el-table-column>
          <el-table-column label="新封面" width="120">
            <template #default="{ row }">
              <el-image
                class="folder-cover-audit-list__cover-preview w-24 h-13.5 rounded"
                :src="row.newCover"
                fit="cover"
                :preview-src-list="[row.newCover]"
                preview-teleported
              />
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">
              <TimeText :time="row.createdAt" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="default" effect="light" :type="stateTagType(row.auditStatus)">
                {{ stateTagText(row.auditStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <div class="flex gap-2">
                <el-button
                  v-if="canApprove(row.auditStatus)"
                  size="default"
                  type="primary"
                  :loading="approvingId === row.pk"
                  @click="handleApprove(row as FolderCoverAuditItem)"
                >
                  通过
                </el-button>
                <el-button
                  v-if="canReject(row.auditStatus)"
                  size="default"
                  type="danger"
                  :loading="rejectingId === row.pk"
                  @click="handleReject(row as FolderCoverAuditItem)"
                >
                  驳回
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <PaginationBar
          v-if="total > pageSize"
          class="folder-cover-audit-list__pagination mt-4"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @update:current-page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </div>
    </LoadingWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import {
  fetchFolderCoverAuditList,
  folderCoverAuditApprove,
  folderCoverAuditReject,
  ResourceAuditStatusEnum,
  AuditBizType } from '@/api/notify/moment-api'
import { auditStateText, auditStateTagType, canApprove, canReject } from '@/utils/auditStateMachine'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import AuditOverviewCard from '@/components/admin/AuditOverviewCard.vue'
import { fetchAuditStatisticsByBiz, type AuditStatisticsData } from '@/api/notify/moment-api'
import type { FolderCoverAuditItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'

// 状态 Tab：待审核 / 已过审 / 已驳回（封面暂无 biz 资源类，操作走专用接口）
const AUDIT_TABS: Array<{ name: string; label: string; status: ResourceAuditStatusEnum }> = [
  { name: 'AUDITING', label: '待审核', status: ResourceAuditStatusEnum.AUDITING },
  { name: 'NORMAL', label: '已过审', status: ResourceAuditStatusEnum.NORMAL },
  { name: 'REJECTED', label: '已驳回', status: ResourceAuditStatusEnum.REJECTED },
]

// 审核总览统计（通用统计接口，按业务域聚合）
const statistics = ref<AuditStatisticsData | null>(null)

async function loadStatistics() {
  statistics.value = await fetchAuditStatisticsByBiz(AuditBizType.FOLDER_COVER)
}
const statusOf = (name: string) =>
  AUDIT_TABS.find((t) => t.name === name)?.status ?? ResourceAuditStatusEnum.AUDITING

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
} = useAuditTabCache<FolderCoverAuditItem>(
  async (tab, pageNum, size) => {
    const res = await fetchFolderCoverAuditList({
      auditStatus: statusOf(tab),
      page_num: pageNum,
      page_size: size,
    })
    return { items: res.items || [], total: res.total || 0 }
  },
  { tabs: AUDIT_TABS, defaultTab: 'AUDITING' }
)

const approvingId = ref<number | null>(null)
const rejectingId = ref<number | null>(null)

// 状态标签 / 动作显隐统一走审核状态机（utils/auditStateMachine）
const stateTagText = (s: string) => auditStateText(s)
const stateTagType = (s: string) => auditStateTagType(s)

onMounted(() => {
  load()
  loadStatistics()
})

async function handleApprove(item: FolderCoverAuditItem) {
  approvingId.value = item.pk
  const res = await folderCoverAuditApprove(item.pk, '通过')
  approvingId.value = null
  if (res) {
    removeRow((i) => i.pk === item.pk)
    biliMessage.success('已通过，新封面已公开显示')
  }
}

async function handleReject(item: FolderCoverAuditItem) {
  try {
    const { value: reason } = await import('element-plus').then((m) =>
      m.ElMessageBox.prompt('请输入驳回原因', '驳回封面', { inputType: 'textarea' })
    )
    if (reason) {
      rejectingId.value = item.pk
      const res = await folderCoverAuditReject(item.pk, reason, '驳回')
      rejectingId.value = null
      if (res) {
        removeRow((i) => i.pk === item.pk)
        biliMessage.success('已驳回')
      }
    }
  } catch {
    // 用户取消
  }
}
</script>
