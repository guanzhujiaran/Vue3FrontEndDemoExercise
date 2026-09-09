<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, TableV2FixedDir, type Column } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import UserSearchPicker from '@/components/message/UserSearchPicker.vue'

const { t } = useI18n()
import { MessageAdminService } from '@/api/community/hey-api'
import { useMessageAdminStore } from '@/stores/message_admin'
import {
  AUDIT_BIZ_ROWS,
  BIZ_PERM_OPS,
  bizPermsText,
  type MessageAdminItem,
  type MessageAdminListResp,
} from '@/views/message/messageAdmin'

const adminStore = useMessageAdminStore()

const admins = ref<MessageAdminItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const pageSizes = [10, 20, 50, 100]
const loading = ref(false)
const isError = ref(false)
const submitting = ref(false)

// el-table-v2 列定义（与 CommentAdminView 保持同构；权限列自动分配剩余宽度，操作列固定右侧）
const permColumns: Column<MessageAdminItem>[] = [
  { key: 'mid', title: t('message.colMid'), width: 150, dataKey: 'mid' },
  { key: 'granted_by', title: t('message.colGrantedBy'), width: 150, dataKey: 'granted_by' },
  { key: 'biz_perms', title: t('message.permLabel'), width: 340, minWidth: 300, flexGrow: 1 },
  { key: 'note', title: t('message.colNote'), width: 200, minWidth: 160, dataKey: 'note' },
  { key: 'created_at', title: t('message.colCreatedAt'), width: 200, minWidth: 180, dataKey: 'created_at' },
  { key: 'action', title: t('message.colAction'), width: 110, fixed: TableV2FixedDir.RIGHT }
]

const isRoot = computed(() => adminStore.status.is_root)

const grantVisible = ref(false)
const grantForm = reactive<{ mid: string; bizPerms: Record<string, number>; note: string }>({
  mid: '',
  bizPerms: {},
  note: ''
})

/** 授权矩阵勾选状态：行=资源域，列=操作位（rwx） */
const permMatrix = reactive<Record<string, { view: boolean; audit: boolean; ban: boolean }>>(
  Object.fromEntries(AUDIT_BIZ_ROWS.map((r) => [r.biz, { view: false, audit: false, ban: false }]))
)

type OpKey = 'view' | 'audit' | 'ban'
const OP_KEYS: OpKey[] = ['view', 'audit', 'ban']

function rowCheckedCount(biz: string): number {
  const c = permMatrix[biz]
  return OP_KEYS.filter((k) => c[k]).length
}

/** 行状态（横向：单资源域全选 / 半选） */
function rowState(biz: string) {
  const n = rowCheckedCount(biz)
  return { checked: n === OP_KEYS.length, indeterminate: n > 0 && n < OP_KEYS.length }
}

function toggleRow(biz: string) {
  const target = !rowState(biz).checked
  for (const k of OP_KEYS) permMatrix[biz][k] = target
}

/** 列状态（纵向：单操作位跨全部资源域全选 / 半选） */
function colState(key: OpKey) {
  const n = AUDIT_BIZ_ROWS.filter((r) => permMatrix[r.biz][key]).length
  return { checked: n === AUDIT_BIZ_ROWS.length, indeterminate: n > 0 && n < AUDIT_BIZ_ROWS.length }
}

function toggleCol(key: OpKey) {
  const target = !colState(key).checked
  for (const r of AUDIT_BIZ_ROWS) permMatrix[r.biz][key] = target
}

/** 总控（全部资源域 × 全部操作位） */
function allState() {
  const total = AUDIT_BIZ_ROWS.length * OP_KEYS.length
  const n = AUDIT_BIZ_ROWS.reduce((acc, r) => acc + rowCheckedCount(r.biz), 0)
  return { checked: n === total, indeterminate: n > 0 && n < total }
}

function toggleAll() {
  const target = !allState().checked
  for (const r of AUDIT_BIZ_ROWS) {
    for (const k of OP_KEYS) permMatrix[r.biz][k] = target
  }
}

