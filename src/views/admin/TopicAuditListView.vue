<template>
  <div class="topic-audit-list h-full flex flex-col">
    <!-- 工具栏 -->
    <div class="topic-audit-list__toolbar mb-4 flex items-center justify-between">
      <h2 class="topic-audit-list__title text-base font-bold text-text-primary">话题审核队列</h2>
      <el-button
        class="topic-audit-list__refresh-btn"
        size="default"
        :icon="Refresh"
        :loading="loading"
        @click="load"
      >
        刷新
      </el-button>
    </div>

    <LoadingWrap :loading="loading" class="topic-audit-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="!loading && items.length === 0" text="暂无待审核话题" />
      <div v-else class="topic-audit-list__table-wrap">
        <el-table
          :data="items"
          class="topic-audit-list__table w-full"
          size="default"
          stripe
          :header-cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text)' }"
          :cell-style="{ background: 'var(--color-msg-card)', color: 'var(--color-msg-text-active)' }"
        >
          <el-table-column prop="topicId" label="ID" width="120" />
          <el-table-column label="创建者" width="160">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <el-avatar :size="28" :src="row.creatorFace || BiliImg.face.noface" />
                <span class="truncate text-sm">{{ row.creatorName || row.creatorMid || '未知' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="话题名称" min-width="160">
            <template #default="{ row }">
              <span class="truncate text-sm font-bold">#{{ row.topicName }}#</span>
            </template>
          </el-table-column>
          <el-table-column label="封面" width="90">
            <template #default="{ row }">
              <el-avatar
                v-if="row.topicCover"
                :size="48"
                :src="row.topicCover"
                shape="square"
              />
              <div v-else class="w-12 h-12 rounded bg-bg flex items-center justify-center text-text-placeholder text-lg">
                #
              </div>
            </template>
          </el-table-column>
          <el-table-column label="描述" min-width="180">
            <template #default="{ row }">
              <span class="block truncate text-sm text-text-secondary">{{ row.topicDesc || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">
              <TimeText :time="row.createdAt" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <div class="flex gap-2">
                <el-button
                  size="default"
                  type="primary"
                  :loading="approvingId === row.topicId"
                  @click="handleApprove(row)"
                >
                  通过
                </el-button>
                <el-button
                  size="default"
                  type="danger"
                  :loading="rejectingId === row.topicId"
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
          class="topic-audit-list__pagination mt-4"
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
  fetchTopicAuditList,
  topicAuditApprove,
  topicAuditReject,
} from '@/api/notify/moment-api'
import type { MomentTopicAuditItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import { ElMessage, ElMessageBox } from 'element-plus'

const items = ref<MomentTopicAuditItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const approvingId = ref<number | null>(null)
const rejectingId = ref<number | null>(null)

onMounted(load)

async function load() {
  loading.value = true
  const res = await fetchTopicAuditList({ page_num: page.value, page_size: pageSize })
  items.value = res.items || []
  total.value = res.total || 0
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

async function handleApprove(item: MomentTopicAuditItem) {
  approvingId.value = item.topicId
  const res = await topicAuditApprove(item.topicId, '通过')
  approvingId.value = null
  if (res) {
    items.value = items.value.filter((i) => i.topicId !== item.topicId)
    total.value = Math.max(0, total.value - 1)
    ElMessage.success('已通过，话题已公开')
  }
}

async function handleReject(item: MomentTopicAuditItem) {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入驳回原因', '驳回话题', {
      inputType: 'textarea',
    })
    if (reason) {
      rejectingId.value = item.topicId
      const res = await topicAuditReject(item.topicId, reason, '驳回')
      rejectingId.value = null
      if (res) {
        items.value = items.value.filter((i) => i.topicId !== item.topicId)
        total.value = Math.max(0, total.value - 1)
        ElMessage.success('已驳回')
      }
    }
  } catch {
    // 用户取消
  }
}
</script>
