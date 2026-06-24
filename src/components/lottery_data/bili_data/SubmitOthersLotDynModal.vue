<template>
  <el-button round type="primary" :icon="Upload" class="submit-btn" @click="openDialog">
    提交抽奖
  </el-button>

  <el-dialog
    v-model="dialogVisible"
    title="提交第三方抽奖动态"
    width="550px"
    :close-on-click-modal="true"
  >
    <el-alert
      title="提交第三方（非官方号）发布的抽奖动态，后台将自动获取动态详情并解析"
      type="info"
      :closable="false"
      show-icon
      class="mb-4"
    />

    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="动态链接" prop="dynamicUrl">
        <el-input
          v-model="form.dynamicUrl"
          placeholder="请输入B站动态链接或动态ID"
          clearable
        >
          <template #prepend>
            <el-icon><Link /></el-icon>
          </template>
          <template #append>
            <el-button
              :icon="DocumentCopy"
              @click="handlePaste"
              :disabled="loading"
            >
              粘贴
            </el-button>
          </template>
        </el-input>
        <div class="form-tip">
          支持：https://t.bilibili.com/xxxxx 或直接输入动态ID
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button :icon="RefreshLeft" @click="handleReset" :disabled="loading">
        重置
      </el-button>
      <el-button
        type="primary"
        :icon="Check"
        :loading="loading"
        @click="handleSubmit"
      >
        {{ loading ? '提交中...' : '提交' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { usePermission } from '@vueuse/core'
import biliMessage from '@/utils/message'
import { Upload, Link, Check, RefreshLeft, DocumentCopy } from '@element-plus/icons-vue'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref()
const clipboardReadPermission = usePermission('clipboard-read')

const form = reactive({
  dynamicUrl: ''
})

const rules = {
  dynamicUrl: [
    {
      validator: (_rule: any, _value: any, callback: any) => {
        if (!form.dynamicUrl) {
          callback(new Error('请输入动态链接'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const openDialog = () => {
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  handleReset()
}

// 粘贴功能
const handlePaste = async () => {
  if (clipboardReadPermission.value !== 'granted' && clipboardReadPermission.value !== 'prompt') {
    biliMessage.error('浏览器不支持剪贴板访问或未授予权限，请手动粘贴')
    return
  }

  try {
    const clipText = await navigator.clipboard.readText()
    form.dynamicUrl = clipText
    biliMessage.success('已从剪贴板粘贴')
  } catch (err) {
    biliMessage.error('无法访问剪贴板，请手动粘贴')
  }
}

// 提交处理
const handleSubmit = async () => {
  if (!form.dynamicUrl) {
    biliMessage.warning('请输入动态链接')
    return
  }

  loading.value = true
  try {
    await formRef.value?.validate()
    const resp = await lotteryDataBaseApi.addOthersLotDyn(form.dynamicUrl.trim())
    if (resp.code === 0 && resp.data) {
      if (resp.data.is_succ) {
        biliMessage.success(resp.data.msg || '提交成功')
        closeDialog()
      } else {
        biliMessage.error(resp.data.msg || '提交失败')
      }
    } else {
      biliMessage.error(resp.msg || '提交失败')
    }
  } catch (error: any) {
    biliMessage.error(error.message || '提交失败')
  } finally {
    loading.value = false
  }
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
  form.dynamicUrl = ''
}
</script>
