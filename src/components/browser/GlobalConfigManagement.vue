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
        <p>配置浏览器事件通知和默认指纹参数，支持多种推送方式，确保重要信息及时送达。</p>
        <p>包括系统状态、任务完成、错误报告等通知类型，以及新建浏览器实例的默认配置。</p>
      </template>
    </el-alert>

    <!-- 统一配置管理卡片 -->
    <el-card>
      <div class="config-header">
        <h3>全局配置中心</h3>
        <p class="config-description">统一管理浏览器默认配置和通知设置</p>
      </div>
      
      <!-- 统一手风琴组件 -->
      <el-collapse v-model="activeCollapses" class="unified-accordion">
        <!-- 第一部分：浏览器默认配置（在上） -->
        <el-collapse-item name="default-fingerprint-section" title="浏览器默认配置">
          <template #title>
            <div class="main-accordion-title">
              <el-icon><Monitor /></el-icon>
              <span>浏览器默认配置</span>
              <span class="badge-text badge-success">指纹</span>
            </div>
          </template>
          <div v-loading="loadingDefaultConfig" class="min-h-[300px]">
            <div v-if="defaultFingerprintConfig" class="space-y-6">
              <el-form :model="defaultFingerprintConfig" label-width="160px" @submit.prevent>
                <el-collapse 
                  v-model="activeDefaultConfigCollapses" 
                  class="unified-accordion"
                  @change="handleDefaultConfigAccordionChange"
                >
                  <!-- 基础浏览器配置 -->
                  <el-collapse-item name="browser-basic" title="基础浏览器配置">
                    <template #title>
                      <div class="accordion-title">
                        <el-icon><Monitor /></el-icon>
                        <span>基础配置</span>
                        <span class="badge-text badge-core">核心</span>
                      </div>
                    </template>
                    <el-form-item label="浏览器类型">
                      <el-select 
                        v-model="defaultFingerprintConfig.default_browser" 
                        placeholder="选择浏览器类型（留空则使用后端默认值）"
                        clearable
                        style="width: 100%"
                        @change="handleDefaultConfigChange"
                      >
                        <el-option label="Chrome" value="chrome" />
                        <el-option label="Edge" value="edge" />
                        <el-option label="Firefox" value="firefox" />
                      </el-select>
                      <div class="form-help-text">新建浏览器时使用的浏览器类型，留空则使用后端默认值</div>
                    </el-form-item>
                    <el-form-item label="操作系统">
                      <el-select 
                        v-model="defaultFingerprintConfig.default_platform" 
                        placeholder="选择操作系统（留空则使用后端默认值）"
                        clearable
                        style="width: 100%"
                        @change="handleDefaultConfigChange"
                      >
                        <el-option label="Windows" value="windows" />
                        <el-option label="macOS" value="macos" />
                        <el-option label="Linux" value="linux" />
                      </el-select>
                      <div class="form-help-text">新建浏览器时使用的操作系统，留空则使用后端默认值</div>
                    </el-form-item>
                  </el-collapse-item>

                  <!-- 屏幕分辨率配置 -->
                  <el-collapse-item name="screen-config" title="屏幕分辨率配置">
                    <template #title>
                      <div class="accordion-title">
                        <el-icon><FullScreen /></el-icon>
                        <span>屏幕配置</span>
                        <span class="badge-text badge-warning">显示</span>
                      </div>
                    </template>
                    <div class="config-section">
                      <el-row :gutter="16">
                        <el-col :md="12">
                          <el-form-item label="视口宽度">
                            <el-input-number 
                              v-model="defaultFingerprintConfig.default_viewport_width" 
                              :min="800"
                              :max="3840"
                              :step="100"
                              placeholder="留空则使用后端默认值"
                              clearable
                              style="width: 100%"
                              @change="handleDefaultConfigChange"
                            />
                            <div class="form-help-text">浏览器视口宽度，留空则使用后端默认值</div>
                          </el-form-item>
                        </el-col>
                        <el-col :md="12">
                          <el-form-item label="视口高度">
                            <el-input-number 
                              v-model="defaultFingerprintConfig.default_viewport_height" 
                              :min="600"
                              :max="2160"
                              :step="100"
                              placeholder="留空则使用后端默认值"
                              clearable
                              style="width: 100%"
                              @change="handleDefaultConfigChange"
                            />
                            <div class="form-help-text">浏览器视口高度，留空则使用后端默认值</div>
                          </el-form-item>
                        </el-col>
                      </el-row>
                    </div>
                  </el-collapse-item>

                  <!-- 语言与时区配置 -->
                  <el-collapse-item name="locale-timezone" title="语言与时区配置">
                    <template #title>
                      <div class="accordion-title">
                        <el-icon><Clock /></el-icon>
                        <span>语言时区</span>
                        <span class="badge-text badge-info">区域</span>
                      </div>
                    </template>
                    <div class="config-section">
                      <el-form-item label="语言">
                        <el-input 
                          v-model="defaultFingerprintConfig.default_lang" 
                          placeholder="zh-CN（留空则使用后端默认值）"
                          clearable
                          @input="handleDefaultConfigChange"
                        />
                        <div class="form-help-text">浏览器语言设置，如 zh-CN、en-US，留空则使用后端默认值</div>
                      </el-form-item>
                      <el-form-item label="时区">
                        <el-input 
                          v-model="defaultFingerprintConfig.default_timezone" 
                          placeholder="Asia/Shanghai（留空则使用后端默认值）"
                          clearable
                          @input="handleDefaultConfigChange"
                        />
                        <div class="form-help-text">浏览器时区设置，如 Asia/Shanghai、America/New_York，留空则使用后端默认值</div>
                      </el-form-item>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </el-form>
              
              <!-- 配置状态和操作 -->
              <div class="config-actions">
                <div class="config-status">
                  <span class="status-badge" :class="defaultConfigSaved ? 'status-saved' : 'status-unsaved'">
                    <el-icon class="status-icon">
                      <SuccessFilled v-if="defaultConfigSaved" />
                      <WarningFilled v-else />
                    </el-icon>
                    {{ defaultConfigSaved ? '配置已保存' : '有未保存的更改' }}
                  </span>
                  <el-button 
                    size="default" 
                    type="danger"
                    plain
                    @click="clearAllDefaultConfig" 
                    class="clear-button"
                  >
                    <el-icon><CircleCloseFilled /></el-icon>
                    全部设为未设置
                  </el-button>
                </div>
                <div class="config-buttons">
                  <el-button 
                    @click="resetDefaultConfig"
                    :icon="RefreshLeft"
                    size="small"
                  >
                    重置
                  </el-button>
                  <el-button 
                    type="primary" 
                    @click="saveDefaultConfig" 
                    :loading="savingDefaultConfig"
                    :icon="Check"
                    size="small"
                  >
                    保存配置
                  </el-button>
                </div>
              </div>
            </div>
            
            <!-- 空状态 -->
            <el-empty v-else description="暂无默认配置">
              <el-button type="primary" @click="initializeDefaultConfig">初始化配置</el-button>
            </el-empty>
          </div>
        </el-collapse-item>

        <!-- 第二部分：全局通知配置（在下） -->
        <el-collapse-item name="notification-section" title="全局通知配置">
          <template #title>
            <div class="main-accordion-title">
              <el-icon><Setting /></el-icon>
              <span>全局通知配置</span>
              <span class="badge-text badge-primary">通知</span>
            </div>
          </template>
          <div v-loading="loadingConfig" class="min-h-[300px]">
            <div v-if="notificationConfig" class="space-y-6">
              <!-- 统一手风琴配置界面 -->
              <el-form :model="notificationConfig" label-width="160px" @submit.prevent>
              <el-collapse 
                v-model="activeNotificationCollapses" 
                class="unified-accordion"
                @change="handleNotificationAccordionChange"
              >
                <!-- 基础设置 -->
                <el-collapse-item name="basic" title="基础设置">
                  <template #title>
                    <div class="accordion-title">
                      <el-icon><Setting /></el-icon>
                      <span>基础设置</span>
                      <span class="badge-text badge-core">核心</span>
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
                      <span class="badge-text badge-ios">iOS</span>
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
                      <span class="badge-text badge-warning">多平台</span>
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
                      <span class="badge-text badge-wechat">微信</span>
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
                      <span class="badge-text badge-more">更多</span>
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
                  <span class="status-badge" :class="configSaved ? 'status-saved' : 'status-unsaved'">
                    <el-icon class="status-icon">
                      <SuccessFilled v-if="configSaved" />
                      <WarningFilled v-else />
                    </el-icon>
                    {{ configSaved ? '配置已保存' : '有未保存的更改' }}
                  </span>
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
import biliMessage from '@/utils/message'
import { Setting, Apple, Promotion, ChatDotRound, MoreFilled, SuccessFilled, WarningFilled, RefreshLeft, Check, Document, DataAnalysis, Bell, CircleCloseFilled, Monitor, FullScreen, Clock } from '@element-plus/icons-vue'
import browserApi from '@/api/browser/browser_api'
import { asyncHandler } from '@/utils/asyncHandler'
import type { 
  NotificationConfigCreate,
  NotificationConfigUpdate,
  UserBrowserDefaultSettingRequest,
  UserBrowserDefaultSettingResponse
} from '@/types/browser-automation-api'

