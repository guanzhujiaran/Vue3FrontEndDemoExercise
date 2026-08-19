<template>
  <div class="topic-square h-full flex flex-col">
    <!-- 筛选栏 -->
    <div class="topic-square__toolbar flex items-center justify-between gap-4 mb-4">
      <div class="topic-square__filters flex items-center gap-2">
        <el-radio-group v-model="viewMode" size="default" @change="onViewChange">
          <el-radio-button value="all">全部话题</el-radio-button>
          <el-radio-button value="hot">热门话题</el-radio-button>
          <el-radio-button value="mine">我创建的</el-radio-button>
        </el-radio-group>
      </div>
      <el-button
        class="topic-square__create-btn"
        type="primary"
        size="default"
        :icon="Plus"
        @click="openCreateDialog"
      >
        创建话题
      </el-button>
    </div>

    <LoadingWrap :loading="loading" class="topic-square__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="!loading && items.length === 0" :text="emptyText" />
      <div v-else class="topic-square__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="item in items"
          :key="item.topicId"
          class="topic-square__card bg-msg-card hover:bg-msg-card-hover rounded-lg border border-msg-border p-4 transition-colors cursor-pointer"
          @click="openTopic(item)"
        >
          <!-- 封面 -->
          <div class="topic-square__cover aspect-video rounded-md overflow-hidden mb-3 bg-msg-sidebar">
            <img
              v-if="item.topicCover"
              :src="item.topicCover"
              class="w-full h-full object-cover"
              loading="lazy"
              :alt="item.topicName"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-msg-muted text-2xl">
              #
            </div>
          </div>
          <!-- 信息 -->
          <div class="topic-square__info">
            <div class="flex items-center gap-2">
              <span class="topic-square__name text-sm font-bold text-msg-text-active truncate">
                #{{ item.topicName }}#
              </span>
              <el-tag v-if="isMineMode" size="default" :type="auditTagType(item)" effect="light">
                {{ auditTagText(item) }}
              </el-tag>
              <el-tag v-else-if="item.isHot" size="default" type="danger">热门</el-tag>
            </div>
            <div class="topic-square__meta flex items-center gap-3 mt-2 text-xs text-msg-muted">
              <span>{{ formatNum(item.dynCount) }} 条动态</span>
              <span>{{ formatNum(item.viewCount) }} 浏览</span>
            </div>
            <el-text
              v-if="isMineMode && item.auditStatus === 'rejected' && item.auditRejectReason"
              class="topic-square__reject-reason mt-1 block text-xs text-danger"
              tag="p"
            >
              驳回原因：{{ item.auditRejectReason }}
            </el-text>
          </div>
        </div>
      </div>
      <!-- 分页 -->
      <div class="topic-square__pagination flex justify-center py-4">
        <el-pagination
          v-if="total > pageSize"
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          size="default"
          @current-change="onPageChange"
        />
      </div>
    </LoadingWrap>

    <!-- 创建话题弹窗 -->
    <el-dialog
      v-model="createVisible"
      class="topic-create-dialog"
      title="创建话题"
      width="480"
      :close-on-click-modal="false"
    >
      <el-form
        class="topic-create-dialog__form"
        label-position="top"
        :model="createForm"
        :rules="createRules"
        ref="createFormRef"
      >
        <el-form-item label="话题名称" prop="topicName">
          <el-input
            v-model="createForm.topicName"
            class="topic-create-dialog__name"
            maxlength="30"
            show-word-limit
            placeholder="请输入 1-30 字话题名称"
          />
        </el-form-item>
        <el-form-item label="话题描述" prop="topicDesc">
          <el-input
            v-model="createForm.topicDesc"
            class="topic-create-dialog__desc"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请输入话题描述（选填，≤200 字）"
          />
        </el-form-item>
        <el-form-item label="封面图 URL" prop="topicCover">
          <el-input
            v-model="createForm.topicCover"
            class="topic-create-dialog__cover"
            placeholder="请输入图片 http/https 链接（选填）"
          />
        </el-form-item>
        <el-text class="topic-create-dialog__tip text-xs text-msg-muted" tag="p">
          创建后将进入审核，审核通过后才会公开展示。
        </el-text>
      </el-form>
      <template #footer>
        <div class="topic-create-dialog__footer flex justify-end gap-2">
          <el-button size="default" @click="createVisible = false">取消</el-button>
          <el-button type="primary" size="default" :loading="createSubmitting" @click="submitCreate">
            提交
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import {
  fetchTopicSquare,
  fetchMyTopics,
  createTopic,
} from '@/api/notify/moment-api'
import type { MomentTopicInfo, MomentTopicMineItem } from '@/api/notify/moment-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

