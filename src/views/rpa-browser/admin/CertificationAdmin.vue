<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Medal, Close } from '@element-plus/icons-vue'
import { useRpaAdminStore } from '@/stores/rpa_admin.ts'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import { 管理员管理Service, type CertificationItemResp as CertificationItem } from '@/api/browser/hey-api'

const adminStore = useRpaAdminStore()
const isAdmin = computed(() => adminStore.status.is_admin || adminStore.status.is_root)

const loading = ref(false)
const certList = ref<CertificationItem[]>([])
const certTotal = ref(0)
const certPage = ref(1)
const certForm = ref({ target_type: 'action', target_id: '', note: '' })

const loadCerts = async () => {
  loading.value = true
  const res = await businessHandler(
    管理员管理Service.listCertificationsApiAdminRpaCertificationListPost({ body: { page: certPage.value, per_page: 20 } }),
    { showSuccessToast: false, errorMessage: '获取认证列表失败' }
  )
  if (res.success && res.data) {
    certList.value = res.data.items || []
    certTotal.value = res.data.total || 0
  }
  loading.value = false
}

const handleCertify = async () => {
  if (!certForm.value.target_id) {
    biliMessage.error('请输入资源 ID')
    return
  }
  await businessHandler(
    管理员管理Service.certifyApiAdminRpaCertificationCertifyPost({
      body: { target_type: certForm.value.target_type, target_id: certForm.value.target_id, note: certForm.value.note },
    }),
    { successMessage: '已标注官方认证', errorMessage: '认证失败' }
  )
  certForm.value.target_id = ''
  certForm.value.note = ''
  loadCerts()
}

const handleRevokeCert = async (item: CertificationItem) => {
  try {
    await ElMessageBox.confirm('确定撤销该资源的官方认证吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  await businessHandler(
    管理员管理Service.revokeCertificationApiAdminRpaCertificationRevokePost({ body: { target_type: item.target_type, target_id: item.target_id } }),
    { successMessage: '已撤销官方认证', errorMessage: '撤销失败' }
  )
  loadCerts()
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) loadCerts()
})
</script>

<template>
  <div class="rpa-cert-admin">
    <h2 class="mb-4 text-lg font-bold text-text-primary">官方认证</h2>

    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <div v-else class="grid gap-4 md:grid-cols-2">
      <el-card class="rpa-admin-card" shadow="never">
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
  </div>
</template>