// 响应式数据
const showAlert = ref(true)
const activeCollapses = ref<string[]>(['default-fingerprint-section']) // 默认展开浏览器默认配置
const activeNotificationCollapses = ref<string[]>(['basic']) // 通知配置内部手风琴状态
const activeDefaultConfigCollapses = ref<string[]>(['browser-basic']) // 默认配置内部手风琴状态
const loadingConfig = ref(false)
const savingConfig = ref(false)
const testingNotification = ref(false)
const configSaved = ref(true)
const notificationConfig = ref<NotificationConfigCreate | null>(null)

// 浏览器默认配置相关
const loadingDefaultConfig = ref(false)
const savingDefaultConfig = ref(false)
const defaultConfigSaved = ref(true)
const defaultFingerprintConfig = ref<UserBrowserDefaultSettingRequest | null>(null)

// 处理主手风琴变化（已废弃，保留兼容）
const handleAccordionChange = (activeNames: string[]) => {
  activeCollapses.value = activeNames
}

// 处理通知配置内部手风琴变化
const handleNotificationAccordionChange = (activeNames: string[]) => {
  activeNotificationCollapses.value = activeNames
}

// 处理默认配置内部手风琴变化
const handleDefaultConfigAccordionChange = (activeNames: string[]) => {
  activeDefaultConfigCollapses.value = activeNames
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
  biliMessage.info('配置已重置')
}

