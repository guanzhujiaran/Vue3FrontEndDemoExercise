<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\BrowserManagementView.vue
 * @Description: RPA浏览器控制台 - 统一管理浏览器自动化操作和调试
-->
<template>
  <div class="w-full">
    <!-- 标签页导航 -->
    <el-tabs v-model="activeTab" type="card" class="mb-4">
      <el-tab-pane label="RPA浏览器控制台" name="unified" :lazy="true">
        <FingerprintList 
          :fingerprints="fingerprints" 
          :loading="loading" 
          @refresh="loadFingerprints"
          @edit="handleEditFingerprint" 
          @delete="handleDeleteFingerprint" 
          @start="handleQuickStart"
          @create="handleCreateFingerprint" 
        />
      </el-tab-pane>
      <el-tab-pane label="全局配置" name="global" :lazy="true">
        <GlobalConfigManagement />
      </el-tab-pane>
    </el-tabs>

    <!-- 浏览器调试面板对话框 -->
    <el-dialog 
      v-model="showDebugPanel" 
      title="浏览器控制台"
      width="95%"
      top="2vh"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <BrowserDebugPanel 
        v-if="showDebugPanel && selectedFingerprint"
        :browser-id="String(selectedFingerprint.id)" 
      />
    </el-dialog>

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
        <el-text class="flex justify-end gap-2" tag="span">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitForm" :loading="submitLoading">
            {{ isEditMode ? '保存' : '创建' }}
          </el-button>
        </el-text>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import biliMessage from '@/utils/message'
import FingerprintList from '@/components/browser/FingerprintList.vue'
import FingerprintEditForm from '@/components/browser/FingerprintEditForm.vue'
import GlobalConfigManagement from '@/components/browser/GlobalConfigManagement.vue'
import BrowserDebugPanel from '@/components/browser/BrowserDebugPanel.vue'
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
const showDebugPanel = ref(false)
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
    errorMessage: '加载指纹列表失败',
    showSuccessToast: false // 查询操作不显示成功提示
  })

  if (result.success && result.data) {
    fingerprints.value = result.data.items || []
  }

  loading.value = false
}

const debouncedLoadFingerprints = useDebounceFn(loadFingerprints, 500)

// 处理快速启动（打开调试面板）
const handleQuickStart = (fingerprint: UserBrowserInfoReadResp) => {
  selectedFingerprint.value = fingerprint
  showDebugPanel.value = true
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
    biliMessage.error('操作失败，请重试')
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
      biliMessage.success('随机指纹生成成功')
    }
  } catch (error) {
    console.error('生成随机指纹失败:', error)
    biliMessage.error('生成随机指纹失败，请重试')
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

