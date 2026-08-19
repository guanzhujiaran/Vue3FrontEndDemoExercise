<template>
  <div class="moment-audit-list h-full flex flex-col">
    <!-- 工具栏 -->
    <div class="moment-audit-list__toolbar mb-4 flex items-center justify-between">
      <h2 class="moment-audit-list__title text-base font-bold text-msg-text-active">动态审核队列</h2>
      <el-button
        class="moment-audit-list__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="load"
      >
        刷新
      </el-button>
    </div>

    <LoadingWrap :loading="loading" class="moment-audit-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="!loading && items.length === 0" text="暂无待审核动态" />
      <div v-else class="moment-audit-list__table-wrap">
        <el-table
          :data="items"
          class="moment-audit-list__table w-full"
          size="default"
          stripe
          :header-cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text)' }"
          :cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text-active)' }"
        >
          <el-table-column prop="dynIdStr" label="动态 ID" width="160" />
          <el-table-column label="发布者" width="160">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-avatar :size="28" :src="row.authorFace || BiliImg.face.noface" />
                <span class="truncate text-sm">{{ row.authorName || '未知' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="contentText" label="内容预览" min-width="200" show-overflow-tooltip />
          <el-table-column label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="default" :type="row.dynType === 'FORWARD' ? 'info' : ''">
                {{ row.dynType === 'FORWARD' ? '转发' : '文字' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="发布时间" width="170">
            <template #default="{ row }">
              <TimeText :time="row.pubTime || row.createdTime" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="default" type="warning">待审核</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220">
            <template #default="{ row }">
              <div class="flex gap-2">
                <el-button
                  size="default"
                  type="primary"
                  :loading="approvingId === row.dynIdStr"
                  @click="handleApprove(row)"
                >
                  通过
                </el-button>
                <el-button
                  size="default"
                  type="danger"
                  :loading="rejectingId === row.dynIdStr"
                  @click="handleReject(row)"
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
          class="moment-audit-list__pagination mt-4"
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
import { fetchAuditList, auditApprove, auditReject } from '@/api/notify/moment-api'
import type { MomentAuditItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import biliMessage from '@/utils/message'

const items = ref<MomentAuditItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const approvingId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)

onMounted(load)

async function load() {
  loading.value = true
  const res = await fetchAuditList({ page_num: page.value, page_size: pageSize })
  items.value = res.items || []
  total.value = res.total || 0
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

async function handleApprove(item: MomentAuditItem) {
  approvingId.value = item.dynIdStr
  const res = await auditApprove(item.dynIdStr, '通过')
  approvingId.value = null
  if (res) {
    items.value = items.value.filter((i) => i.dynIdStr !== item.dynIdStr)
    total.value = Math.max(0, total.value - 1)
    biliMessage.success('已通过')
  }
}

async function handleReject(item: MomentAuditItem) {
  try {
    const { value: reason } = await import('element-plus').then((m) =>
      m.ElMessageBox.prompt('请输入驳回原因', '驳回动态', { inputType: 'textarea' })
    )
    if (reason) {
      rejectingId.value = item.dynIdStr
      const res = await auditReject(item.dynIdStr, reason, '驳回')
      rejectingId.value = null
      if (res) {
        items.value = items.value.filter((i) => i.dynIdStr !== item.dynIdStr)
        total.value = Math.max(0, total.value - 1)
        biliMessage.success('已驳回')
      }
    }
  } catch {
    // 用户取消
  }
  }

  /** 管理员删除动态（2.22.1）：二次确认后软删任意动态，成功从列表移除 */
  </script>