const initializeConfig = () => {
  notificationConfig.value = { ...defaultConfig }
  configSaved.value = false
  biliMessage.success('配置初始化完成')
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
  
  biliMessage.success(`已应用${templateNames[templateName]}模板`)
}

const testNotification = async () => {
  testingNotification.value = true
  try {
    // 模拟测试推送
    await new Promise(resolve => setTimeout(resolve, 1000))
    biliMessage.success('测试推送发送成功')
  } catch (error) {
    biliMessage.error('测试推送发送失败')
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

// ========== 浏览器默认配置相关方法 ==========

// 默认指纹配置（使用服务器端 API 的类型）
// 所有字段初始化为 null/undefined，表示"未设置"状态
// 这样可以让后端动态决定默认值，用户也可以主动选择"未设置"
const defaultFingerprintDefaultConfig: UserBrowserDefaultSettingRequest = {
  default_browser: undefined,
  default_platform: undefined,
  default_lang: undefined,
  default_timezone: undefined,
  default_viewport_width: undefined,
  default_viewport_height: undefined,
  default_headless: undefined,
  default_timeout: undefined,
  default_max_pages: undefined,
  default_retry_times: undefined,
  default_retry_delay: undefined,
  default_min_wait: undefined,
  default_max_wait: undefined,
  default_proxy_server: undefined,
  default_log_level: undefined
}

// 加载默认指纹配置（从服务器获取）
const loadDefaultFingerprintConfig = async () => {
  loadingDefaultConfig.value = true
  
  const { data: response, error } = await asyncHandler(
    browserApi.getDefaultSettings(),
    {
      errorMessage: '加载浏览器默认配置失败',
      showErrorToast: false // 不显示错误提示，因为可能是首次使用
    }
  )
  
  if (!error && response && response.code === 0 && response.data) {
    // API 调用成功且有数据，直接使用后端返回的配置
    defaultFingerprintConfig.value = { ...response.data }
    defaultConfigSaved.value = true
  } else {
    // API 调用失败或无数据，使用"未设置"状态
    defaultFingerprintConfig.value = { ...defaultFingerprintDefaultConfig }
    defaultConfigSaved.value = true // 初始状态视为已保存（未设置也是一种有效状态）
  }
  
  loadingDefaultConfig.value = false
}

// 保存默认指纹配置到服务器
const saveDefaultConfig = async () => {
  if (!defaultFingerprintConfig.value) return
  
  savingDefaultConfig.value = true
  
  const { data: response, error } = await asyncHandler(
    browserApi.createOrUpdateDefaultSettings(defaultFingerprintConfig.value),
    {
      successMessage: '浏览器默认配置保存成功',
      errorMessage: '保存失败',
      showSuccessToast: true,
      showErrorToast: true
    }
  )
  
  if (!error && response && response.code === 0) {
    defaultConfigSaved.value = true
  } else {
    defaultConfigSaved.value = false
  }
  
  savingDefaultConfig.value = false
}

// 处理默认配置变化
const handleDefaultConfigChange = () => {
  defaultConfigSaved.value = false
}

// 重置默认配置 - 重置为"未设置"状态
const resetDefaultConfig = () => {
  defaultFingerprintConfig.value = { ...defaultFingerprintDefaultConfig }
  defaultConfigSaved.value = false
  biliMessage.info('配置已重置为未设置状态')
}

// 清除所有默认配置 - 将所有字段设为 undefined
const clearAllDefaultConfig = () => {
  if (defaultFingerprintConfig.value) {
    // 将所有字段设置为 undefined
    Object.keys(defaultFingerprintConfig.value).forEach(key => {
      (defaultFingerprintConfig.value as any)[key] = undefined
    })
    defaultConfigSaved.value = false
    biliMessage.success('所有配置已设为未设置状态，将由后端提供默认值')
  }
}

// 初始化默认配置 - 初始化为"未设置"状态
const initializeDefaultConfig = () => {
  defaultFingerprintConfig.value = { ...defaultFingerprintDefaultConfig }
  defaultConfigSaved.value = false
  biliMessage.success('配置已初始化为未设置状态，将由后端提供默认值')
}

// 生命周期
onMounted(() => {
  // 加载通知配置
  loadConfig()
  
  // 加载默认指纹配置
  loadDefaultFingerprintConfig()
  
  // 自动关闭alert
  setTimeout(() => {
    showAlert.value = false
  }, 5000) // 5秒后自动关闭
})
</script>

<style scoped>
/* 全局容器 */
.global-config-management {
  padding: var(--spacing-4);
  max-width: 1400px;
  margin: 0 auto;
  font-size: var(--font-size-base);
}

/* 配置头部样式 */
.config-header {
  padding: var(--spacing-6);
  text-align: center;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 0;
}

.config-header h3 {
  margin: 0 0 var(--spacing-2) 0;
  font-size: var(--font-size-4xl);
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.config-description {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--el-text-color-regular);
  line-height: var(--line-height-relaxed);
}

/* 主手风琴样式 */
.main-accordion {
  border: none;
  box-shadow: var(--el-box-shadow-lighter);
  border-radius: var(--size-radius-base);
  overflow: hidden;
}

.main-accordion :deep(.el-collapse-item__header) {
  padding: var(--spacing-4) var(--spacing-5);
  font-size: var(--font-size-lg);
  font-weight: 600;
  border: none;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all var(--transition-slow) var(--transition-timing);
}


/* 统一手风琴样式 */
.unified-accordion {
  border: none;
  box-shadow: var(--el-box-shadow-lighter);
  border-radius: var(--size-radius-base);
  overflow: hidden;
}

.unified-accordion :deep(.el-collapse-item) {
  border-bottom: 1px solid var(--el-border-color-light);
}

.unified-accordion :deep(.el-collapse-item:last-child) {
  border-bottom: none;
}

.unified-accordion :deep(.el-collapse-item__header) {
  padding: var(--spacing-4) var(--spacing-5);
  font-weight: 600;
  border: none;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all var(--transition-base) var(--transition-timing);
}

.unified-accordion :deep(.el-collapse-item__wrap) {
  border: none;
}

.unified-accordion :deep(.el-collapse-item__content) {
  padding: var(--spacing-6) var(--spacing-5);
}

/* 主手风琴标题样式 */
.main-accordion-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
}

.main-accordion-title .el-icon {
  font-size: var(--icon-size-xl);
  color: var(--el-color-primary);
}

.main-accordion-title span {
  flex: 1;
  font-size: var(--font-size-2xl);
  font-weight: 600;
}

/* 手风琴标题样式 */
.accordion-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
}

