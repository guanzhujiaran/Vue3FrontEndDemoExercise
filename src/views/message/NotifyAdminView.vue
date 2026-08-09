<template>
  <div class="notify-admin">
    <div class="notify-admin__toolbar mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold text-msg-text-active">通知管理（管理员）</h2>
      <el-button
        type="primary"
        size="default"
        class="notify-admin__create"
        @click="openCreate"
      >
        发布通知
      </el-button>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="items.length === 0" text="暂无通知记录" />
      <el-table v-else :data="items" class="notify-admin__table" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.level)" size="default" effect="light">
              {{ levelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="default" effect="plain">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标" width="140">
          <template #default="{ row }">
            <span class="text-sm text-msg-muted">{{ targetText(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">
            <TimeText :time="row.publish_at" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="default" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status !== 'revoked'"
              size="default"
              type="warning"
              @click="revoke(row)"
            >
              删除
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
      :title="editingId ? '编辑通知' : '发布通知'"
      width="560px"
      class="notify-admin__dialog"
    >
      <el-form :model="form" label-width="90px" class="notify-admin__form">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" size="default" placeholder="通知标题" />
        </el-form-item>
        <el-form-item label="正文" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            size="default"
            placeholder="通知正文"
          />
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="form.level" size="default" class="w-full">
            <el-option label="普通" value="normal" />
            <el-option label="重要" value="important" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标类型">
          <el-select v-model="form.target_type" size="default" class="w-full">
            <el-option label="全部用户" value="all" />
            <el-option label="按角色" value="role" />
            <el-option label="按等级" value="level" />
            <el-option label="按 VIP" value="vip" />
            <el-option label="自定义 mid" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标值">
          <el-input
            v-model="form.target_value"
            size="default"
            placeholder="role 填角色名；level 填最低等级；custom 填逗号分隔 mid"
          />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.jump_url" size="default" placeholder="可选" />
        </el-form-item>
        <el-form-item label="立即发布">
          <el-switch v-model="form.publish_now" size="default" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="default" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="default" :loading="submitting" @click="submit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import biliMessage from '@/utils/message'
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
    biliMessage.warning('标题与正文必填')
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
    biliMessage.success(editingId.value != null ? '已更新' : '已发布')
    dialogVisible.value = false
    await load()
  }
}

async function revoke(row: NotifyAdminItem) {
  const ok = await revokeNotify(row.id)
  if (ok) {
    biliMessage.success('已撤回')
    await load()
  }
}

function levelTag(level: NotifyLevel): 'info' | 'warning' | 'danger' {
  if (level === 'urgent') return 'danger'
  if (level === 'important') return 'warning'
  return 'info'
}
function levelText(level: NotifyLevel): string {
  return level === 'urgent' ? '紧急' : level === 'important' ? '重要' : '普通'
}
function statusTag(status: NotifyStatus): 'info' | 'success' | 'danger' {
  if (status === 'published') return 'success'
  if (status === 'revoked') return 'danger'
  return 'info'
}
function statusText(status: NotifyStatus): string {
  return status === 'published' ? '已发布' : status === 'revoked' ? '已撤回' : '草稿'
}
function targetText(row: NotifyAdminItem): string {
  const map: Record<NotifyTargetType, string> = {
    all: '全部',
    role: '角色',
    level: '等级',
    vip: 'VIP',
    custom: '自定义'
  }
  const prefix = map[row.target_type] ?? row.target_type
  return row.target_value ? `${prefix}:${row.target_value}` : prefix
}

onMounted(load)
</script>
