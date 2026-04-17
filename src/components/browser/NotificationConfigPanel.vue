<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\NotificationConfigPanel.vue
 * @Description: 通知配置组件
-->
<template>
  <div class="min-h-[400px]" v-loading="loading">
    <div v-if="config" class="space-y-6">
      <!-- 统一手风琴配置界面 -->
      <el-form :model="config" label-width="160px" @submit.prevent>
        <el-collapse 
          v-model="activeCollapses" 
          class="border border-[var(--el-border-color)] rounded"
          @change="handleAccordionChange"
        >
          <!-- 基础设置 -->
          <el-collapse-item name="basic" title="基础设置">
            <template #title>
              <div class="flex items-center gap-2 font-medium">
                <el-icon><Setting /></el-icon>
                <span>基础设置</span>
                <el-tag type="primary" size="small">核心</el-tag>
              </div>
            </template>
            <el-form-item label="一言推送">
              <el-switch 
                v-model="config.hitokoto" 
                @change="handleConfigChange"
              />
              <div class="text-[12px] text-[var(--el-text-color-secondary)] mt-1">启用后每日推送一句优美语句</div>
            </el-form-item>
          </el-collapse-item>

          <!-- Bark推送配置 -->
          <el-collapse-item name="bark" title="Bark推送配置">
            <template #title>
              <div class="flex items-center gap-2 font-medium">
                <el-icon><Apple /></el-icon>
                <span>Bark推送</span>
                <el-tag type="success" size="small">iOS</el-tag>
              </div>
            </template>
            <div class="px-4">
              <el-form-item label="推送地址">
                <el-input 
                  v-model="config.bark_push" 
                  placeholder="https://api.day.app/your_key"
                  @input="handleConfigChange"
                />
                <div class="text-[12px] text-[var(--el-text-color-secondary)] mt-1">iOS设备专用推送服务</div>
              </el-form-item>
              <el-row :gutter="16">
                <el-col :md="12">
                  <el-form-item label="归档">
                    <el-input 
                      v-model="config.bark_archive" 
                      placeholder="归档名称"
                      maxlength="128"
                      @input="handleConfigChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :md="12">
                  <el-form-item label="分组">
                    <el-input 
                      v-model="config.bark_group" 
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
                      v-model="config.bark_sound" 
                      placeholder="音效名称"
                      maxlength="128"
                      @input="handleConfigChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :md="12">
                  <el-form-item label="级别">
                    <el-input 
                      v-model="config.bark_level" 
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
                      v-model="config.bark_icon" 
                      placeholder="图标URL"
                      @input="handleConfigChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :md="12">
                  <el-form-item label="跳转URL">
                    <el-input 
                      v-model="config.bark_url" 
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
              <div class="flex items-center gap-2 font-medium">
                <el-icon><Promotion /></el-icon>
                <span>Push Plus</span>
                <el-tag type="warning" size="small">多平台</el-tag>
              </div>
            </template>
            <div class="px-4">
              <el-form-item label="Token">
                <el-input 
                  v-model="config.push_plus_token" 
                  placeholder="Push Plus Token"
                  @input="handleConfigChange"
                />
              </el-form-item>
              <el-row :gutter="16">
                <el-col :md="12">
                  <el-form-item label="用户ID">
                    <el-input 
                      v-model="config.push_plus_user" 
                      placeholder="用户ID"
                      maxlength="128"
                      @input="handleConfigChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :md="12">
                  <el-form-item label="模板">
                    <el-input 
                      v-model="config.push_plus_template" 
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
                      v-model="config.push_plus_channel" 
                      placeholder="推送渠道"
                      maxlength="128"
                      @input="handleConfigChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :md="12">
                  <el-form-item label="收件人">
                    <el-input 
                      v-model="config.push_plus_to" 
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
                      v-model="config.push_plus_webhook" 
                      placeholder="Webhook地址"
                      @input="handleConfigChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :md="12">
                  <el-form-item label="回调URL">
                    <el-input 
                      v-model="config.push_plus_callbackurl" 
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
              <div class="flex items-center gap-2 font-medium">
                <el-icon><ChatDotRound /></el-icon>
                <span>微信推送器</span>
                <el-tag type="info" size="small">微信</el-tag>
              </div>
            </template>
            <div class="px-4">
              <el-form-item label="应用Token">
                <el-input 
                  v-model="config.wxpusher_app_token" 
                  placeholder="应用Token"
                  @input="handleConfigChange"
                />
              </el-form-item>
              <el-row :gutter="16">
                <el-col :md="12">
                  <el-form-item label="主题ID">
                    <el-input 
                      v-model="config.wxpusher_topic_ids" 
                      placeholder="主题ID列表"
                      @input="handleConfigChange"
                    />
                  </el-form-item>
                </el-col>
                <el-col :md="12">
                  <el-form-item label="用户ID">
                    <el-input 
                      v-model="config.wxpusher_uids" 
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
              <div class="flex items-center gap-2 font-medium">
                <el-icon><MoreFilled /></el-icon>
                <span>其他推送</span>
                <el-tag type="info" size="small">更多</el-tag>
              </div>
            </template>
            <div class="px-4">
              <div class="mb-5">
                <h4 class="mt-0 mb-3 text-[var(--el-text-color-primary)] font-medium">钉钉机器人</h4>
                <el-row :gutter="16">
                  <el-col :md="12">
                    <el-form-item label="Token">
                      <el-input 
                        v-model="config.dd_bot_token" 
                        placeholder="钉钉机器人Token"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :md="12">
                    <el-form-item label="密钥">
                      <el-input 
                        v-model="config.dd_bot_secret" 
                        placeholder="钉钉机器人密钥"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              
              <div class="mb-5">
                <h4 class="mt-0 mb-3 text-[var(--el-text-color-primary)] font-medium">企业微信</h4>
                <el-form-item label="密钥">
                  <el-input 
                    v-model="config.qywx_key" 
                    placeholder="企业微信密钥"
                    @input="handleConfigChange"
                  />
                </el-form-item>
              </div>
              
              <div class="mb-5">
                <h4 class="mt-0 mb-3 text-[var(--el-text-color-primary)] font-medium">Telegram</h4>
                <el-row :gutter="16">
                  <el-col :md="12">
                    <el-form-item label="Bot Token">
                      <el-input 
                        v-model="config.tg_bot_token" 
                        placeholder="Telegram Bot Token"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :md="12">
                    <el-form-item label="用户ID">
                      <el-input 
                        v-model="config.tg_user_id" 
                        placeholder="用户ID"
                        maxlength="128"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              
              <div class="mb-5">
                <h4 class="mt-0 mb-3 text-[var(--el-text-color-primary)] font-medium">邮件推送</h4>
                <el-row :gutter="16">
                  <el-col :md="12">
                    <el-form-item label="SMTP服务器">
                      <el-input 
                        v-model="config.smtp_server" 
                        placeholder="SMTP服务器地址"
                        maxlength="128"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :md="12">
                    <el-form-item label="发件邮箱">
                      <el-input 
                        v-model="config.smtp_email" 
                        placeholder="发件邮箱"
                        maxlength="256"
                        @input="handleConfigChange"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
              
              <div class="mb-5">
                <h4 class="mt-0 mb-3 text-[var(--el-text-color-primary)] font-medium">Webhook</h4>
                <el-form-item label="Webhook地址">
                  <el-input 
                    v-model="config.webhook_url" 
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
      <div class="flex justify-between items-center p-4 border-t border-[var(--el-border-color)] bg-[var(--el-fill-color-light)] rounded-b">
        <div>
          <el-tag 
            :type="saved ? 'success' : 'warning'" 
            size="small"
            effect="light"
            :icon="saved ? SuccessFilled : WarningFilled"
          >
            {{ saved ? '配置已保存' : '有未保存的更改' }}
          </el-tag>
        </div>
        <div class="flex gap-2">
          <el-button 
            @click="$emit('reset')"
            :icon="RefreshLeft"
            size="small"
          >
            重置
          </el-button>
          <el-button 
            type="primary" 
            @click="$emit('save')" 
            :loading="saving"
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
      <el-button type="primary" @click="$emit('initialize')">初始化配置</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Setting, Apple, Promotion, ChatDotRound, MoreFilled,
  SuccessFilled, WarningFilled, RefreshLeft, Check
} from '@element-plus/icons-vue'
import type { NotificationConfigCreate } from '@/types/browser-automation-api'

// 定义Props
interface Props {
  config: NotificationConfigCreate | null
  loading?: boolean
  saving?: boolean
  saved?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  saving: false,
  saved: true
})

// 定义Emit
const emit = defineEmits<{
  change: [config: NotificationConfigCreate]
  save: []
  reset: []
  initialize: []
}>()

// 手风琴激活项
const activeCollapses = ref<string[]>(['basic'])

// 方法
const handleAccordionChange = () => {
  // 可以在这里添加手风琴状态变化的处理逻辑
}

const handleConfigChange = () => {
  if (props.config) {
    emit('change', props.config)
  }
}
</script>

