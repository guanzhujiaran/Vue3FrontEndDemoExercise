<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\FingerprintFormDialog.vue
 * @Description: 指纹表单对话框组件
-->
<template>
  <el-dialog :title="dialogTitle" v-model="visible" width="900px" @close="handleClose">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 基本信息tab -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="140px">
          <el-form-item label="浏览器类型" prop="fingerprint_browser">
            <el-select v-model="form.fingerprint_browser" placeholder="选择浏览器类型">
              <el-option label="Chrome" value="chrome" />
              <el-option label="Edge" value="Edge" />
              <el-option label="Opera" value="Opera" />
              <el-option label="Vivaldi" value="Vivaldi" />
            </el-select>
          </el-form-item>

          <el-form-item label="操作系统" prop="fingerprint_platform">
            <el-select v-model="form.fingerprint_platform" placeholder="选择操作系统">
              <el-option label="Windows" value="windows" />
              <el-option label="Linux" value="linux" />
              <el-option label="macOS" value="macos" />
            </el-select>
          </el-form-item>

          <el-form-item label="版本号" prop="fingerprint_brand_version">
            <el-input v-model="form.fingerprint_brand_version" placeholder="浏览器版本号" />
          </el-form-item>

          <el-form-item label="CPU核心数" prop="fingerprint_hardware_concurrency">
            <el-input-number v-model="form.fingerprint_hardware_concurrency" :min="1" :max="32" />
          </el-form-item>

          <el-form-item label="GPU厂商" prop="fingerprint_gpu_vendor">
            <el-input v-model="form.fingerprint_gpu_vendor" placeholder="GPU厂商" />
          </el-form-item>

          <el-form-item label="GPU渲染器" prop="fingerprint_gpu_renderer">
            <el-input v-model="form.fingerprint_gpu_renderer" placeholder="GPU渲染器" />
          </el-form-item>

          <el-form-item label="语言" prop="lang">
            <el-input v-model="form.lang" placeholder="浏览器语言" />
          </el-form-item>

          <el-form-item label="Accept-Language" prop="accept_lang">
            <el-input v-model="form.accept_lang" placeholder="Accept-Language" />
          </el-form-item>

          <el-form-item label="时区" prop="timezone">
            <el-input v-model="form.timezone" placeholder="时区" />
          </el-form-item>

          <el-form-item label="代理服务器" prop="proxy_server">
            <el-input v-model="form.proxy_server" placeholder="代理服务器地址" />
          </el-form-item>

          <el-form-item label="设备类型" prop="is_desktop">
            <el-switch v-model="form.is_desktop" active-text="桌面" inactive-text="移动" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 通知配置tab -->
      <el-tab-pane label="通知配置" name="notification" v-if="isEditMode">
        <NotificationConfigPanel :config="notificationConfig" :loading="loadingNotification"
          :saving="savingNotification" :saved="notificationSaved" @change="handleNotificationChange"
          @save="saveNotification" @reset="resetNotification" @initialize="initializeNotification" />
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <span class="dialog-footer">
        <el-button type="success" @click="generateRandomConfig" :loading="generatingRandom">
          <el-icon>
            <Refresh />
          </el-icon>
          生成随机配置
        </el-button>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import biliMessage from '@/utils/message'
import type { FormInstance, FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import NotificationConfigPanel from './NotificationConfigPanel.vue'
import browserApi from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import { asyncHandler } from '@/utils/asyncHandler'
import type {
  UserBrowserInfoCreateParams,
  UserBrowserInfoUpdateParams,
  UserBrowserInfoReadResp,
  NotificationConfigCreate
} from '@/types/browser-automation-api'

// 定义Model
const visible = defineModel<boolean>('visible', { default: false })

// 定义Props
interface Props {
  selectedFingerprint?: UserBrowserInfoReadResp | null
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedFingerprint: null,
  submitting: false
})

// 定义Emit
const emit = defineEmits<{
  submit: [formData: UserBrowserInfoCreateParams | UserBrowserInfoUpdateParams]
  'generate-random-config': []
  close: []
}>()

// 随机生成状态
const generatingRandom = ref(false)

// 当前激活的tab
const activeTab = ref('basic')

// 通知配置相关
const notificationConfig = ref<NotificationConfigCreate | null>(null)
const loadingNotification = ref(false)
const savingNotification = ref(false)
const notificationSaved = ref(true)
const notificationLoaded = ref(false) // 标记通知配置是否已加载

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const form = reactive<UserBrowserInfoCreateParams & UserBrowserInfoUpdateParams & { id?: string }>({
  id: '',
  id_str: '',
  fingerprint_browser: 'chrome',
  fingerprint_platform: 'windows',
  fingerprint_brand_version: '',
  fingerprint_hardware_concurrency: 4,
  fingerprint_gpu_vendor: '',
  fingerprint_gpu_renderer: '',
  lang: 'zh-CN',
  accept_lang: 'zh-CN,zh,en',
  timezone: 'Asia/Shanghai',
  proxy_server: '',
  is_desktop: true,
  fingerprint_int: undefined
})

// 表单验证规则
const rules: FormRules = {
  fingerprint_browser: [{ required: true, message: '请选择浏览器类型', trigger: 'change' }],
  fingerprint_platform: [{ required: true, message: '请选择操作系统', trigger: 'change' }]
}

