<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-18 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\GlobalConfigManagement.vue
 * @Description: 全局配置管理组件
-->
<template>
  <div class="global-config-management space-y-6">
    <!-- 功能说明 -->
    <el-alert
      v-if="showAlert"
      title="全局配置中心"
      type="info"
      closable
      show-icon
      @close="showAlert = false"
    >
      <template #default>
        <p>配置浏览器事件通知，支持多种推送方式，确保重要信息及时送达。</p>
        <p>包括系统状态、任务完成、错误报告等通知类型。</p>
      </template>
    </el-alert>

    <!-- 全局通知配置 -->
    <el-card>
      <div class="config-header">
        <h3>全局通知配置</h3>
        <p class="config-description">配置浏览器事件通知，支持多种推送方式，确保重要信息及时送达</p>
      </div>
      
      <el-collapse v-model="activeCollapses" class="unified-accordion">
        <!-- 当前配置 -->
        <el-collapse-item name="current" title="当前配置">
          <template #title>
            <div class="main-accordion-title">
              <el-icon><Setting /></el-icon>
              <span>当前配置</span>
              <el-tag type="primary" size="small">配置</el-tag>
            </div>
          </template>
          <div v-loading="loadingConfig" class="min-h-[300px]">
            <div v-if="notificationConfig" class="space-y-6">
              <!-- 统一手风琴配置界面 -->
              <el-form :model="notificationConfig" label-width="160px" @submit.prevent>
              <el-collapse 
                v-model="activeCollapses" 
                class="unified-accordion"
                @change="handleAccordionChange"
              >
                <!-- 基础设置 -->
                <el-collapse-item name="basic" title="基础设置">
                  <template #title>
                    <div class="accordion-title">
                      <el-icon><Setting /></el-icon>
                      <span>基础设置</span>
                      <el-tag type="primary" size="small">核心</el-tag>
                    </div>
                  </template>
                  <el-form-item label="一言推送">
                    <el-switch 
                      v-model="notificationConfig.hitokoto" 
                      @change="handleConfigChange"
                    />
                    <div class="form-help-text">启用后每日推送一句优美语句</div>
                  </el-form-item>
                </el-collapse-item>

                <!-- Bark推送配置 -->
                <el-collapse-item name="bark" title="Bark推送配置">
                  <template #title>
                    <div class="accordion-title">
                      <el-icon><Apple /></el-icon>
                      <span>Bark推送</span>
                      <el-tag type="success" size="small">iOS</el-tag>
                    </div>
                  </template>
                  <div class="config-section">
                    <el-form-item label="推送地址">
                      <el-input 
                        v-model="notificationConfig.bark_push" 
                        placeholder="https://api.day.app/your_key"
                        @input="handleConfigChange"
                      />
                      <div class="form-help-text">iOS设备专用推送服务</div>
                    </el-form-item>
                    <el-row :gutter="16">
                      <el-col :md="12">
                        <el-form-item label="归档">
                          <el-input 
                            v-model="notificationConfig.bark_archive" 
                            placeholder="归档名称"
                            maxlength="128"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :md="12">
                        <el-form-item label="分组">
                          <el-input 
                            v-model="notificationConfig.bark_group" 
                            placeholder="分组名称"
                            maxlength="128"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                    <el-row :gutter="16">
                      <el-col :md="12">
                        <el-form-item label="音效">
                          <el-input 
                            v-model="notificationConfig.bark_sound" 
                            placeholder="音效名称"
                            maxlength="128"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :md="12">
                        <el-form-item label="级别">
                          <el-input 
                            v-model="notificationConfig.bark_level" 
                            placeholder="通知级别"
                            maxlength="128"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                    <el-row :gutter="16">
                      <el-col :md="12">
                        <el-form-item label="图标">
                          <el-input 
                            v-model="notificationConfig.bark_icon" 
                            placeholder="图标URL"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :md="12">
                        <el-form-item label="跳转URL">
                          <el-input 
                            v-model="notificationConfig.bark_url" 
                            placeholder="跳转URL"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </div>
                </el-collapse-item>

                <!-- Push Plus配置 -->
                <el-collapse-item name="pushplus" title="Push Plus配置">
                  <template #title>
                    <div class="accordion-title">
                      <el-icon><Promotion /></el-icon>
                      <span>Push Plus</span>
                      <el-tag type="warning" size="small">多平台</el-tag>
                    </div>
                  </template>
                  <div class="config-section">
                    <el-form-item label="Token">
                      <el-input 
                        v-model="notificationConfig.push_plus_token" 
                        placeholder="Push Plus Token"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                    <el-row :gutter="16">
                      <el-col :md="12">
                        <el-form-item label="用户ID">
                          <el-input 
                            v-model="notificationConfig.push_plus_user" 
                            placeholder="用户ID"
                            maxlength="128"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :md="12">
                        <el-form-item label="模板">
                          <el-input 
                            v-model="notificationConfig.push_plus_template" 
                            placeholder="模板类型"
                            maxlength="128"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                    <el-row :gutter="16">
                      <el-col :md="12">
                        <el-form-item label="渠道">
                          <el-input 
                            v-model="notificationConfig.push_plus_channel" 
                            placeholder="推送渠道"
                            maxlength="128"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :md="12">
                        <el-form-item label="收件人">
                          <el-input 
                            v-model="notificationConfig.push_plus_to" 
                            placeholder="收件人信息"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                    <el-row :gutter="16">
                      <el-col :md="12">
                        <el-form-item label="Webhook">
                          <el-input 
                            v-model="notificationConfig.push_plus_webhook" 
                            placeholder="Webhook地址"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :md="12">
                        <el-form-item label="回调URL">
                          <el-input 
                            v-model="notificationConfig.push_plus_callbackurl" 
                            placeholder="回调URL"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </div>
                </el-collapse-item>

                <!-- 微信推送器配置 -->
                <el-collapse-item name="wxpusher" title="微信推送器配置">
                  <template #title>
                    <div class="accordion-title">
                      <el-icon><ChatDotRound /></el-icon>
                      <span>微信推送器</span>
                      <el-tag type="info" size="small">微信</el-tag>
                    </div>
                  </template>
                  <div class="config-section">
                    <el-form-item label="应用Token">
                      <el-input 
                        v-model="notificationConfig.wxpusher_app_token" 
                        placeholder="应用Token"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                    <el-row :gutter="16">
                      <el-col :md="12">
                        <el-form-item label="主题ID">
                          <el-input 
                            v-model="notificationConfig.wxpusher_topic_ids" 
                            placeholder="主题ID列表"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                      <el-col :md="12">
                        <el-form-item label="用户ID">
                          <el-input 
                            v-model="notificationConfig.wxpusher_uids" 
                            placeholder="用户ID列表"
                            @input="handleConfigChange"
                          />
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </div>
                </el-collapse-item>

                <!-- 其他推送服务 -->
                <el-collapse-item name="other" title="其他推送服务">
                  <template #title>
                    <div class="accordion-title">
                      <el-icon><MoreFilled /></el-icon>
                      <span>其他推送</span>
                      <el-tag type="info" size="small">更多</el-tag>
                    </div>
                  </template>
                  <div class="config-section">
                    <div class="sub-section">
                      <h4>钉钉机器人</h4>
                      <el-row :gutter="16">
                        <el-col :md="12">
                          <el-form-item label="Token">
                            <el-input 
                              v-model="notificationConfig.dd_bot_token" 
                              placeholder="钉钉机器人Token"
                              @input="handleConfigChange"
                            />
                          </el-form-item>
                        </el-col>
                        <el-col :md="12">
                          <el-form-item label="密钥">
                            <el-input 
                              v-model="notificationConfig.dd_bot_secret" 
                              placeholder="钉钉机器人密钥"
                              @input="handleConfigChange"
                            />
                          </el-form-item>
                        </el-col>
                      </el-row>
                    </div>
                    
                    <div class="sub-section">
                      <h4>企业微信</h4>
                      <el-form-item label="密钥">
                        <el-input 
                          v-model="notificationConfig.qywx_key" 
                          placeholder="企业微信密钥"
                          @input="handleConfigChange"
                        />
                      </el-form-item>
                    </div>
                    
                    <div class="sub-section">
                      <h4>Telegram</h4>
                      <el-row :gutter="16">
                        <el-col :md="12">
                          <el-form-item label="Bot Token">
                            <el-input 
                              v-model="notificationConfig.tg_bot_token" 
                              placeholder="Telegram Bot Token"
                              @input="handleConfigChange"
                            />
                          </el-form-item>
                        </el-col>
                        <el-col :md="12">
                          <el-form-item label="用户ID">
                            <el-input 
                              v-model="notificationConfig.tg_user_id" 
                              placeholder="用户ID"
                              maxlength="128"
                              @input="handleConfigChange"
                            />
                          </el-form-item>
                        </el-col>
                      </el-row>
                    </div>
                    
                    <div class="sub-section">
                      <h4>邮件推送</h4>
                      <el-row :gutter="16">
                        <el-col :md="12">
                          <el-form-item label="SMTP服务器">
                            <el-input 
                              v-model="notificationConfig.smtp_server" 
                              placeholder="SMTP服务器地址"
                              maxlength="128"
                              @input="handleConfigChange"
                            />
                          </el-form-item>
                        </el-col>
                        <el-col :md="12">
                          <el-form-item label="发件邮箱">
                            <el-input 
                              v-model="notificationConfig.smtp_email" 
                              placeholder="发件邮箱"
                              maxlength="256"
                              @input="handleConfigChange"
                            />
                          </el-form-item>
                        </el-col>
                      </el-row>
                    </div>
                    
                    <div class="sub-section">
                      <h4>Webhook</h4>
                      <el-form-item label="Webhook地址">
                        <el-input 
                          v-model="notificationConfig.webhook_url" 
                          placeholder="Webhook地址"
                          @input="handleConfigChange"
                        />
                      </el-form-item>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
              </el-form>
              
              <!-- 配置状态和操作 -->
              <div class="config-actions">
                <div class="config-status">
                  <el-tag 
                    :type="configSaved ? 'success' : 'warning'" 
                    size="small"
                    effect="light"
                  >
                    <el-icon class="status-icon">
                      <SuccessFilled v-if="configSaved" />
                      <WarningFilled v-else />
                    </el-icon>
                    {{ configSaved ? '配置已保存' : '有未保存的更改' }}
                  </el-tag>
                  <el-button 
                    size="small" 
                    link 
                    @click="testNotification" 
                    :loading="testingNotification"
                    class="test-button"
                  >
                    <el-icon><Bell /></el-icon>
                    测试推送
                  </el-button>
                </div>
                <div class="config-buttons">
                  <el-button 
                    @click="resetConfig"
                    :icon="RefreshLeft"
                    size="small"
                  >
                    重置
                  </el-button>
                  <el-button 
                    type="primary" 
                    @click="saveConfig" 
                    :loading="savingConfig"
                    :icon="Check"
                    size="small"
                  >
                    保存配置
                  </el-button>
                </div>
              </div>
            </div>
            
            <!-- 空状态 -->
            <el-empty v-else description="暂无通知配置">
              <el-button type="primary" @click="initializeConfig">初始化配置</el-button>
            </el-empty>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Apple, Promotion, ChatDotRound, MoreFilled, SuccessFilled, WarningFilled, RefreshLeft, Check, Document, DataAnalysis, Bell, CircleCloseFilled } from '@element-plus/icons-vue'
