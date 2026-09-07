<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'
import { businessHandler } from '@/utils/businessHandler'
import { client } from '@/api/browser/hey-api/client.gen'

interface AuditItem {
  id: number
  admin_mid: number
  action: string
  target_type: string
  target_id: string
  detail: string
  created_at: string
}

const adminStore = useRpaAdminStore()
const userNavStore = useUserNavStore()
const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

const loading = ref(false)
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

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) loadAudit()
})
</script>

<template>
  <div class="rpa-audit-admin">
    <h2 class="mb-4 text-lg font-bold text-text-primary">操作审计</h2>

    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <el-card v-else class="rpa-admin-card" shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-base font-bold">
            <el-icon><Document /></el-icon>
            <span>操作审计日志</span>
          </div>
          <el-select v-model="auditActionFilter" class="w-44" placeholder="全部操作" @change="auditPage = 1; loadAudit()">
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
  </div>
</template>
