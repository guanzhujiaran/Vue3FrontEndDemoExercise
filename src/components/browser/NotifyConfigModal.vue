<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\NotifyConfigModal.vue
 * @Description: 通知配置Modal组件
-->
<template>
  <el-dialog
    v-model="visible"
    :title="`通知配置 - ${currentFingerprint?.id_str || currentFingerprint?.id}`"
    width="600px"
    destroy-on-close
    style="--el-dialog-body-max-height: 60vh; overflow-y: auto;"
  >
    <el-form :model="form" label-width="120px" class="mb-4">
      <!-- 操作按钮 -->
      <div class="mb-4 flex gap-2">
        <el-button @click="loadConfig" :loading="loading">
          <el-icon><Refresh /></el-icon>
          加载配置
        </el-button>
      </div>

      <!-- 基础配置 -->
      <el-form-item label="启用一言">
        <el-switch v-model="form.hitokoto" />
        <div class="ml-2 text-[12px] text-[var(--el-text-color-secondary)]">在通知消息前添加一言</div>
      </el-form-item>

      <!-- Bark推送配置 -->
      <el-collapse v-model="activeCollapse" class="mt-4">
        <el-collapse-item title="Bark推送" name="bark">
          <el-form-item label="Bark Key">
            <el-input v-model="form.bark_push" placeholder="请输入Bark推送密钥" />
          </el-form-item>
          <el-form-item label="归档分组">
            <el-input v-model="form.bark_archive" placeholder="归档分组名称" />
          </el-form-item>
          <el-form-item label="通知分组">
            <el-input v-model="form.bark_group" placeholder="通知分组名称" />
          </el-form-item>
          <el-form-item label="提示音">
            <el-input v-model="form.bark_sound" placeholder="提示音名称" />
          </el-form-item>
          <el-form-item label="图标">
            <el-input v-model="form.bark_icon" placeholder="图标URL" />
          </el-form-item>
          <el-form-item label="级别">
            <el-input v-model="form.bark_level" placeholder="通知级别" />
          </el-form-item>
          <el-form-item label="跳转URL">
            <el-input v-model="form.bark_url" placeholder="点击通知跳转的URL" />
          </el-form-item>
        </el-collapse-item>

        <!-- Push Plus配置 -->
        <el-collapse-item title="Push Plus" name="pushplus">
          <el-form-item label="Token">
            <el-input v-model="form.push_plus_token" placeholder="Push Plus Token" />
          </el-form-item>
          <el-form-item label="用户">
            <el-input v-model="form.push_plus_user" placeholder="用户标识" />
          </el-form-item>
          <el-form-item label="模板">
            <el-select v-model="form.push_plus_template" placeholder="选择模板">
              <el-option label="HTML" value="html" />
              <el-option label="Markdown" value="markdown" />
              <el-option label="文本" value="text" />
            </el-select>
          </el-form-item>
          <el-form-item label="渠道">
            <el-select v-model="form.push_plus_channel" placeholder="选择渠道">
              <el-option label="微信" value="wechat" />
              <el-option label="企业微信" value="qywx" />
              <el-option label="钉钉" value="dingtalk" />
            </el-select>
          </el-form-item>
          <el-form-item label="Webhook">
            <el-input v-model="form.push_plus_webhook" placeholder="Webhook地址" />
          </el-form-item>
          <el-form-item label="回调URL">
            <el-input v-model="form.push_plus_callbackurl" placeholder="回调URL" />
          </el-form-item>
          <el-form-item label="接收人">
            <el-input v-model="form.push_plus_to" placeholder="接收人标识" />
          </el-form-item>
        </el-collapse-item>

        <!-- 微信加配置 -->
        <el-collapse-item title="微信加" name="weplus">
          <el-form-item label="Bot Token">
            <el-input v-model="form.we_plus_bot_token" placeholder="机器人Token" />
          </el-form-item>
          <el-form-item label="接收人">
            <el-input v-model="form.we_plus_bot_receiver" placeholder="接收人标识" />
          </el-form-item>
          <el-form-item label="版本">
            <el-select v-model="form.we_plus_bot_version" placeholder="选择版本">
              <el-option label="专业版" value="pro" />
              <el-option label="标准版" value="standard" />
            </el-select>
          </el-form-item>
        </el-collapse-item>

        <!-- 企业微信配置 -->
        <el-collapse-item title="企业微信" name="qywx">
          <el-form-item label="企业ID">
            <el-input v-model="form.qywx_origin" placeholder="企业ID" />
          </el-form-item>
          <el-form-item label="应用ID">
            <el-input v-model="form.qywx_am" placeholder="应用ID" />
          </el-form-item>
          <el-form-item label="密钥">
            <el-input v-model="form.qywx_key" placeholder="应用密钥" />
          </el-form-item>
        </el-collapse-item>

        <!-- Telegram配置 -->
        <el-collapse-item title="Telegram" name="telegram">
          <el-form-item label="Bot Token">
            <el-input v-model="form.tg_bot_token" placeholder="Bot Token" />
          </el-form-item>
          <el-form-item label="用户ID">
            <el-input v-model="form.tg_user_id" placeholder="用户ID" />
          </el-form-item>
          <el-form-item label="API主机">
            <el-input v-model="form.tg_api_host" placeholder="API主机地址" />
          </el-form-item>
          <el-form-item label="代理认证">
            <el-input v-model="form.tg_proxy_auth" placeholder="代理认证信息" />
          </el-form-item>
          <el-form-item label="代理主机">
            <el-input v-model="form.tg_proxy_host" placeholder="代理主机地址" />
          </el-form-item>
          <el-form-item label="代理端口">
            <el-input v-model="form.tg_proxy_port" placeholder="代理端口" />
          </el-form-item>
        </el-collapse-item>

        <!-- Webhook配置 -->
        <el-collapse-item title="Webhook" name="webhook">
          <el-form-item label="Webhook URL">
            <el-input v-model="form.webhook_url" placeholder="Webhook地址" />
          </el-form-item>
        </el-collapse-item>

        <!-- 其他配置 -->
        <el-collapse-item title="其他配置" name="others">
          <el-form-item label="钉钉机器人">
            <el-input v-model="form.dd_bot_token" placeholder="Token" />
            <el-input v-model="form.dd_bot_secret" placeholder="Secret" class="mt-2" />
          </el-form-item>
          <el-form-item label="飞书机器人">
            <el-input v-model="form.fskey" placeholder="飞书机器人Key" />
          </el-form-item>
          <el-form-item label="GoBot">
            <el-input v-model="form.gobot_url" placeholder="URL" />
            <el-input v-model="form.gobot_token" placeholder="Token" class="mt-2" />
            <el-input v-model="form.gobot_qq" placeholder="QQ号" class="mt-2" />
          </el-form-item>
          <el-form-item label="Gotify">
            <el-input v-model="form.gotify_url" placeholder="URL" />
            <el-input v-model="form.gotify_token" placeholder="Token" class="mt-2" />
            <el-input-number v-model="form.gotify_priority" :min="0" :max="10" placeholder="优先级" class="mt-2" />
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <!-- 配置来源提示 -->
    <div v-if="configSource" class="mt-4">
      <el-alert
        :title="`当前配置来源: ${configSource === 'browser' ? '浏览器配置' : '全局配置'}`"
        :type="configSource === 'browser' ? 'success' : 'info'"
        show-icon
        :closable="false"
      />
    </div>

    <template #footer>
      <span class="flex justify-between items-center w-full">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="danger" @click="handleDelete" :disabled="!hasConfig">删除配置</el-button>
        <el-button type="primary" @click="handleSave">保存配置</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import biliMessage, { ElMessageBox } from '@/utils/message'