import browserApi from '@/api/browser/browser_api'
import { asyncHandler } from '@/utils/asyncHandler'
import type { 
  NotificationConfigCreate,
  NotificationConfigUpdate
} from '@/types/browser-automation-api'

// 响应式数据
const showAlert = ref(true)
const activeCollapses = ref<string[]>(['current'])
const loadingConfig = ref(false)
const savingConfig = ref(false)
const testingNotification = ref(false)
const configSaved = ref(true)
const notificationConfig = ref<NotificationConfigCreate | null>(null)

// 处理手风琴变化
const handleAccordionChange = (activeNames: string[]) => {
  activeCollapses.value = activeNames
}

// 统计数据
const statistics = reactive({
  total: 0,
  success: 0,
  failed: 0,
  pending: 0
})

// 默认配置
const defaultConfig: NotificationConfigCreate = {
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
  smtp_password: '',
  smtp_name: '',
  pushme_key: '',
  pushme_url: '',
  chronocat_qq: '',
  chronocat_token: '',
  chronocat_url: '',
  webhook_url: '',
  webhook_body: '',
  webhook_headers: '',
  webhook_method: '',
  webhook_content_type: '',
  ntfy_url: '',
  ntfy_topic: '',
  ntfy_priority: '3',
  ntfy_token: '',
  ntfy_username: '',
  ntfy_password: '',
  ntfy_actions: '',
  wxpusher_app_token: '',
  wxpusher_topic_ids: '',
  wxpusher_uids: ''
}

