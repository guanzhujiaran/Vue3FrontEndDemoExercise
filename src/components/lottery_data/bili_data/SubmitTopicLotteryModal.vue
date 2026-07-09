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
      :effect="themeStore.themeEffectString"
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

      <el-form-item label="批量提交" prop="batchIds">
        <el-input
          v-model="form.batchIds"
          type="textarea"
          :rows="4"
          placeholder="批量提交请在此输入，每行一个话题 ID"
          clearable
        />
        <div class="form-tip">每行一个话题 ID，最多支持50个</div>
      </el-form-item>
    </el-form>

    <!-- 批量提交结果展示 -->
    <el-collapse v-if="batchResults.length > 0" class="mt-4">
      <el-collapse-item title="批量提交结果" name="results">
        <el-table
          :data="batchResults"
          stripe
          style="width: 100%"
          max-height="200"
        >
          <el-table-column prop="topic_id" label="话题 ID" width="180" />
          <el-table-column prop="is_succ" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.is_succ ? 'success' : 'danger'">
                {{ row.is_succ ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="msg" label="消息" show-overflow-tooltip />
        </el-table>
      </el-collapse-item>
    </el-collapse>

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
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref()
const batchResults = ref<any[]>([])

const form = reactive({
  topicId: '',
  batchIds: ''
})

const rules = {
  topicId: [
    {
      validator: (_rule: any, _value: any, callback: any) => {
        if (!form.topicId && !form.batchIds) {
          callback(new Error('请输入话题 ID 或批量提交内容'))
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

// 单个提交
const handleSingleSubmit = async (topicId: string) => {
  try {
    const resp = await lotteryDataBaseApi.addTopicLottery(topicId.trim())
    return resp
  } catch (error) {
    return {
      code: -1,
      msg: '提交失败',
      data: undefined
    }
  }
}

// 批量提交
const handleBatchSubmit = async () => {
  const ids = form.batchIds
    .split('\n')
    .map(u => u.trim())
    .filter(u => u)
    .slice(0, 50) // 限制最多50个

  if (ids.length === 0) {
    return
  }

  try {
    const resp = await lotteryDataBaseApi.bulkAddTopicLottery(ids)

    if (resp.code === 0 && resp.data) {
      batchResults.value = resp.data.map(item => ({
        topic_id: item.topic_id,
        is_succ: item.is_succ,
        msg: item.msg,
        is_new: item.is_new
      }))

      const successCount = batchResults.value.filter(r => r.is_succ).length

      if (successCount === ids.length) {
        biliMessage.success(`批量提交成功 ${successCount}/${ids.length}`)
        closeDialog()
      } else {
        biliMessage.info(`批量提交完成 成功 ${successCount}/${ids.length}`)
      }
    } else {
      biliMessage.error(resp.msg || '批量提交失败')
    }
  } catch (error: any) {
    biliMessage.error(error.message || '批量提交失败')
  }
}

// 提交处理
const handleSubmit = async () => {
  if (!form.topicId && !form.batchIds) {
    biliMessage.warning('请输入话题 ID 或批量提交内容')
    return
  }

  loading.value = true

  try {
    if (form.batchIds) {
      // 批量提交
      await handleBatchSubmit()
    } else if (form.topicId) {
      // 单个提交
      await formRef.value?.validate()
      const resp = await handleSingleSubmit(form.topicId)
      if (resp.code === 0) {
        biliMessage.success('提交成功')
        closeDialog()
      } else {
        biliMessage.error(resp.msg)
      }
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
  form.topicId = ''
  form.batchIds = ''
  batchResults.value = []
}
</script>
