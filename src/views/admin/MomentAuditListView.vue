<template>
  <div class="moment-audit-list flex flex-col gap-4">
    <!-- 审核总览统计（通用组件） -->
    <AuditOverviewCard :statistics="statistics" total-label="动态总数" />

    <!-- 工具栏（通用组件：标题 + 状态 Tabs + 刷新） -->
    <AdminAuditTabs
      v-model="activeTab"
      title="动态审核队列"
      :tabs="AUDIT_TABS"
      :loading="loading"
      @refresh="load(true)"
    />

    <div class="flex items-center gap-3">
      <span class="text-sm text-text-placeholder">类型</span>
      <el-select
        v-model="bizTypeFilter"
        clearable
        size="default"
        placeholder="全部类型"
        class="w-52"
        @change="load(true)"
      >
        <el-option
          v-for="t in statistics?.byType ?? []"
          :key="String(t.type)"
          :label="String(t.type)"
          :value="String(t.type)"
        />
      </el-select>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="!loading && items.length === 0" :text="emptyText" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height；滚动条落在表格内部，不依赖外侧布局滚动 -->
      <div v-else class="moment-audit-list__table h-[calc(100vh-320px)] min-h-105">
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
              row-key="dynIdStr"
              fixed
            >
              <template #header-cell="{ column }">
                <span class="moment-audit-list__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 发布者 -->
                <template v-if="column.key === 'author'">
                  <div class="flex items-center gap-2">
                    <el-avatar :size="28" :src="rowData.authorFace || BiliImg.face.noface" />
                    <span class="truncate text-sm">{{ rowData.authorName || '未知' }}</span>
                  </div>
                </template>

                <!-- 内容预览 -->
                <template v-else-if="column.key === 'contentText'">
                  <span class="block truncate text-sm text-text-secondary">{{ rowData.contentText }}</span>
                </template>

                <!-- 类型 -->
                <template v-else-if="column.key === 'type'">
                  <el-tag size="default" effect="plain" :type="rowData.dynType === 'FORWARD' ? 'info' : 'success'">
                    {{ rowData.dynType === 'FORWARD' ? '转发' : '文字' }}
                  </el-tag>
                </template>

                <!-- 发布时间 -->
                <template v-else-if="column.key === 'pubTime'">
                  <TimeText :time="rowData.pubTime || rowData.createdTime" />
                </template>

                <!-- 状态 -->
                <template v-else-if="column.key === 'state'">
                  <el-tag size="default" effect="light" :type="stateTagType(rowData.auditStatus)">
                    {{ stateTagText(rowData.auditStatus) }}
                  </el-tag>
                </template>

                <!-- 操作：由审核状态机决定（待审核=通过/驳回；已过审=仅驳回撤回；已驳回=仅通过恢复） -->
                <template v-else-if="column.key === 'action'">
                  <div class="flex gap-2">
                    <el-button
                      v-if="canApprove(rowData.auditStatus)"
                      size="default"
                      type="primary"
                      :loading="approvingId === rowData.dynIdStr"
                      @click="handleApprove(rowData)"
                    >
                      通过
                    </el-button>
                    <el-button
                      v-if="canReject(rowData.auditStatus)"
                      size="default"
                      type="danger"
                      :loading="rejectingId === rowData.dynIdStr"
                      @click="handleReject(rowData)"
                    >
                      驳回
                    </el-button>
                  </div>
                </template>

                <!-- 动态 ID -->
                <template v-else>
                  <span class="text-sm text-text-primary">{{ rowData.dynIdStr }}</span>
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty description="暂无数据" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="moment-audit-list__pagination"
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
  fetchAuditList,
  fetchAuditStatisticsByBiz,
  auditApproveByBiz,
  auditRejectByBiz,
  InteractionBizTypeEnum,
  ResourceAuditStatusEnum,
  AuditBizType } from '@/api/notify/moment-api'