// 配置模板
const templates = {
  basic: {
    hitokoto: true,
    bark_push: '',
    push_plus_token: '',
    wxpusher_app_token: ''
  },
  recommended: {
    hitokoto: true,
    bark_push: 'https://api.day.app/your_key',
    push_plus_token: '',
    wxpusher_app_token: ''
  },
  complete: {
    hitokoto: true,
    bark_push: 'https://api.day.app/your_key',
    push_plus_token: 'your_push_plus_token',
    wxpusher_app_token: 'your_wxpusher_app_token',
    dd_bot_token: 'your_dingtalk_token',
    qywx_key: 'your_qywx_key',
    tg_bot_token: 'your_telegram_token'
  }
}

// 方法
const loadConfig = async () => {
  loadingConfig.value = true
  
  // 使用 asyncHandler 处理 API 调用
  const { data: response, error } = await asyncHandler(
    browserApi.readGlobalNotifyConfig(),
    {
      errorMessage: 'API加载通知配置失败',
      showErrorToast: true
    }
  )
  
  if (!error && response && response.code === 0 && response.data) {
    // API 调用成功且有数据
    notificationConfig.value = {
      ...defaultConfig,
      ...response.data
    }
  } else {
    // API 调用失败，使用默认配置
    notificationConfig.value = { ...defaultConfig }
  }
  
  updateStatistics()
  loadingConfig.value = false
}

