<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Check, Close, Stamp } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import { canApprove, canReject, auditStateText, auditStateTagType } from '@/utils/auditStateMachine'
import {
  管理员管理Service,
  type ApprovalItemResp as ApprovalItem,
  type ApprovalListResponse,
} from '@/api/browser/hey-api'

const adminStore = useRpaAdminStore()
const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

const loading = ref(false)
const reviewNoteMap = ref<Record<number, string>>({})

// 状态 Tab：待审核 / 已通过 / 已驳回（懒加载 + 按 Tab 缓存）
const STATUS_TABS: Array<{ name: string; label: string; status?: string }> = [
  { name: 'pending', label: '待审核', status: 'pending' },
  { name: 'approved', label: '已通过', status: 'approved' },
  { name: 'rejected', label: '已驳回', status: 'rejected' },
]
const activeTab = ref('pending')

/** 每个 Tab 独立缓存：首次激活才请求，切回复用已有数据 */
interface TabState {
  items: ApprovalItem[]
  total: number
  page: number
  loaded: boolean
}
const tabCache = ref<Record<string, TabState>>({})
const pageSize = 20
const EMPTY_TAB: TabState = { items: [], total: 0, page: 1, loaded: false }

function ensureTab(name: string): TabState {
  if (!tabCache.value[name]) {
    tabCache.value[name] = { items: [], total: 0, page: 1, loaded: false }
  }
  return tabCache.value[name]
}

const currentTab = computed<TabState>(() => tabCache.value[activeTab.value] ?? EMPTY_TAB)
const approvalList = computed(() => currentTab.value.items)
const approvalTotal = computed(() => currentTab.value.total)
const approvalPage = computed(() => currentTab.value.page)

const loadApprovals = async (force = false) => {
  const st = ensureTab(activeTab.value)
  if (st.loaded && !force) return
  loading.value = true
  const res = await businessHandler(
    管理员管理Service.listApprovalsApiAdminRpaApprovalListPost({
      body: {
        page: st.page,
        per_page: pageSize,
        status: activeTab.value === 'pending' ? 'pending' : activeTab.value,
      },
    }) as unknown as Promise<BusinessResponse<ApprovalListResponse | null | undefined>>,
    { showSuccessToast: false, errorMessage: '获取审批列表失败' }
  )
  if (res.success && res.data) {
    st.items = (res.data.items || []) as ApprovalItem[]
    st.total = res.data.total || 0
    st.loaded = true
  }
  loading.value = false
}

/** Tab 切换：已加载过的直接复用缓存，未加载的才请求 */
function onTabChange(name: string | number) {
  const st = ensureTab(String(name))
  if (!st.loaded) loadApprovals()
}

function onPageChange(p: number) {
  const st = ensureTab(activeTab.value)
  st.page = p
  st.loaded = false
  loadApprovals()
}

const handleReview = async (
  item: { id: number },
  status: 'approved' | 'rejected'
) => {
  try {
    await ElMessageBox.confirm(
      status === 'approved' ? '确定通过该审批？' : '确定驳回该审批？',
      '审核',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  await businessHandler(
    管理员管理Service.reviewApprovalApiAdminRpaApprovalReviewPost({
      body: { approval_id: item.id, status, review_note: reviewNoteMap.value[item.id] || '' },
    }) as unknown as Promise<BusinessResponse<ApprovalItem | null | undefined>>,
    { successMessage: '审核完成', errorMessage: '审核失败' }
  )
  reviewNoteMap.value[item.id] = ''
  // 刷新当前 Tab + 使其它 Tab 缓存失效（状态互转会影响相邻 Tab 数据）
  const st = ensureTab(activeTab.value)
  st.loaded = false
  for (const name of Object.keys(tabCache.value)) {
    if (name !== activeTab.value) tabCache.value[name].loaded = false
  }
  loadApprovals()
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) loadApprovals()
})
</script>

<template>
  <div class="rpa-approval-admin">
    <h2 class="mb-4 text-lg font-bold text-text-primary">审批审核</h2>

    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <el-card v-else class="rpa-admin-card" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-base font-bold">
            <el-icon><Stamp /></el-icon>
            <span>审批列表</span>
          </div>
          <!-- 状态 Tab：待审核 / 已通过 / 已驳回（懒加载 + 缓存） -->
          <el-tabs v-model="activeTab" class="rpa-approval-admin__tabs" @tab-change="onTabChange">
            <el-tab-pane
              v-for="tab in STATUS_TABS"
              :key="tab.name"
              :label="tab.label"
              :name="tab.name"
              lazy
            />
          </el-tabs>
        </div>
      </template>
      <el-table :data="approvalList" v-loading="loading" class="rpa-admin-table" size="large">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="submitter_mid" label="提交人" width="100" />
        <el-table-column prop="resource_type" label="类型" width="90" />
        <el-table-column prop="resource_id" label="资源ID" min-width="120" />
        <el-table-column prop="action" label="动作" width="90" />
        <el-table-column prop="title" label="标题" min-width="120" show-overflow-tooltip />
        <el-table-column prop="description" label="说明" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="auditStateTagType(row.status)" effect="light">{{ auditStateText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="160">
          <template #default="{ row }">
            <el-input
              v-if="canApprove(row.status) || canReject(row.status)"
              v-model="reviewNoteMap[row.id]"
              placeholder="审核意见"
            />
            <span v-else class="text-sm text-gray-400">{{ row.review_note || '-' }}</span>
          </template>
        </el-table-column>
        <!-- 操作：由审核状态机决定按钮（pending=通过/驳回；已通过=驳回撤回；已驳回=通过恢复） -->
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="canApprove(row.status) || canReject(row.status)">
              <el-button
                v-if="canApprove(row.status)"
                :icon="Check"
                type="success"
                @click="handleReview(row as ApprovalItem, 'approved')"
              >
                通过
              </el-button>
              <el-button
                v-if="canReject(row.status)"
                :icon="Close"
                type="danger"
                @click="handleReview(row as ApprovalItem, 'rejected')"
              >
                驳回
              </el-button>
            </template>
            <span v-else class="text-sm text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" min-width="160">
          <template #default="{ row }">
            <span>{{ row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        :current-page="approvalPage"
        :page-size="pageSize"
        :total="approvalTotal"
        layout="prev, pager, next, total"
        class="mt-3"
        @current-change="onPageChange"
      />
    </el-card>
  </div>
</template>