import {
  auditStateText,
  auditStateTagType,
  canApprove,
  canReject,
} from '@/utils/auditStateMachine'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import AuditOverviewCard from '@/components/admin/AuditOverviewCard.vue'
import type { AuditStatisticsData } from '@/api/notify/moment-api'
import type { MomentAuditItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'

// 状态 Tab：待审核 / 已过审（可驳回撤回）/ 已驳回（可通过恢复）
// status 取值必须是 SDK 的数字枚举（后端 IntEnum 校验只接受 1/2/3/4），不能传 'auditing' 这类字符串
const AUDIT_TABS: Array<{ name: string; label: string; status: ResourceAuditStatusEnum }> = [
  { name: 'AUDITING', label: '待审核', status: ResourceAuditStatusEnum.AUDITING },
  { name: 'NORMAL', label: '已过审', status: ResourceAuditStatusEnum.NORMAL },
  { name: 'REJECTED', label: '已驳回', status: ResourceAuditStatusEnum.REJECTED },
]
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
} = useAuditTabCache<MomentAuditItem>(
  async (tab, pageNum, size) => {
    const res = await fetchAuditList({
      auditStatus: statusOf(tab),
      bizType: bizTypeFilter.value || undefined,
      page_num: pageNum,
      page_size: size,
    })
    return { items: res.items || [], total: res.total || 0 }
  },
  { tabs: AUDIT_TABS, defaultTab: 'AUDITING' }
)

const approvingId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)

// 审核总览统计（按类型 + 按状态分组）
const statistics = ref<AuditStatisticsData | null>({ byType: [], byStatus: {}, total: 0 })

// 资源子类型筛选（动态类型，与统计 byType 对齐；各 admin list 接口统一 bizType 参数名）
const bizTypeFilter = ref<string>()
const loadingStat = ref(false)

// 状态标签 / 动作显隐统一走审核状态机（utils/auditStateMachine）
const stateTagText = (s: string) => auditStateText(s)
const stateTagType = (s: string) => auditStateTagType(s)

const emptyText = computed(() => {
  const map: Record<string, string> = {
    AUDITING: '暂无待审核动态',
    NORMAL: '暂无已过审动态',
    REJECTED: '暂无已驳回动态',
  }
  return map[activeTab.value] ?? '暂无数据'
})

// el-table-v2 列定义（与 CommentAdminView 保持同构；无批量选择列，操作列固定右侧）
const auditColumns: Column<MomentAuditItem>[] = [
  { key: 'dynIdStr', title: '动态 ID', width: 160 },
  { key: 'author', title: '发布者', width: 180 },
  { key: 'contentText', title: '内容预览', width: 360, minWidth: 200, flexGrow: 1 },
  { key: 'type', title: '类型', width: 100 },
  { key: 'pubTime', title: '发布时间', width: 180 },
  { key: 'state', title: '状态', width: 110 },
  { key: 'action', title: '操作', width: 200, fixed: TableV2FixedDir.RIGHT }
]

onMounted(async () => {
  await loadStatistics()
  load()
})

// 拉取审核总览统计（role=root，与审核列表同守卫）
async function loadStatistics() {
  loadingStat.value = true
  try {
    statistics.value = await fetchAuditStatisticsByBiz(AuditBizType.DYNAMIC)
  } finally {
    loadingStat.value = false
  }
}

// 表格高度自适应：数据不满一屏时收缩到内容实际高度，底部滚动条紧跟最后一行数据
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 72
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

/** 拉取当前 Tab 数据；`force=true`（刷新按钮）时忽略已加载标记重新请求 */
async function handleApprove(item: MomentAuditItem) {
  approvingId.value = item.dynIdStr
  // 统一审核接口：按 bizType(dynamic) + bizId(dynId) 操作，驳回通知由后端资源方法承载
  const res = await auditApproveByBiz(
    InteractionBizTypeEnum.DYNAMIC,
    item.dynIdStr,
    '通过'
  )
  approvingId.value = null
  if (res) {
    removeRow((i) => i.dynIdStr === item.dynIdStr)
    biliMessage.success('已通过')
  }
}

async function handleReject(item: MomentAuditItem) {
  try {
    const { value: reason } = await import('element-plus').then((m) =>
      m.ElMessageBox.prompt('请输入驳回原因', '驳回动态', { inputType: 'textarea' })
    )
    if (reason) {
      rejectingId.value = item.dynIdStr
      const res = await auditRejectByBiz(
        InteractionBizTypeEnum.DYNAMIC,
        item.dynIdStr,
        reason,
        '驳回'
      )
      rejectingId.value = null
      if (res) {
        removeRow((i) => i.dynIdStr === item.dynIdStr)
        biliMessage.success('已驳回')
      }
    }
  } catch {
    // 用户取消
  }
}
</script>