const saveConfig = async () => {
  if (!notificationConfig.value) return
  
  savingConfig.value = true
  
  // 通过API保存
  const { data: response, error } = await asyncHandler(
    browserApi.upsertNotifyConfig(notificationConfig.value as NotificationConfigCreate),
    {
      successMessage: '通知配置保存成功',
      errorMessage: 'API保存失败',
      showSuccessToast: true,
      showErrorToast: true
    }
  )
  
  if (!error && response && response.code === 0) {
    // API 保存成功
    configSaved.value = true
  } else {
    // API 保存失败
    configSaved.value = false
  }
  
  savingConfig.value = false
}

const handleConfigChange = () => {
  configSaved.value = false
}

const resetConfig = () => {
  notificationConfig.value = { ...defaultConfig }
  configSaved.value = false
  ElMessage.info('配置已重置')
}

const initializeConfig = () => {
  notificationConfig.value = { ...defaultConfig }
  configSaved.value = false
  ElMessage.success('配置初始化完成')
}

const applyTemplate = (templateName: keyof typeof templates) => {
  if (!notificationConfig.value) {
    notificationConfig.value = { ...defaultConfig }
  }
  
  Object.assign(notificationConfig.value, templates[templateName])
  configSaved.value = false
  
  const templateNames = {
    basic: '基础',
    recommended: '推荐',
    complete: '完整'
  }
  
  ElMessage.success(`已应用${templateNames[templateName]}模板`)
}

const testNotification = async () => {
  testingNotification.value = true
  try {
    // 模拟测试推送
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('测试推送发送成功')
  } catch (error) {
    ElMessage.error('测试推送发送失败')
  }
  testingNotification.value = false
}

const updateStatistics = () => {
  // 模拟统计数据
  statistics.total = 156
  statistics.success = 142
  statistics.failed = 8
  statistics.pending = 6
}

// 生命周期
onMounted(() => {
  // 加载配置
  loadConfig()
  
  // 自动关闭alert
  setTimeout(() => {
    showAlert.value = false
  }, 5000) // 5秒后自动关闭
})
</script>