// 计算属性
const isEditMode = computed(() => !!props.selectedFingerprint)
const dialogTitle = computed(() => isEditMode.value ? '编辑指纹' : '创建指纹')

// 监听visible变化
watch(visible, (newVal) => {
  if (newVal && props.selectedFingerprint) {
    // 编辑模式：填充表单数据
    Object.assign(form, {
      ...props.selectedFingerprint,
      id: props.selectedFingerprint.id.toString()
    })
    // 编辑模式：重置加载标记，准备加载通知配置
    notificationLoaded.value = false
  } else if (newVal) {
    // 创建模式：重置表单
    resetForm()
    // 创建模式：重置通知配置
    resetNotification()
  }
})

// 监听 activeTab 变化，当切换到通知配置 tab 时加载配置
watch(activeTab, async (newVal) => {
  if (newVal === 'notification' && isEditMode.value && !notificationLoaded.value && form.id) {
    await loadNotificationConfig()
  }
})

// 方法
const handleClose = () => {
  visible.value = false
  emit('close')
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (valid) {
      const formData = { ...form }

      formData.id = formData.id_str

      // 调用 API 创建或更新指纹
      const result = await businessHandler(
        browserApi.upsertFingerprint(formData as UserBrowserInfoCreateParams & { id?: string }),
        {
          successMessage: isEditMode.value ? '更新成功' : '创建成功',
          errorMessage: '操作失败'
        }
      )

      if (result.success) {
        // 关闭对话框
        handleClose()
      }
    }
  } catch (error) {
    biliMessage.error('表单验证失败，请检查输入')
  }
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(form, {
    id: '',
    id_str: '',
    fingerprint_browser: 'chrome',
    fingerprint_platform: 'windows',
    fingerprint_brand_version: '',
    fingerprint_hardware_concurrency: 4,
    fingerprint_gpu_vendor: '',
    fingerprint_gpu_renderer: '',
    lang: 'zh-CN',
    accept_lang: 'zh-CN,zh,en',
    timezone: 'Asia/Shanghai',
    proxy_server: '',
    is_desktop: true,
    fingerprint_int: undefined
  })
}

// 通知配置相关方法
const handleNotificationChange = (config: NotificationConfigCreate) => {
  notificationConfig.value = config
  notificationSaved.value = false
}

const loadNotificationConfig = async () => {
  if (!form.id) return

  loadingNotification.value = true

  try {
    const { data: response, error } = await asyncHandler(
      browserApi.readNotifyConfigCompat(form.id),
      {
        errorMessage: '加载浏览器通知配置失败',
        showErrorToast: true
      }
    )

    if (!error && response && response.code === 0 && response.data) {
      // API 调用成功且有数据
      notificationConfig.value = {
        hitokoto: false,
        ...response.data
      }
      notificationSaved.value = true
      notificationLoaded.value = true
    }
  } catch (error) {
    console.error('加载通知配置失败:', error)
  } finally {
    loadingNotification.value = false
  }
}

const saveNotification = async () => {
  if (!notificationConfig.value || !form.id) return

  savingNotification.value = true
  try {
    // 为通知配置添加browser_id
    const configWithBrowserId = {
      ...notificationConfig.value,
      browser_id: form.id.toString()
    }

    const { data: response, error } = await asyncHandler(
      browserApi.upsertNotifyConfig(configWithBrowserId),
      {
        successMessage: '通知配置保存成功',
        errorMessage: '通知配置保存失败',
        showSuccessToast: true,
        showErrorToast: true
      }
    )

    if (!error && response && response.code === 0) {
      notificationSaved.value = true
    } else {
      notificationSaved.value = false
    }
  } catch (error) {
    console.error('保存通知配置失败:', error)
    notificationSaved.value = false
  } finally {
    savingNotification.value = false
  }
}

const resetNotification = () => {
  // 重置通知配置到初始状态
  notificationSaved.value = true
  notificationLoaded.value = false
}

const initializeNotification = () => {
  // 初始化空的通知配置对象
  notificationConfig.value = {
    hitokoto: false,
    bark_push: '',
    bark_archive: '',
    bark_group: '',
    bark_sound: '',
    bark_level: '',
    bark_icon: '',
    bark_url: '',
    push_plus_token: '',
    push_plus_user: '',
    push_plus_template: '',
    push_plus_channel: '',
    push_plus_to: '',
    push_plus_webhook: '',
    push_plus_callbackurl: '',
    wxpusher_app_token: '',
    wxpusher_topic_ids: '',
    wxpusher_uids: '',
    dd_bot_token: '',
    dd_bot_secret: '',
    qywx_key: '',
    tg_bot_token: '',
    tg_user_id: '',
    smtp_server: '',
    smtp_email: '',
    webhook_url: ''
  }
  notificationSaved.value = false
  notificationLoaded.value = false
}

// 随机生成配置
const generateRandomConfig = async () => {
  generatingRandom.value = true
  try {
    // 调用API生成随机配置
    const result = await businessHandler(
      browserApi.genRandFingerprint({}),
      {
        successMessage: '随机配置生成成功',
        errorMessage: '生成随机配置失败'
      }
    )

    if (result.success && result.data) {
      // 直接使用API返回的数据填充表单
      Object.assign(form, result.data)
    }
  } catch (error) {
    console.error('生成随机配置失败:', error)
  } finally {
    generatingRandom.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>