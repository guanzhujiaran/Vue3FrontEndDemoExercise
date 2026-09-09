<template>
  <div class="topic-audit-list flex flex-col gap-4">
    <!-- 审核总览统计（通用组件） -->
    <AuditOverviewCard
      :statistics="statistics"
      total-label="话题总数"

    />
    <!-- 工具栏（通用组件：标题 + 状态 Tabs + 刷新） -->
    <AdminAuditTabs
      v-model="activeTab"
      title="话题审核队列"
      :tabs="AUDIT_TABS"
      :loading="loading"
      @refresh="load(true)"
    />

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="!loading && items.length === 0" text="暂无待审核话题" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height；滚动条落在表格内部，不依赖外侧布局滚动 -->
      <div v-else class="topic-audit-list__table h-[calc(100vh-320px)] min-h-105">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="auditColumns"
              :data="items"
              :width="width"
              :height="fitTableHeight(height)"
              :row-height="72"
              :header-height="44"
              :footer-height="total > pageSize ? 64 : 0"
              row-key="topicId"
              fixed
            >
              <template #header-cell="{ column }">
                <span class="topic-audit-list__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 创建者 -->
                <template v-if="column.key === 'creator'">
                  <div class="flex items-center gap-2">
                    <el-avatar :size="28" :src="rowData.creatorFace || BiliImg.face.noface" />
                    <span class="truncate text-sm">{{ rowData.creatorName || rowData.creatorMid || '未知' }}</span>
                  </div>
                </template>

                <!-- 话题名称 -->
                <template v-else-if="column.key === 'topicName'">
                  <span class="truncate text-sm font-bold">#{{ rowData.topicName }}#</span>
                </template>

                <!-- 封面 -->
                <template v-else-if="column.key === 'cover'">
                  <el-avatar
                    v-if="rowData.topicCover"
                    :size="48"
                    :src="rowData.topicCover"
                    shape="square"
                  />
                  <div v-else class="w-12 h-12 rounded bg-bg flex items-center justify-center text-text-placeholder text-lg">
                    #
                  </div>
                </template>

                <!-- 描述 -->
                <template v-else-if="column.key === 'topicDesc'">
                  <span class="block truncate text-sm text-text-secondary">{{ rowData.topicDesc || '-' }}</span>
                </template>

                <!-- 提交时间 -->
                <template v-else-if="column.key === 'createdAt'">
                  <TimeText :time="rowData.createdAt" />
                </template>

                <!-- 操作 -->
                <template v-else-if="column.key === 'action'">
                  <div class="flex gap-2">
                    <el-button
                      size="default"
                      type="primary"
                      :loading="approvingId === rowData.topicId"
                      @click="handleApprove(rowData)"
                    >
                      通过
                    </el-button>
                    <el-button
                      size="default"
                      type="danger"
                      :loading="rejectingId === rowData.topicId"
                      @click="handleReject(rowData)"
                    >
                      驳回
                    </el-button>
                  </div>
                </template>

                <!-- ID -->
                <template v-else>
                  <span class="text-sm text-text-primary">{{ rowData.topicId }}</span>
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty description="暂无数据" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="topic-audit-list__pagination"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TableV2FixedDir, type Column } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  fetchTopicAuditList,
  topicAuditApprove,
  topicAuditReject,
  ResourceAuditStatusEnum,
  AuditBizType } from '@/api/notify/moment-api'
import type { MomentTopicAuditItem } from '@/api/notify/moment-api'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import AuditOverviewCard from '@/components/admin/AuditOverviewCard.vue'
import { fetchAuditStatisticsByBiz, type AuditStatisticsData } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import { ElMessage, ElMessageBox } from 'element-plus'

// 状态 Tab：待审核 / 已过审 / 已驳回（话题暂无 biz 资源类，操作走专用接口）
const AUDIT_TABS: Array<{ name: string; label: string; status: ResourceAuditStatusEnum }> = [
  { name: 'AUDITING', label: '待审核', status: ResourceAuditStatusEnum.AUDITING },
  { name: 'NORMAL', label: '已过审', status: ResourceAuditStatusEnum.NORMAL },
  { name: 'REJECTED', label: '已驳回', status: ResourceAuditStatusEnum.REJECTED },
]

// 审核总览统计（通用统计接口，按业务域聚合）
const statistics = ref<AuditStatisticsData | null>(null)

async function loadStatistics() {
  statistics.value = await fetchAuditStatisticsByBiz(AuditBizType.TOPIC)
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
} = useAuditTabCache<MomentTopicAuditItem>(
  async (tab, pageNum, size) => {
    const res = await fetchTopicAuditList({
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

// el-table-v2 列定义（与 CommentAdminView 保持同构；操作列固定右侧）
const auditColumns: Column<MomentTopicAuditItem>[] = [
  { key: 'topicId', title: 'ID', width: 130 },
  { key: 'creator', title: '创建者', width: 180 },
  { key: 'topicName', title: '话题名称', width: 200, minWidth: 160 },
  { key: 'cover', title: '封面', width: 90 },
  { key: 'topicDesc', title: '描述', width: 280, minWidth: 180, flexGrow: 1 },
  { key: 'createdAt', title: '提交时间', width: 180 },
  { key: 'action', title: '操作', width: 200, fixed: TableV2FixedDir.RIGHT }
]

onMounted(() => {
  load()
  loadStatistics()
})

// 表格高度自适应：数据不满一屏时收缩到内容实际高度，底部滚动条紧跟最后一行数据
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 72
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

async function handleApprove(item: MomentTopicAuditItem) {
  approvingId.value = item.topicId
  const res = await topicAuditApprove(item.topicId, '通过')
  approvingId.value = null
  if (res) {
    removeRow((i) => i.topicId === item.topicId)
    ElMessage.success('已通过，话题已公开')
  }
}

async function handleReject(item: MomentTopicAuditItem) {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入驳回原因', '驳回话题', {
      inputType: 'textarea',
    })
    if (reason) {
      rejectingId.value = item.topicId
      const res = await topicAuditReject(item.topicId, reason, '驳回')
      rejectingId.value = null
      if (res) {
        removeRow((i) => i.topicId === item.topicId)
        ElMessage.success('已驳回')
      }
    }
  } catch {
    // 用户取消
  }
}
</script>
