<template>
  <div class="rpa-feedback-admin flex flex-col gap-4">
    <div class="rpa-feedback-admin__header flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-bold text-text-primary">反馈管理</h2>
        <span class="text-sm text-text-placeholder">
          用户（含未登录游客）提交的报错 / 建议：先落库留档，推送服主为弱依赖。此处可查看、补录、编辑、删除。
        </span>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增反馈</el-button>
    </div>

    <el-empty v-if="statusLoaded && !isAdmin" description="无权限访问，需要管理员或 root 权限" />

    <template v-else>
      <!-- 筛选栏 -->
      <div class="rpa-feedback-admin__filters flex flex-wrap items-center gap-3">
        <el-select v-model="filterStatus" placeholder="处理状态" clearable class="rpa-feedback-admin__filter-status w-40">
          <el-option label="待处理" value="pending" />
          <el-option label="已处理" value="resolved" />
          <el-option label="已忽略" value="ignored" />
        </el-select>
        <el-select v-model="filterCategory" placeholder="分类" clearable class="rpa-feedback-admin__filter-category w-40">
          <el-option label="缺陷 / 报错" value="bug" />
          <el-option label="改进建议" value="suggestion" />
          <el-option label="其他" value="other" />
        </el-select>
        <el-input
          v-model="filterKeyword"
          placeholder="标题 / 描述 / 联系方式"
          clearable
          class="rpa-feedback-admin__filter-keyword w-56"
          @keyup.enter="handleSearch"
        />
        <el-input
          v-model="filterUname"
          placeholder="提交者昵称"
          clearable
          class="rpa-feedback-admin__filter-uname w-40"
          @keyup.enter="handleSearch"
        />
        <el-input
          v-model="filterMid"
          placeholder="提交者 mid"
          clearable
          class="rpa-feedback-admin__filter-mid w-44"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        <div class="flex-1" />
        <el-button :icon="Refresh" circle :loading="loading" @click="load(page)" />
      </div>

      <!-- 批量操作条 -->
      <div v-if="selectedIds.length" class="rpa-feedback-admin__bulk flex items-center gap-3">
        <span class="text-sm text-text-secondary">已选 {{ selectedIds.length }} 条</span>
        <el-button type="danger" :icon="Delete" @click="handleBatchDelete">批量删除</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="items"
        row-key="report_id"
        class="rpa-feedback-admin__table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="52" />
        <el-table-column label="标题" min-width="200">
          <template #default="{ row }">
            <span class="rpa-feedback-admin__title block truncate text-text-primary" :title="row.title">
              {{ row.title }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="130">
          <template #default="{ row }">
            <span class="text-text-primary">{{ categoryLabel(row.category) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="200">
          <template #default="{ row }">
            <div v-if="row.mid" class="rpa-feedback-admin__submitter flex flex-col">
              <span class="text-text-primary">{{ row.uname || '未记录昵称' }}</span>
              <span class="text-xs text-text-placeholder">mid: {{ row.mid }}</span>
            </div>
            <el-tag v-else type="info" effect="plain">未登录游客</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="联系方式" width="180">
          <template #default="{ row }">
            <span class="text-text-secondary">{{ row.contact || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            <span class="text-text-secondary">{{ formatTime(row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <div class="rpa-feedback-admin__actions flex items-center gap-1">
              <el-button link type="primary" @click="openDetail(row as AdminFeedbackItem)">详情</el-button>
              <el-button link type="primary" @click="openEdit(row as AdminFeedbackItem)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row as AdminFeedbackItem)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <PaginationBar
        class="rpa-feedback-admin__pagination"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @update:current-page="onPageChange"
        @update:page-size="onPageSizeChange"
      />
    </template>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" title="反馈详情" width="680px" :lock-scroll="false">
      <div v-if="detailRow" class="rpa-feedback-admin__detail flex flex-col gap-3">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题" :span="2">{{ detailRow.title }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ categoryLabel(detailRow.category) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detailRow.status)">{{ statusLabel(detailRow.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交者">
            {{ detailRow.mid ? `${detailRow.uname || '未记录昵称'}（mid: ${detailRow.mid}）` : '未登录游客' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系方式">{{ detailRow.contact || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatTime(detailRow.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatTime(detailRow.updated_at) }}</el-descriptions-item>
          <el-descriptions-item label="处理人">{{ detailRow.handled_by ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="处理时间">{{ formatTime(detailRow.handled_at) }}</el-descriptions-item>
          <el-descriptions-item label="处理备注" :span="2">{{ detailRow.admin_remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="rpa-feedback-admin__detail-desc flex flex-col gap-1">
          <span class="text-sm font-medium text-text-primary">详细描述</span>
          <span class="whitespace-pre-wrap text-sm text-text-secondary">{{ detailRow.description }}</span>
        </div>

        <div class="rpa-feedback-admin__detail-context flex flex-col gap-1">
          <span class="text-sm font-medium text-text-primary">错误上下文</span>
          <el-descriptions v-if="contextEntries(detailRow).length" :column="1" border>
            <el-descriptions-item
              v-for="entry in contextEntries(detailRow)"
              :key="entry.label"
              :label="entry.label"
            >
              <span class="whitespace-pre-wrap break-all">{{ entry.value }}</span>
            </el-descriptions-item>
          </el-descriptions>
          <span v-else class="text-sm text-text-placeholder">无</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="formVisible"
      :title="editing ? '编辑反馈' : '新增反馈'"
      width="640px"
      :lock-scroll="false"
    >
      <el-form label-position="top" class="rpa-feedback-admin__form flex flex-col gap-2">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <el-form-item label="分类" class="mb-0">
            <el-select v-model="form.category" class="w-full">
              <el-option label="缺陷 / 报错" value="bug" />
              <el-option label="改进建议" value="suggestion" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="处理状态" class="mb-0">
            <el-select v-model="form.status" class="w-full">
              <el-option label="待处理" value="pending" />
              <el-option label="已处理" value="resolved" />
              <el-option label="已忽略" value="ignored" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="标题" class="mb-0">
          <el-input v-model="form.title" maxlength="256" show-word-limit placeholder="简短标题" />
        </el-form-item>
        <el-form-item label="详细描述" class="mb-0">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="错误现象 / 期望行为" />
        </el-form-item>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <el-form-item label="提交者 mid（留空 = 游客）" class="mb-0">
            <el-input v-model="form.mid" placeholder="数字字符串" />
          </el-form-item>
          <el-form-item label="提交者昵称" class="mb-0">
            <el-input v-model="form.uname" maxlength="128" placeholder="可选" />
          </el-form-item>
        </div>

        <el-form-item label="联系方式" class="mb-0">
          <el-input v-model="form.contact" maxlength="256" placeholder="邮箱 / QQ 等" />
        </el-form-item>
        <el-form-item label="处理备注" class="mb-0">
          <el-input v-model="form.adminRemark" type="textarea" :rows="2" placeholder="处理结论 / 沟通记录" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">
          {{ editing ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import { businessHandler } from '@/utils/businessHandler'
import { formatDateTime } from '@/utils/dateFormat'
import PaginationBar from '@/components/message/PaginationBar.vue'
import {
  createFeedbackAdmin,
  deleteFeedbacksAdmin,
  listFeedbacksAdmin,
  updateFeedbackAdmin,
  type AdminFeedbackCategory,
  type AdminFeedbackContext,
  type AdminFeedbackItem,
  type AdminFeedbackListParams,
  type AdminFeedbackStatus
} from '@/api/browser/feedback_admin_api'

/**
 * 报错 / 反馈管理端（管理员 / root）
 *
 * 反馈由用户侧 `/browser/feedback/submit` 落库（允许未登录），推送服主是弱依赖；
 * 本页对**全部提交者（含游客）**的反馈做 CRUD 与状态处理，
 * 后端 `/api/admin/rpa/feedback/*` 由 `require_admin` 强制校验。
 */
defineOptions({ name: 'FeedbackAdmin' })

const adminStore = useMessageAdminStore()
// loaded 只在「成功拿到一次身份」后置位：避免请求未返回时误判为非管理员
const statusLoaded = computed(() => adminStore.loaded)
const isAdmin = computed(() => Boolean(adminStore.status?.is_admin || adminStore.status?.is_root))

// ── 筛选 ─────────────────────────────────────────────
const filterStatus = ref<AdminFeedbackStatus | ''>('')
const filterCategory = ref<AdminFeedbackCategory | ''>('')
const filterKeyword = ref('')
const filterUname = ref('')
const filterMid = ref('')

// ── 列表 ─────────────────────────────────────────────
const loading = ref(false)
const items = ref<AdminFeedbackItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

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
const CATEGORY_LABELS: Record<string, string> = {
  bug: '缺陷 / 报错',
  suggestion: '改进建议',
  other: '其他'
}
const statusLabel = (value: string) => STATUS_LABELS[value] ?? value
const statusTagType = (value: string) => STATUS_TAG[value] ?? 'info'
const categoryLabel = (value: string) => CATEGORY_LABELS[value] ?? value
// 后端出参为秒级时间戳，统一走站点时间工具（固定 Asia/Shanghai + zh-CN）
const formatTime = (value: number | null | undefined) => (value ? formatDateTime(value) : '-')

function buildBody(pageNum: number): AdminFeedbackListParams {
  const body: AdminFeedbackListParams = { page: pageNum, per_page: pageSize.value }
  if (filterStatus.value) body.status = filterStatus.value
  if (filterCategory.value) body.category = filterCategory.value
  const keyword = filterKeyword.value.trim()
  if (keyword) body.keyword = keyword
  const uname = filterUname.value.trim()
  if (uname) body.uname = uname
  const mid = filterMid.value.trim()
  if (mid) body.mid = mid
  return body
}

async function load(pageNum = 1) {
  if (!isAdmin.value) return
  loading.value = true
  const res = await businessHandler(listFeedbacksAdmin(buildBody(pageNum)), {
    showSuccessToast: false,
    errorMessage: '获取反馈列表失败'
  })
  loading.value = false
  if (res.success && res.data) {
    items.value = res.data.items || []
    total.value = res.data.total || 0
    page.value = pageNum
  } else {
    items.value = []
    total.value = 0
  }
}

function handleSearch() {
  load(1)
}

function handleReset() {
  filterStatus.value = ''
  filterCategory.value = ''
  filterKeyword.value = ''
  filterUname.value = ''
  filterMid.value = ''
  load(1)
}

function onPageChange(target: number) {
  load(target)
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  load(1)
}

// ── 勾选 / 批量删除 ───────────────────────────────────
const selectedRows = ref<AdminFeedbackItem[]>([])
const selectedIds = computed(() => selectedRows.value.map((row) => row.report_id))

function handleSelectionChange(rows: AdminFeedbackItem[]) {
  selectedRows.value = rows
}

async function handleBatchDelete() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(`确定删除勾选的 ${ids.length} 条反馈吗？删除后不可恢复。`, '批量删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      lockScroll: false
    })
  } catch {
    return
  }
  const res = await businessHandler(deleteFeedbacksAdmin(ids), {
    successMessage: '反馈已删除',
    errorMessage: '删除失败'
  })
  if (res.success) load(page.value)
}

async function handleDelete(row: AdminFeedbackItem) {
  try {
    await ElMessageBox.confirm(`确定删除反馈「${row.title}」吗？`, '删除反馈', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      lockScroll: false
    })
  } catch {
    return
  }
  const res = await businessHandler(deleteFeedbacksAdmin([row.report_id]), {
    successMessage: '反馈已删除',
    errorMessage: '删除失败'
  })
  if (res.success) load(page.value)
}

// ── 详情 ─────────────────────────────────────────────
const detailVisible = ref(false)
const detailRow = ref<AdminFeedbackItem | null>(null)

function openDetail(row: AdminFeedbackItem) {
  detailRow.value = row
  detailVisible.value = true
}

const CONTEXT_LABELS: [keyof AdminFeedbackContext, string][] = [
  ['source', '来源'],
  ['action_id', '相关动作'],
  ['workflow_id', '相关工作流'],
  ['run_id', '相关运行'],
  ['browser_id', '相关浏览器'],
  ['error_message', '错误摘要'],
  ['error_detail', '错误详情'],
  ['page_url', '页面 URL'],
  ['extra', '补充信息']
]

function contextEntries(row: AdminFeedbackItem): { label: string; value: string }[] {
  const context: AdminFeedbackContext | null | undefined = row.context
  if (!context) return []
  const entries: { label: string; value: string }[] = []
  for (const [key, label] of CONTEXT_LABELS) {
    const value = context[key]
    if (value === null || value === undefined || value === '') continue
    entries.push({ label, value: String(value) })
  }
  return entries
}

// ── 新增 / 编辑 ───────────────────────────────────────
const formVisible = ref(false)
const editing = ref(false)
const submitting = ref(false)
const editingReportId = ref('')

interface FeedbackForm {
  category: AdminFeedbackCategory
  status: AdminFeedbackStatus
  title: string
  description: string
  mid: string
  uname: string
  contact: string
  adminRemark: string
}

const form = reactive<FeedbackForm>({
  category: 'bug',
  status: 'pending',
  title: '',
  description: '',
  mid: '',
  uname: '',
  contact: '',
  adminRemark: ''
})

function resetForm() {
  form.category = 'bug'
  form.status = 'pending'
  form.title = ''
  form.description = ''
  form.mid = ''
  form.uname = ''
  form.contact = ''
  form.adminRemark = ''
}

function openCreate() {
  editing.value = false
  editingReportId.value = ''
  resetForm()
  formVisible.value = true
}

function openEdit(row: AdminFeedbackItem) {
  editing.value = true
  editingReportId.value = row.report_id
  form.category = (row.category as AdminFeedbackCategory) || 'bug'
  form.status = (row.status as AdminFeedbackStatus) || 'pending'
  form.title = row.title
  form.description = row.description
  form.mid = row.mid ?? ''
  form.uname = row.uname ?? ''
  form.contact = row.contact ?? ''
  form.adminRemark = row.admin_remark ?? ''
  formVisible.value = true
}

async function handleSave() {
  if (!form.title.trim() || !form.description.trim()) {
    ElMessage.warning('请填写标题与详细描述')
    return
  }
  if (form.mid.trim() && !/^\d+$/.test(form.mid.trim())) {
    ElMessage.warning('提交者 mid 必须是数字')
    return
  }
  submitting.value = true

  if (editing.value) {
    const res = await businessHandler(
      updateFeedbackAdmin({
        report_id: editingReportId.value,
        category: form.category,
        status: form.status,
        title: form.title.trim(),
        description: form.description.trim(),
        mid: form.mid.trim() || null,
        uname: form.uname.trim() || null,
        contact: form.contact.trim() || null,
        admin_remark: form.adminRemark
      }),
      { successMessage: '反馈已更新', errorMessage: '更新失败' }
    )
    submitting.value = false
    if (res.success) {
      formVisible.value = false
      load(page.value)
    }
    return
  }

  const res = await businessHandler(
    createFeedbackAdmin({
      category: form.category,
      status: form.status,
      title: form.title.trim(),
      description: form.description.trim(),
      // 新增接口的 mid 是可选字段，空串不传（游客）
      ...(form.mid.trim() ? { mid: form.mid.trim() } : {}),
      uname: form.uname.trim() || undefined,
      contact: form.contact.trim() || undefined,
      admin_remark: form.adminRemark
    }),
    { successMessage: '反馈已创建', errorMessage: '创建失败' }
  )
  submitting.value = false
  if (res.success) {
    formVisible.value = false
    load(1)
  }
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) load(1)
})
</script>