function matrixToBizPerms(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of AUDIT_BIZ_ROWS) {
    const c = permMatrix[row.biz]
    const mask =
      (c.view ? BIZ_PERM_OPS[0].op : 0) |
      (c.audit ? BIZ_PERM_OPS[1].op : 0) |
      (c.ban ? BIZ_PERM_OPS[2].op : 0)
    if (mask > 0) out[row.biz] = mask
  }
  return out
}

// 表格高度自适应：数据不满一屏时收缩到内容实际高度，底部滚动条紧跟最后一行数据
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 56
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + admins.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

async function fetchList() {
  loading.value = true
  try {
    const res = await MessageAdminService.listAdminsApiV1MessageAdminListGet({
      query: { page_num: page.value, page_size: pageSize.value }
    })
    // SDK（ThrowOnError=false）返回 { data, error } 包装，列表在 res.data 里
    const payload = res as unknown as { data?: MessageAdminListResp }
    const data = payload?.data
    if (data) {
      admins.value = data.items ?? []
      total.value = Number(data.total ?? 0)
      isError.value = false
    } else {
      // 后端返回空响应：等同加载失败，交给 <BiliError> 特殊展示
      isError.value = true
    }
  } catch {
    // 后端接口报错：交给 <BiliError> 做特殊展示，点击重试重新拉取
    isError.value = true
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  fetchList()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  fetchList()
}

function openGrant() {
  grantForm.mid = ''
  grantForm.bizPerms = {}
  for (const row of AUDIT_BIZ_ROWS) {
    permMatrix[row.biz] = { view: false, audit: false, ban: false }
  }
  grantForm.note = ''
  grantVisible.value = true
}

async function onGrant() {
  const mid = grantForm.mid
  if (!mid || Number(mid) <= 0) {
    ElMessage.warning(t('message.invalidMid'))
    return
  }
  submitting.value = true
  try {
    const res = await MessageAdminService.grantAdminApiV1MessageAdminGrantPost({
      body: {
        mid,
        biz_perms: matrixToBizPerms(),
        note: grantForm.note || null
      }
    })
    if (res) {
      ElMessage.success(t('message.grantSuccess'))
      grantVisible.value = false
      await fetchList()
    } else {
      ElMessage.error(t('message.grantFailed'))
    }
  } catch {
    ElMessage.error(t('message.grantFailed'))
  } finally {
    submitting.value = false
  }
}

async function onRevoke(row: MessageAdminItem) {
  try {
    await ElMessageBox.confirm(
      t('message.revokeConfirm', { mid: row.mid }),
      t('message.revokeConfirmTitle'),
      { type: 'warning', confirmButtonText: t('message.revokePermission'), cancelButtonText: t('common.cancel') }
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    const res = await MessageAdminService.revokeAdminApiV1MessageAdminRevokePost({ body: { mid: row.mid } })
    if (res) {
      ElMessage.success(t('message.revokeSuccess'))
      await fetchList()
    } else {
      ElMessage.error(t('message.revokeFailed'))
    }
  } catch {
    ElMessage.error(t('message.revokeFailed'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (!adminStore.loaded) {
    adminStore.fetchStatus()
  }
  fetchList()
})
</script>

<template>
  <div class="message-admin-permission flex flex-col gap-4">
    <div class="message-admin-permission__toolbar flex items-center justify-between bg-bg-overlay px-4 py-3 rounded-lg">
      <div class="flex flex-col gap-1">
        <el-text class="text-text-primary font-medium">{{ t('message.permTitle') }}</el-text>
        <span class="text-text-placeholder text-xs">
          {{ t('message.permSubtitle') }}
        </span>
      </div>
      <el-button v-if="isRoot" type="primary" :icon="Plus" @click="openGrant">
        {{ t('message.grantPermission') }}
      </el-button>
    </div>

    <div class="message-admin-permission__table-bar mb-2 flex items-center justify-end">
      <el-button
        class="message-admin-permission__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="fetchList"
      >
        {{ t('message.refresh') }}
      </el-button>
    </div>

    <BiliError v-if="isError" :txt="t('message.listLoadFailed')" @click-retry="fetchList" />
    <LoadingWrap v-else :loading="loading" :rows="6">
      <EmptyState v-if="admins.length === 0" :text="t('message.emptyAdmin')" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height；滚动条落在表格内部，不依赖外侧布局滚动 -->
      <div v-else class="message-admin-permission__table h-[calc(100vh-320px)] min-h-105">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="permColumns"
              :data="admins"
              :width="width"
              :height="height"
              :row-height="56"
              :header-height="44"
              :footer-height="total > pageSize ? 64 : 0"
              row-key="mid"
              fixed
            >
              <template #header-cell="{ column }">
                <span class="message-admin-permission__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 权限标签 -->
                <template v-if="column.key === 'biz_perms'">
                  <span class="text-sm text-text-secondary">{{ bizPermsText(rowData.biz_perms) || '—' }}</span>
                </template>

                <!-- 操作 -->
                <template v-else-if="column.key === 'action'">
                  <el-button v-if="isRoot" link type="danger" :disabled="submitting" @click="onRevoke(rowData)">
                    {{ t('message.revokePermission') }}
                  </el-button>
                </template>

                <!-- 其余简单列（mid / granted_by / note / created_at） -->
                <template v-else>
                  <span class="text-sm text-text-primary">
                    {{ column.dataKey ? rowData[column.dataKey as keyof MessageAdminItem] : '-' }}
                  </span>
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty :description="t('message.emptyAdmin')" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="message-admin-permission__pagination"
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

    <el-dialog v-model="grantVisible" :title="t('message.grantDialogTitle')" width="520px" :close-on-click-modal="false">
      <el-form :model="grantForm" label-width="88px" @submit.prevent>
        <!-- 用户搜索选择（公共组件 el-select 远程搜索）：点选即设定被授权人 -->
        <el-form-item :label="t('userSearch.label')" required>
          <UserSearchPicker
            v-model="grantForm.mid"
            :disabled="submitting"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item :label="t('message.permLabel')">
          <div class="w-full overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-text-placeholder">
                  <th class="py-1 text-left font-normal">
                    <el-checkbox
                      :model-value="allState().checked"
                      :indeterminate="allState().indeterminate"
                      :disabled="submitting"
                      @change="toggleAll()"
                    />
                    资源域
                  </th>
                  <th v-for="o in BIZ_PERM_OPS" :key="o.op" class="py-1 text-center font-normal">
                    <div class="flex flex-col items-center leading-tight">
                      <el-checkbox
                        :model-value="colState(o.short as OpKey).checked"
                        :indeterminate="colState(o.short as OpKey).indeterminate"
                        :disabled="submitting"
                        @change="toggleCol(o.short as OpKey)"
                      />
                      <span>{{ o.label }}（{{ o.short }})</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in AUDIT_BIZ_ROWS" :key="row.biz">
                  <td class="py-1">
                    <div class="flex items-center gap-2">
                      <el-checkbox
                        :model-value="rowState(row.biz).checked"
                        :indeterminate="rowState(row.biz).indeterminate"
                        :disabled="submitting"
                        @change="toggleRow(row.biz)"
                      />
                      <span class="text-text-primary">{{ row.label }}</span>
                    </div>
                  </td>
                  <td v-for="o in BIZ_PERM_OPS" :key="o.op" class="py-1 text-center">
                    <el-checkbox
                      v-model="(permMatrix[row.biz] as { view: boolean; audit: boolean; ban: boolean })[o.short as 'view' | 'audit' | 'ban']"
                      :disabled="submitting"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </el-form-item>
        <el-form-item :label="t('message.noteLabel')">
          <el-input
            v-model="grantForm.note"
            type="textarea"
            :rows="3"
            :placeholder="t('message.notePlaceholder')"
            :disabled="submitting"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitting" @click="grantVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="onGrant">{{ t('message.confirmGrant') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