.accordion-title .el-icon {
  font-size: var(--icon-size-lg);
  color: var(--el-color-primary);
}

.accordion-title span:not(.badge-text) {
  flex: 1;
  font-size: var(--font-size-xl);
  font-weight: 500;
}

/* 配置区域样式 */
.config-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.sub-section {
  padding: var(--spacing-4);
  border-radius: var(--size-radius-base);
  margin-bottom: var(--spacing-4);
}

.sub-section h4 {
  margin: 0 0 var(--spacing-4) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-left: 3px solid var(--el-color-primary);
  padding-left: var(--spacing-2);
}

/* 表单帮助文本 */
.form-help-text {
  font-size: var(--font-size-xs);
  color: var(--el-text-color-secondary);
  margin-top: var(--spacing-1);
  line-height: var(--line-height-snug);
}

/* 模板卡片样式 */
.template-card {
  padding: var(--spacing-5);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--size-radius-base);
  box-shadow: var(--el-box-shadow-lighter);
  transition: all var(--transition-base) var(--transition-timing);
}

.template-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--el-box-shadow-light);
}

.template-card h4 {
  margin: 0 0 var(--spacing-4) 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: center;
}

/* 卡片样式 */
.el-card {
  margin-bottom: var(--spacing-5);
  border-radius: var(--size-radius-base);
  box-shadow: var(--el-box-shadow-light);
}

