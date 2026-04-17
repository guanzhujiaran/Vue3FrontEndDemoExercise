<template>
  <el-button round type="primary" :icon="Upload" class="submit-btn" @click="openDialog">
    提交话题
  </el-button>

    <el-dialog
      v-model="dialogVisible"
      title="提交话题抽奖"
      width="500px"
      :close-on-click-modal="true"
    >
      <el-alert
        title="提交 B 站话题活动抽奖"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />

      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="话题 ID" prop="topicId">
          <el-input
            v-model="form.topicId"
            placeholder="请输入 B 站话题 ID"
            clearable
          >
            <template #prepend>
              <el-icon><Promotion /></el-icon>
            </template>
          </el-input>
          <div class="form-tip">
            从话题链接中获取：https://www.bilibili.com/topic/xxxxx 中的 xxxxx
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
import biliMessage from '@/utils/message'
import { Upload, Check, RefreshLeft, Promotion } from '@element-plus/icons-vue'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref()

const form = reactive({
  topicId: ''
})

const rules = {
  topicId: [
    { required: true, message: '请输入话题 ID', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: '话题 ID 格式不正确',
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

// 提交处理
const handleSubmit = async () => {
  if (!form.topicId) {
    biliMessage.warning('请输入话题 ID')
    return
  }

  await formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true

    try {
      const resp = await lotteryDataBaseApi.handle_add_topic_lottery_data({
        topic_id: form.topicId
      })

      if (resp.code === 0) {
        biliMessage.success('提交成功')
        closeDialog()
      } else {
        biliMessage.error(resp.msg)
      }
    } catch (error: any) {
      biliMessage.error(error.message || '提交失败')
    } finally {
      loading.value = false
    }
  })
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
  form.topicId = ''
}
</script>



