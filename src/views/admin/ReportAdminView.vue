<template>
  <div class="report-admin flex flex-col gap-4">
    <div class="report-admin__header flex items-center justify-between">
      <h2 class="text-lg font-bold text-text-primary">举报审核</h2>
      <span class="text-sm text-text-placeholder">举报达阈值仅入审核队列，下架由管理员审核时决定</span>
    </div>

    <div class="report-admin__filter flex flex-wrap items-center gap-3">
      <el-select
        v-model="bizTypeFilter"
        clearable
        size="default"
        placeholder="来源类型"
        class="report-admin__filter-biz w-36"
        @change="onFilterChange"
      >
        <el-option label="动态" :value="InteractionBizTypeEnum.DYNAMIC" />
        <el-option label="评论" :value="InteractionBizTypeEnum.COMMENT" />
        <el-option label="用户" :value="InteractionBizTypeEnum.USER" />
        <el-option label="抽奖" :value="InteractionBizTypeEnum.LOTTERY" />
        <el-option label="RPA 动作" :value="InteractionBizTypeEnum.RPA_ACTION" />
        <el-option label="RPA 工作流" :value="InteractionBizTypeEnum.RPA_WORKFLOW" />
        <el-option label="RPA 浏览器" :value="InteractionBizTypeEnum.RPA_BROWSER" />
        <el-option label="RPA 插件" :value="InteractionBizTypeEnum.RPA_PLUGIN" />
      </el-select>
      <el-select
        v-model="statusFilter"
        clearable
        size="default"
        placeholder="审核状态"
        class="report-admin__filter-status w-36"
        @change="onFilterChange"
      >
        <el-option label="待处理" value="pending" />
        <el-option label="已成立" value="resolved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-button size="default" @click="loadReports">刷新</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="reportList"
      class="report-admin__table"
      size="large"
    >
      <el-table-column label="被举报对象" width="220">
        <template #default="{ row }">
          <div class="report-admin__target flex flex-col">
            <span class="font-medium text-text-primary">{{ bizTypeName(row.bizType) }}</span>
            <span class="text-xs text-text-placeholder">ID: {{ row.bizId }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="被举报数量" width="140" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.reportCount && row.reportCount > 1" type="warning" effect="light" size="default">
            {{ row.reportCount ?? 0 }} 次 / {{ row.reportPeopleCount ?? 0 }} 人
          </el-tag>
          <span v-else class="text-text-primary">{{ row.reportCount ?? 0 }} 次 / {{ row.reportPeopleCount ?? 0 }} 人</span>
        </template>
      </el-table-column>
      <el-table-column label="被举报内容" min-width="220">
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
      <el-table-column label="举报人" width="170">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <el-avatar :size="28" :src="row.reporterFace || undefined" />
            <span class="text-text-primary">{{ row.reporterName || ('用户 ' + row.reportMid) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="被举报人" width="170">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <el-avatar :size="28" :src="row.accusedFace || undefined" />
            <span class="text-text-primary">{{ row.accusedName || ('用户 ' + row.accusedMid) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="举报理由" min-width="140">
        <template #default="{ row }">
          <span class="text-text-primary">#{{ row.reasonType }}</span>
          <span v-if="row.reasonDesc" class="ml-1 text-xs text-text-placeholder">{{ row.reasonDesc }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.auditStatus)" effect="light" size="default">
            {{ statusName(row.auditStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="举报时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.auditStatus === 'pending'"
            size="default"
            type="primary"
            @click="openReview(row as ReportItem)"
          >
            审核
          </el-button>
          <span v-else class="text-sm text-text-placeholder">已处理</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="reportPage"
      :page-size="pageSize"
      :total="reportTotal"
      layout="prev, pager, next, total"
      class="report-admin__pagination"
      @current-change="loadReports"
    />

    <!-- 审核弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="审核举报" width="520px">
      <div v-if="reviewTarget" class="report-admin__dialog flex flex-col gap-4">
        <el-descriptions :column="2" border size="default">
          <el-descriptions-item label="被举报对象">
            {{ bizTypeName(reviewTarget.bizType) }} ({{ reviewTarget.bizId }})
          </el-descriptions-item>
          <el-descriptions-item label="被举报数量">
            {{ reviewTarget.reportCount ?? 0 }} 次 / {{ reviewTarget.reportPeopleCount ?? 0 }} 人
          </el-descriptions-item>
          <el-descriptions-item label="举报人">
            {{ reviewTarget.reporterName || ('用户 ' + reviewTarget.reportMid) }}（{{ reviewTarget.reportMid }}）
          </el-descriptions-item>
          <el-descriptions-item label="被举报人">
            {{ reviewTarget.accusedName || ('用户 ' + reviewTarget.accusedMid) }}（{{ reviewTarget.accusedMid }}）
          </el-descriptions-item>
          <el-descriptions-item label="举报理由">#{{ reviewTarget.reasonType }}</el-descriptions-item>
          <el-descriptions-item v-if="reviewTarget.reasonDesc" label="补充说明">
            {{ reviewTarget.reasonDesc }}
          </el-descriptions-item>
        </el-descriptions>

        <el-form label-width="96px" size="default">
          <el-form-item label="审核结果">
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
                  ? '该资源类型不允许下架'
                  : '同时下架被举报资源（动态/评论/RPA 资源）'
              }}
            </el-checkbox>
          </el-form-item>
          <el-form-item label="审核备注">
            <el-input
              v-model="reviewForm.remark"
              type="textarea"
              :rows="2"
              maxlength="500"
              placeholder="选填"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button size="default" @click="reviewDialogVisible = false">取消</el-button>
        <el-button size="default" type="primary" :loading="submitting" @click="submitReview">
          提交审核
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchReportList, InteractionBizTypeEnum, reviewReport, type ReportItem } from '@/api/notify/report-api.ts'
import { jumpToTarget } from '@/utils/routeJump'

const loading = ref(false)
const submitting = ref(false)
const reportList = ref<ReportItem[]>([])
const reportTotal = ref(0)
const reportPage = ref(1)
const pageSize = 20

const bizTypeFilter = ref<InteractionBizTypeEnum | ''>('')
const statusFilter = ref('')

const reviewDialogVisible = ref(false)
const reviewTarget = ref<ReportItem | null>(null)
const reviewForm = reactive({ decision: 'resolve' as 'resolve' | 'reject', hideResource: false, remark: '' })

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
    case InteractionBizTypeEnum.RPA_ACTION:
      return 'RPA 动作'
    case InteractionBizTypeEnum.RPA_WORKFLOW:
      return 'RPA 工作流'
    case InteractionBizTypeEnum.RPA_BROWSER:
      return 'RPA 浏览器'
    case InteractionBizTypeEnum.RPA_PLUGIN:
      return 'RPA 插件'
    default:
      return String(bt)
  }
}
const statusName = (s: string) =>
  ({ pending: '待处理', resolved: '已成立', rejected: '已驳回' })[s] ?? s
const statusTagType = (s: string): 'warning' | 'success' | 'info' | 'danger' =>
  ({ pending: 'warning', resolved: 'success', rejected: 'info' } as Record<string, 'warning' | 'success' | 'info' | 'danger'>)[s] ?? 'info'

// 抽奖（LOTTERY）与用户（USER）不允许下架；动态/评论/RPA 资源允许
const canHide = (row: ReportItem) =>
  row.bizType !== InteractionBizTypeEnum.LOTTERY && row.bizType !== InteractionBizTypeEnum.USER

const formatTime = (t?: string | null) =>
  t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-'

const router = useRouter()
const openResource = (url?: string | null) => jumpToTarget(router, url)

const onFilterChange = () => {
  reportPage.value = 1
  loadReports()
}

const loadReports = async () => {
  loading.value = true
  try {
    const res = await fetchReportList({
      biz_type: bizTypeFilter.value || undefined,
      status: statusFilter.value || undefined,
      page: reportPage.value,
      page_size: pageSize,
    })
    reportList.value = res.items || []
    reportTotal.value = res.total || 0
  } catch (e) {
    console.error('加载举报列表失败:', e)
    ElMessage.error('加载举报列表失败')
  } finally {
    loading.value = false
  }
}

const openReview = (row: ReportItem) => {
  reviewTarget.value = row
  reviewForm.decision = 'resolve'
  reviewForm.hideResource = false
  reviewForm.remark = ''
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!reviewTarget.value) return
  submitting.value = true
  try {
    await reviewReport({
      reportPk: reviewTarget.value.pk,
      decision: reviewForm.decision,
      resourceAction: reviewForm.hideResource ? 'hide' : undefined,
      remark: reviewForm.remark || undefined,
    })
    ElMessage.success(reviewForm.decision === 'resolve' ? '举报已成立' : '举报已驳回')
    reviewDialogVisible.value = false
    loadReports()
  } catch (e) {
    console.error('审核举报失败:', e)
    ElMessage.error('审核失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadReports)
</script>
