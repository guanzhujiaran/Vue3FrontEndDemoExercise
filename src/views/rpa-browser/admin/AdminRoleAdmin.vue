<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus, User, Close } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import { 管理员管理Service, type RpaAdminItemResp as RpaAdminItem } from '@/api/browser/hey-api'

const adminStore = useRpaAdminStore()
const isRoot = computed(() => adminStore.status.is_root)

const loading = ref(false)
const adminList = ref<RpaAdminItem[]>([])
const adminTotal = ref(0)
const adminPage = ref(1)
const grantMid = ref('')
const grantNote = ref('')

const loadAdmins = async () => {
  loading.value = true
  const res = await businessHandler(
    管理员管理Service.listAdminsApiAdminRpaRoleListPost({ body: { page: adminPage.value, per_page: 20 } }),
    { showSuccessToast: false, errorMessage: '获取管理员列表失败' }
  )
  if (res.success && res.data) {
    adminList.value = res.data.items || []
    adminTotal.value = res.data.total || 0
  }
  loading.value = false
}

const handleGrant = async () => {
  const mid = grantMid.value
  if (!mid || mid <= 0) {
    biliMessage.error('请输入有效的用户 mid')
    return
  }
  await businessHandler(管理员管理Service.grantAdminApiAdminRpaRoleGrantPost({ body: { mid, note: grantNote.value } }), {
    successMessage: '已授予管理员权限',
    errorMessage: '授予失败',
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
      type: 'warning',
    })
  } catch {
    return
  }
  await businessHandler(管理员管理Service.revokeAdminApiAdminRpaRoleRevokePost({ body: { mid: item.mid } }), {
    successMessage: '已撤销管理员权限',
    errorMessage: '撤销失败',
  })
  loadAdmins()
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isRoot.value) loadAdmins()
})
</script>

<template>
  <div class="rpa-role-admin">
    <h2 class="mb-4 text-lg font-bold text-text-primary">管理员权限</h2>

    <el-empty v-if="!isRoot" description="仅 root 可管理管理员权限" />

    <el-card v-else class="rpa-admin-card" shadow="never">
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
  </div>
</template>
