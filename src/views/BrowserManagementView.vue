<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\BrowserManagementView.vue
 * @Description: 浏览器管理页面 - 统一管理浏览器指纹和工作区
-->
<template>
  <div class="browser-management-view">
    <!-- 标签页导航 -->
    <el-tabs v-model="activeTab" type="card" class="mb-4">
      <el-tab-pane label="统一浏览器管理" name="unified" :lazy="true">
        <FingerprintCardList :fingerprints="fingerprints" :loading="loading" @refresh="loadFingerprints"
          @edit="handleEditFingerprint" @delete="handleDeleteFingerprint" @quickStart="handleQuickStart"
          @configNotify="handleConfigNotify" @create="handleCreateFingerprint" />
      </el-tab-pane>
      <el-tab-pane label="全局配置" name="global" :lazy="true">
        <GlobalConfigManagement />
      </el-tab-pane>
    </el-tabs>

    <!-- 实时控制Modal -->
    <RealTimeControlModal v-model="showRealTimeControl" :fingerprint="selectedFingerprint"
      @save="handleSaveControlConfig" />

    <!-- 通知配置Modal -->
    <NotifyConfigModal v-model="showNotifyConfig" :fingerprint="selectedFingerprint" @refresh="loadFingerprints" />

    <!-- 指纹编辑/新建Modal -->
    <el-dialog 
      v-model="showEditDialog" 
      :title="isEditMode ? `编辑指纹 - ${selectedFingerprint?.id_str || selectedFingerprint?.id}` : '新建指纹'"
      width="800px" 
      destroy-on-close
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <FingerprintEditForm 
        ref="editFormRef" 
        :fingerprint="selectedFingerprint" 
        :default-data="generatedFingerprintData"
        @submit="handleSaveFingerprint"
        @generateRandom="handleGenerateRandom" 
      />
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitForm" :loading="submitLoading">
            {{ isEditMode ? '保存' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import FingerprintCardList from '@/components/browser/FingerprintCardList.vue'
import FingerprintEditForm from '@/components/browser/FingerprintEditForm.vue'
import GlobalConfigManagement from '@/components/browser/GlobalConfigManagement.vue'
import RealTimeControlModal from '@/components/browser/RealTimeControlModal'
import NotifyConfigModal from '@/components/browser/NotifyConfigModal.vue'
import browserApi from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import type { 
  UserBrowserInfoListParams, 
  UserBrowserInfoReadResp,
  BrowserFingerprintUpsertParams 
} from '@/types/browser-automation-api'

const activeTab = ref('unified')
const loading = ref(false)
const fingerprints = ref<UserBrowserInfoReadResp[]>([])

// Modal控制
const showRealTimeControl = ref(false)
const showNotifyConfig = ref(false)
const showEditDialog = ref(false)
const selectedFingerprint = ref<UserBrowserInfoReadResp | null>(null)
const isEditMode = ref(false)
const submitLoading = ref(false)
const editFormRef = ref<InstanceType<typeof FingerprintEditForm>>()
const generatedFingerprintData = ref<any>(null)

// 加载指纹列表
const loadFingerprints = async () => {
  loading.value = true
  const params: UserBrowserInfoListParams = {
    page: 1,
    per_page: 20
  }

  const result = await businessHandler(browserApi.listFingerprint(params), {
    errorMessage: '加载指纹列表失败'
  })

  if (result.success && result.data) {
    fingerprints.value = result.data.items || []
  }

  loading.value = false
}

const debouncedLoadFingerprints = useDebounceFn(loadFingerprints, 500)

// 处理快速启动（实时控制）
const handleQuickStart = (fingerprint: UserBrowserInfoReadResp) => {
  selectedFingerprint.value = fingerprint
  showRealTimeControl.value = true
}

// 处理编辑指纹
const handleEditFingerprint = (fingerprint: UserBrowserInfoReadResp) => {
  selectedFingerprint.value = fingerprint
  isEditMode.value = true
  generatedFingerprintData.value = null
  showEditDialog.value = true
}

// 处理删除指纹
const handleDeleteFingerprint = async (fingerprint: UserBrowserInfoReadResp) => {
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

// 处理配置通知
const handleConfigNotify = (fingerprint: UserBrowserInfoReadResp) => {
  selectedFingerprint.value = fingerprint
  showNotifyConfig.value = true
}

// 处理保存控制配置
const handleSaveControlConfig = (config: any) => {
  console.log('保存控制配置:', config)
  ElMessage.success('控制配置保存成功')
}

// 处理保存指纹
const handleSaveFingerprint = async (data: BrowserFingerprintUpsertParams) => {
  submitLoading.value = true
  
  try {
    if (isEditMode.value) {
      // 编辑模式：使用upsert接口
      const result = await businessHandler(
        browserApi.upsertFingerprint(data),
        {
          successMessage: '指纹更新成功',
          errorMessage: '指纹更新失败'
        }
      )
      
      if (result.success) {
        showEditDialog.value = false
        await loadFingerprints()
      }
    } else {
      // 新建模式：使用upsert接口
      const result = await businessHandler(
        browserApi.upsertFingerprint(data),
        {
          successMessage: '指纹创建成功',
          errorMessage: '指纹创建失败'
        }
      )
      
      if (result.success) {
        showEditDialog.value = false
        await loadFingerprints()
      }
    }
  } catch (error) {
    console.error('保存指纹失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

// 处理表单提交
const handleSubmitForm = async () => {
  if (editFormRef.value) {
    await editFormRef.value.submitForm()
  }
}

// 处理生成随机指纹
const handleGenerateRandom = async () => {
  try {
    const result = await businessHandler(
      browserApi.genRandFingerprint({}),
      {
        errorMessage: '生成随机指纹失败'
      }
    )
    
    if (result.success && result.data) {
      generatedFingerprintData.value = result.data
      ElMessage.success('随机指纹生成成功')
    }
  } catch (error) {
    console.error('生成随机指纹失败:', error)
    ElMessage.error('生成随机指纹失败，请重试')
  }
}

// 处理对话框关闭
const handleDialogClosed = () => {
  generatedFingerprintData.value = null
  submitLoading.value = false
}

// 处理新建指纹
const handleCreateFingerprint = () => {
  selectedFingerprint.value = null
  isEditMode.value = false
  generatedFingerprintData.value = null
  showEditDialog.value = true
}

// 首次加载
onMounted(() => {
  debouncedLoadFingerprints()
})
</script>

<style scoped>
.browser-management-view {
  width: 100%;
}

.edit-dialog-content {
  padding: 20px 0;
  text-align: center;
}

.edit-dialog-content p {
  margin: 8px 0;
  color: var(--el-text-color-regular);
}
</style>