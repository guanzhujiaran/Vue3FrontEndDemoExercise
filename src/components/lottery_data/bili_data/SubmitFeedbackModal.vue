<template>
  <el-button round type="warning" :icon="ChatLineRound" class="feedback-btn" @click="openDialog">
    反馈bug
  </el-button>

    <el-dialog
      v-model="dialogVisible"
      title="反馈bug"
      width="500px"
      :close-on-click-modal="true"
    >
      <el-alert
        title="反馈bug给服主，可以帮助我们改进系统，提供更好的体验！"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />

      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="反馈bug" prop="message">
          <el-input
            v-model="form.message"
            type="textarea"
            :rows="6"
            placeholder="请输入您的反馈内容，包括问题描述、建议等..."
            maxlength="1000"
            show-word-limit
          />
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
import { ElMessage } from 'element-plus'
import { ChatLineRound, Check, RefreshLeft } from '@element-plus/icons-vue'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'
import emitter from '@/utils/mitt'

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref()

const form = reactive({
  message: ''
})

const rules = {
  message: [
    { required: true, message: '请输入反馈内容', trigger: 'blur' },
    { min: 5, message: '反馈内容不能少于 5 个字符', trigger: 'blur' }
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
  if (!form.message) {
    ElMessage.warning('请输入反馈内容')
    return
  }

  await formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true

    try {
      const resp = await lotteryDataBaseApi.handle_submit_feedback({
        message: form.message
      })

      if (resp.code === 0) {
        emitter.emit('toast', { t: '反馈提交成功！感谢您的反馈', e: 'success' })
        closeDialog()
      } else {
        emitter.emit('toast', { t: resp.msg, e: 'error' })
      }
    } catch (error: any) {
      emitter.emit('toast', { t: error.message || '提交失败', e: 'error' })
    } finally {
      loading.value = false
    }
  })
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
  form.message = ''
}
</script>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
</style>
