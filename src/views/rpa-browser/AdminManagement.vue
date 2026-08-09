<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Check, Close, Medal, CollectionTag, User, Stamp, Warning, Search, Document } from '@element-plus/icons-vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import {
  grantAdminApiAdminRpaRoleGrantPost as grantAdmin,
  revokeAdminApiAdminRpaRoleRevokePost as revokeAdmin,
  listAdminsApiAdminRpaRoleListPost as listAdmins,
  submitApprovalApiAdminRpaApprovalSubmitPost as submitApproval,
  listApprovalsApiAdminRpaApprovalListPost as listApprovals,
  reviewApprovalApiAdminRpaApprovalReviewPost as reviewApproval,
  listTagsApiAdminRpaTagListPost as listTags,
  createTagApiAdminRpaTagCreatePost as createTag,
  updateTagApiAdminRpaTagUpdatePost as updateTag,
  deleteTagApiAdminRpaTagDeletePost as deleteTag,
  attachTagApiAdminRpaTagAttachPost as attachTag,
  detachTagApiAdminRpaTagDetachPost as detachTag,
  listCertificationsApiAdminRpaCertificationListPost as listCertifications,
  certifyApiAdminRpaCertificationCertifyPost as certify,
  revokeCertificationApiAdminRpaCertificationRevokePost as revokeCertification,
  type RpaAdminItemResp as RpaAdminItem,
  type ApprovalItemResp as ApprovalItem,
  type TagItemResp as TagItem,
  type CertificationItemResp as CertificationItem
} from '@/api/browser/hey-api/sdk.gen'
import { client } from '@/api/browser/hey-api/client.gen'

const adminStore = useRpaAdminStore()
const userNavStore = useUserNavStore()

const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)
const isRoot = computed(() => adminStore.status.is_root)

const loading = ref(false)
const activeTab = ref<'admin' | 'approval' | 'tag' | 'cert' | 'report'>('approval')

// ===================== 管理员管理（root） =====================
const adminList = ref<RpaAdminItem[]>([])
const adminTotal = ref(0)
const adminPage = ref(1)
const grantMid = ref('')
const grantNote = ref('')

const loadAdmins = async () => {
  loading.value = true
  const res = await businessHandler(
    listAdmins({ body: { page: adminPage.value, per_page: 20 } }),
    { showSuccessToast: false, errorMessage: '获取管理员列表失败' }
  )
  if (res.success && res.data) {
    adminList.value = res.data.items || []
    adminTotal.value = res.data.total || 0
  }
  loading.value = false
}

const handleGrant = async () => {
  const mid = Number(grantMid.value)
  if (!mid || mid <= 0) {
    biliMessage.error('请输入有效的用户 mid')
    return
  }
  await businessHandler(grantAdmin({ body: { mid, note: grantNote.value } }), {
    successMessage: '已授予管理员权限',
    errorMessage: '授予失败'
  })
  grantMid.value = ''
  grantNote.value = ''
  loadAdmins()
}

