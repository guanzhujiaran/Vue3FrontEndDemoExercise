<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import {
  fetchReportList,
  reviewReport,
  InteractionBizTypeEnum,
  type ReportItem,
} from '@/api/notify/report-api.ts'
import { jumpToTarget } from '@/utils/routeJump'

const adminStore = useRpaAdminStore()
const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

const router = useRouter()

const loading = ref(false)
const reportList = ref<ReportItem[]>([])
const reportTotal = ref(0)
const reportPage = ref(1)
const pageSize = 20
const statusFilter = ref('') // ''=全部, 'pending'=待处理, 'resolved'=已成立, 'rejected'=已驳回

const reviewDialogVisible = ref(false)
const submitting = ref(false)
const reviewTarget = ref<ReportItem | null>(null)
const reviewForm = ref({ decision: 'resolve' as 'resolve' | 'reject', hideResource: false, remark: '' })

const bizTypeName = (bt: InteractionBizTypeEnum) => {
  switch (bt) {
    case InteractionBizTypeEnum.DYNAMIC:
      return '动态'
    case InteractionBizTypeEnum.COMMENT:
      return '评论'
    case InteractionBizTypeEnum.USER:
      return '用户'
    case InteractionBizTypeEnum.LOTTERY:
      return '抽奖'
    case InteractionBizTypeEnum.RPA_BROWSER:
      return 'RPA 浏览器'
    case InteractionBizTypeEnum.RPA_ACTION:
      return 'RPA 操作'
    case InteractionBizTypeEnum.RPA_WORKFLOW:
      return 'RPA 工作流'
    case InteractionBizTypeEnum.RPA_PLUGIN:
      return 'RPA 插件'
    default:
      return String(bt)
  }
}
const statusName = (s: string) => ({ pending: '待处理', resolved: '已成立', rejected: '已驳回' })[s] ?? s
const statusTagType = (s: string): 'warning' | 'success' | 'info' => {
  const map: Record<string, 'warning' | 'success' | 'info'> = {
    pending: 'warning',
    resolved: 'success',
    rejected: 'info',
  }
  return map[s] ?? 'info'
}

// 联动下架（resourceAction=hide）支持的资源类型：
// 动态/评论 → 置 hidden；rpa_* → 退出 Feed；lottery 拒绝下架；user 预留（空实现）
const canHide = (row: ReportItem) =>
  row.bizType === InteractionBizTypeEnum.DYNAMIC ||
  row.bizType === InteractionBizTypeEnum.COMMENT ||
  row.bizType === InteractionBizTypeEnum.RPA_BROWSER ||
  row.bizType === InteractionBizTypeEnum.RPA_ACTION ||
  row.bizType === InteractionBizTypeEnum.RPA_WORKFLOW ||
  row.bizType === InteractionBizTypeEnum.RPA_PLUGIN
const openResource = (url?: string | null) => jumpToTarget(router, url)
const formatTime = (t?: string | null) =>
  t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-'

const loadReports = async () => {
  loading.value = true
  try {
    const res = await fetchReportList({
      status: statusFilter.value || undefined,
      page: reportPage.value,
      page_size: pageSize,
    })
    reportList.value = res.items || []
    reportTotal.value = res.total || 0
  } catch (e) {
    console.error('获取举报列表失败:', e)
    ElMessage.error('获取举报列表失败')
  } finally {
    loading.value = false
  }
}

const onFilterChange = () => {
  reportPage.value = 1
  loadReports()
}

const openReview = (item: ReportItem) => {
  reviewTarget.value = item
  reviewForm.value = { decision: 'resolve', hideResource: false, remark: '' }
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!reviewTarget.value) return
  submitting.value = true
  try {
    await reviewReport({
      reportPk: reviewTarget.value.pk,
      decision: reviewForm.value.decision,
      resourceAction: reviewForm.value.hideResource ? 'hide' : undefined,
      remark: reviewForm.value.remark || undefined,
    })
    ElMessage.success(reviewForm.value.decision === 'resolve' ? '举报已成立' : '举报已驳回')
    reviewDialogVisible.value = false
    loadReports()
  } catch (e) {
    console.error('审核失败:', e)
    ElMessage.error('审核失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) loadReports()
})
</script>

