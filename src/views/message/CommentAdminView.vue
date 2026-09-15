<template>
  <div class="comment-admin flex flex-col gap-4">
    <div class="comment-admin__stats grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="comment-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statTotalComments') }}</div>
        <div class="text-xl font-bold text-primary">{{ stats.total_comments }}</div>
      </div>
      <div class="comment-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statTodayNew') }}</div>
        <div class="text-xl font-bold text-text-primary">{{ stats.today_new }}</div>
      </div>
      <div class="comment-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statTotalSubjects') }}</div>
        <div class="text-xl font-bold text-text-primary">{{ stats.total_subjects }}</div>
      </div>
      <div class="comment-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statTotalRoot') }}</div>
        <div class="text-xl font-bold text-text-primary">{{ stats.total_root }}</div>
      </div>
    </div>

    <!-- 审核状态分布总览（通用组件） -->
    <AuditOverviewCard :statistics="auditStats" type-label="评论区类型" />

    <AdminAuditTabs
      v-model="activeTab"
      title="评论审核队列"
      :tabs="visibleTabs"
      :loading="loading"
      @refresh="onFilterChange"
    />

    <div v-if="canViewAllStates" class="comment-admin__filter flex items-center gap-3">
      <span class="text-sm text-text-placeholder">评论区类型</span>
      <el-select
        v-model="bizTypeFilter"
        clearable
        size="default"
        placeholder="全部类型"
        class="comment-admin__filter-select w-72"
        @change="onFilterChange"
      >
        <el-option
          v-for="row in auditStats?.byType ?? []"
          :key="String(row.type)"
          :label="String(row.type)"
          :value="String(row.type)"
        />
      </el-select>
    </div>

    <div
      v-loading="auditPending"
      :element-loading-text="t('message.bulkAuditing')"
      class="comment-admin__bulk-toolbar flex flex-wrap items-center gap-3 rounded-lg bg-bg-overlay p-3"
    >
      <span class="text-sm text-text-placeholder">{{ t('message.selectedCount', { n: selectedRows.length }) }}</span>
      <el-button
        type="success"
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('pass')"
      >
        {{ t('message.batchPass') }}
      </el-button>
      <el-button
        type="warning"
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('reject')"
      >
        {{ t('message.batchReject') }}
      </el-button>
      <el-button
        type="danger"
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('hidden')"
      >
        {{ t('message.batchTakeDown') }}
      </el-button>
      <el-button
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('restore')"
      >
        {{ t('message.batchRestore') }}
      </el-button>
      <template v-if="canBan">
        <el-divider direction="vertical" />
        <el-button
          type="danger"
          size="default"
          :disabled="!selectedMids.length || !canBan"
          @click="banDialogVisible = true"
        >
          {{ t('message.banUser') }}
        </el-button>
        <el-button
          size="default"
          :disabled="!selectedMids.length || !canBan"
          @click="unbanSelected"
        >
          {{ t('message.unbanUser') }}
        </el-button>
      </template>
    </div>

    <div class="comment-admin__table-bar mb-2 flex items-center justify-end">
      <el-button
        class="comment-admin__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="load"
      >
        {{ t('message.refresh') }}
      </el-button>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="items.length === 0" :text="t('message.emptyAuditComment')" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height -->
      <div v-else class="comment-admin__table h-[calc(100vh-320px)] min-h-105">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="commentColumns"
              :data="items"
              :width="width"
              :height="fitTableHeight(height)"
              :row-height="72"
              :header-height="44"
              :footer-height="total > pageSize ? 64 : 0"
              row-key="rpid"
              fixed
            >
              <template #header-cell="{ column }">
                <div
                  v-if="column.key === 'selection'"
                  class="flex h-full items-center justify-center"
                >
                  <el-checkbox
                    :model-value="allSelected"
                    @change="(v: unknown) => toggleSelectAll(v)"
                  />
                </div>
                <span v-else class="comment-admin__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 自定义选择列 -->
                <template v-if="column.key === 'selection'">
                  <div class="flex h-full items-center justify-center">
                    <el-checkbox
                      :model-value="selectedKeys.has(rowData.rpid)"
                      @change="(v: unknown) => toggleRow(rowData, v)"
                    />
                  </div>
                </template>

                <!-- 作者 -->
                <template v-else-if="column.key === 'author'">
                  <UserBriefCell :mid="rowData.mid" :brief="rowData.member" :show-actions="true" />
                </template>

                <!-- 内容 -->
                <template v-else-if="column.key === 'message'">
                  <span class="text-sm text-text-secondary">{{ rowData.message }}</span>
                </template>

                <!-- 内容来源 -->
                <template v-else-if="column.key === 'source'">
                  <AuditSourceLink :source="rowData.source" />
                </template>

                <!-- 状态 -->
                <template v-else-if="column.key === 'state'">
                  <el-tag :type="stateTag(rowData.state)" size="default" effect="light">
                    {{ stateText(rowData.state) }}
                  </el-tag>
                </template>

                <!-- 平台/设备 -->
                <template v-else-if="column.key === 'plat_device'">
                  <span v-if="rowData.plat || rowData.device" class="text-sm text-text-placeholder">
                    {{ rowData.plat || t('message.unknownPlatform')
                    }}<template v-if="rowData.device"> · {{ rowData.device }}</template>
                  </span>
                  <span v-else class="text-sm text-text-placeholder">—</span>
                </template>

                <!-- 点赞 -->
                <template v-else-if="column.key === 'like'">
                  <span class="text-sm text-text-placeholder">{{ rowData.like_count }}</span>
                </template>

                <!-- 时间 -->
                <template v-else-if="column.key === 'ctime'">
                  <TimeText :time="rowData.ctime" />
                </template>

                <!-- 其余默认列（类型 / rpid / oid） -->
                <template v-else>
                  {{ column.dataKey ? rowData[column.dataKey as keyof CommentAuditRow] : '-' }}
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty :description="t('message.emptyData')" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="comment-admin__pagination"
                  :total="total"
                  :page-size="pageSize"
                  :page-sizes="pageSizes"
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

    <BanUserDialog
      v-model="banDialogVisible"
      :mids="selectedMids"
      @success="load"
    />

    <AuditReasonDialog
      v-model="reasonDialogVisible"
      action-label="驳回"
      target-text="评论"
      :items="reasonDialogItems"
      @confirm="onReasonConfirm"
      @ban="onReasonBan"
    />

    <BanUserDialog
      v-model="banFromReasonVisible"
      :mids="banFromReasonMids"
      @success="load"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AuditOverviewCard from '@/components/admin/AuditOverviewCard.vue'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import { fetchAuditStatisticsByBiz, type AuditStatisticsData, AuditBizType } from '@/api/notify/moment-api'
