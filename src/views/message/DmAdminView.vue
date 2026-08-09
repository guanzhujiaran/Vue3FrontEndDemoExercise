<template>
  <div class="dm-admin flex flex-col gap-4">
    <div class="dm-admin__header flex items-center justify-between">
      <h2 class="text-lg font-bold text-msg-text-active">私信审核（管理员）</h2>
      <el-button size="default" @click="load">刷新</el-button>
    </div>

    <div class="dm-admin__stats grid grid-cols-2 gap-3 md:grid-cols-5">
      <div class="dm-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">私信总数</div>
        <div class="text-xl font-bold text-msg-link">{{ stats.total_dm }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">今日新增</div>
        <div class="text-xl font-bold text-msg-text-active">{{ stats.today_new }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">待审核</div>
        <div class="text-xl font-bold text-msg-link">{{ stats.auditing }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">已驳回</div>
        <div class="text-xl font-bold text-msg-pink">{{ stats.rejected }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-msg-card p-4">
        <div class="text-sm text-msg-muted">已下架</div>
        <div class="text-xl font-bold text-msg-muted">{{ stats.hidden }}</div>
      </div>
    </div>

    <div v-if="canViewAllStates" class="dm-admin__filter flex items-center gap-3">
      <span class="text-sm text-msg-muted">状态筛选</span>
      <el-select
        v-model="stateFilter"
        multiple
        clearable
        collapse-tags
        size="default"
        placeholder="全部状态"
        class="dm-admin__filter-select w-72"
        @change="onFilterChange"
      >
        <el-option label="待审核" value="auditing" />
        <el-option label="已驳回" value="rejected" />
        <el-option label="已下架" value="hidden" />
      </el-select>
    </div>

    <div
      v-loading="auditPending"
      element-loading-text="批量审核中"
      class="dm-admin__bulk-toolbar flex flex-wrap items-center gap-3 rounded-lg bg-msg-card p-3"
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
      <EmptyState v-if="items.length === 0" text="暂无待审私信" />
      <el-table
        v-else
        :data="items"
        class="dm-admin__table"
        border
        stripe
        row-key="msgkey"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="发送方" width="160">
          <template #default="{ row }">
            <UserBriefCell :mid="row.sender_mid" :brief="row.sender" />
          </template>
        </el-table-column>
        <el-table-column label="内容" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-sm text-msg-text">{{ row.message || '[图片/系统消息]' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="内容来源" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <AuditSourceLink
              :source="row.source"
              :intercept-navigate="true"
              @navigate="openSession"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="stateTag(row.audit_state)" size="default" effect="light">
              {{ stateText(row.audit_state) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="default" effect="plain">{{ msgTypeText(row.msg_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="接收方" width="110">
          <template #default="{ row }">
            <span class="text-sm text-msg-text-active">{{ row.talker_mid }}</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            <TimeText :time="row.created_at" />
          </template>
        </el-table-column>
        <el-table-column prop="msgkey" label="msgkey" width="150" />
      </el-table>

      <PaginationBar
        v-if="total > pageSize"
        class="dm-admin__pagination"
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
      :action-label="reasonDialogLabel"
      target-text="私信"
      :items="reasonDialogItems"
      @confirm="onReasonConfirm"
      @ban="onReasonBan"
    />

    <BanUserDialog
      v-model="banFromReasonVisible"
      :mids="banFromReasonMids"
      @success="load"
    />

    <el-drawer
      v-model="sessionDrawerVisible"
      title="会话上下文"
      direction="rtl"
      size="480px"
      class="dm-admin__session-drawer"
    >
      <LoadingWrap :loading="sessionLoading" :rows="4">
        <div v-if="sessionContext" class="dm-session flex flex-col gap-3">
          <div class="dm-session__meta rounded-lg bg-msg-card p-3 text-sm text-msg-muted">
            <div>会话：{{ sessionContext.session_key }}</div>
            <div>发送方：{{ sessionContext.sender_mid }}</div>
            <div>对话方：{{ sessionContext.talker_mid }}</div>
            <div>消息数：{{ sessionContext.total ?? (sessionContext.items?.length ?? 0) }}</div>
          </div>
          <el-table :data="sessionContext.items ?? []" class="dm-session__table" border stripe>
            <el-table-column label="内容" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="text-sm text-msg-text">{{ row.message || '[图片/系统消息]' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="stateTag(row.audit_state)" size="default" effect="light">
                  {{ stateText(row.audit_state) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="150">
              <template #default="{ row }">
                <TimeText :time="row.created_at" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </LoadingWrap>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import biliMessage from '@/utils/message'
import {
  adminStatsApiV1MessageDmAdminStatsGet,
  auditQueueApiV1MessageDmAdminAuditGet,
  bulkAuditDmApiV1MessageDmAdminAuditBatchPost,
  sessionContextApiV1MessageDmAdminSessionGet,
  unbanUsers,
  type AuditSourceInfo,
  type DmSessionContextResp,
  type StandardResponseDmAuditItem,
  type StandardResponseDmAuditListResp,
  type StandardResponseDmStatsResp,
} from '@/api/notify/hey-api'

// 从生成 SDK 的响应类型派生出 data 实体类型（responseStyle: 'data' 下函数直接返回 data）
type DmAuditRow = NonNullable<StandardResponseDmAuditItem['data']>
type DmAuditListData = NonNullable<StandardResponseDmAuditListResp['data']>
type DmStatsData = NonNullable<StandardResponseDmStatsResp['data']>
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import AuditSourceLink from '@/components/message/AuditSourceLink.vue'
import BanUserDialog from '@/components/message/BanUserDialog.vue'
import AuditReasonDialog from '@/components/message/AuditReasonDialog.vue'
import UserBriefCell from '@/components/message/UserBriefCell.vue'
import { useMessageAdminStore } from '@/stores/message_admin'

const items = ref<DmAuditRow[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const pageSizes = [10, 20, 50, 100]
const stateFilter = ref<string[]>([])
const canViewAllStates = ref(false)
const sessionDrawerVisible = ref(false)
const sessionLoading = ref(false)
const sessionContext = ref<DmSessionContextResp | null>(null)
const stats = reactive<DmStatsData>({
  total_dm: 0,
  today_new: 0,
  auditing: 0,
  rejected: 0,
  hidden: 0
})

// 多选批量封禁 / 解封（私信违规用户取发送方 mid）
const selectedRows = ref<DmAuditRow[]>([])
const banDialogVisible = ref(false)
const adminStore = useMessageAdminStore()

// 审核原因弹窗（驳回 / 下架时必填，支持默认原因自动补全）
const reasonDialogVisible = ref(false)
const banFromReasonVisible = ref(false)
const banFromReasonMids = ref<number[]>([])
const pendingOp = ref<'' | 'pass' | 'reject' | 'hidden' | 'restore'>('')
const reasonDialogLabel = ref('驳回')
// 弹窗内逐条列出的待审核条目
const reasonDialogItems = ref<
  { id: string; preview?: string; mid?: number | null; brief?: DmAuditRow['sender'] }[]
>([])
// 私信封禁 / 解封权限（dm:ban）
const canBan = computed(
  () =>
    adminStore.status.is_root ||
    adminStore.status.permissions.includes('dm:ban')
)
const selectedMids = computed(() =>
  selectedRows.value.map((r) => r.sender_mid).filter((m): m is number => Boolean(m))
)

function onSelectionChange(rows: DmAuditRow[]) {
  selectedRows.value = rows
}

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
    auditQueueApiV1MessageDmAdminAuditGet({
      query: {
        state: stateFilter.value.length ? stateFilter.value : undefined,
        page_num: page.value,
        page_size: pageSize.value
      }
    }),
    adminStatsApiV1MessageDmAdminStatsGet()
  ])
  items.value = list?.data?.items ?? []
  total.value = list?.data?.total ?? 0
  canViewAllStates.value = Boolean(list?.data?.can_view_all_states)
  Object.assign(stats, st?.data ?? {})
  // 审核列表已内嵌发送者信息（sender），无需前端再回查
  loading.value = false
}

async function openSession(source: AuditSourceInfo) {
  const sessionKey = source.params?.session_key
  const msgkey = source.params?.msgkey
  if (!sessionKey && !msgkey) {
    biliMessage.warning('该私信缺少会话定位参数，无法查看上下文')
    return
  }
  sessionLoading.value = true
  sessionDrawerVisible.value = true
  try {
    const ctx = await sessionContextApiV1MessageDmAdminSessionGet({
      query: { session_key: sessionKey ?? null, msgkey: msgkey ?? null }
    })
    sessionContext.value = ctx?.data ?? null
  } finally {
    sessionLoading.value = false
  }
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
const DM_OP_REASON_LABEL: Partial<Record<string, string>> = {
  reject: '驳回',
  hidden: '下架'
}

async function batchAudit(op: 'pass' | 'reject' | 'hidden' | 'restore') {
  if (auditPending.value) return
  const rows = selectedRows.value
  if (!rows.length) return

  if (DM_OP_REASON_LABEL[op]) {
    // 暂存操作，弹窗内逐条列出条目并各自选择原因，确认后再逐条执行
    pendingOp.value = op
    reasonDialogLabel.value = DM_OP_REASON_LABEL[op] ?? '驳回'
    reasonDialogItems.value = rows.map((r) => ({
      id: r.msgkey,
      preview: r.message,
      mid: r.sender_mid,
      brief: r.sender
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

// 弹窗确认：reasons 为 { [msgkey]: 该条原因 }
async function onReasonConfirm(reasons: Record<string, string>) {
  const op = pendingOp.value
  pendingOp.value = ''
  if (!op) return
  await doAudit(selectedRows.value, op, reasons)
}

// 通过 / 恢复：notes 为 null；驳回 / 下架：逐条带上各自的原因
async function doAudit(
  rows: DmAuditRow[],
  op: 'pass' | 'reject' | 'hidden' | 'restore',
  reasons: Record<string, string> | null
) {
  if (!rows.length) return
  auditPending.value = true
  try {
    const newState = OP_STATE_MAP[op]
    // 一次批量审核调用，逐条原因通过 notes 映射传入（{ msgkey: 原因 }）
    const resp = await bulkAuditDmApiV1MessageDmAdminAuditBatchPost({
      body: {
        msgkeys: rows.map((r) => r.msgkey),
        op,
        notes: reasons ?? undefined
      }
    })
    // 审核成功后就地更新对应行状态，避免整表重新加载导致闪烁
    const failed = new Set(resp?.failed ?? [])
    rows.forEach((row) => {
      if (!failed.has(row.msgkey)) {
        const target = items.value.find((it) => it.msgkey === row.msgkey)
        if (target) target.audit_state = newState
      }
    })
    biliMessage.success(`已${DM_OP_REASON_LABEL[op] ? DM_OP_REASON_LABEL[op] : '处理'} ${rows.length} 条`)
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

function msgTypeText(t: string): string {
  if (t === 'image') return '图片'
  if (t === 'system') return '系统'
  return '文本'
}

function stateTag(s: string): 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'normal') return 'success'
  if (s === 'auditing') return 'warning'
  if (s === 'rejected') return 'danger'
  return 'info'
}

function stateText(s: string): string {
  if (s === 'normal') return '正常'
  if (s === 'auditing') return '待审核'
  if (s === 'rejected') return '已驳回'
  return '已下架'
}

onMounted(async () => {
  await adminStore.fetchStatus()
  await load()
})
</script>
