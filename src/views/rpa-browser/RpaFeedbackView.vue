<template>
  <FlexContainer class="rpa-feedback-view flex flex-col gap-4">
    <BiliPageHeader
      title="报错反馈"
      description="把运行中遇到的报错、异常或改进建议提交给服主，落库后会实时通知服主，便于及时定位问题、改进设计。同一能力也通过 MCP 暴露（工具 rpa_feedback_submit），你的 LLM 也能自动上报。"
    />

    <!-- 提交表单 -->
    <div class="rpa-feedback-view__form rounded-2xl bg-primary-light-9 border border-primary-light-8 p-4">
      <el-form label-position="top" class="rpa-feedback-view__form-inner flex flex-col gap-3">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <el-form-item label="分类" class="mb-0">
            <el-select v-model="form.category" class="w-full">
              <el-option label="缺陷 / 报错" value="bug" />
              <el-option label="改进建议" value="suggestion" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="标题" class="mb-0">
            <el-input
              v-model="form.title"
              maxlength="256"
              show-word-limit
              placeholder="一句话概括问题"
            />
          </el-form-item>
        </div>

        <el-form-item label="详细描述" class="mb-0">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="错误现象、期望行为、复现步骤等"
          />
        </el-form-item>

        <el-collapse class="rpa-feedback-view__context">
          <el-collapse-item title="错误上下文（可选，带上更便于定位）" name="context">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <el-form-item label="错误摘要" class="mb-0">
                <el-input v-model="form.error_message" placeholder="错误提示 / 异常摘要" />
              </el-form-item>
              <el-form-item label="页面 URL" class="mb-0">
                <el-input v-model="form.page_url" placeholder="出错时页面 URL" />
              </el-form-item>
              <el-form-item label="相关动作 id" class="mb-0">
                <el-input v-model="form.action_id" placeholder="可选" />
              </el-form-item>
              <el-form-item label="相关工作流 id" class="mb-0">
                <el-input v-model="form.workflow_id" placeholder="可选" />
              </el-form-item>
              <el-form-item label="相关运行 id" class="mb-0">
                <el-input v-model="form.run_id" placeholder="可选" />
              </el-form-item>
              <el-form-item label="相关浏览器 id" class="mb-0">
                <el-input v-model="form.browser_id" placeholder="可选" />
              </el-form-item>
            </div>
            <el-form-item label="错误详情 / 堆栈 / 失败步骤" class="mb-0">
              <el-input
                v-model="form.error_detail"
                type="textarea"
                :rows="3"
                placeholder="可选，完整错误信息 / 堆栈"
              />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>

        <div class="flex items-center gap-3">
          <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
            提交反馈
          </el-button>
          <span class="text-sm text-text-placeholder">提交后会实时通知服主</span>
        </div>
      </el-form>
    </div>

    <!-- 我的反馈 -->
    <div class="rpa-feedback-view__list rounded-2xl bg-primary-light-9 border border-primary-light-8 p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-text-secondary font-medium">我的反馈</span>
        <el-button size="small" :loading="loading" @click="loadList">刷新</el-button>
      </div>
      <el-table :data="items" size="small" stripe>
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            <span class="text-text-secondary">{{ formatTime(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="perPage"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadList"
        @size-change="onSizeChange"
      />
    </div>
  </FlexContainer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  submitFeedback,
  listFeedback,
  type FeedbackItem,
  type FeedbackSubmitPayload
} from '@/api/browser/feedback_api'

defineOptions({ name: 'RpaFeedbackView' })

const form = ref<FeedbackSubmitPayload>({
  category: 'bug',
  title: '',
  description: '',
  source: 'web',
  page_url: typeof window !== 'undefined' ? window.location.href : ''
})

const submitting = ref(false)
const loading = ref(false)
const items = ref<FeedbackItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(10)

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  resolved: '已处理',
  ignored: '已忽略'
}
const STATUS_TAG: Record<string, 'warning' | 'success' | 'info'> = {
  pending: 'warning',
  resolved: 'success',
  ignored: 'info'
}
const statusLabel = (s: string) => STATUS_LABELS[s] ?? s
const statusTagType = (s: string) => STATUS_TAG[s] ?? 'info'

const formatTime = (t?: string | null) => (t ? String(t).replace('T', ' ').slice(0, 19) : '-')

async function loadList() {
  loading.value = true
  const res = await listFeedback({ page: page.value, per_page: perPage.value })
  loading.value = false
  if (res.success && res.data) {
    items.value = res.data.items ?? []
    total.value = res.data.total ?? 0
  }
}

function onSizeChange() {
  page.value = 1
  loadList()
}

async function handleSubmit() {
  if (!form.value.title.trim() || !form.value.description.trim()) {
    ElMessage.warning('请填写标题与详细描述')
    return
  }
  submitting.value = true
  const payload: FeedbackSubmitPayload = { ...form.value }
  // 可选上下文：空值不提交，避免写入无意义字段
  for (const key of ['error_message', 'page_url', 'action_id', 'workflow_id', 'run_id', 'browser_id', 'error_detail'] as const) {
    if (!payload[key]) delete payload[key]
  }
  const res = await submitFeedback(payload)
  submitting.value = false
  if (res.success) {
    form.value.title = ''
    form.value.description = ''
    form.value.error_message = ''
    form.value.error_detail = ''
    ElMessage.success(
      res.data?.notified ? '已提交并通知服主' : '已提交（未配置推送，服主可在后台查看）'
    )
    page.value = 1
    loadList()
  }
}

onMounted(loadList)
</script>