const router = useRouter()

type MineItem = MomentTopicMineItem & { isHot?: number; dynCount?: number; viewCount?: number }

const viewMode = ref<'all' | 'hot' | 'mine'>('all')
const items = ref<Array<MomentTopicInfo | MineItem>>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 20

const createVisible = ref(false)
const createSubmitting = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({ topicName: '', topicDesc: '', topicCover: '' })
const createRules: FormRules = {
  topicName: [{ required: true, message: '请输入话题名称', trigger: 'blur' }],
}

const isMineMode = computed(() => viewMode.value === 'mine')
const emptyText = computed(() => (isMineMode.value ? '你还没有创建过话题' : '暂无话题'))

onMounted(loadFirst)

async function loadFirst() {
  page.value = 1
  loading.value = true
  if (viewMode.value === 'mine') {
    const res = await fetchMyTopics({ page: 1, page_size: pageSize })
    items.value = res.items || []
    total.value = items.value.length
  } else {
    const res = await fetchTopicSquare({ page: 1, page_size: pageSize, hot_only: viewMode.value === 'hot' || undefined })
    items.value = res.items || []
    total.value = (res as any).total ?? 0
  }
  loading.value = false
}

async function onPageChange(p: number) {
  page.value = p
  loading.value = true
  if (viewMode.value === 'mine') {
    const res = await fetchMyTopics({ page: p, page_size: pageSize })
    items.value = res.items || []
  } else {
    const res = await fetchTopicSquare({ page: p, page_size: pageSize, hot_only: viewMode.value === 'hot' || undefined })
    items.value = res.items || []
  }
  loading.value = false
}

function onViewChange() {
  loadFirst()
}

function openTopic(item: MomentTopicInfo | MineItem) {
  if (isMineMode.value && item.auditStatus !== 'normal') return
  router.push({ name: 'MOMENT_TOPIC_FEED', params: { topicId: String(item.topicId) }, query: { topicName: item.topicName } })
}

function formatNum(n?: number | null): string {
  if (n == null) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}

function auditTagType(item: MineItem) {
  if (item.auditStatus === 'normal') return 'success'
  if (item.auditStatus === 'rejected') return 'danger'
  return 'warning'
}

function auditTagText(item: MineItem) {
  if (item.auditStatus === 'normal') return '已通过'
  if (item.auditStatus === 'rejected') return '已驳回'
  return '待审核'
}

function openCreateDialog() {
  createForm.topicName = ''
  createForm.topicDesc = ''
  createForm.topicCover = ''
  createVisible.value = true
}

async function submitCreate() {
  await createFormRef.value?.validate()
  createSubmitting.value = true
  try {
    const res = await createTopic({
      topicName: createForm.topicName,
      topicDesc: createForm.topicDesc || undefined,
      topicCover: createForm.topicCover || undefined,
    })
    createSubmitting.value = false
    if (res) {
      createVisible.value = false
      ElMessage.success('话题已提交审核，通过后公开展示')
      if (viewMode.value === 'mine') loadFirst()
    }
  } catch {
    createSubmitting.value = false
  }
}
</script>
