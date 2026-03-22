<template>
  <el-button round type="primary" :icon="Upload" class="submit-btn" @click="openDialog">
    提交抽奖
  </el-button>

    <el-dialog
      v-model="dialogVisible"
      title="提交抽奖动态"
      width="550px"
      :close-on-click-modal="true"
    >
      <el-alert
        title="支持以下抽奖类型：官方转发抽奖、充电抽奖、预约抽奖"
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

        <el-form-item label="批量提交" prop="batchUrls">
          <el-input
            v-model="form.batchUrls"
            type="textarea"
            :rows="4"
            placeholder="批量提交请在此输入，每行一个链接或ID"
            clearable
          />
          <div class="form-tip">每行一个链接，最多支持50个</div>
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
            size="small"
          >
            <el-table-column prop="dynamic_id" label="动态ID" width="180" />
            <el-table-column prop="is_succ" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_succ ? 'success' : 'danger'" size="small">
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
import { useClipboard } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { Upload, Link, Check, RefreshLeft, DocumentCopy } from '@element-plus/icons-vue'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'
import emitter from '@/utils/mitt'
import { usePermission } from '@vueuse/core'

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref()
const batchResults = ref<any[]>([])
const clipboardReadPermission = usePermission('clipboard-read')

const form = reactive({
  dynamicUrl: '',
  batchUrls: ''
})

const rules = {
  dynamicUrl: [
    {
      validator: (_rule: any, _value: any, callback: any) => {
        if (!form.dynamicUrl && !form.batchUrls) {
          callback(new Error('请输入动态链接或批量提交内容'))
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
    ElMessage.error('浏览器不支持剪贴板访问或未授予权限，请手动粘贴')
    return
  }

  try {
    const clipText = await navigator.clipboard.readText()
    form.dynamicUrl = clipText
    ElMessage.success('已从剪贴板粘贴')
  } catch (err) {
    ElMessage.error('无法访问剪贴板，请手动粘贴')
  }
}

// 单个提交
const handleSingleSubmit = async (url: string) => {
  try {
    const resp = await lotteryDataBaseApi.handle_add_dynamic_lottery_data({
      dynamic_id_or_url: url.trim()
    })
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
  const urls = form.batchUrls
    .split('\n')
    .map(u => u.trim())
    .filter(u => u)
    .slice(0, 50) // 限制最多50个

  if (urls.length === 0) {
    return
  }

  try {
    const resp = await lotteryDataBaseApi.handle_bulk_add_dynamic_lottery_data({
      dynamic_id_or_urls: urls
    })

    if (resp.code === 0 && resp.data) {
      batchResults.value = resp.data.map(item => ({
        dynamic_id: item.dynamic_id_or_url,
        is_succ: item.is_succ,
        msg: item.msg,
        is_new: item.is_new
      }))

      const successCount = batchResults.value.filter(r => r.is_succ).length

      if (successCount === urls.length) {
        emitter.emit('toast', {
          t: `批量提交成功 ${successCount}/${urls.length}`,
          e: 'success'
        })
        closeDialog()
      } else {
        emitter.emit('toast', {
          t: `批量提交完成 成功 ${successCount}/${urls.length}`,
          e: 'info'
        })
      }
    } else {
      emitter.emit('toast', { t: resp.msg || '批量提交失败', e: 'error' })
    }
  } catch (error: any) {
    emitter.emit('toast', { t: error.message || '批量提交失败', e: 'error' })
  }
}

// 提交处理
const handleSubmit = async () => {
  if (!form.dynamicUrl && !form.batchUrls) {
    ElMessage.warning('请输入动态链接或批量提交内容')
    return
  }

  loading.value = true

  try {
    if (form.batchUrls) {
      // 批量提交
      await handleBatchSubmit()
    } else if (form.dynamicUrl) {
      // 单个提交
      await formRef.value?.validate()
      const resp = await handleSingleSubmit(form.dynamicUrl)
      if (resp.code === 0) {
        emitter.emit('toast', { t: '提交成功', e: 'success' })
        closeDialog()
      } else {
        emitter.emit('toast', { t: resp.msg, e: 'error' })
      }
    }
  } catch (error: any) {
    emitter.emit('toast', { t: error.message || '提交失败', e: 'error' })
  } finally {
    loading.value = false
  }
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
  form.dynamicUrl = ''
  form.batchUrls = ''
  batchResults.value = []
}
</script>

<style scoped>
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
