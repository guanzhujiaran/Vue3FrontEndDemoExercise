<template>
  <FlexContainer class="rpa-feedback-view flex flex-col gap-4">
    <BiliPageHeader
      title="报错反馈"
      description="把运行中遇到的报错、异常或改进建议提交给服主：先落库留档，再按服主配置做站外推送（邮件 / Webhook），便于及时定位问题、改进设计。未登录也可以提交（建议留联系方式）。同一能力也通过 MCP 暴露（工具 rpa_feedback_submit），你的 LLM 也能自动上报。"
    />

    <!-- 游客提示：未登录也能反馈，留联系方式便于回访 -->
    <el-alert
      v-if="isHydrated && !isLoggedIn"
      class="rpa-feedback-view__guest-tip"
      type="info"
      :closable="false"
      show-icon
      title="当前未登录，仍可提交反馈"
      description="未登录提交不会记录你的账号，请填写联系方式（邮箱 / QQ 等），否则服主无法回访；登录后还能在下方查看自己提交过的反馈。"
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

        <el-form-item
          label="联系方式（未登录必填，便于服主回访）"
          class="mb-0 rpa-feedback-view__contact"
        >
          <el-input
            v-model="form.contact"
            maxlength="256"
            show-word-limit
            placeholder="邮箱 / QQ / 其他联系方式"
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
          <span class="text-sm text-text-placeholder">提交后先落库留档，再按服主配置站外推送（邮件 / Webhook）</span>
        </div>
      </el-form>
    </div>

    <!-- 我的反馈（仅登录可见；游客没有归属数据） -->
    <div
      v-if="isLoggedIn"
      class="rpa-feedback-view__list rounded-2xl bg-primary-light-9 border border-primary-light-8 p-4 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm text-text-secondary font-medium">我的反馈</span>
        <el-button size="default" :loading="loading" @click="loadList">刷新</el-button>
      </div>
      <el-table :data="items" stripe>
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="category" label="分类" width="110" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="190">
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
    <el-alert
      v-else-if="isHydrated"
      class="rpa-feedback-view__login-tip"
      type="warning"
      :closable="false"
      show-icon
      title="登录后可查看自己的反馈记录"
    />
  </FlexContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  submitFeedback,
  listFeedback,
  type FeedbackItem,
  type FeedbackSubmitPayload
} from '@/api/browser/feedback_api'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useHydrated } from '@/composables/useHydrated'
import { formatDateTime } from '@/utils/dateFormat'

defineOptions({ name: 'RpaFeedbackView' })

const route = useRoute()

// 登录态：反馈提交允许游客（后端可选登录），「我的反馈」仅登录后可查
const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const isHydrated = useHydrated()
const isLoggedIn = computed(() => isHydrated.value && !!biliUser.value.uid)

const form = ref<FeedbackSubmitPayload>({
  category: 'bug',
  title: '',
  description: '',
  contact: '',
  source: 'web',
  page_url: typeof window !== 'undefined' ? window.location.href : ''
})

/**
 * 上下文预填：RPA 全局反馈按钮跳过来时会带 `page_url`（出错页面）与 `browser_id`，
 * 直接填进「错误上下文」，比默认的「反馈页自己的 URL」更有定位价值。
 */
function applyQueryContext() {
  const { page_url, browser_id } = route.query
  if (typeof page_url === 'string' && page_url) form.value.page_url = page_url
  if (typeof browser_id === 'string' && browser_id) form.value.browser_id = browser_id
}

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

// 后端出参为秒级时间戳，统一走站点时间工具（固定 Asia/Shanghai + zh-CN）
const formatTime = (t?: number | null) => (t ? formatDateTime(t) : '-')

async function loadList() {
  if (!isLoggedIn.value) return
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
  // 游客提交没有账号可追溯，联系方式是唯一回访渠道，前端强制填写
  if (!isLoggedIn.value && !form.value.contact?.trim()) {
    ElMessage.warning('未登录提交请填写联系方式，便于服主回访')
    return
  }
  submitting.value = true
  const payload: FeedbackSubmitPayload = { ...form.value }
  // 可选上下文：空值不提交，避免写入无意义字段
  for (const key of [
    'contact',
    'error_message',
    'page_url',
    'action_id',
    'workflow_id',
    'run_id',
    'browser_id',
    'error_detail'
  ] as const) {
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
      res.data?.notified
        ? '已提交并通知服主'
        : '已提交落库（服主可在管理后台查看）'
    )
    if (isLoggedIn.value) {
      page.value = 1
      loadList()
    }
  }
}

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) loadList()
})

onMounted(() => {
  applyQueryContext()
  if (isLoggedIn.value) loadList()
})
</script>
