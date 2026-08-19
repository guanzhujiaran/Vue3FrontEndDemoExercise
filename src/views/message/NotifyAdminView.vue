<template>
  <div class="notify-admin">
    <div class="notify-admin__toolbar mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold text-msg-text-active">{{ t('message.notifyAdminTitle') }}</h2>
      <el-button
        type="primary"
        size="default"
        class="notify-admin__create"
        @click="openCreate"
      >
        {{ t('message.publishNotify') }}
      </el-button>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="items.length === 0" :text="t('message.noNotifyRecord')" />
      <el-table v-else :data="items" class="notify-admin__table" border stripe>
        <el-table-column prop="id" :label="t('message.colId')" width="80" />
        <el-table-column prop="title" :label="t('message.colTitle')" min-width="180" show-overflow-tooltip />
        <el-table-column :label="t('message.colLevel')" width="100">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.level)" size="default" effect="light">
              {{ levelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('message.colStatus')" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="default" effect="plain">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('message.colTarget')" width="140">
          <template #default="{ row }">
            <span class="text-sm text-msg-muted">{{ targetText(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('message.colPublishTime')" width="170">
          <template #default="{ row }">
            <TimeText :time="row.publish_at" />
          </template>
        </el-table-column>
        <el-table-column :label="t('message.colAction')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="default" @click="openEdit(row)">{{ t('message.editNotify') }}</el-button>
            <el-button
              v-if="row.status !== 'revoked'"
              size="default"
              type="warning"
              @click="revoke(row)"
            >
              {{ t('message.deleteNotify') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <PaginationBar
        v-if="total > pageSize"
        class="notify-admin__pagination"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @update:current-page="onPageChange"
      />
    </LoadingWrap>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? t('message.notifyDialogEdit') : t('message.notifyDialogCreate')"
      width="560px"
      class="notify-admin__dialog"
    >
      <el-form :model="form" label-width="90px" class="notify-admin__form">
        <el-form-item :label="t('message.notifyFormTitle')" required>
          <el-input v-model="form.title" size="default" :placeholder="t('message.notifyFormTitle')" />
        </el-form-item>
        <el-form-item :label="t('message.notifyFormContent')" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            size="default"
            :placeholder="t('message.notifyFormContent')"
          />
        </el-form-item>
        <el-form-item :label="t('message.notifyFormLevel')">
          <el-select v-model="form.level" size="default" class="w-full">
            <el-option :label="t('message.notifyLevelNormal')" value="normal" />
            <el-option :label="t('message.notifyLevelImportant')" value="important" />
            <el-option :label="t('message.notifyLevelUrgent')" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('message.notifyFormTargetType')">
          <el-select v-model="form.target_type" size="default" class="w-full">
            <el-option :label="t('message.notifyTargetAll')" value="all" />
            <el-option :label="t('message.notifyTargetRole')" value="role" />
            <el-option :label="t('message.notifyTargetLevel')" value="level" />
            <el-option :label="t('message.notifyTargetVip')" value="vip" />
            <el-option :label="t('message.notifyTargetCustom')" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('message.notifyFormTargetValue')">
          <el-input
            v-model="form.target_value"
            size="default"
            :placeholder="t('message.notifyTargetValuePlaceholder')"
          />
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
import { useI18n } from 'vue-i18n'
import biliMessage from '@/utils/message'

const { t } = useI18n()
import {
  fetchAdminNotifyList,
  createNotify,
  updateNotify,
  revokeNotify,
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

const dialogVisible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<CreateNotifyPayload & { target_type: NotifyTargetType }>({
  title: '',
  content: '',
  jump_url: null,
  target_type: 'all',
  target_value: '',
  level: 'normal',
  publish_now: true
})

async function load() {
  loading.value = true
  const list = await fetchAdminNotifyList({ page: page.value, size: pageSize })
  items.value = list.items
  total.value = list.total
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
  form.target_type = 'all'
  form.target_value = ''
  form.level = 'normal'
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
  form.publish_now = row.status === 'published'
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
      status: payload.publish_now ? 'published' : 'draft'
    }
    res = await updateNotify(editingId.value, upd)
  } else {
    res = await createNotify(payload)
  }
  submitting.value = false
  if (res) {
    biliMessage.success(editingId.value != null ? t('message.notifyUpdated') : t('message.notifyPublished'))
    dialogVisible.value = false
    await load()
  }
}

async function revoke(row: NotifyAdminItem) {
  const ok = await revokeNotify(row.id)
  if (ok) {
    biliMessage.success(t('message.notifyRevoked'))
    await load()
  }
}

function levelTag(level: NotifyLevel): 'info' | 'warning' | 'danger' {
  if (level === 'urgent') return 'danger'
  if (level === 'important') return 'warning'
  return 'info'
}
function levelText(level: NotifyLevel): string {
  if (level === 'urgent') return t('message.notifyLevelUrgent')
  if (level === 'important') return t('message.notifyLevelImportant')
  return t('message.notifyLevelNormal')
}
function statusTag(status: NotifyStatus): 'info' | 'success' | 'danger' {
  if (status === 'published') return 'success'
  if (status === 'revoked') return 'danger'
  return 'info'
}
function statusText(status: NotifyStatus): string {
  if (status === 'published') return t('message.notifyPublished')
  if (status === 'revoked') return t('message.notifyRevoked')
  return t('message.notifyFormDraft')
}
function targetText(row: NotifyAdminItem): string {
  const map: Record<NotifyTargetType, string> = {
    all: t('message.notifyTargetAll'),
    role: t('message.notifyTargetRole'),
    level: t('message.notifyTargetLevel'),
    vip: t('message.notifyTargetVip'),
    custom: t('message.notifyTargetCustom')
  }
  const prefix = map[row.target_type] ?? row.target_type
  return row.target_value ? `${prefix}:${row.target_value}` : prefix
}

onMounted(load)
</script>