const handleRevoke = async (item: RpaAdminItem) => {
  try {
    await ElMessageBox.confirm(`确定撤销用户 ${item.mid} 的管理员权限吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await businessHandler(revokeAdmin({ body: { mid: item.mid } }), {
    successMessage: '已撤销管理员权限',
    errorMessage: '撤销失败'
  })
  loadAdmins()
}

// ===================== 审批 =====================
const approvalList = ref<ApprovalItem[]>([])
const approvalTotal = ref(0)
const approvalPage = ref(1)
const approvalStatusFilter = ref('')
const reviewNoteMap = ref<Record<number, string>>({})

const submitForm = ref({
  resource_type: 'action',
  resource_id: '',
  action: 'publish',
  title: '',
  description: ''
})

const loadApprovals = async () => {
  loading.value = true
  const res = await businessHandler(
    listApprovals({
      body: {
        page: approvalPage.value,
        per_page: 20,
        status: approvalStatusFilter.value || undefined
      }
    }),
    { showSuccessToast: false, errorMessage: '获取审批列表失败' }
  )
  if (res.success && res.data) {
    approvalList.value = res.data.items || []
    approvalTotal.value = res.data.total || 0
  }
  loading.value = false
}

const handleSubmitApproval = async () => {
  if (!submitForm.value.resource_id) {
    biliMessage.error('请输入资源 ID')
    return
  }
  await businessHandler(
    submitApproval({
      body: {
        resource_type: submitForm.value.resource_type,
        resource_id: submitForm.value.resource_id,
        action: submitForm.value.action,
        title: submitForm.value.title,
        description: submitForm.value.description
      }
    }),
    { successMessage: '审批申请已提交', errorMessage: '提交失败' }
  )
  submitForm.value.resource_id = ''
  submitForm.value.title = ''
  submitForm.value.description = ''
  loadApprovals()
}

const handleReview = async (item: ApprovalItem, status: 'approved' | 'rejected') => {
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
    reviewApproval({
      body: { approval_id: item.id, status, review_note: reviewNoteMap.value[item.id] || '' }
    }),
    { successMessage: '审核完成', errorMessage: '审核失败' }
  )
  reviewNoteMap.value[item.id] = ''
  loadApprovals()
}

// ===================== 标签管理 =====================
const tagList = ref<TagItem[]>([])
const tagTotal = ref(0)
const tagPage = ref(1)
const tagDialogVisible = ref(false)
const tagForm = ref({ id: 0, name: '', color: '#409EFF' })
const attachDialogVisible = ref(false)
const attachForm = ref({ tag_id: 0, target_type: 'action', target_id: '' })

const loadTags = async () => {
  const res = await businessHandler(
    listTags({ body: { page: tagPage.value, per_page: 100 } }),
    { showSuccessToast: false, errorMessage: '获取标签失败' }
  )
  if (res.success && res.data) {
    tagList.value = res.data.items || []
    tagTotal.value = res.data.total || 0
  }
}

const openCreateTag = () => {
  tagForm.value = { id: 0, name: '', color: '#409EFF' }
  tagDialogVisible.value = true
}

const openEditTag = (tag: TagItem) => {
  tagForm.value = { id: tag.id, name: tag.name, color: tag.color }
  tagDialogVisible.value = true
}

const handleSaveTag = async () => {
  if (!tagForm.value.name) {
    biliMessage.error('请输入标签名称')
    return
  }
  if (tagForm.value.id) {
    await businessHandler(
      updateTag({
        body: { id: tagForm.value.id, name: tagForm.value.name, color: tagForm.value.color }
      }),
      {
        successMessage: '标签已更新',
        errorMessage: '更新失败'
      }
    )
  } else {
    await businessHandler(
      createTag({ body: { name: tagForm.value.name, color: tagForm.value.color } }),
      {
        successMessage: '标签已创建',
        errorMessage: '创建失败'
      })
  }
  tagDialogVisible.value = false
  loadTags()
}

const handleDeleteTag = async (tag: TagItem) => {
  try {
    await ElMessageBox.confirm(`确定删除标签「${tag.name}」吗？关联也会一并清除。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await businessHandler(deleteTag({ body: { id: tag.id } }), {
    successMessage: '标签已删除',
    errorMessage: '删除失败'
  })
  loadTags()
}

const openAttach = () => {
  attachForm.value = { tag_id: tagList.value[0]?.id || 0, target_type: 'action', target_id: '' }
  attachDialogVisible.value = true
}

const handleAttach = async () => {
  if (!attachForm.value.tag_id || !attachForm.value.target_id) {
    biliMessage.error('请选择标签并填写资源 ID')
    return
  }
  await businessHandler(
    attachTag({
      body: {
        tag_id: attachForm.value.tag_id,
        target_type: attachForm.value.target_type,
        target_id: attachForm.value.target_id
      }
    }),
    { successMessage: '已关联标签', errorMessage: '关联失败' }
  )
  attachDialogVisible.value = false
}

const handleDetach = async (tag: TagItem, targetType: string, targetId: string) => {
  await businessHandler(detachTag({ body: { tag_id: tag.id, target_type: targetType, target_id: targetId } }), {
    successMessage: '已移除标签',
    errorMessage: '移除失败'
  })
}

// ===================== 官方认证 =====================
const certList = ref<CertificationItem[]>([])
const certTotal = ref(0)
const certPage = ref(1)
const certForm = ref({ target_type: 'action', target_id: '', note: '' })

const loadCerts = async () => {
  const res = await businessHandler(
    listCertifications({
      body: { page: certPage.value, per_page: 20 }
    }),
    { showSuccessToast: false, errorMessage: '获取认证列表失败' }
  )
  if (res.success && res.data) {
    certList.value = res.data.items || []
    certTotal.value = res.data.total || 0
  }
}

const handleCertify = async () => {
  if (!certForm.value.target_id) {
    biliMessage.error('请输入资源 ID')
    return
  }
  await businessHandler(
    certify({
      body: {
        target_type: certForm.value.target_type,
        target_id: certForm.value.target_id,
        note: certForm.value.note
      }
    }),
    { successMessage: '已标注官方认证', errorMessage: '认证失败' }
  )
  certForm.value.target_id = ''
  certForm.value.note = ''
  loadCerts()
}

const handleRevokeCert = async (item: CertificationItem) => {
  try {
    await ElMessageBox.confirm(`确定撤销该资源的官方认证吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await businessHandler(
    revokeCertification({ body: { target_type: item.target_type, target_id: item.target_id } }),
    {
      successMessage: '已撤销官方认证',
      errorMessage: '撤销失败'
    })
  loadCerts()
}

// ===================== 社区举报审核 =====================
interface ReportItem {
  id: number
  mid: string
  resource_type: number
  resource_type_name: string
  resource_id: number
  reason: number
  reason_name: string
  description: string
  is_valid: boolean
  decision: string
  review_note: string
  reviewed_by_mid: string | null
  reviewed_at: string | null
  created_at: string
}

const reportList = ref<ReportItem[]>([])
const reportTotal = ref(0)
const reportPage = ref(1)
const reportValidFilter = ref('') // ''=全部, 'true'=未处理, 'false'=已处理
const reviewDialogVisible = ref(false)
const reviewTarget = ref<ReportItem | null>(null)
const reviewForm = ref({ decision: 'ignore', review_note: '' })

const reportDecisionName = (d: string) => {
  return (
    {
      pending: '待处理',
      ignored: '已忽略',
      warned: '已警告',
      takedown: '已下架',
    } as Record<string, string>
  )[d] ?? d
}

const loadReports = async () => {
  loading.value = true
  const res = await businessHandler(
    client.post({
      url: '/api/admin/rpa/reports/list',
      body: {
        page: reportPage.value,
        per_page: 20,
        is_valid: reportValidFilter.value || undefined,
      },
      headers: { ...userNavStore.user_header },
    }) as unknown as Promise<{ code: number; data?: { items: ReportItem[]; total: number }; msg?: string }>,
    { showSuccessToast: false, errorMessage: '获取举报列表失败' }
  )
  if (res.success && res.data) {
    reportList.value = res.data.items || []
    reportTotal.value = res.data.total || 0
  }
  loading.value = false
}

const openReview = (item: ReportItem) => {
  reviewTarget.value = item
  reviewForm.value = { decision: 'ignore', review_note: '' }
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!reviewTarget.value) return
  await businessHandler(
    client.post({
      url: '/api/admin/rpa/reports/review',
      body: {
        report_id: reviewTarget.value.id,
        decision: reviewForm.value.decision,
        review_note: reviewForm.value.review_note,
      },
      headers: { ...userNavStore.user_header },
    }) as unknown as Promise<{ code: number; data?: unknown; msg?: string }>,
    { successMessage: '审核完成', errorMessage: '审核失败' }
  )
  reviewDialogVisible.value = false
  loadReports()
}

// ===================== 操作审计 =====================
interface AuditItem {
  id: number
  admin_mid: number
  action: string
  target_type: string
  target_id: string
  detail: string
  created_at: string
}

const auditList = ref<AuditItem[]>([])
const auditTotal = ref(0)
const auditPage = ref(1)
const auditActionFilter = ref('')

const auditActionName = (a: string) => {
  return (
    {
      'role:grant': '授予管理员',
      'role:revoke': '撤销管理员',
      'cert:certify': '官方认证',
      'cert:revoke': '撤销认证',
      'tag:create': '创建标签',
      'tag:update': '更新标签',
      'tag:delete': '删除标签',
      'approval:review': '审批审核',
      'report:review': '举报审核',
      'report:mark_invalid': '举报标记无效',
    } as Record<string, string>
  )[a] ?? a
}

const loadAudit = async () => {
  loading.value = true
  const res = await businessHandler(
    client.post({
      url: '/api/admin/rpa/audit/list',
      body: {
        page: auditPage.value,
        per_page: 50,
        action: auditActionFilter.value || undefined,
      },
      headers: { ...userNavStore.user_header },
    }) as unknown as Promise<{ code: number; data?: { items: AuditItem[]; total: number }; msg?: string }>,
    { showSuccessToast: false, errorMessage: '获取审计日志失败' }
  )
  if (res.success && res.data) {
    auditList.value = res.data.items || []
    auditTotal.value = res.data.total || 0
  }
  loading.value = false
}

// 审批待办角标
const pendingApprovalTotal = ref(0)
const loadPendingApproval = async () => {
  const res = await businessHandler(
    client.post({
      url: '/api/admin/rpa/approval/list',
      body: { page: 1, per_page: 1, status: 'pending' },
      headers: { ...userNavStore.user_header },
    }) as unknown as Promise<{ code: number; data?: { total: number }; msg?: string }>,
    { showSuccessToast: false, errorMessage: '' }
  )
  if (res.success && res.data) {
    pendingApprovalTotal.value = res.data.total || 0
  }
}

// ===================== 初始化 =====================
const init = async () => {
  await adminStore.fetchStatus()
  if (!isAdmin.value) return
  await Promise.all([loadApprovals(), loadTags(), loadCerts(), loadReports(), loadAudit(), loadPendingApproval()])
  if (isRoot.value) {
    loadAdmins()
  }
}

onMounted(init)

const statusTagType = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="RPA 管理后台" description="审批、官方认证、标签与管理员权限管理" tag="管理">
      <template #extra>
        <el-tag v-if="isRoot" type="danger" effect="dark">ROOT</el-tag>
        <el-tag v-else-if="isAdmin" type="warning" effect="dark">管理员</el-tag>
      </template>
    </BiliPageHeader>

    <!-- 无权限提示 -->
    <CenteredContainer v-if="!isAdmin" class="py-20">
      <el-empty description="无权限访问，需要 RPA 管理员或 root 权限" />
    </CenteredContainer>

    <FlexContainer v-else class="mt-4">
      <el-tabs v-model="activeTab" class="rpa-admin-tabs w-full">
        <!-- 审批 -->
        <el-tab-pane name="approval">
          <template #label>
            <el-badge :value="pendingApprovalTotal" :max="99" :hidden="!pendingApprovalTotal" class="rpa-admin-tabs__badge">
              <span>操作审批</span>
            </el-badge>
          </template>
          <div class="grid gap-4 md:grid-cols-2">
            <el-card class="rpa-admin-card" shadow="never">
              <template #header>
                <div class="flex items-center gap-2 text-base font-bold">
                  <el-icon><Stamp /></el-icon>
                  <span>提交审批申请</span>
                </div>
              </template>
              <el-form label-position="top">
                <el-form-item label="资源类型">
                  <el-select v-model="submitForm.resource_type" class="w-full">
                    <el-option label="复合操作" value="action" />
                    <el-option label="工作流" value="workflow" />
                    <el-option label="插件" value="plugin" />
                  </el-select>
                </el-form-item>
                <el-form-item label="资源 ID">
                  <el-input v-model="submitForm.resource_id" placeholder="资源 ID（字符串）" />
                </el-form-item>
                <el-form-item label="申请操作">
                  <el-select v-model="submitForm.action" class="w-full">
                    <el-option label="发布到社区" value="publish" />
                    <el-option label="执行" value="execute" />
                  </el-select>
                </el-form-item>
                <el-form-item label="标题">
                  <el-input v-model="submitForm.title" placeholder="申请标题" />
                </el-form-item>
                <el-form-item label="说明">
                  <el-input v-model="submitForm.description" type="textarea" :rows="3" placeholder="申请说明" />
                </el-form-item>
                <el-button type="primary" :icon="Plus" @click="handleSubmitApproval" class="w-full">
                  提交审批
                </el-button>
              </el-form>
            </el-card>

            <el-card class="rpa-admin-card" shadow="never">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-base font-bold">
                    <el-icon><Stamp /></el-icon>
                    <span>审批列表</span>
                  </div>
                  <el-select v-model="approvalStatusFilter" class="w-32" @change="loadApprovals">
                    <el-option label="全部" value="" />
                    <el-option label="待审核" value="pending" />
                    <el-option label="已通过" value="approved" />
                    <el-option label="已驳回" value="rejected" />
                  </el-select>
                </div>
              </template>
              <el-table :data="approvalList" v-loading="loading" class="rpa-admin-table" size="large">
                <el-table-column prop="id" label="ID" width="70" />
                <el-table-column prop="resource_type" label="类型" width="90" />
                <el-table-column prop="resource_id" label="资源ID" min-width="120" />
                <el-table-column prop="action" label="操作" width="90" />
                <el-table-column label="状态" width="90">
                  <template #default="{ row }">
                    <el-tag :type="statusTagType(row.status)" effect="light">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="审核" min-width="160" v-if="isAdmin">
                  <template #default="{ row }">
                    <div class="flex flex-col gap-2">
                      <el-input v-model="reviewNoteMap[row.id]" size="small" placeholder="审核意见" />
                      <div class="flex gap-2">
                        <el-button :icon="Check" type="success" @click="handleReview(row, 'approved')">通过</el-button>
                        <el-button :icon="Close" type="danger" @click="handleReview(row, 'rejected')">驳回</el-button>
                      </div>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              <el-pagination
                v-model:current-page="approvalPage"
                :page-size="20"
                :total="approvalTotal"
                layout="prev, pager, next, total"
                class="mt-3"
                @current-change="loadApprovals"
              />
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 社区举报 -->
        <el-tab-pane label="社区举报" name="report">
          <el-card class="rpa-admin-card" shadow="never">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-base font-bold">
                  <el-icon><Warning /></el-icon>
                  <span>社区举报审核</span>
                </div>
                <el-select
                  v-model="reportValidFilter"
                  class="w-36"
                  @change="reportPage = 1; loadReports()"
                >
                  <el-option label="全部" value="" />
                  <el-option label="未处理" value="true" />
                  <el-option label="已处理" value="false" />
                </el-select>
              </div>
            </template>
            <el-table :data="reportList" v-loading="loading" class="rpa-admin-table" size="large">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="resource_type_name" label="资源" width="110" />
              <el-table-column prop="resource_id" label="资源ID" min-width="110" />
              <el-table-column prop="reason_name" label="举报理由" width="110" />
              <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
              <el-table-column prop="mid" label="举报人" width="110" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.is_valid ? 'warning' : 'info'" effect="light">
                    {{ row.is_valid ? '待处理' : reportDecisionName(row.decision) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="100" v-if="isAdmin">
                <template #default="{ row }">
                  <el-button
                    :icon="Search"
                    type="primary"
                    link
                    @click="openReview(row)"
                    :disabled="!row.is_valid"
                  >审核</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-model:current-page="reportPage"
              :page-size="20"
              :total="reportTotal"
              layout="prev, pager, next, total"
              class="mt-3"
              @current-change="loadReports"
            />
          </el-card>
        </el-tab-pane>

        <!-- 操作审计 -->
        <el-tab-pane label="操作审计" name="audit">
          <el-card class="rpa-admin-card" shadow="never">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-base font-bold">
                  <el-icon><Document /></el-icon>
                  <span>操作审计日志</span>
                </div>
                <el-select
                  v-model="auditActionFilter"
                  class="w-44"
                  placeholder="全部操作"
                  @change="auditPage = 1; loadAudit()"
                >
                  <el-option label="全部操作" value="" />
                  <el-option label="授予管理员" value="role:grant" />
                  <el-option label="撤销管理员" value="role:revoke" />
                  <el-option label="官方认证" value="cert:certify" />
                  <el-option label="撤销认证" value="cert:revoke" />
                  <el-option label="创建标签" value="tag:create" />
                  <el-option label="更新标签" value="tag:update" />
                  <el-option label="删除标签" value="tag:delete" />
                  <el-option label="审批审核" value="approval:review" />
                  <el-option label="举报审核" value="report:review" />
                  <el-option label="举报标记无效" value="report:mark_invalid" />
                </el-select>
              </div>
            </template>
            <el-table :data="auditList" v-loading="loading" class="rpa-admin-table" size="large">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="admin_mid" label="管理员mid" width="120" />
              <el-table-column label="操作" min-width="120">
                <template #default="{ row }">
                  {{ auditActionName(row.action) }}
                </template>
              </el-table-column>
              <el-table-column prop="target_type" label="目标类型" width="110" />
              <el-table-column prop="target_id" label="目标ID" min-width="120" />
              <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
              <el-table-column prop="created_at" label="时间" min-width="170" />
            </el-table>
            <el-pagination
              v-model:current-page="auditPage"
              :page-size="50"
              :total="auditTotal"
              layout="prev, pager, next, total"
              class="mt-3"
              @current-change="loadAudit"
            />
          </el-card>
        </el-tab-pane>

        <!-- 官方认证 -->
        <el-tab-pane label="官方认证" name="cert">
          <div class="grid gap-4 md:grid-cols-2">
            <el-card class="rpa-admin-card" shadow="never" v-if="isAdmin">
              <template #header>
                <div class="flex items-center gap-2 text-base font-bold">
                  <el-icon><Medal /></el-icon>
                  <span>标注官方认证</span>
                </div>
              </template>
              <el-form label-position="top">
                <el-form-item label="资源类型">
                  <el-select v-model="certForm.target_type" class="w-full">
                    <el-option label="复合操作" value="action" />
                    <el-option label="工作流" value="workflow" />
                    <el-option label="插件" value="plugin" />
                  </el-select>
                </el-form-item>
                <el-form-item label="资源 ID">
                  <el-input v-model="certForm.target_id" placeholder="资源 ID" />
                </el-form-item>
                <el-form-item label="备注">
                  <el-input v-model="certForm.note" type="textarea" :rows="3" placeholder="认证备注" />
                </el-form-item>
                <el-button type="primary" :icon="Medal" @click="handleCertify" class="w-full">
                  标注认证
                </el-button>
              </el-form>
            </el-card>

            <el-card class="rpa-admin-card" shadow="never">
              <template #header>
                <div class="flex items-center gap-2 text-base font-bold">
                  <el-icon><Medal /></el-icon>
                  <span>已认证资源</span>
                </div>
              </template>
              <el-table :data="certList" v-loading="loading" class="rpa-admin-table" size="large">
                <el-table-column prop="target_type" label="类型" width="100" />
                <el-table-column prop="target_id" label="资源ID" min-width="140" />
                <el-table-column prop="certified_by" label="认证人" width="100" />
                <el-table-column label="操作" width="90" v-if="isAdmin">
                  <template #default="{ row }">
                    <el-button :icon="Close" type="danger" text @click="handleRevokeCert(row)">撤销</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-pagination
                v-model:current-page="certPage"
                :page-size="20"
                :total="certTotal"
                layout="prev, pager, next, total"
                class="mt-3"
                @current-change="loadCerts"
              />
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 标签管理 -->
        <el-tab-pane label="标签管理" name="tag">
          <div class="flex justify-end mb-3 gap-2" v-if="isAdmin">
            <el-button :icon="Plus" type="primary" @click="openCreateTag">新建标签</el-button>
            <el-button :icon="CollectionTag" @click="openAttach">关联标签到资源</el-button>
          </div>
          <el-card class="rpa-admin-card" shadow="never">
            <template #header>
              <div class="flex items-center gap-2 text-base font-bold">
                <el-icon><CollectionTag /></el-icon>
                <span>标签列表</span>
              </div>
            </template>
            <el-table :data="tagList" class="rpa-admin-table" size="large">
              <el-table-column label="颜色" width="80">
                <template #default="{ row }">
                  <span class="inline-block w-5 h-5 rounded" :style="{ backgroundColor: row.color }"></span>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="名称" min-width="140" />
              <el-table-column prop="created_by" label="创建者" width="100" />
              <el-table-column label="操作" width="160" v-if="isAdmin">
                <template #default="{ row }">
                  <el-button :icon="Check" text @click="openEditTag(row)">编辑</el-button>
                  <el-button :icon="Close" type="danger" text @click="handleDeleteTag(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-model:current-page="tagPage"
              :page-size="100"
              :total="tagTotal"
              layout="prev, pager, next, total"
              class="mt-3"
              @current-change="loadTags"
            />
          </el-card>
        </el-tab-pane>

        <!-- 管理员管理（root） -->
        <el-tab-pane label="管理员权限" name="admin" v-if="isRoot">
          <el-card class="rpa-admin-card" shadow="never">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-base font-bold">
                  <el-icon><User /></el-icon>
                  <span>管理员列表（仅 root 可管理）</span>
                </div>
                <div class="flex gap-2">
                  <el-input v-model="grantMid" placeholder="用户 mid" class="w-32" />
                  <el-input v-model="grantNote" placeholder="备注" class="w-40" />
                  <el-button :icon="Plus" type="primary" @click="handleGrant">授予管理员</el-button>
                </div>
              </div>
            </template>
            <el-table :data="adminList" v-loading="loading" class="rpa-admin-table" size="large">
              <el-table-column prop="mid" label="用户 mid" width="120" />
              <el-table-column prop="granted_by" label="授予者" width="110" />
              <el-table-column prop="permissions" label="权限" min-width="160">
                <template #default="{ row }">
                  <el-tag v-for="p in row.permissions" :key="p" class="mr-1 mb-1" effect="light">{{ p }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="note" label="备注" min-width="140" />
              <el-table-column label="操作" width="90">
                <template #default="{ row }">
                  <el-button :icon="Close" type="danger" text @click="handleRevoke(row)">撤销</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-model:current-page="adminPage"
              :page-size="20"
              :total="adminTotal"
              layout="prev, pager, next, total"
              class="mt-3"
              @current-change="loadAdmins"
            />
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </FlexContainer>

    <!-- 标签编辑弹窗 -->
    <el-dialog v-model="tagDialogVisible" title="标签" width="420px">
      <el-form label-position="top">
        <el-form-item label="名称">
          <el-input v-model="tagForm.name" placeholder="标签名称" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="tagForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTag">保存</el-button>
      </template>
    </el-dialog>

    <!-- 关联标签弹窗 -->
    <el-dialog v-model="attachDialogVisible" title="关联标签到资源" width="420px">
      <el-form label-position="top">
        <el-form-item label="标签">
          <el-select v-model="attachForm.tag_id" class="w-full">
            <el-option v-for="t in tagList" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源类型">
          <el-select v-model="attachForm.target_type" class="w-full">
            <el-option label="复合操作" value="action" />
            <el-option label="工作流" value="workflow" />
            <el-option label="插件" value="plugin" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源 ID">
          <el-input v-model="attachForm.target_id" placeholder="资源 ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="attachDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAttach">关联</el-button>
      </template>
    </el-dialog>

    <!-- 举报审核弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="审核举报" width="480px">
      <div class="flex flex-col gap-3">
        <el-descriptions :column="1" border size="small" v-if="reviewTarget">
          <el-descriptions-item label="资源">{{ reviewTarget.resource_type_name }} #{{ reviewTarget.resource_id }}</el-descriptions-item>
          <el-descriptions-item label="举报人">{{ reviewTarget.mid }}</el-descriptions-item>
          <el-descriptions-item label="理由">{{ reviewTarget.reason_name }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ reviewTarget.description }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-position="top">
          <el-form-item label="处理决策">
            <el-select v-model="reviewForm.decision" class="w-full">
              <el-option label="标记无效（忽略）" value="ignore" />
              <el-option label="警告被举报人（通知待私信系统）" value="warn" />
              <el-option label="下架资源" value="takedown" />
            </el-select>
          </el-form-item>
          <el-form-item label="审核备注">
            <el-input v-model="reviewForm.review_note" type="textarea" :rows="3" placeholder="审核备注（可选）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReview">提交审核</el-button>
      </template>
    </el-dialog>
  </FlexContainer>
</template>
