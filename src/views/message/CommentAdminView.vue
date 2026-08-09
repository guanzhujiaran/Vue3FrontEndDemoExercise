<template>
  <div class="comment-admin flex flex-col gap-4">
    <div class="comment-admin__header flex items-center justify-between">
      <h2 class="text-lg font-bold text-msg-text-active">评论审核（管理员）</h2>
      <el-button size="default" @click="load">刷新</el-button>
    </div>

    <div class="comment-admin__stats grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="comment-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">评论总数</div>
        <div class="text-xl font-bold text-msg-link">{{ stats.total_comments }}</div>
      </div>
      <div class="comment-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">今日新增</div>
        <div class="text-xl font-bold text-msg-text-active">{{ stats.today_new }}</div>
      </div>
      <div class="comment-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">评论区数</div>
        <div class="text-xl font-bold text-msg-text-active">{{ stats.total_subjects }}</div>
      </div>
      <div class="comment-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">根评论数</div>
        <div class="text-xl font-bold text-msg-text-active">{{ stats.total_root }}</div>
      </div>
    </div>

    <div v-if="canViewAllStates" class="comment-admin__filter flex items-center gap-3">
      <span class="text-sm text-msg-muted">状态筛选</span>
      <el-select
        v-model="stateFilter"
        multiple
        clearable
        collapse-tags
        size="default"
        placeholder="全部状态"
        class="comment-admin__filter-select w-72"
        @change="onFilterChange"
      >
        <el-option label="待审核" value="auditing" />
        <el-option label="正常" value="normal" />
        <el-option label="已驳回" value="rejected" />
        <el-option label="已下架" value="hidden" />
      </el-select>
    </div>

    <div
      v-loading="auditPending"
      element-loading-text="批量审核中"
      class="comment-admin__bulk-toolbar flex flex-wrap items-center gap-3 rounded-lg bg-msg-card p-3"
    >
      <span class="text-sm text-msg-muted">已选 {{ selectedRows.length }} 条</span>
      <el-button
        type="success"
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('pass')"
      >
        通过
      </el-button>
      <el-button
        type="warning"
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('reject')"
      >
        驳回
      </el-button>
      <el-button
        type="danger"
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('hidden')"
      >
        下架
      </el-button>
      <el-button
        size="default"
        :disabled="!selectedRows.length"
        @click="batchAuditDebounced('restore')"
      >
        恢复
      </el-button>
      <template v-if="canBan">
        <el-divider direction="vertical" />
        <el-button
          type="danger"
          size="default"
          :disabled="!selectedMids.length || !canBan"
          @click="banDialogVisible = true"
        >
          封禁用户
        </el-button>
        <el-button
          size="default"
          :disabled="!selectedMids.length || !canBan"
          @click="unbanSelected"
        >
          解封用户
        </el-button>
      </template>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="items.length === 0" text="暂无待审评论" />
      <div v-else class="comment-admin__table w-full h-[calc(100vh-320px)] min-h-105">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="commentColumns"
              :data="items"
              :width="width"
              :height="height"
              :row-height="72"
              :header-height="44"
              row-key="rpid"
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
                  <UserBriefCell :mid="rowData.mid" :brief="rowData.member" />
                </template>

                <!-- 内容 -->
                <template v-else-if="column.key === 'message'">
                  <span class="text-sm text-msg-text">{{ rowData.message }}</span>
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
                  <span v-if="rowData.plat || rowData.device" class="text-sm text-msg-muted">
                    {{ rowData.plat || '未知平台'
                    }}<template v-if="rowData.device"> · {{ rowData.device }}</template>
                  </span>
                  <span v-else class="text-sm text-msg-muted">—</span>
                </template>

                <!-- 点赞 -->
                <template v-else-if="column.key === 'like'">
                  <span class="text-sm text-msg-muted">{{ rowData.like_count }}</span>
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
                  <el-empty description="暂无数据" :image-size="80" />
                </div>
              </template>
            </el-table-v2>
          </template>
        </el-auto-resizer>
      </div>

      <PaginationBar
        v-if="total > pageSize"
        class="comment-admin__pagination"
        :total="total"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :current-page="page"
        @update:current-page="onPageChange"
        @update:page-size="onPageSizeChange"
      />
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
import { computed, onMounted, reactive, ref } from 'vue'
import type { Column } from 'element-plus'
import { useDebounceFn } from '@vueuse/core'
import biliMessage from '@/utils/message'
import {
  adminStatsApiV1CommentAdminStatsGet,
  auditQueueApiV1CommentAdminAuditGet,
  bulkAuditCommentApiV1CommentAdminAuditBatchPost,
  unbanUsers,
  type StandardResponseCommentAuditItem,
  type StandardResponseCommentAuditListResp,
  type StandardResponseCommentStatsResp,
} from '@/api/notify/hey-api'

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

