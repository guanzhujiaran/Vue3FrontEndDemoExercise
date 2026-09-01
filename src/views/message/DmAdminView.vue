<template>
  <div class="dm-admin flex flex-col gap-4">
    <div class="dm-admin__header flex items-center justify-between">
      <h2 class="text-lg font-bold text-text-primary">{{ t('message.dmAuditTitle') }}</h2>
      <el-button size="default" @click="load">{{ t('message.refresh') }}</el-button>
    </div>

    <div class="dm-admin__stats grid grid-cols-2 gap-3 md:grid-cols-5">
      <div class="dm-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statTotalDm') }}</div>
        <div class="text-xl font-bold text-primary">{{ stats.total_dm }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statTodayNew') }}</div>
        <div class="text-xl font-bold text-text-primary">{{ stats.today_new }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statAuditing') }}</div>
        <div class="text-xl font-bold text-primary">{{ stats.auditing }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statRejected') }}</div>
        <div class="text-xl font-bold text-msg-pink">{{ stats.rejected }}</div>
      </div>
      <div class="dm-admin__stat-card rounded-lg bg-bg-overlay p-4">
        <div class="text-sm text-text-placeholder">{{ t('message.statHidden') }}</div>
        <div class="text-xl font-bold text-text-placeholder">{{ stats.hidden }}</div>
      </div>
    </div>

    <div v-if="canViewAllStates" class="dm-admin__filter flex items-center gap-3">
      <span class="text-sm text-text-placeholder">{{ t('message.statusFilter') }}</span>
      <el-select
        v-model="stateFilter"
        multiple
        clearable
        collapse-tags
        size="default"
        :placeholder="t('message.filterAllStatus')"
        class="dm-admin__filter-select w-72"
        @change="onFilterChange"
      >
        <el-option :label="t('message.stateAuditing')" value="auditing" />
        <el-option :label="t('message.stateRejected')" value="rejected" />
        <el-option :label="t('message.stateHidden')" value="hidden" />
      </el-select>
    </div>

    <div
      v-loading="auditPending"
      :element-loading-text="t('message.bulkAuditing')"
      class="dm-admin__bulk-toolbar flex flex-wrap items-center gap-3 rounded-lg bg-bg-overlay p-3"
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

    <div class="dm-admin__table-bar mb-2 flex items-center justify-end">
      <el-button
        class="dm-admin__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="load"
      >
        {{ t('message.refresh') }}
      </el-button>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="items.length === 0" :text="t('message.emptyAuditDm')" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height -->
      <div v-else class="dm-admin__table w-full h-[calc(100vh-320px)] min-h-105">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="dmColumns"
              :data="items"
              :width="width"
              :height="fitTableHeight(height)"
              :row-height="56"
              :header-height="44"
              :footer-height="total > pageSize ? 64 : 0"
              row-key="msgkey"
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
                <span v-else class="dm-admin__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 自定义选择列 -->
                <template v-if="column.key === 'selection'">
                  <div class="flex h-full items-center justify-center">
                    <el-checkbox
                      :model-value="selectedKeys.has(rowData.msgkey)"
                      @change="(v: unknown) => toggleRow(rowData, v)"
                    />
                  </div>
                </template>

                <!-- 发送者 -->
                <template v-else-if="column.key === 'sender'">
                  <UserBriefCell :mid="rowData.sender_mid" :brief="rowData.sender" :show-actions="true" />
                </template>

                <!-- 内容 -->
                <template v-else-if="column.key === 'message'">
                  <div class="w-full truncate">
                    <span class="text-sm text-text-secondary">{{ rowData.message || t('message.auditImageMsg') }}</span>
                  </div>
                </template>

                <!-- 内容来源 -->
                <template v-else-if="column.key === 'source'">
                  <AuditSourceLink
                    :source="rowData.source"
                    :intercept-navigate="true"
                    @navigate="openSession"
                  />
                </template>

                <!-- 状态 -->
                <template v-else-if="column.key === 'state'">
                  <el-tag :type="stateTag(rowData.audit_state)" size="default" effect="light">
                    {{ stateText(rowData.audit_state) }}
                  </el-tag>
                </template>

                <!-- 类型 -->
                <template v-else-if="column.key === 'type'">
                  <el-tag size="default" effect="plain">{{ msgTypeText(rowData.msg_type) }}</el-tag>
                </template>

                <!-- 接收方 -->
                <template v-else-if="column.key === 'talker'">
                  <span class="text-sm text-text-primary">{{ rowData.talker_mid }}</span>
                </template>

                <!-- 时间 -->
                <template v-else-if="column.key === 'ctime'">
                  <TimeText :time="rowData.created_at" />
                </template>

                <!-- 其余默认列（msgkey） -->
                <template v-else>
                  {{ column.dataKey ? rowData[column.dataKey as keyof DmAuditRow] : '-' }}
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty :description="t('message.emptyData')" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="dm-admin__pagination"
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
      :title="t('message.dmSessionContext')"
      direction="rtl"
      size="480px"
      class="dm-admin__session-drawer"
    >
      <LoadingWrap :loading="sessionLoading" :rows="4">
        <div v-if="sessionContext" class="dm-session flex flex-col gap-3">
          <div class="dm-session__meta rounded-lg bg-bg-overlay p-3 text-sm text-text-placeholder">
            <div>{{ t('message.sessionKey') }}{{ sessionContext.session_key }}</div>
            <div>{{ t('message.sessionSender') }}{{ sessionContext.sender_mid }}</div>
            <div>{{ t('message.sessionTalker') }}{{ sessionContext.talker_mid }}</div>
            <div>{{ t('message.sessionCount') }}{{ sessionContext.total ?? (sessionContext.items?.length ?? 0) }}</div>
          </div>
          <el-table :data="sessionContext.items ?? []" class="dm-session__table" border stripe>
            <el-table-column :label="t('message.colMessage')" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="text-sm text-text-secondary">{{ row.message || t('message.auditImageMsg') }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('message.colStatus')" width="90">
              <template #default="{ row }">
                <el-tag :type="stateTag(row.audit_state)" size="default" effect="light">
                  {{ stateText(row.audit_state) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('message.colTime')" width="150">
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
import type { Column } from 'element-plus'
import { useDebounceFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { Refresh } from '@element-plus/icons-vue'
import biliMessage from '@/utils/message'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'

const { t } = useI18n()
import { MessageDmAdminService, MessageAdminBanService, DmAuditStateEnum, DmMsgTypeEnum, type AuditSourceInfo, type DmSessionContextResp, type StandardResponseDmAuditItem, type StandardResponseDmAuditListResp, type StandardResponseDmStatsResp } from '@/api/community/hey-api'

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
// 默认筛选「审核中」（与评论审核一致：审核员进入页面最关心待审队列）
const stateFilter = ref<string[]>(['auditing'])
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

// 多选批量封禁 / 解封（el-table-v2 无内置选择列，使用 Set 维护选中 msgkey；违规用户取发送方 mid）
const selectedKeys = ref<Set<string>>(new Set())
const selectedRows = computed<DmAuditRow[]>(() =>
  items.value.filter((i) => selectedKeys.value.has(i.msgkey))
)
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

// el-table-v2 列定义（含自定义选择列）；全部列固定宽度，总列宽 1690px 显著超出常规容器宽度，
// 保证任意分辨率下表格都可以左右滚动查看全部列
const dmColumns: Column<DmAuditRow>[] = [
  { key: 'selection', title: '', width: 50 },
  { key: 'sender', title: t('message.colSender'), width: 200 },
  { key: 'message', title: t('message.colMessage'), width: 600, minWidth: 600 },
  { key: 'source', title: t('message.colSource'), width: 200 },
  { key: 'state', title: t('message.colStatus'), width: 100 },
  { key: 'type', title: t('message.colType'), width: 90 },
  { key: 'talker', title: t('message.colReceiver'), width: 110 },
  { key: 'ctime', title: t('message.colTime'), width: 180 },
  { key: 'msgkey', title: t('message.colMsgkey'), width: 160, dataKey: 'msgkey' }
]

function toggleRow(row: DmAuditRow, val: unknown) {
  const next = new Set(selectedKeys.value)
  if (val) next.add(row.msgkey)
  else next.delete(row.msgkey)
  selectedKeys.value = next
}

const allSelected = computed(
  () => items.value.length > 0 && items.value.every((i) => selectedKeys.value.has(i.msgkey))
)
function toggleSelectAll(val: unknown) {
  const next = new Set(selectedKeys.value)
  if (val) items.value.forEach((i) => next.add(i.msgkey))
  else items.value.forEach((i) => next.delete(i.msgkey))
  selectedKeys.value = next
}

async function unbanSelected() {
  if (!selectedMids.value.length) return
  try {
    await ElMessageBox.confirm(
      t('message.unbanConfirm', { n: selectedMids.value.length }),
      t('message.unbanConfirmTitle'),
      { type: 'warning' }
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
const TABLE_ROW_H = 56
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

async function load() {
  loading.value = true
  const [list, st] = await Promise.all([
    MessageDmAdminService.auditQueueApiV1MessageDmAdminAuditGet({
      query: {
        state: stateFilter.value.length ? stateFilter.value : undefined,
        page_num: page.value,
        page_size: pageSize.value
      }
    }),
    MessageDmAdminService.adminStatsApiV1MessageDmAdminStatsGet()
  ])
  items.value = list?.data?.data?.items ?? []
  total.value = list?.data?.data?.total ?? 0
  canViewAllStates.value = Boolean(list?.data?.data?.can_view_all_states)
  Object.assign(stats, st?.data?.data ?? {})
  // 审核列表已内嵌发送者信息（sender），无需前端再回查
  // 翻页 / 刷新后当前页条目变化，清空选中避免残留
  selectedKeys.value = new Set()
  loading.value = false
}

async function openSession(source: AuditSourceInfo) {
  const sessionKey = source.params?.session_key
  const msgkey = source.params?.msgkey
  if (!sessionKey && !msgkey) {
    biliMessage.warning(t('message.missingSessionParams'))
    return
  }
  sessionLoading.value = true
  sessionDrawerVisible.value = true
  try {
    const ctx = await MessageDmAdminService.sessionContextApiV1MessageDmAdminSessionGet({
      query: { session_key: sessionKey ?? null, msgkey: msgkey ?? null }
    })
    sessionContext.value = ctx?.data?.data ?? null
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
// 注意：此处传入 AuditReasonDialog 的 actionLabel 需为中文 key（组件内再做 i18n 映射）
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
    // 一次批量审核调用，逐条原因通过 notes 映射传入（{ msgkey: 原因 }）；
    // 成功文案由调用方预设，失败提示由后端响应驱动（统一 businessHandler 处理）
    await businessHandler<{ failed?: number[] }>(
      MessageDmAdminService.bulkAuditDmApiV1MessageDmAdminAuditBatchPost({
        body: {
          msgkeys: rows.map((r) => r.msgkey),
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
            if (!failed.has(row.msgkey)) {
              const target = items.value.find((it) => it.msgkey === row.msgkey)
              if (target) target.audit_state = newState
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

// 审核操作 -> 目标状态
// 后端枚举是整数：审核动作落到哪个状态必须用枚举值表达，不能写字符串字面量
const OP_STATE_MAP: Record<string, DmAuditStateEnum> = {
  pass: DmAuditStateEnum.NORMAL,
  reject: DmAuditStateEnum.REJECTED,
  hidden: DmAuditStateEnum.HIDDEN,
  restore: DmAuditStateEnum.NORMAL
}

function msgTypeText(type?: DmMsgTypeEnum): string {
  if (type === DmMsgTypeEnum.IMAGE) return t('message.typeImage')
  if (type === DmMsgTypeEnum.SYSTEM) return t('message.typeSystem')
  return t('message.typeText')
}

function stateTag(s?: DmAuditStateEnum): 'success' | 'warning' | 'danger' | 'info' {
  if (s === DmAuditStateEnum.NORMAL) return 'success'
  if (s === DmAuditStateEnum.AUDITING) return 'warning'
  if (s === DmAuditStateEnum.REJECTED) return 'danger'
  return 'info'
}

function stateText(s?: DmAuditStateEnum): string {
  if (s === DmAuditStateEnum.NORMAL) return t('message.stateNormal')
  if (s === DmAuditStateEnum.AUDITING) return t('message.stateAuditing')
  if (s === DmAuditStateEnum.REJECTED) return t('message.stateRejected')
  return t('message.stateHidden')
}

onMounted(async () => {
  await adminStore.fetchStatus()
  await load()
})
</script>
