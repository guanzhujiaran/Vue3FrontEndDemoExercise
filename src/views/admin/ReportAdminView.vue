<template>
  <div class="report-admin flex flex-col gap-4">
    <!-- 审核总览说明 -->
    <div class="report-admin__header flex items-center justify-between">
      <h2 class="text-lg font-bold text-text-primary">举报审核</h2>
      <span class="text-sm text-text-placeholder">举报达阈值仅入审核队列，下架由管理员审核时决定</span>
    </div>

    <!-- 审核总览统计（通用组件） -->
    <AuditOverviewCard
      :statistics="statistics"
      total-label="举报总数"
      :statusLabels="{ pending: '待处理', resolved: '已成立', rejected: '已驳回' }"
      typeLabel="来源类型"
    />

    <!-- 状态 Tab 工具行（通用组件）+ 来源类型筛选 -->
    <AdminAuditTabs
      v-model="activeTab"
      title="举报审核队列"
      :tabs="STATUS_TABS"
      :loading="loading"
      @refresh="load(true)"
    >
      <template #extra>
        <el-select
          v-model="bizTypeFilter"
          clearable
          size="default"
          placeholder="来源类型"
          class="report-admin__filter-biz w-36"
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
      </template>
    </AdminAuditTabs>

    <el-table v-loading="loading" :data="reportList" class="report-admin__table" size="large">
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
          <el-tag :type="auditStateTagType(row.auditStatus)" effect="light" size="default">
            {{ reportStateText(row.auditStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="举报时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="canApprove(row.auditStatus) || canReject(row.auditStatus)"
            size="default"
            :type="row.auditStatus === 'pending' ? 'primary' : 'default'"
            @click="openReview(row as ReportItem)"
          >
            {{ row.auditStatus === 'pending' ? '审核' : '重新审核' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <PaginationBar
      class="report-admin__pagination"
      :total="reportTotal"
      :page-size="pageSize"
      :current-page="reportPage"
      @update:current-page="onPageChange"
      @update:page-size="onPageSizeChange"
    />

    <!-- 审核弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="审核举报" width="520px" :lock-scroll="false">
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
            <el-input v-model="reviewForm.remark" type="textarea" :rows="2" maxlength="500" placeholder="选填" />
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
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  fetchReportList,
  InteractionBizTypeEnum,
  reviewReport,
  type ReportItem,
} from '@/api/notify/report-api.ts'
import { jumpToTarget } from '@/utils/routeJump'
import { auditStateText, auditStateTagType, canApprove, canReject } from '@/utils/auditStateMachine'
import { useAuditTabCache } from '@/composables/useAuditTabCache'
import AdminAuditTabs from '@/components/admin/AdminAuditTabs.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import AuditOverviewCard from '@/components/admin/AuditOverviewCard.vue'
import { fetchAuditStatisticsByBiz, type AuditStatisticsData, AuditBizType } from '@/api/notify/moment-api'

// 状态 Tab：待处理 / 已成立 / 已驳回（状态机：已成立可改判不成立，已驳回可改判成立）
const STATUS_TABS = [
  { name: 'pending', label: '待处理' },
  { name: 'resolved', label: '已成立' },
  { name: 'rejected', label: '已驳回' },
]

// 审核总览统计（通用统计接口，按业务域聚合）
const statistics = ref<AuditStatisticsData | null>(null)

async function loadStatistics() {
  statistics.value = await fetchAuditStatisticsByBiz(AuditBizType.REPORT)
}

const submitting = ref(false)
const bizTypeFilter = ref<InteractionBizTypeEnum | ''>('')

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

// 抽奖（LOTTERY）与用户（USER）不允许下架；动态/评论/RPA 资源允许
const canHide = (row: ReportItem) =>
  row.bizType !== InteractionBizTypeEnum.LOTTERY && row.bizType !== InteractionBizTypeEnum.USER

const formatTime = (t?: string | null) =>
  t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '-'

const router = useRouter()
const openResource = (url?: string | null) => jumpToTarget(router, url)

// 状态 Tab 缓存懒加载：fetcher 携带来源类型筛选
const {
  activeTab,
  items: reportList,
  total: reportTotal,
  page: reportPage,
  pageSize,
  loading,
  load,
  onPageChange,
  onPageSizeChange,
  removeRow,
  invalidateOthers,
} = useAuditTabCache<ReportItem>(
  (tab, page, size) =>
    fetchReportList({
      biz_type: bizTypeFilter.value || undefined,
      status: tab,
      page,
      page_size: size,
    }),
  { tabs: STATUS_TABS, defaultTab: 'pending' }
)

// 来源类型筛选变化：全部 Tab 缓存失效并重载当前 Tab
watch(bizTypeFilter, () => {
  invalidateOthers()
  load(true)
})

/**
 * 举报状态文案（与页内 Tab、总览统计卡片口径一致）。
 *
 * 通用状态机 auditStateMachine 的文案是「待审核 / 已过审 / 已驳回」（动态、话题等业务域），
 * 而举报域的业务词是「待处理 / 已成立 / 已驳回」（后端契约：pending / resolved / rejected）。
 * 文案用举报域的说法，颜色与「可审核动作」仍复用通用状态机
 * （已成立 = resolved → NORMAL = 绿色 success，且只允许改判驳回）。
 */
const REPORT_STATE_TEXT: Record<string, string> = {
  pending: '待处理',
  resolved: '已成立',
  rejected: '已驳回',
}
const reportStateText = (status?: string | null): string =>
  REPORT_STATE_TEXT[String(status ?? '').toLowerCase()] ?? auditStateText(status)

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
    // reviewReport 返回「是否成功」：失败时不能提示成功、也不能把该行移除
    // （错误提示由统一入口 businessHandler 弹出，弹窗保持打开便于重试）
    const ok = await reviewReport({
      reportPk: reviewTarget.value.pk,
      decision: reviewForm.decision,
      resourceAction: reviewForm.hideResource ? 'hide' : undefined,
      remark: reviewForm.remark || undefined,
    })
    if (!ok) return
    ElMessage.success(reviewForm.decision === 'resolve' ? '举报已成立' : '举报已驳回')
    reviewDialogVisible.value = false
    // 当前 Tab 移除该单；其它状态 Tab 缓存失效（该单可能出现在别的状态里）
    removeRow((i) => i.pk === reviewTarget.value?.pk)
    invalidateOthers()
    // 审核会改变各状态的数量，总览统计需同步刷新，否则卡片显示的是审核前的过期数字
    await loadStatistics()
  } catch (e) {
    console.error('审核举报失败:', e)
    ElMessage.error('审核失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  load()
  loadStatistics()
})
</script>