<template>
  <div class="rpa-report-admin">
    <h2 class="mb-4 text-lg font-bold text-text-primary">社区举报</h2>

    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <el-card v-else class="rpa-admin-card" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-base font-bold">
            <el-icon><Warning /></el-icon>
            <span>社区举报审核</span>
          </div>
          <el-select
            v-model="statusFilter"
            clearable
            class="w-36"
            placeholder="审核状态"
            @change="onFilterChange"
          >
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="已成立" value="resolved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </div>
      </template>

      <el-table :data="reportList" v-loading="loading" class="rpa-admin-table" size="large">
        <el-table-column label="被举报对象" width="160">
          <template #default="{ row }">
            <div class="flex flex-col">
              <span class="font-medium text-text-primary">{{ bizTypeName(row.bizType) }}</span>
              <span class="text-xs text-text-placeholder">ID: {{ row.bizId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="被举报数量" width="130" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.reportCount && row.reportCount > 1" type="warning" effect="light" size="default">
              {{ row.reportCount ?? 0 }} 次 / {{ row.reportPeopleCount ?? 0 }} 人
            </el-tag>
            <span v-else class="text-text-primary">{{ row.reportCount ?? 0 }} 次 / {{ row.reportPeopleCount ?? 0 }} 人</span>
          </template>
        </el-table-column>
        <el-table-column label="被举报内容" min-width="180">
          <template #default="{ row }">
            <div v-if="row.resource" class="flex items-center gap-2">
              <el-image
                v-if="row.resource.cover"
                :src="row.resource.cover"
                fit="cover"
                class="h-10 w-10 shrink-0 rounded"
                :preview-src-list="[row.resource.cover as string]"
                preview-teleported
              />
              <button
                v-if="row.resource.exists"
                type="button"
                class="line-clamp-2 text-left text-text-primary hover:text-primary"
                @click="openResource(row.resource.jumpTarget)"
              >
                {{ row.resource.title || ('资源 #' + row.bizId) }}
              </button>
              <span v-else class="text-sm text-text-placeholder">内容已删除</span>
            </div>
            <span v-else class="text-text-placeholder">资源详情不可用</span>
          </template>
        </el-table-column>
        <el-table-column label="举报人" width="140">
          <template #default="{ row }">
            <span class="text-text-primary">{{ row.reporterName || ('用户 ' + row.reportMid) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="被举报人" width="140">
          <template #default="{ row }">
            <span class="text-text-primary">{{ row.accusedName || ('用户 ' + row.accusedMid) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="举报理由" min-width="120">
          <template #default="{ row }">
            <span class="text-text-primary">#{{ row.reasonType }}</span>
            <span v-if="row.reasonDesc" class="ml-1 text-xs text-text-placeholder">{{ row.reasonDesc }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.auditStatus)" effect="light">
              {{ statusName(row.auditStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.auditStatus === 'pending'"
              type="primary"
              link
              @click="openReview(row as ReportItem)"
            >审核</el-button>
            <span v-else class="text-sm text-text-placeholder">已处理</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="reportPage"
        :page-size="pageSize"
        :total="reportTotal"
        layout="prev, pager, next, total"
        class="mt-3"
        @current-change="loadReports"
      />
    </el-card>

    <!-- 举报审核弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="审核举报" width="480px">
      <div v-if="reviewTarget" class="flex flex-col gap-3">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="被举报对象">
            {{ bizTypeName(reviewTarget.bizType) }} #{{ reviewTarget.bizId }}
          </el-descriptions-item>
          <el-descriptions-item label="举报人">
            {{ reviewTarget.reporterName || ('用户 ' + reviewTarget.reportMid) }}
          </el-descriptions-item>
          <el-descriptions-item label="被举报人">
            {{ reviewTarget.accusedName || ('用户 ' + reviewTarget.accusedMid) }}
          </el-descriptions-item>
          <el-descriptions-item label="理由">#{{ reviewTarget.reasonType }}</el-descriptions-item>
          <el-descriptions-item v-if="reviewTarget.reasonDesc" label="说明">
            {{ reviewTarget.reasonDesc }}
          </el-descriptions-item>
        </el-descriptions>
        <el-form label-position="top">
          <el-form-item label="处理决策">
            <el-radio-group v-model="reviewForm.decision">
              <el-radio value="resolve">举报成立</el-radio>
              <el-radio value="reject">举报不成立</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="下架资源">
            <el-checkbox
              v-model="reviewForm.hideResource"
              :disabled="reviewForm.decision !== 'resolve' || !canHide(reviewTarget)"
            >
              {{
                !canHide(reviewTarget)
                  ? '该资源类型不支持下架（抽奖/用户等）'
                  : '同时下架被举报资源'
              }}
            </el-checkbox>
          </el-form-item>
          <el-form-item label="审核备注">
            <el-input v-model="reviewForm.remark" type="textarea" :rows="3" placeholder="审核备注（可选）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">提交审核</el-button>
      </template>
    </el-dialog>
  </div>
</template>
