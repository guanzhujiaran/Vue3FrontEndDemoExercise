<template>
  <div class="folder-cover-audit-list h-full flex flex-col">
    <!-- 工具栏 -->
    <div class="folder-cover-audit-list__toolbar mb-4 flex items-center justify-between">
      <h2 class="folder-cover-audit-list__title text-base font-bold text-text-primary">收藏夹封面审核队列</h2>
      <el-button
        class="folder-cover-audit-list__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="load"
      >
        刷新
      </el-button>
    </div>

    <LoadingWrap :loading="loading" class="folder-cover-audit-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="!loading && items.length === 0" text="暂无待审核封面" />
      <div v-else class="folder-cover-audit-list__table-wrap">
        <el-table
          :data="items"
          class="folder-cover-audit-list__table w-full"
          size="default"
          stripe
          :header-cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text)' }"
          :cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text-active)' }"
        >
          <el-table-column prop="pk" label="ID" width="80" />
          <el-table-column label="申请者" width="160">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-avatar :size="28" :src="BiliImg.face.noface" />
                <span class="truncate text-sm">{{ row.authorName || row.mid || '未知' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="所属收藏夹" width="130">
            <template #default="{ row }">
              <span class="text-sm">{{ row.folderId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="旧封面" width="120">
            <template #default="{ row }">
              <el-image
                v-if="row.oldCover"
                class="folder-cover-audit-list__cover-preview w-24 h-13.5 rounded"
                :src="row.oldCover"
                fit="cover"
                :preview-src-list="[row.oldCover]"
                preview-teleported
              />
              <span v-else class="text-xs text-text-secondary">无</span>
            </template>
          </el-table-column>
          <el-table-column label="新封面" width="120">
            <template #default="{ row }">
              <el-image
                class="folder-cover-audit-list__cover-preview w-24 h-13.5 rounded"
                :src="row.newCover"
                fit="cover"
                :preview-src-list="[row.newCover]"
                preview-teleported
              />
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">
              <TimeText :time="row.createdAt" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="default" type="warning">待审核</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <div class="flex gap-2">
                <el-button
                  size="default"
                  type="primary"
                  :loading="approvingId === row.pk"
                  @click="handleApprove(row as FolderCoverAuditItem)"
                >
                  通过
                </el-button>
                <el-button
                  size="default"
                  type="danger"
                  :loading="rejectingId === row.pk"
                  @click="handleReject(row as FolderCoverAuditItem)"
                >
                  驳回
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <PaginationBar
          v-if="total > pageSize"
          class="folder-cover-audit-list__pagination mt-4"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @update:current-page="onPageChange"
        />
      </div>
    </LoadingWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import {
  fetchFolderCoverAuditList,
  folderCoverAuditApprove,
  folderCoverAuditReject,
} from '@/api/notify/moment-api'
import type { FolderCoverAuditItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'

const items = ref<FolderCoverAuditItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const approvingId = ref<number | null>(null)
const rejectingId = ref<number | null>(null)

onMounted(load)

async function load() {
  loading.value = true
  const res = await fetchFolderCoverAuditList({ page_num: page.value, page_size: pageSize })
  items.value = res.items || []
  total.value = res.total || 0
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

async function handleApprove(item: FolderCoverAuditItem) {
  approvingId.value = item.pk
  const res = await folderCoverAuditApprove(item.pk, '通过')
  approvingId.value = null
  if (res) {
    items.value = items.value.filter((i) => i.pk !== item.pk)
    total.value = Math.max(0, total.value - 1)
    biliMessage.success('已通过，新封面已公开显示')
  }
}

async function handleReject(item: FolderCoverAuditItem) {
  try {
    const { value: reason } = await import('element-plus').then((m) =>
      m.ElMessageBox.prompt('请输入驳回原因', '驳回封面', { inputType: 'textarea' })
    )
    if (reason) {
      rejectingId.value = item.pk
      const res = await folderCoverAuditReject(item.pk, reason, '驳回')
      rejectingId.value = null
      if (res) {
        items.value = items.value.filter((i) => i.pk !== item.pk)
        total.value = Math.max(0, total.value - 1)
        biliMessage.success('已驳回')
      }
    }
  } catch {
    // 用户取消
  }
}
</script>
