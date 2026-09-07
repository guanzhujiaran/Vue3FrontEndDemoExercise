<template>
  <div class="notify-admin">
    <div class="notify-admin__toolbar mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold text-text-primary">{{ t('message.notifyAdminTitle') }}</h2>
      <el-button type="primary" size="default" class="notify-admin__create" @click="openCreate">
        {{ t('message.publishNotify') }}
      </el-button>
    </div>

    <div class="notify-admin__table-bar mb-2 flex items-center justify-end">
      <el-button
        class="notify-admin__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="load"
      >
        {{ t('message.refresh') }}
      </el-button>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="items.length === 0" :text="t('message.noNotifyRecord')" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height；滚动条落在表格内部，不依赖外侧布局滚动 -->
      <div v-else class="notify-admin__table h-[calc(100vh-260px)] min-h-105">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2  :columns="notifyColumns" :data="items" :width="width" :height="fitTableHeight(height)" :row-height="56"
              :header-height="44" :footer-height="total > pageSize ? 64 : 0" row-key="id" fixed>
              <template #header-cell="{ column }">
                <span class="notify-admin__th font-medium text-text-primary">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 正文（含 #{文本}{"url"} 内联链接），多行截断，悬停 title 展示全文 -->
                <template v-if="column.key === 'content'">
                  <div
                    class="notify-admin__content line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-text-primary"
                    :title="rowData.content">
                    <template v-for="(seg, idx) in renderNotifySegments(rowData.content)" :key="idx">
                      <a v-if="seg.url" :href="seg.url" :target="isExternalUrl(seg.url) ? '_blank' : '_self'"
                        :rel="LINK_REL" :referrerpolicy="LINK_REFERRER_POLICY"
                        class="notify-admin__content-link font-medium text-primary hover:underline"
                        @click="onInlineLink($event, seg.url)">{{ seg.text }}</a>
                      <template v-else>{{ seg.text }}</template>
                    </template>
                  </div>
                </template>

                <!-- 级别 -->
                <template v-else-if="column.key === 'level'">
                  <el-tag :type="levelTag(rowData.level)" size="default" effect="light">
                    {{ levelText(rowData.level) }}
                  </el-tag>
                </template>

                <!-- 状态 -->
                <template v-else-if="column.key === 'status'">
                  <el-tag :type="statusTag(rowData.status)" size="default" effect="plain">
                    {{ statusText(rowData.status) }}
                  </el-tag>
                </template>

                <!-- 目标 -->
                <template v-else-if="column.key === 'target'">
                  <span class="text-sm text-text-placeholder">{{ targetText(rowData) }}</span>
                </template>

                <!-- 发布时间 -->
                <template v-else-if="column.key === 'publish_at'">
                  <TimeText :time="rowData.publish_at" />
                </template>

                <!-- 操作 -->
                <template v-else-if="column.key === 'actions'">
                  <el-button size="default" @click="openEdit(rowData)">{{ t('message.editNotify') }}</el-button>
                  <el-button v-if="rowData.status !== NotifyStatusEnum.REVOKED" size="default" type="warning" @click="revoke(rowData)">
                    {{ t('message.deleteNotify') }}
                  </el-button>
                </template>

                <!-- 其余简单列（id / title） -->
                <template v-else>
                  <span class="text-sm text-text-primary">{{ rowData[column.dataKey as keyof NotifyAdminItem] }}</span>
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty :description="t('message.noNotifyRecord')" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="notify-admin__pagination"
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

    <el-dialog v-model="dialogVisible"
      :title="editingId ? t('message.notifyDialogEdit') : t('message.notifyDialogCreate')" width="560px"
      class="notify-admin__dialog">
      <el-form :model="form" label-width="90px" class="notify-admin__form">
        <el-form-item :label="t('message.notifyFormTitle')" required>
          <el-input v-model="form.title" size="default" :placeholder="t('message.notifyFormTitle')" />
        </el-form-item>
        <el-form-item :label="t('message.notifyFormContent')" required>
          <el-input v-model="form.content" type="textarea" :rows="4" size="default"
            :placeholder="t('message.notifyFormContent')" />
        </el-form-item>
        <el-form-item :label="t('message.notifyFormLevel')">
          <!-- 后端枚举是整数，选项 value 必须绑定枚举值而非字符串字面量 -->
          <el-select v-model="form.level" size="default" class="w-full">
            <el-option :label="t('message.notifyLevelNormal')" :value="NotifyLevelEnum.NORMAL" />
            <el-option :label="t('message.notifyLevelImportant')" :value="NotifyLevelEnum.IMPORTANT" />
            <el-option :label="t('message.notifyLevelUrgent')" :value="NotifyLevelEnum.URGENT" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('message.notifyFormTargetType')">
          <el-select v-model="form.target_type" size="default" class="w-full">
            <el-option :label="t('message.notifyTargetAll')" :value="NotifyTargetTypeEnum.ALL" />
            <el-option :label="t('message.notifyTargetRole')" :value="NotifyTargetTypeEnum.ROLE" />
            <el-option :label="t('message.notifyTargetLevel')" :value="NotifyTargetTypeEnum.LEVEL" />
            <el-option :label="t('message.notifyTargetVip')" :value="NotifyTargetTypeEnum.VIP" />
            <el-option :label="t('message.notifyTargetCustom')" :value="NotifyTargetTypeEnum.CUSTOM" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('message.notifyFormTargetValue')">
          <el-input v-model="form.target_value" size="default"
            :placeholder="t('message.notifyTargetValuePlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('message.notifyFormJumpUrl')">
          <el-input v-model="form.jump_url" size="default" :placeholder="t('message.notifyJumpPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('message.notifyFormPublishNow')">
          <el-switch v-model="form.publish_now" size="default" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="default" @click="dialogVisible = false">{{ t('message.off') }}</el-button>
        <el-button type="primary" size="default" :loading="submitting" @click="submit">
          {{ t('message.on') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LINK_REL, LINK_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'
import { useI18n } from 'vue-i18n'
import { TableV2FixedDir, type Column } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import biliMessage from '@/utils/message'
import { isExternalUrl, renderNotifySegments } from '@/utils/notifyContent'
import { jumpToTarget } from '@/utils/routeJump'

const { t } = useI18n()
const router = useRouter()
import {
  fetchAdminNotifyList,
  createNotify,
  updateNotify,
  revokeNotify,
  NotifyLevelEnum,
  NotifyStatusEnum,
  NotifyTargetTypeEnum,
  type NotifyAdminItem,
  type NotifyLevel,
  type NotifyStatus,
  type NotifyTargetType,
  type CreateNotifyPayload,
  type UpdateNotifyPayload
} from '@/api/notify/message-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'

const items = ref<NotifyAdminItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20

// el-table-v2 列定义。
// 注意：el-table-v2 只有在存在 fixed 列时，body 宽度才会取 max(容器宽度, 列宽总和)，
// 列宽总和超出容器才会出现横向滚动条；无任何 fixed 列时列会被压缩进容器、永不横向滚动。
// 这里标题/正文用 flexGrow 自动分配剩余宽度，操作列固定右侧，窄容器下自动出现横向滚动。
const notifyColumns: Column<NotifyAdminItem>[] = [
  { key: 'id', title: t('message.colId'), width: 90, minWidth: 90, dataKey: 'id' },
  { key: 'title', title: t('message.colTitle'), width: 220, minWidth: 220, dataKey: 'title', flexGrow: 1 },
  { key: 'content', title: t('message.colContent'), width: 480, minWidth: 480, flexGrow: 2 },
  { key: 'level', title: t('message.colLevel'), width: 110, minWidth: 110 },
  { key: 'status', title: t('message.colStatus'), width: 120, minWidth: 120 },
  { key: 'target', title: t('message.colTarget'), width: 160, minWidth: 160 },
  { key: 'publish_at', title: t('message.colPublishTime'), width: 180, minWidth: 180 },
  { key: 'actions', title: t('message.colAction'), width: 230, minWidth: 230, fixed: TableV2FixedDir.RIGHT }
]

const dialogVisible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<CreateNotifyPayload & { target_type: NotifyTargetType }>({
  title: '',
  content: '',
  jump_url: null,
  target_type: NotifyTargetTypeEnum.ALL,
  target_value: '',
  level: NotifyLevelEnum.NORMAL,
  publish_now: true
})

// 表格高度自适应：数据不满一屏时收缩到「表头 + 行数 + 分页」的实际内容高度，
// 让表格底部滚动条紧跟最后一行数据，而不是固定在固定高度容器的底部空白处
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 56
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

async function load() {
  loading.value = true
  const list = await fetchAdminNotifyList({ page: page.value, size: pageSize })
  items.value = list.items ?? []
  total.value = list.total ?? 0
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

function resetForm() {
  form.title = ''
  form.content = ''
  form.jump_url = null
  form.target_type = NotifyTargetTypeEnum.ALL
  form.target_value = ''
  form.level = NotifyLevelEnum.NORMAL
  form.publish_now = true
}

function openCreate() {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: NotifyAdminItem) {
  editingId.value = row.id
  form.title = row.title
  form.content = row.content
  form.jump_url = row.jump_url ?? null
  form.target_type = row.target_type
  form.target_value = row.target_value ?? ''
  form.level = row.level
  form.publish_now = row.status === NotifyStatusEnum.PUBLISHED
  dialogVisible.value = true
}

async function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    biliMessage.warning(t('message.notifyTitleRequired'))
    return
  }
  submitting.value = true
  const payload: CreateNotifyPayload = {
    title: form.title.trim(),
    content: form.content.trim(),
    jump_url: form.jump_url || null,
    target_type: form.target_type,
    target_value: form.target_value || null,
    level: form.level,
    publish_now: form.publish_now
  }
  let res: NotifyAdminItem | null = null
  if (editingId.value != null) {
    const upd: UpdateNotifyPayload = {
      title: payload.title,
      content: payload.content,
      jump_url: payload.jump_url,
      target_type: payload.target_type,
      target_value: payload.target_value,
      level: payload.level,
      status: payload.publish_now ? NotifyStatusEnum.PUBLISHED : NotifyStatusEnum.DRAFT
    }
    res = await updateNotify(editingId.value, upd, {
      showSuccessToast: true,
      successMessage: t('message.notifyUpdated'),
    })
  } else {
    res = await createNotify(payload, {
      showSuccessToast: true,
      successMessage: t('message.notifyPublished'),
    })
  }
  submitting.value = false
  if (res) {
    dialogVisible.value = false
    await load()
  }
}

async function revoke(row: NotifyAdminItem) {
  const ok = await revokeNotify(row.id, {
    showSuccessToast: true,
    successMessage: t('message.notifyRevoked'),
  })
  if (ok) await load()
}

function levelTag(level: NotifyLevel | undefined): 'info' | 'warning' | 'danger' {
  if (level === NotifyLevelEnum.URGENT) return 'danger'
  if (level === NotifyLevelEnum.IMPORTANT) return 'warning'
  return 'info'
}
function levelText(level: NotifyLevel | undefined): string {
  if (level === NotifyLevelEnum.URGENT) return t('message.notifyLevelUrgent')
  if (level === NotifyLevelEnum.IMPORTANT) return t('message.notifyLevelImportant')
  return t('message.notifyLevelNormal')
}
function statusTag(status: NotifyStatus | undefined): 'info' | 'success' | 'danger' {
  if (status === NotifyStatusEnum.PUBLISHED) return 'success'
  if (status === NotifyStatusEnum.REVOKED) return 'danger'
  return 'info'
}
function statusText(status: NotifyStatus | undefined): string {
  if (status === NotifyStatusEnum.PUBLISHED) return t('message.notifyPublished')
  if (status === NotifyStatusEnum.REVOKED) return t('message.notifyRevoked')
  return t('message.notifyFormDraft')
}
function targetText(row: NotifyAdminItem): string {
  const map: Record<NotifyTargetType, string> = {
    [NotifyTargetTypeEnum.ALL]: t('message.notifyTargetAll'),
    [NotifyTargetTypeEnum.ROLE]: t('message.notifyTargetRole'),
    [NotifyTargetTypeEnum.LEVEL]: t('message.notifyTargetLevel'),
    [NotifyTargetTypeEnum.VIP]: t('message.notifyTargetVip'),
    [NotifyTargetTypeEnum.CUSTOM]: t('message.notifyTargetCustom')
  }
  const prefix = map[row.target_type] ?? String(row.target_type)
  return row.target_value ? `${prefix}:${row.target_value}` : prefix
}

/** 正文中点击内联链接：站内目标（route: 路由名 / 存量路径）走 SPA 路由，外链交给浏览器新开标签。 */
function onInlineLink(ev: MouseEvent, url: string) {
  if (!isExternalUrl(url)) {
    ev.preventDefault()
    jumpToTarget(router, url)
  }
}

onMounted(load)
</script>