import { Refresh } from '@element-plus/icons-vue'
import browserApi from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import type { UserBrowserInfoReadResp, NotificationConfigCreate } from '@/types/browser-automation-api'

interface Props {
  modelValue: boolean
  fingerprint: UserBrowserInfoReadResp | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const currentFingerprint = ref<UserBrowserInfoReadResp | null>(null)
const activeCollapse = ref<string[]>(['bark', 'pushplus'])
const configSource = ref<'browser' | 'global' | null>(null)

// 默认表单数据
const defaultForm: NotificationConfigCreate = {
  hitokoto: true,
  bark_push: '',
  bark_archive: '',
  bark_group: '',
  bark_sound: '',
  bark_icon: '',
  bark_level: '',
  bark_url: '',
  dd_bot_secret: '',
  dd_bot_token: '',
  fskey: '',
  gobot_url: '',
  gobot_qq: '',
  gobot_token: '',
  gotify_url: '',
  gotify_token: '',
  gotify_priority: 0,
  igot_push_key: '',
  push_key: '',
  deer_key: '',
  deer_url: '',
  chat_url: '',
  chat_token: '',
  push_plus_token: '',
  push_plus_user: '',
  push_plus_template: 'html',
  push_plus_channel: 'wechat',
  push_plus_webhook: '',
  push_plus_callbackurl: '',
  push_plus_to: '',
  we_plus_bot_token: '',
  we_plus_bot_receiver: '',
  we_plus_bot_version: 'pro',
  qmsg_key: '',
  qmsg_type: '',
  qywx_origin: '',
  qywx_am: '',
  qywx_key: '',
  tg_bot_token: '',
  tg_user_id: '',
  tg_api_host: '',
  tg_proxy_auth: '',
  tg_proxy_host: '',
  tg_proxy_port: '',
  aibotk_key: '',
  aibotk_type: '',
  aibotk_name: '',
  smtp_server: '',
  smtp_ssl: 'false',
  smtp_email: '',
  smtp_port: '',
  smtp_password: '',
  smtp_to: '',
  webhook_url: ''
}

// 表单数据
const form = ref<NotificationConfigCreate>({ ...defaultForm })

// 重置表单
const resetForm = () => {
  form.value = { ...defaultForm }
  configSource.value = null
}

// 检查是否有配置
const hasConfig = computed(() => {
  const values = Object.values(form.value)
  return values.some(value => 
    value !== '' && 
    value !== null && 
    value !== undefined && 
    value !== false &&
    (typeof value !== 'string' || value.trim() !== '')
  )
})

// 监听指纹变化
watch(() => props.fingerprint, (newFingerprint) => {
  currentFingerprint.value = newFingerprint
  if (newFingerprint) {
    // 重置表单，但不自动加载配置（等待对话框打开时再加载）
    resetForm()
  } else {
    resetForm()
  }
}, { immediate: true })

// 监听对话框打开状态
watch(() => visible.value, (isVisible) => {
  if (isVisible && currentFingerprint.value) {
    // 对话框打开时自动加载配置（不显示消息）
    loadConfig(false)
  }
})

// 加载配置
const loading = ref(false)
const loadConfig = async (showMessage = true) => {
  if (!currentFingerprint.value) return
  
  loading.value = true
  try {
    // 首先尝试加载浏览器特定配置
    const result = await businessHandler(
      browserApi.readNotifyConfig({
        browser_id: currentFingerprint.value.id_str || currentFingerprint.value.id.toString()
      }),
      { showSuccessToast: false } // 查询操作不显示成功提示
    )
    
      if (result.success && result.data) {
      // 有浏览器特定配置，使用它
      Object.assign(form.value, result.data)
      configSource.value = 'browser'
      console.log('已加载浏览器特定配置')
      if (showMessage) biliMessage.success('配置加载成功')
    } else {
      // 没有浏览器配置，尝试加载全局配置
      const globalResult = await businessHandler(
        browserApi.readGlobalNotifyConfig(),
        { showSuccessToast: false } // 查询操作不显示成功提示
      )
      
      if (globalResult.success && globalResult.data) {
        // 有全局配置，使用它作为默认值
        Object.assign(form.value, globalResult.data)
        configSource.value = 'global'
        console.log('已加载全局配置')
        if (showMessage) biliMessage.success('已加载全局配置')
      } else {
        // 都没有配置，使用默认值
        resetForm()
        configSource.value = null
        console.log('使用默认配置')
        if (showMessage) biliMessage.info('暂无通知配置，使用默认配置')
      }
    }
  } catch (error) {
    console.error('加载通知配置失败:', error)
    if (showMessage) biliMessage.error('加载通知配置失败，使用默认配置')
    resetForm()
  } finally {
    loading.value = false
  }
}



// 保存配置
const handleSave = async () => {
  if (!currentFingerprint.value) return
  
  try {
    const configData = {
      ...form.value,
      browser_id: currentFingerprint.value.id_str || currentFingerprint.value.id.toString()
    }
    
    const result = await businessHandler(
      browserApi.upsertNotifyConfig(configData)
    )
    
    if (result.success) {
      biliMessage.success('通知配置保存成功')
      handleClose()
    }
  } catch (error) {
    biliMessage.error('通知配置保存失败')
  }
}

// 删除配置
const handleDelete = async () => {
  if (!currentFingerprint.value) return
  
  try {
    await ElMessageBox.confirm(
      '确定要删除此浏览器的通知配置吗？删除后将使用全局默认配置。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const result = await businessHandler(
      browserApi.deleteNotifyConfig({
        browser_id: currentFingerprint.value.id_str || currentFingerprint.value.id.toString()
      })
    )
    
    if (result.success) {
      biliMessage.success('通知配置删除成功')
      resetForm()
      handleClose()
    }
  } catch (error) {
    if (error !== 'cancel') {
      biliMessage.error('通知配置删除失败')
    }
  }
}

// 处理关闭
const handleClose = () => {
  visible.value = false
}
</script>