.el-card :deep(.el-card__header) {
  font-size: var(--font-size-lg);
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light);
}

.el-card :deep(.el-card__body) {
  padding: var(--spacing-6);
  font-size: var(--font-size-base);
}

.config-tabs :deep(.el-tabs__content) {
  padding: var(--spacing-5) 0;
}

.text-center .el-card :deep(.el-card__body) {
  padding: var(--spacing-8) var(--spacing-6);
}

.el-descriptions {
  margin-bottom: var(--spacing-4);
}

.el-tag {
  margin-bottom: var(--spacing-1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .global-config-management {
    padding: var(--spacing-3);
  }
  
  .main-accordion :deep(.el-collapse-item__header),
  .unified-accordion :deep(.el-collapse-item__header) {
    padding: var(--spacing-3) var(--spacing-4);
    font-size: var(--font-size-base);
  }
  
  .main-accordion :deep(.el-collapse-item__content),
  .unified-accordion :deep(.el-collapse-item__content) {
    padding: var(--spacing-4);
  }
  
  .accordion-title {
    gap: var(--spacing-2);
  }
  
  .accordion-title .el-icon {
    font-size: var(--icon-size-sm);
  }
  
  .accordion-title span {
    font-size: var(--font-size-base);
  }
  
  .sub-section {
    padding: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }
  
  .el-form-item {
    margin-bottom: var(--spacing-4);
  }
  
  .el-card :deep(.el-card__body) {
    padding: var(--spacing-4);
  }
}

@media (max-width: 480px) {
  .global-config-management {
    padding: var(--spacing-2);
  }
  
  .main-accordion :deep(.el-collapse-item__header),
  .unified-accordion :deep(.el-collapse-item__header) {
    padding: var(--spacing-2) var(--spacing-3);
  }
  
  .main-accordion :deep(.el-collapse-item__content),
  .unified-accordion :deep(.el-collapse-item__content) {
    padding: var(--spacing-3);
  }
  
  .sub-section {
    padding: var(--spacing-2);
  }
  
  .accordion-title .el-tag {
    display: none; /* 在小屏幕上隐藏标签 */
  }
}

/* 交互动画 */
.unified-accordion :deep(.el-collapse-item__arrow) {
  transition: transform var(--transition-base) var(--transition-timing);
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
  padding: var(--spacing-5) 0;
  border-top: 1px solid var(--el-border-color-light);
  margin-top: var(--spacing-5);
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

.config-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.status-icon {
  margin-right: var(--spacing-1);
}

.test-button {
  transition: all var(--transition-base) var(--transition-timing);
}

.test-button:hover {
  transform: translateY(-1px);
}

.clear-button {
  transition: all var(--transition-base) var(--transition-timing);
}

.clear-button:hover {
  transform: translateY(-1px);
}

.config-buttons {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

/* 响应式操作区域 */
@media (max-width: 768px) {
  .config-actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-3);
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
  transition: all var(--transition-base) var(--transition-timing);
}

/* 表单验证反馈 */
.el-form-item.is-error :deep(.el-input__wrapper) {
  animation: shake var(--transition-base) ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* 配置完成提示 */
.config-saved-toast {
  animation: slideInRight var(--transition-base) ease-out;
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
  padding: var(--spacing-0) var(--spacing-1);
  border-radius: var(--size-radius-base);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.el-form-item :deep(.el-form-item__content) {
  line-height: var(--line-height-relaxed);
  font-size: var(--font-size-base);
}

/* 徽章样式 - 精致文字标签 */
.badge-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--spacing-12);
  padding: var(--spacing-1) var(--spacing-3);
  margin-left: var(--spacing-2);
  font-size: var(--component-font-size-sm);
  font-weight: 500;
  line-height: var(--line-height-normal);
  border-radius: var(--size-radius-large);
  white-space: nowrap;
  transition: all var(--transition-base) var(--transition-timing);
  letter-spacing: 0.02em;
}

.badge-text:hover {
  transform: translateY(-1px);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 核心配置 - 紫色渐变 */
.badge-core {
  background: linear-gradient(135deg, var(--color-violet-500) 0%, var(--color-purple-600) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* iOS - 粉红渐变 */
.badge-ios {
  background: linear-gradient(135deg, var(--color-pink-400) 0%, var(--color-rose-500) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* Android - 蓝色渐变 */
.badge-android {
  background: linear-gradient(135deg, var(--color-sky-400) 0%, var(--color-cyan-400) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* Web - 橙黄渐变 */
.badge-web {
  background: linear-gradient(135deg, var(--color-orange-400) 0%, var(--color-amber-300) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 微信 - 绿色渐变 */
.badge-wechat {
  background: linear-gradient(135deg, var(--color-green-500) 0%, var(--color-emerald-600) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 更多 - 蓝紫渐变 */
.badge-more {
  background: linear-gradient(135deg, var(--color-violet-400) 0%, var(--color-fuchsia-300) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 通用 - 灰色渐变 */
.badge-general {
  background: linear-gradient(135deg, var(--color-gray-300) 0%, var(--color-gray-100) 100%);
  color: var(--el-text-color-regular);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 成功 - 绿色渐变 */
.badge-success {
  background: linear-gradient(135deg, var(--el-color-success) 0%, var(--el-color-success-dark-2) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 警告 - 橙色渐变 */
.badge-warning {
  background: linear-gradient(135deg, var(--el-color-warning) 0%, var(--el-color-warning-dark-2) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 信息 - 灰色渐变 */
.badge-info {
  background: linear-gradient(135deg, var(--el-color-info) 0%, var(--el-color-info-dark-2) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 主要 - 蓝色渐变 */
.badge-primary {
  background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-dark-2) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-lighter);
}

/* 状态徽章 - 配置保存状态 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  min-height: var(--component-height-base);
  font-size: var(--font-size-sm);
  font-weight: 600;
  border-radius: var(--size-radius-base);
  transition: all var(--transition-base) var(--transition-timing);
  cursor: default;
  white-space: nowrap;
  line-height: 1;
}

.status-badge .status-icon {
  font-size: var(--icon-size-lg);
}

/* 已保存状态 - 深绿色 */
.status-saved {
  background: linear-gradient(135deg, var(--el-color-success) 0%, var(--el-color-success-dark-2) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-light);
}

.status-saved:hover {
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow);
}

/* 未保存状态 - 深橙色 */
.status-unsaved {
  background: linear-gradient(135deg, var(--el-color-warning) 0%, var(--el-color-warning-dark-2) 100%);
  color: var(--el-color-white);
  box-shadow: var(--el-box-shadow-light);
}

.status-unsaved:hover {
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow);
}
</style>