import type { Column } from 'element-plus'
import { useDebounceFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { Refresh } from '@element-plus/icons-vue'
import biliMessage from '@/utils/message'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'

const { t } = useI18n()
import {
  CommentAdminService,
  ResourceAuditStatusEnum,
  MessageAdminBanService,
  type StandardResponseCommentAuditItem,
  type StandardResponseCommentAuditListResp,
  type StandardResponseCommentStatsResp,
} from '@/api/community/hey-api'

type CommentAuditRow = NonNullable<StandardResponseCommentAuditItem['data']>
type CommentAuditListData = NonNullable<StandardResponseCommentAuditListResp['data']>
type CommentStatsData = NonNullable<StandardResponseCommentStatsResp['data']>
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import AuditSourceLink from '@/components/message/AuditSourceLink.vue'
import BanUserDialog from '@/components/message/BanUserDialog.vue'
import AuditReasonDialog from '@/components/message/AuditReasonDialog.vue'
import UserBriefCell from '@/components/message/UserBriefCell.vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasBizPerm } from './messageAdmin'

const items = ref<CommentAuditRow[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const pageSizes = [10, 20, 50, 100]
// 默认筛选「审核中」（审核员进入页面最关心待审队列）
// 状态 Tab（与 MomentAuditListView 同构：单选 Tabs；非 root 仅「待审核」）
const activeTab = ref('AUDITING')
const canViewAllStates = ref(false)
const COMMENT_TABS: Array<{ name: string; label: string }> = [
  { name: 'AUDITING', label: '待审核' },
  { name: 'NORMAL', label: '已过审' },
  { name: 'REJECTED', label: '已驳回' },
  { name: 'HIDDEN', label: '已下架' }
]
const visibleTabs = computed(() =>
  canViewAllStates.value ? COMMENT_TABS : COMMENT_TABS.filter((tb) => tb.name === 'AUDITING')
)
watch(activeTab, () => {
  page.value = 1
  load()
})
const stats = reactive<CommentStatsData>({
  total_comments: 0,
  total_root: 0,
  total_subjects: 0,
  today_new: 0,
  top_authors: []
})

// 多选批量封禁 / 解封（el-table-v2 无内置选择列，使用 Set 维护选中 rpid）
const selectedKeys = ref<Set<string>>(new Set())
const selectedRows = computed<CommentAuditRow[]>(() =>
  items.value.filter((i) => selectedKeys.value.has(i.rpid))
)
const banDialogVisible = ref(false)
const adminStore = useMessageAdminStore()

function toggleRow(row: CommentAuditRow, val: unknown) {
  const next = new Set(selectedKeys.value)
  if (val) next.add(row.rpid)
  else next.delete(row.rpid)
  selectedKeys.value = next
}

const allSelected = computed(
  () => items.value.length > 0 && items.value.every((i) => selectedKeys.value.has(i.rpid))
)
function toggleSelectAll(val: unknown) {
  const next = new Set(selectedKeys.value)
  if (val) items.value.forEach((i) => next.add(i.rpid))
  else items.value.forEach((i) => next.delete(i.rpid))
  selectedKeys.value = next
}

// 审核原因弹窗（驳回 / 下架时必填，支持默认原因自动补全）
const reasonDialogVisible = ref(false)
const banFromReasonVisible = ref(false)
const banFromReasonMids = ref<number[]>([])
const pendingOp = ref<'' | 'pass' | 'reject' | 'hidden' | 'restore'>('')
// 弹窗内逐条列出的待审核条目
const reasonDialogItems = ref<
  { id: string; preview?: string; mid?: number | null; brief?: CommentAuditRow['member'] }[]
>([])
// 评论封禁 / 解封权限：comment 域处置位（BAN=1；root 恒有）
const canBan = computed(
  () => adminStore.status.is_root || hasBizPerm(adminStore.status.biz_perms, 'comment', 1)
)
const selectedMids = computed(() =>
  selectedRows.value.map((r) => r.mid).filter((m): m is number => Boolean(m))
)

// el-table-v2 列定义（含自定义选择列）；全部列固定宽度，总列宽 1870px 显著超出常规容器宽度，
// 保证任意分辨率下表格都可以左右滚动查看全部列
const commentColumns: Column<CommentAuditRow>[] = [
  { key: 'selection', title: '', width: 50 },
  { key: 'author', title: t('message.colAuthor'), width: 180 },
  { key: 'message', title: t('message.colMessage'), width: 480, minWidth: 480 },
  { key: 'source', title: t('message.colSource'), width: 200 },
  { key: 'state', title: t('message.colStatus'), width: 100 },
  { key: 'type', title: t('message.colType'), width: 90, dataKey: 'type' },
  { key: 'plat_device', title: t('message.colPlatDevice'), width: 200 },
  { key: 'like', title: t('message.colLike'), width: 80 },
  { key: 'ctime', title: t('message.colTime'), width: 200 },
  { key: 'rpid', title: t('message.colRpid'), width: 150, dataKey: 'rpid' },
  { key: 'oid', title: t('message.colOid'), width: 140, dataKey: 'oid' }
]

async function unbanSelected() {
  if (!selectedMids.value.length) return
  try {
    await ElMessageBox.confirm(
      t('message.unbanConfirm', { n: selectedMids.value.length }),
      t('message.unbanConfirmTitle'),
      { type: 'warning', lockScroll: false }
    )
  } catch {
    return
  }
  userActionPending.value = true
  try {
    await businessHandler<null>(
      MessageAdminBanService.unbanUsers({ body: { mids: selectedMids.value } }) as unknown as Promise<
        BusinessResponse<null>
      >,
      { successMessage: t('message.unbanSuccess') },
      [() => load()]
    )
  } finally {
    userActionPending.value = false
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

async function load() {
  loading.value = true
  const [list, st] = await Promise.all([
    CommentAdminService.auditQueueApiV1CommentAdminAuditGet({
      query: {
        // state 仅接受状态数值（StrInt）：Tab 名 → ResourceAuditStatusEnum 取值
        // state 恒按当前 Tab 传状态数值（首次加载 canViewAllStates 尚未就绪也不能漏传；
        // 非 root 传 AUDITING 本身不会触发越权 403，其他状态由后端拒绝）
        state: [ResourceAuditStatusEnum[activeTab.value as keyof typeof ResourceAuditStatusEnum]],
        bizType: bizTypeFilter.value || undefined,
        page_num: page.value,
        page_size: pageSize.value
      } as never
    }),
    CommentAdminService.adminStatsApiV1CommentAdminStatsGet()
  ])
  items.value = list?.data?.items ?? []
  total.value = list?.data?.total ?? 0
  canViewAllStates.value = Boolean(list?.data?.can_view_all_states)
  Object.assign(stats, st?.data ?? {})
  // 审核列表已内嵌作者信息（member），无需前端再回查
  // 翻页 / 刷新后当前页条目变化，清空选中避免残留
  selectedKeys.value = new Set()
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  load()
}

function onFilterChange() {
  page.value = 1
  load()
}

// 驳回 / 下架属于处罚性操作，必须填原因：原因会写进给作者的系统通知
// 注意：此处传入 AuditReasonDialog 的 actionLabel 需为中文 key（组件内再做 i18n 映射）
const OP_REASON_LABEL: Partial<Record<string, string>> = {
  reject: '驳回',
  hidden: '下架'
}

// 处罚性操作（驳回 / 下架）需要弹窗逐条填写原因；通过 / 恢复无需原因
async function batchAudit(op: 'pass' | 'reject' | 'hidden' | 'restore') {
  if (auditPending.value) return
  const rows = selectedRows.value
  if (!rows.length) return

  if (OP_REASON_LABEL[op]) {
    // 暂存操作，弹窗内逐条列出条目并各自选择原因，确认后再逐条执行
    pendingOp.value = op
    reasonDialogItems.value = rows.map((r) => ({
      id: r.rpid,
      preview: r.message,
      mid: r.mid,
      brief: r.member
    }))
    reasonDialogVisible.value = true
    return
  }

  await doAudit(rows, op, null)
}

// 审核弹窗内点击「封禁涉及用户」：打开封禁弹窗
function onReasonBan(mids: number[]) {
  banFromReasonMids.value = mids
  banFromReasonVisible.value = true
}

// 弹窗确认：reasons 为 { [rpid]: 该条原因 }
async function onReasonConfirm(reasons: Record<string, string>) {
  const op = pendingOp.value
  pendingOp.value = ''
  if (!op) return
  await doAudit(selectedRows.value, op, reasons)
}

// 通过 / 恢复：notes 为 null；驳回 / 下架：逐条带上各自的原因
async function doAudit(
  rows: CommentAuditRow[],
  op: 'pass' | 'reject' | 'hidden' | 'restore',
  reasons: Record<string, string> | null
) {
  if (!rows.length) return
  auditPending.value = true
  try {
    const newState = OP_STATE_MAP[op]
    // 一次批量审核调用，逐条原因通过 notes 映射传入（{ rpid: 原因 }）；
    // 成功文案由调用方预设，失败提示由后端响应驱动（统一 businessHandler 处理）
    await businessHandler<{ failed?: string[] }>(
      CommentAdminService.bulkAuditCommentApiV1CommentAdminAuditBatchPost({
        body: {
          rpids: rows.map((r) => r.rpid),
          op,
          notes: reasons ?? undefined
        }
      }) as unknown as Promise<BusinessResponse<{ failed?: string[] }>>,
      { successMessage: t('message.processedCount', { n: rows.length }) },
      [
        (result) => {
          if (!result.success || !result.data) return
          // 审核成功后就地更新对应行状态，避免整表重新加载导致闪烁
          const failed = new Set(result.data.failed ?? [])
          rows.forEach((row) => {
            if (!failed.has(row.rpid)) {
              const target = items.value.find((it) => it.rpid === row.rpid)
              if (target) target.state = newState
            }
          })
        },
      ]
    )
  } finally {
    auditPending.value = false
  }
}

// 防抖包装：避免连续点击触发多次审核调用
const batchAuditDebounced = useDebounceFn(batchAudit, 500)
const auditPending = ref(false)
const userActionPending = ref(false)

// 审核操作 -> 目标状态（用于本地就地更新行状态，须为数值枚举，与后端响应一致）
const OP_STATE_MAP: Record<string, ResourceAuditStatusEnum> = {
  pass: ResourceAuditStatusEnum.NORMAL,
  reject: ResourceAuditStatusEnum.REJECTED,
  hidden: ResourceAuditStatusEnum.HIDDEN,
  restore: ResourceAuditStatusEnum.NORMAL
}

function stateTag(s: ResourceAuditStatusEnum): 'success' | 'warning' | 'danger' | 'info' {
  if (s === ResourceAuditStatusEnum.NORMAL) return 'success'
  if (s === ResourceAuditStatusEnum.AUDITING) return 'warning'
  if (s === ResourceAuditStatusEnum.REJECTED || s === ResourceAuditStatusEnum.HIDDEN) return 'danger'
  return 'info'
}

function stateText(s: ResourceAuditStatusEnum): string {
  if (s === ResourceAuditStatusEnum.NORMAL) return t('message.stateNormal')
  if (s === ResourceAuditStatusEnum.AUDITING) return t('message.stateAuditing')
  if (s === ResourceAuditStatusEnum.REJECTED) return t('message.stateRejected')
  if (s === ResourceAuditStatusEnum.HIDDEN) return t('message.stateHidden')
  return t('message.stateDeleted')
}


// 审核状态分布总览（通用统计接口，bizType=comment）
const auditStats = ref<AuditStatisticsData | null>(null)
// 评论区资源类型筛选（与统计 byType 对齐；各 admin list 接口统一 bizType 参数名）
const bizTypeFilter = ref<string>()
async function loadAuditStats() {
  auditStats.value = await fetchAuditStatisticsByBiz(AuditBizType.COMMENT)
}

onMounted(async () => {
  void loadAuditStats()
  await adminStore.fetchStatus()
  await load()
})
</script>
