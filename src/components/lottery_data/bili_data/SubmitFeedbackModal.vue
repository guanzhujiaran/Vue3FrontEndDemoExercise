<template>
  <el-button v-if="showTrigger" round type="warning" :icon="ChatLineRound" class="feedback-btn" @click="openDialog">
    反馈bug
  </el-button>

  <el-dialog
    v-model="dialogVisible"
    title="反馈bug"
    width="500px"
    :close-on-click-modal="true"
    :lock-scroll="false"
  >
    <el-alert
      title="反馈bug/提建议给服主，可以帮助我们改进系统，提供更好的体验！"
      type="info"
      :effect="themeStore.themeEffectString"
      :closable="false"
      show-icon
      class="mb-4"
    />
    <el-alert
      title="反馈将直接推送到服主本人的推送设置，请在下方选择反馈来源渠道以便服主区分。"
      type="warning"
      :effect="themeStore.themeEffectString"
      :closable="false"
      show-icon
      class="mb-4"
    />

    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="反馈渠道" prop="source">
        <el-select v-model="form.source" placeholder="请选择反馈来源渠道" style="width: 100%">
          <el-option
            v-for="item in sourceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="反馈内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="6"
          placeholder="请输入您的反馈内容，包括问题描述、建议等..."
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="联系方式" prop="contact">
        <el-input
          v-model="form.contact"
          placeholder="选填，方便服主回复您（QQ / 邮箱 / 微信等）"
          maxlength="100"
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
import { ref, reactive, watch } from 'vue'
import biliMessage from '@/utils/message'
import { ChatLineRound, Check, RefreshLeft } from '@element-plus/icons-vue'
import { submitFeedback } from '@/api/notify/message_feedback'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    /** 反馈来源渠道：不同页面传入不同值，便于服主区分推送来自哪里 */
    source?: string
    /** 是否渲染内置的触发按钮，设为 false 时可仅作为弹窗由父组件 ref 调用 openDialog 打开 */
    showTrigger?: boolean
  }>(),
  {
    source: '抽奖数据页',
    showTrigger: true,
  },
)

const themeStore = useThemeStore()

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref()

// 不同来源渠道：告诉服主这条反馈来自哪里
const sourceOptions = [
  { label: '抽奖数据页', value: '抽奖数据页' },
  { label: '首页', value: '首页' },
  { label: 'B站动态', value: 'B站动态' },
  { label: '通用建议', value: '通用建议' },
  { label: '其他', value: '其他' },
]

const form = reactive({
  source: props.source,
  content: '',
  contact: '',
})

// 父组件传入的默认来源变化时同步（仅当对话框未打开时）
watch(
  () => props.source,
  (val) => {
    if (!dialogVisible.value) {
      form.source = val
    }
  },
)

const rules = {
  source: [{ required: true, message: '请选择反馈渠道', trigger: 'change' }],
  content: [
    { required: true, message: '请输入反馈内容', trigger: 'blur' },
    { min: 5, message: '反馈内容不能少于 5 个字符', trigger: 'blur' },
  ],
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
  if (!form.content) {
    biliMessage.warning('请输入反馈内容')
    return
  }

  await formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true

    try {
      const resp = await submitFeedback({
        content: form.content,
        contact: form.contact || null,
        source: form.source || null,
      })

      if (resp.code === 0) {
        biliMessage.success('反馈提交成功！感谢您的反馈')
        closeDialog()
      } else {
        biliMessage.error(resp.msg || '提交失败')
      }
    } catch (error: any) {
      biliMessage.error(error?.message || '提交失败')
    } finally {
      loading.value = false
    }
  })
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
  form.content = ''
  form.contact = ''
  form.source = props.source
}

// 暴露给父组件，便于外部触发打开弹窗
defineExpose({ openDialog })
</script>
