<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\BrowserManagementPanelView.vue
 * @Description: 浏览器管理面板 - 指纹列表、全局配置
-->
<template>
  <div class="browser-management-panel">
    <el-tabs v-model="activeTab" type="card" class="mb-4 flex-1">
      <el-tab-pane label="RPA浏览器控制台" name="unified" :lazy="true">
        <FingerprintList 
          :fingerprints="fingerprints" 
          :loading="loading" 
          @refresh="loadFingerprints"
          @view="handleViewFingerprint"
          @edit="handleEditFingerprint" 
          @delete="handleDeleteFingerprint" 
          @start="handleQuickStart"
          @create="handleCreateFingerprint" 
          @quick-edit="handleQuickEdit"
        />
      </el-tab-pane>
      <el-tab-pane label="全局配置" name="global" :lazy="true">
        <GlobalConfigManagement />
      </el-tab-pane>
    </el-tabs>

    <NotifyConfigModal v-model="showNotifyConfig" :fingerprint="selectedFingerprint" @refresh="loadFingerprints" />
    <FingerprintDetailDialog v-model:visible="showDetailDialog" :fingerprint="selectedFingerprint" />

    <el-dialog 
      v-model="showEditDialog" 
      :title="isEditMode ? `编辑指纹 - ${selectedFingerprint?.custom_name || selectedFingerprint?.id_str || selectedFingerprint?.id}` : '新建浏览器指纹'"
      width="820px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
      align-center
    >
      <FingerprintEditForm 
        ref="editFormRef" 
        :fingerprint="selectedFingerprint" 
        :default-data="generatedFingerprintData"
        @submit="handleSaveFingerprint"
        @generateRandom="handleGenerateRandom" 
      />
      
      <template #footer>
        <div class="flex justify-between items-center w-full">
          <el-button 
            v-if="!isEditMode"
            type="info" 
            plain
            @click="handleGenerateRandom"
            :loading="generatingFingerprint"
          >
            <el-icon><MagicStick /></el-icon>
            随机生成指纹
          </el-button>
          <div v-else></div>
          <div class="flex gap-2">
            <el-button @click="showEditDialog = false">取消</el-button>
            <el-button type="primary" @click="handleSubmitForm" :loading="submitLoading">
              {{ isEditMode ? '保存更改' : '创建指纹' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import biliMessage from '@/utils/message'
import FingerprintList from '@/components/browser/FingerprintList.vue'
import FingerprintEditForm from '@/components/browser/FingerprintEditForm.vue'
import GlobalConfigManagement from '@/components/browser/GlobalConfigManagement.vue'
import NotifyConfigModal from '@/components/browser/NotifyConfigModal.vue'
import FingerprintDetailDialog from '@/components/browser/FingerprintDetailDialog.vue'
import browserApi from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import { MagicStick } from '@element-plus/icons-vue'
import { RouteName } from '@/models/router/index'
import { ElMessageBox } from 'element-plus'
import type { 
  UserBrowserInfoListParams, 
  UserBrowserInfoReadResp,
  BrowserFingerprintUpsertParams 
} from '@/types/browser-automation-api'

const router = useRouter()
const activeTab = ref('unified')
const loading = ref(false)
const fingerprints = ref<UserBrowserInfoReadResp[]>([])

const showNotifyConfig = ref(false)
const showEditDialog = ref(false)
const showDetailDialog = ref(false)
const selectedFingerprint = ref<UserBrowserInfoReadResp | null>(null)
const isEditMode = ref(false)
const submitLoading = ref(false)
const generatingFingerprint = ref(false)
const editFormRef = ref<InstanceType<typeof FingerprintEditForm>>()
const generatedFingerprintData = ref<any>(null)

const loadFingerprints = async () => {
  loading.value = true
  const params: UserBrowserInfoListParams = {
    page: 1,
    per_page: 50
  }

  const result = await businessHandler(browserApi.listFingerprint(params), {
    errorMessage: '加载指纹列表失败',
    showSuccessToast: false
  })

  if (result.success && result.data) {
    fingerprints.value = result.data.items || []
  }

  loading.value = false
}

const debouncedLoadFingerprints = useDebounceFn(loadFingerprints, 500)

const handleQuickStart = (fingerprint: UserBrowserInfoReadResp) => {
  const browserId = String(fingerprint.id_str || fingerprint.id)
  router.push({ name: RouteName.BROWSER_CONSOLE, params: { browserId } })
}

const handleViewFingerprint = (fingerprint: UserBrowserInfoReadResp) => {
  selectedFingerprint.value = fingerprint
  showDetailDialog.value = true
}

const handleQuickEdit = async (browserId: string, newName: string) => {
  try {
    const result = await businessHandler(
      browserApi.renameFingerprint({ id: browserId, custom_name: newName }),
      { successMessage: '名称修改成功', errorMessage: '名称修改失败' }
    )
    if (result.success) {
      const idx = fingerprints.value.findIndex(
        (f) => String(f.id_str || f.id) === String(browserId)
      )
      if (idx !== -1) {
        fingerprints.value[idx] = { ...fingerprints.value[idx], custom_name: newName }
      }
    }
  } catch {
    biliMessage.error('名称修改失败')
  }
}

const handleEditFingerprint = (fingerprint: UserBrowserInfoReadResp) => {
  selectedFingerprint.value = fingerprint
  isEditMode.value = true
  generatedFingerprintData.value = null
  showEditDialog.value = true
}

const handleDeleteFingerprint = async (fingerprint: UserBrowserInfoReadResp) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除指纹「${fingerprint.custom_name || fingerprint.id_str || fingerprint.id}」吗？删除后无法恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }

  try {
    const result = await businessHandler(
      browserApi.deleteFingerprint({
        browser_id: fingerprint.id_str
      }),
      {
        successMessage: '指纹删除成功',
        errorMessage: '指纹删除失败'
      }
    )

    if (result.success) {
      await loadFingerprints()
    }
  } catch (error) {
    console.error('删除指纹失败:', error)
  }
}

const handleSaveFingerprint = async (data: BrowserFingerprintUpsertParams) => {
  submitLoading.value = true
  
  try {
    const result = await businessHandler(
      browserApi.upsertFingerprint(data),
      {
        successMessage: isEditMode.value ? '指纹更新成功' : '指纹创建成功',
        errorMessage: isEditMode.value ? '指纹更新失败' : '指纹创建失败'
      }
    )
    
    if (result.success) {
      showEditDialog.value = false
      await loadFingerprints()
    }
  } catch (error) {
    console.error('保存指纹失败:', error)
    biliMessage.error('操作失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

const handleSubmitForm = async () => {
  if (editFormRef.value) {
    await editFormRef.value.submitForm()
  }
}

const handleGenerateRandom = async () => {
  generatingFingerprint.value = true
  try {
    const result = await businessHandler(
      browserApi.genRandFingerprint({}),
      { errorMessage: '生成随机指纹失败' }
    )
    
    if (result.success && result.data) {
      generatedFingerprintData.value = result.data
      biliMessage.success('随机指纹生成成功')
    }
  } catch (error) {
    console.error('生成随机指纹失败:', error)
    biliMessage.error('生成随机指纹失败，请重试')
  } finally {
    generatingFingerprint.value = false
  }
}

const handleDialogClosed = () => {
  generatedFingerprintData.value = null
  submitLoading.value = false
}

const handleCreateFingerprint = () => {
  selectedFingerprint.value = null
  isEditMode.value = false
  generatedFingerprintData.value = null
  showEditDialog.value = true
}

onMounted(() => {
  debouncedLoadFingerprints()
})
</script>