const items = ref<CommentAuditRow[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const pageSizes = [10, 20, 50, 100]
const stateFilter = ref<string[]>([])
const canViewAllStates = ref(false)
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
// 评论封禁 / 解封权限（comment:ban）
const canBan = computed(
  () =>
    adminStore.status.is_root ||
    adminStore.status.permissions.includes('comment:ban')
)
const selectedMids = computed(() =>
  selectedRows.value.map((r) => r.mid).filter((m): m is number => Boolean(m))
)

// el-table-v2 列定义（含自定义选择列）；内容列 flexGrow 自适应填充剩余宽度
const commentColumns: Column<CommentAuditRow>[] = [
  { key: 'selection', title: '', width: 50 },
  { key: 'author', title: '作者', width: 160 },
  { key: 'message', title: '内容', width: 240, minWidth: 240, flexGrow: 1 },
  { key: 'source', title: '内容来源', width: 180 },
  { key: 'state', title: '状态', width: 100 },
  { key: 'type', title: '类型', width: 90, dataKey: 'type' },
  { key: 'plat_device', title: '平台/设备', width: 160 },
  { key: 'like', title: '点赞', width: 80 },
  { key: 'ctime', title: '时间', width: 180 },
  { key: 'rpid', title: 'rpid', width: 150, dataKey: 'rpid' },
  { key: 'oid', title: 'oid', width: 130, dataKey: 'oid' }
]

async function unbanSelected() {
  if (!selectedMids.value.length) return
  try {
    await ElMessageBox.confirm(
      `确认解封选中的 ${selectedMids.value.length} 名用户？`,
      '解封用户',
      { type: 'warning' }
    )
  } catch {
    return
  }
  userActionPending.value = true
  try {
    const res = await unbanUsers({ body: { mids: selectedMids.value } })
    if (res && res.code === 0) {
      biliMessage.success('已解封选中用户')
      await load()
    } else if (res) {
      biliMessage.error(res.msg || '解封失败')
    }
  } finally {
    userActionPending.value = false
  }
}

async function load() {
  loading.value = true
  const [list, st] = await Promise.all([
    auditQueueApiV1CommentAdminAuditGet({
      query: {
        state: stateFilter.value.length ? stateFilter.value : undefined,
        page_num: page.value,
        page_size: pageSize.value
      }
    }),
    adminStatsApiV1CommentAdminStatsGet()
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
    // 一次批量审核调用，逐条原因通过 notes 映射传入（{ rpid: 原因 }）
    const resp = await bulkAuditCommentApiV1CommentAdminAuditBatchPost({
      body: {
        rpids: rows.map((r) => r.rpid),
        op,
        notes: reasons ?? undefined
      }
    })
    // 审核成功后就地更新对应行状态，避免整表重新加载导致闪烁
    const failed = new Set(resp?.failed ?? [])
    rows.forEach((row) => {
      if (!failed.has(row.rpid)) {
        const target = items.value.find((it) => it.rpid === row.rpid)
        if (target) target.audit_state = newState
      }
    })
    biliMessage.success(`已${OP_REASON_LABEL[op] ? OP_REASON_LABEL[op] : '处理'} ${rows.length} 条`)
  } catch {
    biliMessage.error('审核失败，请重试')
  } finally {
    auditPending.value = false
  }
}

// 防抖包装：避免连续点击触发多次审核调用
const batchAuditDebounced = useDebounceFn(batchAudit, 500)
const auditPending = ref(false)

// 审核操作 -> 目标状态
const OP_STATE_MAP: Record<string, string> = {
  pass: 'normal',
  reject: 'rejected',
  hidden: 'hidden',
  restore: 'normal'
}

function stateTag(s: string): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'normal') return 'success'
  if (s === 'auditing') return 'warning'
  if (s === 'rejected' || s === 'hidden') return 'danger'
  return 'info'
}

function stateText(s: string): string {
  if (s === 'normal') return '正常'
  if (s === 'auditing') return '待审核'
  if (s === 'rejected') return '已驳回'
  if (s === 'hidden') return '已下架'
  return '已删除'
}

onMounted(async () => {
  await adminStore.fetchStatus()
  await load()
})
</script>
