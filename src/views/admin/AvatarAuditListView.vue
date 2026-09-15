<template>
  <div class="avatar-audit-list flex flex-col gap-4">
    <!-- 审核总览统计（通用组件） -->
    <AuditOverviewCard
      :statistics="statistics"
      total-label="头像申请总数"

    />
    <!-- 工具栏（通用组件：标题 + 状态 Tabs + 刷新） -->
    <AdminAuditTabs
      v-model="activeTab"
      title="头像更换审核队列"
      :tabs="AUDIT_TABS"
      :loading="loading"
      @refresh="load(true)"
    />

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="!loading && items.length === 0" text="暂无待审核头像" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height；滚动条落在表格内部，不依赖外侧布局滚动 -->
      <div v-else class="avatar-audit-list__table h-[calc(100vh-320px)] min-h-105">
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
              row-key="pk"
              fixed
            >
              <template #header-cell="{ column }">
                <span class="avatar-audit-list__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 申请者 -->
                <template v-if="column.key === 'applicant'">
                  <div class="flex items-center gap-2">
                    <el-avatar :size="28" :src="rowData.oldAvatar || BiliImg.face.noface" />
                    <span class="truncate text-sm">{{ rowData.authorName || rowData.mid || '未知' }}</span>
                  </div>
                </template>

                <!-- 旧头像 -->
                <template v-else-if="column.key === 'oldAvatar'">
                  <el-avatar :size="48" :src="rowData.oldAvatar || BiliImg.face.noface" shape="square" />
                </template>

                <!-- 新头像 -->
                <template v-else-if="column.key === 'newAvatar'">
                  <el-avatar :size="48" :src="rowData.newAvatar || BiliImg.face.noface" shape="square" />
                </template>

                <!-- 提交时间 -->
                <template v-else-if="column.key === 'createdAt'">
                  <TimeText :time="rowData.createdAt" />
                </template>

                <!-- 状态 -->
                <template v-else-if="column.key === 'state'">
                  <el-tag size="default" effect="light" :type="stateTagType(rowData.auditStatus)">
                    {{ stateTagText(rowData.auditStatus) }}
                  </el-tag>
                </template>

                <!-- 操作：auditing=通过/驳回；normal=仅驳回；rejected=仅通过 -->
                <template v-else-if="column.key === 'action'">
                  <div class="flex gap-2">
                    <el-button
                      v-if="canApprove(rowData.auditStatus)"
                      size="default"
                      type="primary"
                      :loading="approvingId === rowData.pk"
                      @click="handleApprove(rowData)"
                    >
                      通过
                    </el-button>
                    <el-button
                      v-if="canReject(rowData.auditStatus)"
                      size="default"
                      type="danger"
                      :loading="rejectingId === rowData.pk"
                      @click="handleReject(rowData)"
                    >
                      驳回
                    </el-button>
                  </div>
                </template>

                <!-- ID -->
                <template v-else>
                  <span class="text-sm text-text-primary">{{ rowData.pk }}</span>
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty description="暂无数据" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="avatar-audit-list__pagination"
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
  fetchAvatarAuditList,
  auditApproveByBiz,
  auditRejectByBiz,
  InteractionBizTypeEnum,
  ResourceAuditStatusEnum,
  AuditBizType } from '@/api/notify/moment-api'
import { auditStateText, auditStateTagType, canApprove, canReject } from '@/utils/auditStateMachine'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import AuditOverviewCard from '@/components/admin/AuditOverviewCard.vue'
import { fetchAuditStatisticsByBiz, type AuditStatisticsData } from '@/api/notify/moment-api'
import type { AvatarAuditItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'

// 状态 Tab：待审核 / 已过审 / 已驳回；操作走统一审核接口（bizType=USER，bizId=mid）
const AUDIT_TABS: Array<{ name: string; label: string; status: ResourceAuditStatusEnum }> = [
  { name: 'AUDITING', label: '待审核', status: ResourceAuditStatusEnum.AUDITING },
  { name: 'NORMAL', label: '已过审', status: ResourceAuditStatusEnum.NORMAL },
  { name: 'REJECTED', label: '已驳回', status: ResourceAuditStatusEnum.REJECTED },
]

// 审核总览统计（通用统计接口，按业务域聚合）
const statistics = ref<AuditStatisticsData | null>(null)

async function loadStatistics() {
  statistics.value = await fetchAuditStatisticsByBiz(AuditBizType.AVATAR)
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
} = useAuditTabCache<AvatarAuditItem>(
  async (tab, pageNum, size) => {
    const res = await fetchAvatarAuditList({
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

// el-table-v2 列定义（与 CommentAdminView 保持同构；操作列固定右侧）
const auditColumns: Column<AvatarAuditItem>[] = [
  { key: 'pk', title: 'ID', width: 90 },
  { key: 'applicant', title: '申请者', width: 180 },
  { key: 'oldAvatar', title: '旧头像', width: 100 },
  { key: 'newAvatar', title: '新头像', width: 100 },
  { key: 'createdAt', title: '提交时间', width: 180 },
  { key: 'state', title: '状态', width: 110 },
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

async function handleApprove(item: AvatarAuditItem) {
  approvingId.value = item.pk
  // 统一审核接口：bizType=USER，bizId=mid（资源类按 mid 反查待审记录）
  const res = await auditApproveByBiz(InteractionBizTypeEnum.USER, item.mid, '通过')
  approvingId.value = null
  if (res) {
    removeRow((i) => i.pk === item.pk)
    biliMessage.success('已通过，新头像已公开显示')
    // 审核会改变各状态的数量，总览统计需同步刷新（否则卡片停留在审核前的数字）
    await loadStatistics()
  }
}

async function handleReject(item: AvatarAuditItem) {
  try {
    const { value: reason } = await import('element-plus').then((m) =>
      m.ElMessageBox.prompt('请输入驳回原因', '驳回头像', { inputType: 'textarea', lockScroll: false })
    )
    if (reason) {
      rejectingId.value = item.pk
      const res = await auditRejectByBiz(InteractionBizTypeEnum.USER, item.mid, reason, '驳回')
      rejectingId.value = null
      if (res) {
        removeRow((i) => i.pk === item.pk)
        biliMessage.success('已驳回')
        // 审核会改变各状态的数量，总览统计需同步刷新
        await loadStatistics()
      }
    }
  } catch {
    // 用户取消
  }
}
</script>
