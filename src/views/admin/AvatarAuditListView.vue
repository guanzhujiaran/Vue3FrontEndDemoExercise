<template>
  <div class="avatar-audit-list flex flex-col gap-4">
    <!-- 工具栏 -->
    <div class="avatar-audit-list__toolbar flex items-center justify-between">
      <h2 class="avatar-audit-list__title text-lg font-bold text-text-primary">头像更换审核队列</h2>
    </div>

    <div class="avatar-audit-list__table-bar mb-2 flex items-center justify-end">
      <el-button
        class="avatar-audit-list__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="load"
      >
        刷新
      </el-button>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <EmptyState v-if="!loading && items.length === 0" text="暂无待审核头像" />
      <!-- 父容器固定高度，由 AutoResizer 自动测量并传给表格 width/height；滚动条落在表格内部，不依赖外侧布局滚动 -->
      <div v-else class="avatar-audit-list__table h-[calc(100vh-320px)] min-h-105">
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
              row-key="pk"
              fixed
            >
              <template #header-cell="{ column }">
                <span class="avatar-audit-list__th">{{ column.title }}</span>
              </template>

              <template #cell="{ column, rowData }">
                <!-- 申请者 -->
                <template v-if="column.key === 'applicant'">
                  <div class="flex items-center gap-2">
                    <el-avatar :size="28" :src="rowData.oldAvatar || BiliImg.face.noface" />
                    <span class="truncate text-sm">{{ rowData.authorName || rowData.mid || '未知' }}</span>
                  </div>
                </template>

                <!-- 旧头像 -->
                <template v-else-if="column.key === 'oldAvatar'">
                  <el-avatar :size="48" :src="rowData.oldAvatar || BiliImg.face.noface" shape="square" />
                </template>

                <!-- 新头像 -->
                <template v-else-if="column.key === 'newAvatar'">
                  <el-avatar :size="48" :src="rowData.newAvatar || BiliImg.face.noface" shape="square" />
                </template>

                <!-- 提交时间 -->
                <template v-else-if="column.key === 'createdAt'">
                  <TimeText :time="rowData.createdAt" />
                </template>

                <!-- 状态 -->
                <template v-else-if="column.key === 'state'">
                  <el-tag size="default" effect="light" type="warning">待审核</el-tag>
                </template>

                <!-- 操作 -->
                <template v-else-if="column.key === 'action'">
                  <div class="flex gap-2">
                    <el-button
                      size="default"
                      type="primary"
                      :loading="approvingId === rowData.pk"
                      @click="handleApprove(rowData)"
                    >
                      通过
                    </el-button>
                    <el-button
                      size="default"
                      type="danger"
                      :loading="rejectingId === rowData.pk"
                      @click="handleReject(rowData)"
                    >
                      驳回
                    </el-button>
                  </div>
                </template>

                <!-- ID -->
                <template v-else>
                  <span class="text-sm text-text-primary">{{ rowData.pk }}</span>
                </template>
              </template>

              <template #empty>
                <div class="flex h-full items-center justify-center">
                  <el-empty description="暂无数据" :image-size="80" />
                </div>
              </template>

              <template #footer>
                <PaginationBar
                  class="avatar-audit-list__pagination"
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
import { ref, onMounted } from 'vue'
import { TableV2FixedDir, type Column } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  fetchAvatarAuditList,
  avatarAuditApprove,
  avatarAuditReject,
} from '@/api/notify/moment-api'
import type { AvatarAuditItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'

const items = ref<AvatarAuditItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const approvingId = ref<number | null>(null)
const rejectingId = ref<number | null>(null)

// el-table-v2 列定义（与 CommentAdminView 保持同构；操作列固定右侧）
const auditColumns: Column<AvatarAuditItem>[] = [
  { key: 'pk', title: 'ID', width: 90 },
  { key: 'applicant', title: '申请者', width: 180 },
  { key: 'oldAvatar', title: '旧头像', width: 100 },
  { key: 'newAvatar', title: '新头像', width: 100 },
  { key: 'createdAt', title: '提交时间', width: 180 },
  { key: 'state', title: '状态', width: 110 },
  { key: 'action', title: '操作', width: 200, fixed: TableV2FixedDir.RIGHT }
]

onMounted(load)

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
  const res = await fetchAvatarAuditList({ page_num: page.value, page_size: pageSize })
  items.value = res.items || []
  total.value = res.total || 0
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

async function handleApprove(item: AvatarAuditItem) {
  approvingId.value = item.pk
  const res = await avatarAuditApprove(item.pk, '通过')
  approvingId.value = null
  if (res) {
    items.value = items.value.filter((i) => i.pk !== item.pk)
    total.value = Math.max(0, total.value - 1)
    biliMessage.success('已通过，新头像已公开显示')
  }
}

async function handleReject(item: AvatarAuditItem) {
  try {
    const { value: reason } = await import('element-plus').then((m) =>
      m.ElMessageBox.prompt('请输入驳回原因', '驳回头像', { inputType: 'textarea' })
    )
    if (reason) {
      rejectingId.value = item.pk
      const res = await avatarAuditReject(item.pk, reason, '驳回')
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