<style scoped>
/* 全局容器 */
.global-config-management {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 配置头部样式 */
.config-header {
  padding: 24px;
  text-align: center;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 0;
}

.config-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.config-description {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

/* 主手风琴样式 */
.main-accordion {
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.main-accordion :deep(.el-collapse-item__header) {
  padding: 16px 20px;
  font-weight: 600;
  border: none;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
}


/* 统一手风琴样式 */
.unified-accordion {
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.unified-accordion :deep(.el-collapse-item) {
  border-bottom: 1px solid var(--el-border-color-light);
}

.unified-accordion :deep(.el-collapse-item:last-child) {
  border-bottom: none;
}

.unified-accordion :deep(.el-collapse-item__header) {
  padding: 16px 20px;
  font-weight: 600;
  border: none;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
}

.unified-accordion :deep(.el-collapse-item__wrap) {
  border: none;
}

.unified-accordion :deep(.el-collapse-item__content) {
  padding: 24px 20px;
}

/* 主手风琴标题样式 */
.main-accordion-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 手风琴标题样式 */
.accordion-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.accordion-title .el-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.accordion-title span {
  flex: 1;
  font-size: 16px;
}

/* 配置区域样式 */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sub-section {
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.sub-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-left: 3px solid var(--el-color-primary);
  padding-left: 8px;
}

/* 表单帮助文本 */
.form-help-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

/* 模板卡片样式 */
.template-card {
  padding: 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.template-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.template-card h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: center;
}

/* 卡片样式 */
.el-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.el-card :deep(.el-card__header) {
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light);
}

.el-card :deep(.el-card__body) {
  padding: 24px;
}

.config-tabs :deep(.el-tabs__content) {
  padding: 20px 0;
}

.text-center .el-card :deep(.el-card__body) {
  padding: 32px 24px;
}

.el-descriptions {
  margin-bottom: 16px;
}

.el-tag {
  margin-bottom: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .global-config-management {
    padding: 12px;
  }
  
  .main-accordion :deep(.el-collapse-item__header),
  .unified-accordion :deep(.el-collapse-item__header) {
    padding: 12px 16px;
    font-size: 14px;
  }
  
  .main-accordion :deep(.el-collapse-item__content),
  .unified-accordion :deep(.el-collapse-item__content) {
    padding: 16px;
  }
  
  .accordion-title {
    gap: 8px;
  }
  
  .accordion-title .el-icon {
    font-size: 16px;
  }
  
  .accordion-title span {
    font-size: 14px;
  }
  
  .sub-section {
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .el-form-item {
    margin-bottom: 16px;
  }
  
  .el-card :deep(.el-card__body) {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .global-config-management {
    padding: 8px;
  }
  
  .main-accordion :deep(.el-collapse-item__header),
  .unified-accordion :deep(.el-collapse-item__header) {
    padding: 10px 12px;
  }
  
  .main-accordion :deep(.el-collapse-item__content),
  .unified-accordion :deep(.el-collapse-item__content) {
    padding: 12px;
  }
  
  .sub-section {
    padding: 8px;
  }
  
  .accordion-title .el-tag {
    display: none; /* 在小屏幕上隐藏标签 */
  }
}

/* 交互动画 */
.unified-accordion :deep(.el-collapse-item__arrow) {
  transition: transform 0.3s ease;
}

.unified-accordion :deep(.el-collapse-item.is-active .el-collapse-item__arrow) {
  transform: rotate(180deg);
}

/* 表单标签响应式 */
.el-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

/* 输入框聚焦效果 */
.el-input :deep(.el-input__wrapper) {
  transition: all 0.3s ease;
}

.el-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-input-hover-border-color) inset;
}

.el-input.is-focus :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 2px var(--el-input-focus-border-color) inset;
}

/* 行间距优化 */
.el-row {
  margin-bottom: -16px;
}

.el-row .el-col {
  margin-bottom: 16px;
}

/* 配置操作区域 */
.config-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid var(--el-border-color-light);
  margin-top: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.config-status {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.status-icon {
  margin-right: 4px;
}

.test-button {
  transition: all 0.3s ease;
}

.test-button:hover {
  transform: translateY(-1px);
}

.config-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* 响应式操作区域 */
@media (max-width: 768px) {
  .config-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .config-status {
    justify-content: center;
  }
  
  .config-buttons {
    justify-content: center;
  }
}

/* 动画和过渡效果 */
.config-actions * {
  transition: all 0.3s ease;
}

/* 表单验证反馈 */
.el-form-item.is-error :deep(.el-input__wrapper) {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* 配置完成提示 */
.config-saved-toast {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 确保与FingerprintManagement组件样式一致 */
code {
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.text-xs {
  font-size: 12px;
  word-break: break-all;
}

.el-form-item :deep(.el-form-item__content) {
  line-height: 1.6;
}

.text-sm {
  font-size: 14px;
  line-height: 1.5;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-600 {
  color: #4b5563;
}

.text-blue-500 {
  color: #3b82f6;
}

.text-green-500 {
  color: #10b981;
}

.text-orange-500 {
  color: #f59e0b;
}

.text-purple-500 {
  color: #8b5cf6;
}

.text-blue-600 {
  color: #2563eb;
}

.text-green-600 {
  color: #059669;
}

.text-red-600 {
  color: #dc2626;
}

.text-lg {
  font-size: 18px;
}

.text-2xl {
  font-size: 24px;
}

.font-medium {
  font-weight: 500;
}

.font-bold {
  font-weight: 700;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mt-1 {
  margin-top: 0.25rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mt-6 {
  margin-top: 1.5rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.text-center {
  text-align: center;
}

.gap-2 {
  gap: 0.5rem;
}

.gap-20 {
  gap: 5rem;
}

.min-h-\[200px\] {
  min-height: 200px;
}

.min-h-\[300px\] {
  min-height: 300px;
}
</style>
