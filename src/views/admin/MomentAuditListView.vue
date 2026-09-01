<template>
  <div class="moment-audit-list flex flex-col gap-4">
    <!-- 工具栏 -->
    <div class="moment-audit-list__toolbar flex items-center justify-between">
      <h2 class="moment-audit-list__title text-lg font-bold text-text-primary">动态审核队列</h2>
      <div class="moment-audit-list__toolbar-right flex items-center gap-3">
        <!-- 状态筛选 Tab：待审核 / 已过审（可驳回撤回）/ 已驳回（可通过恢复） -->
        <el-radio-group v-model="statusTab" size="default" @change="onStatusChange">
          <el-radio-button value="auditing">待审核</el-radio-button>
          <el-radio-button value="normal">已过审</el-radio-button>
          <el-radio-button value="rejected">已驳回</el-radio-button>
        </el-radio-group>
        <el-button
          class="moment-audit-list__refresh-btn"
          size="default"
          :icon="Refresh"
          :loading="loading"
          @click="load"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 审核总览统计 -->
    <el-card class="moment-audit-stat" shadow="never" :body-style="{ padding: '16px' }">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold">审核总览</span>
          <span class="text-sm text-text-secondary">动态总数：{{ statistics.total }}</span>
        </div>
      </template>
      <div class="flex flex-wrap gap-3 mb-3">
        <el-tag type="warning" effect="light">审核中 {{ statistics.byStatus?.auditing || 0 }}</el-tag>
        <el-tag type="success" effect="light">已过审 {{ statistics.byStatus?.normal || 0 }}</el-tag>
        <el-tag type="danger" effect="light">已驳回 {{ statistics.byStatus?.rejected || 0 }}</el-tag>
        <el-tag type="info" effect="light">已下架 {{ statistics.byStatus?.hidden || 0 }}</el-tag>
      </div>
      <el-table :data="statistics.byType" size="small" border>
        <el-table-column prop="dynType" label="类型" width="120" />
        <el-table-column prop="auditing" label="审核中" />
        <el-table-column prop="normal" label="已过审" />
        <el-table-column prop="rejected" label="已驳回" />
        <el-table-column prop="hidden" label="已下架" />
        <el-table-column prop="total" label="合计" />
      </el-table>
    </el-card>

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

                <!-- 操作：auditing=通过/驳回；normal=仅驳回（失误过审撤回）；rejected=仅通过（恢复） -->
                <template v-else-if="column.key === 'action'">
                  <div class="flex gap-2">
                    <el-button
                      v-if="rowData.auditStatus !== 'normal'"
                      size="default"
                      type="primary"
                      :loading="approvingId === rowData.dynIdStr"
                      @click="handleApprove(rowData)"
                    >
                      通过
                    </el-button>
                    <el-button
                      v-if="rowData.auditStatus !== 'rejected'"
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
import { fetchAuditList, auditApprove, auditReject, fetchAuditStatistics } from '@/api/notify/moment-api'
import type { MomentAuditItem, MomentAuditStatusEnum, MomentAuditStatisticsResp } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'

const items = ref<MomentAuditItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const approvingId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)
// 状态筛选 Tab：auditing（默认，待审核）/ normal（已过审，可驳回撤回）/ rejected（已驳回，可通过恢复）
const statusTab = ref<MomentAuditStatusEnum>('auditing')

// 审核总览统计（按类型 + 按状态分组）
const statistics = ref<MomentAuditStatisticsResp>({ byType: [], byStatus: {}, total: 0 })
const loadingStat = ref(false)

// 审核状态 → 标签文案/类型映射（对齐后端 MomentAuditStatusEnum 字符串值）
const AUDIT_STATE_MAP: Record<string, { text: string; type: 'warning' | 'success' | 'danger' | 'info' }> = {
  auditing: { text: '待审核', type: 'warning' },
  normal: { text: '已过审', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  hidden: { text: '已下架', type: 'info' },
}

function stateTagText(status: string): string {
  return AUDIT_STATE_MAP[status]?.text ?? status
}

function stateTagType(status: string): 'warning' | 'success' | 'danger' | 'info' {
  return AUDIT_STATE_MAP[status]?.type ?? 'info'
}

const emptyText = computed(() => {
  const map: Record<string, string> = {
    auditing: '暂无待审核动态',
    normal: '暂无已过审动态',
    rejected: '暂无已驳回动态',
  }
  return map[statusTab.value] ?? '暂无数据'
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
    statistics.value = await fetchAuditStatistics()
  } finally {
    loadingStat.value = false
  }
}

// 表格高度自适应：数据不满一屏时收缩到内容实际高度，底部滚动条紧跟最后一行数据
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 72
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

async function load() {
  loading.value = true
  const res = await fetchAuditList({
    auditStatus: statusTab.value,
    page_num: page.value,
    page_size: pageSize,
  })
  items.value = res.items || []
  total.value = res.total || 0
  loading.value = false
}

function onStatusChange() {
  page.value = 1
  load()
}

function onPageChange(p: number) {
  page.value = p
  load()
}

async function handleApprove(item: MomentAuditItem) {
  approvingId.value = item.dynIdStr
  const res = await auditApprove(item.dynIdStr, '通过')
  approvingId.value = null
  if (res) {
    items.value = items.value.filter((i) => i.dynIdStr !== item.dynIdStr)
    total.value = Math.max(0, total.value - 1)
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
      const res = await auditReject(item.dynIdStr, reason, '驳回')
      rejectingId.value = null
      if (res) {
        items.value = items.value.filter((i) => i.dynIdStr !== item.dynIdStr)
        total.value = Math.max(0, total.value - 1)
        biliMessage.success('已驳回')
      }
    }
  } catch {
    // 用户取消
  }
}
</script>
