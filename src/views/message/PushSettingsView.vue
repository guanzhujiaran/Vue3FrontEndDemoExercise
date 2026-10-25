<template>
  <FlexContainer class="push-settings-view gap-4">
    <!-- 页头 -->
    <BiliPageHeader
      title="推送设置"
      description="配置站外推送渠道与接收时段；站内系统通知不受此页影响"
    />

    <div v-loading="loading" class="push-settings-view__body flex flex-col gap-4">
      <!-- ============ 区块一：外部推送总开关与免打扰 ============ -->
      <div class="push-settings-view__section rounded-lg bg-bg-overlay p-6">
        <h3 class="push-settings-view__section-title mb-4 text-base font-medium text-text-primary">
          外部推送总开关与免打扰
        </h3>

        <div class="push-settings-view__row mb-6">
          <div class="push-settings-view__label mb-2 text-sm font-medium text-text-primary">
            外部推送总开关
            <span class="push-settings-view__tip text-text-placeholder">
              关闭后，所有外部推送渠道（下方配置的站外渠道）将不再发送消息；站内系统通知不受影响。
            </span>
          </div>
          <el-switch
            v-model="settingForm.push_enabled"
            :loading="savingToggle"
            @change="savePushEnabled"
          />
        </div>

        <div class="push-settings-view__row" :class="{ 'opacity-60': !settingForm.push_enabled }">
          <div class="push-settings-view__label mb-2 text-sm font-medium text-text-primary">
            免打扰时段
            <span class="push-settings-view__tip text-text-placeholder">
              在该时段内不发送外部推送。起始时间小于结束时间表示同一天区间，大于表示跨零点。
            </span>
          </div>
          <div class="push-settings-view__dnd flex flex-wrap items-center gap-3">
            <el-select
              v-model="settingForm.dnd_start_hour"
              class="push-settings-view__dnd-select w-32"
              placeholder="起始时间"
              :disabled="!settingForm.push_enabled"
              @change="saveDnd"
            >
              <el-option
                v-for="opt in HOUR_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <span class="text-text-placeholder">至</span>
            <el-select
              v-model="settingForm.dnd_end_hour"
              class="push-settings-view__dnd-select w-32"
              placeholder="结束时间"
              :disabled="!settingForm.push_enabled"
              @change="saveDnd"
            >
              <el-option
                v-for="opt in HOUR_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-button
              class="push-settings-view__dnd-clear"
              :disabled="!settingForm.push_enabled || (settingForm.dnd_start_hour === null && settingForm.dnd_end_hour === null)"
              @click="disableDnd"
            >
              不启用免打扰
            </el-button>
          </div>
        </div>
      </div>

      <!-- ============ 区块二：推送渠道配置（全局配置） ============ -->
      <div class="push-settings-view__section rounded-lg bg-bg-overlay p-6">
        <h3 class="push-settings-view__section-title mb-2 text-base font-medium text-text-primary">
          推送渠道配置
          <span class="push-settings-view__tip text-text-placeholder">（全局默认配置，对所有工作流生效）</span>
        </h3>
        <p class="push-settings-view__section-desc mb-4 text-xs text-text-placeholder">
          按渠道填写密钥/地址，未填写的渠道不会发送。填写完成后点击底部「保存配置」——会先用当前内容测试推送，测试通过后才会保存；也可单独点「测试推送」先行验证。
        </p>

        <el-collapse v-model="activeGroups">
          <el-collapse-item
            v-for="group in CHANNEL_GROUPS"
            :key="group.key"
            :name="group.key"
          >
            <template #title>
              <span class="push-settings-view__group-title text-sm font-medium text-text-primary">
                {{ group.title }}
              </span>
              <el-tag
                size="small"
                class="push-settings-view__group-count ml-2"
                :type="configuredCount(group) > 0 ? 'success' : 'info'"
              >
                已配置 {{ configuredCount(group) }} / {{ group.fields.length }} 项
              </el-tag>
              <span v-if="group.desc" class="push-settings-view__group-desc ml-2 text-xs text-text-placeholder">
                {{ group.desc }}
              </span>
            </template>

            <!-- form 包裹：渠道密钥为密码输入框，Chromium 要求位于 form 内；@submit.prevent 防回车提交 -->
            <form
              class="push-settings-view__fields grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2"
              @submit.prevent
            >
              <div
                v-for="field in group.fields"
                :key="field.key"
                class="push-settings-view__field flex flex-col gap-1"
              >
                <label class="push-settings-view__field-label text-xs text-text-secondary">
                  {{ field.label }}
                </label>
                <el-switch
                  v-if="field.type === 'switch'"
                  v-model="form[field.key]"
                />
                <el-input-number
                  v-else-if="field.type === 'number'"
                  v-model="form[field.key]"
                  class="w-full"
                  controls-position="right"
                />
                <el-input
                  v-else
                  v-model="form[field.key]"
                  :type="field.type === 'password' ? 'password' : 'text'"
                  :show-password="field.type === 'password'"
                  :placeholder="field.placeholder"
                  clearable
                />
              </div>
            </form>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- ============ 底部操作区 ============ -->
      <div class="push-settings-view__actions flex flex-wrap justify-end gap-2">
        <el-button
          class="push-settings-view__test-btn"
          :loading="testing"
          @click="handleTest"
        >
          测试推送
        </el-button>
        <el-button
          type="primary"
          class="push-settings-view__save-btn"
          :loading="saving"
          @click="handleSave"
        >
          保存配置
        </el-button>
      </div>
    </div>
  </FlexContainer>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { 通知配置管理Service } from '@/api/browser/hey-api'
import type {
  NotificationConfig,
  NotificationConfigCreate,
  NotificationConfigUpsertResp
} from '@/api/browser/hey-api'
import { PushService } from '@/api/community/hey-api'
import { businessHandler } from '@/utils/businessHandler'
import {
  fetchMessageSetting,
  updateMessageSetting
} from '@/api/notify/message-api'

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回时保留表单状态）
defineOptions({ name: 'PushSettingsView' })

// ---------------------------------------------------------------------------
// 渠道字段描述表：覆盖 NotificationConfigCreate 的全部渠道字段（共 72 个）
// （mid / created_at / updated_at / browser_id 为服务端托管字段，不在此表单内）
// ---------------------------------------------------------------------------
type FieldType = 'text' | 'password' | 'number' | 'switch'

interface ChannelField {
  key: keyof NotificationConfigCreate
  label: string
  type?: FieldType
  placeholder?: string
  /**
   * 表单初值。
   *
   * 必须与后端 `NotificationConfigBase`（RPA `app/models/database/notify/models.py`）
   * 的默认值保持一致：本表单保存时**整份提交**，后端以 `exclude_unset` 逐字段覆盖，
   * 若初值为空串会把这些带默认值的字段清成空值（如 PushPlus 模板、Ntfy 优先级）。
   */
  initial?: number | boolean | string
}

interface ChannelGroup {
  key: string
  title: string
  desc?: string
  fields: ChannelField[]
}

const CHANNEL_GROUPS: ChannelGroup[] = [
  {
    key: 'hitokoto',
    title: '一言',
    fields: [{ key: 'hitokoto', label: '附加一言随机句子', type: 'switch', initial: true }]
  },
  {
    key: 'bark',
    title: 'Bark',
    fields: [
      { key: 'bark_push', label: 'Bark 推送 Key', type: 'password' },
      { key: 'bark_archive', label: '归档' },
      { key: 'bark_group', label: '分组' },
      { key: 'bark_sound', label: '铃声' },
      { key: 'bark_icon', label: '图标' },
      { key: 'bark_level', label: '级别' },
      { key: 'bark_url', label: '服务器地址' }
    ]
  },
  {
    key: 'dingtalk',
    title: '钉钉',
    fields: [
      { key: 'dd_bot_secret', label: '机器人 Secret', type: 'password' },
      { key: 'dd_bot_token', label: '机器人 Token', type: 'password' }
    ]
  },
  {
    key: 'feishu',
    title: '飞书',
    fields: [{ key: 'fskey', label: '飞书 Key', type: 'password' }]
  },
  {
    key: 'serverchan',
    title: 'Server 酱',
    fields: [{ key: 'push_key', label: 'SendKey', type: 'password' }]
  },
  {
    key: 'pushplus',
    title: 'PushPlus',
    fields: [
      { key: 'push_plus_token', label: 'Token', type: 'password' },
      { key: 'push_plus_user', label: 'User' },
      { key: 'push_plus_template', label: '模板', initial: 'html' },
      { key: 'push_plus_channel', label: '渠道', initial: 'wechat' },
      { key: 'push_plus_webhook', label: 'Webhook' },
      { key: 'push_plus_callbackurl', label: '回调地址' },
      { key: 'push_plus_to', label: '接收人' }
    ]
  },
  {
    key: 'pushdeer',
    title: 'PushDeer',
    fields: [
      { key: 'deer_key', label: 'Key', type: 'password' },
      { key: 'deer_url', label: '服务器地址' }
    ]
  },
  {
    key: 'telegram',
    title: 'Telegram',
    fields: [
      { key: 'tg_bot_token', label: 'Bot Token', type: 'password' },
      { key: 'tg_user_id', label: 'Chat/User ID' },
      { key: 'tg_api_host', label: 'API Host' },
      { key: 'tg_proxy_auth', label: '代理认证', type: 'password' },
      { key: 'tg_proxy_host', label: '代理 Host' },
      { key: 'tg_proxy_port', label: '代理端口' }
    ]
  },
  {
    key: 'qywx',
    title: '企业微信',
    fields: [
      { key: 'qywx_origin', label: '代理地址' },
      { key: 'qywx_am', label: '应用消息' },
      { key: 'qywx_key', label: '机器人 Key', type: 'password' },
      { key: 'we_plus_bot_token', label: 'WePlus 机器人 Token', type: 'password' },
      { key: 'we_plus_bot_receiver', label: 'WePlus 接收人' },
      { key: 'we_plus_bot_version', label: 'WePlus 版本', initial: 'pro' }
    ]
  },
  {
    key: 'qmsg',
    title: 'Qmsg 酱',
    fields: [
      { key: 'qmsg_key', label: 'Key', type: 'password' },
      { key: 'qmsg_type', label: '类型' }
    ]
  },
  {
    key: 'gocqhttp',
    title: 'go-cqhttp',
    fields: [
      { key: 'gobot_url', label: '接口地址' },
      { key: 'gobot_qq', label: 'QQ 号' },
      { key: 'gobot_token', label: 'Token', type: 'password' }
    ]
  },
  {
    key: 'gotify',
    title: 'Gotify',
    fields: [
      { key: 'gotify_url', label: '服务器地址' },
      { key: 'gotify_token', label: 'Token', type: 'password' },
      { key: 'gotify_priority', label: '优先级', type: 'number', initial: 0 }
    ]
  },
  {
    key: 'ntfy',
    title: 'Ntfy',
    fields: [
      { key: 'ntfy_url', label: '服务器地址' },
      { key: 'ntfy_topic', label: 'Topic' },
      { key: 'ntfy_priority', label: '优先级', initial: '3' },
      { key: 'ntfy_token', label: 'Token', type: 'password' },
      { key: 'ntfy_username', label: '用户名' },
      { key: 'ntfy_password', label: '密码', type: 'password' },
      { key: 'ntfy_actions', label: 'Actions' }
    ]
  },
  {
    key: 'wxpusher',
    title: 'WxPusher',
    fields: [
      { key: 'wxpusher_app_token', label: 'AppToken', type: 'password' },
      { key: 'wxpusher_topic_ids', label: 'Topic IDs' },
      { key: 'wxpusher_uids', label: 'UIDs' }
    ]
  },
  {
    key: 'webhook',
    title: '自定义 Webhook',
    fields: [
      { key: 'webhook_url', label: '请求地址' },
      { key: 'webhook_body', label: '请求体' },
      { key: 'webhook_headers', label: '请求头' },
      { key: 'webhook_method', label: '请求方法' },
      { key: 'webhook_content_type', label: 'Content-Type' }
    ]
  },
  {
    key: 'smtp',
    title: 'SMTP 邮件',
    fields: [
      { key: 'smtp_server', label: '服务器地址' },
      { key: 'smtp_ssl', label: '是否启用 SSL', initial: 'false', placeholder: 'true / false' },
      { key: 'smtp_email', label: '发件邮箱' },
      { key: 'smtp_password', label: '邮箱密码/授权码', type: 'password' },
      { key: 'smtp_name', label: '发件人名称' }
    ]
  },
  {
    key: 'pushme',
    title: 'PushMe',
    fields: [
      { key: 'pushme_key', label: 'Key', type: 'password' },
      { key: 'pushme_url', label: '服务器地址' }
    ]
  },
  {
    key: 'other',
    title: '其它',
    fields: [
      { key: 'igot_push_key', label: 'iGot 推送 Key', type: 'password' },
      { key: 'chat_url', label: 'Chat 推送地址' },
      { key: 'chat_token', label: 'Chat Token', type: 'password' },
      { key: 'chronocat_qq', label: 'Chronocat QQ' },
      { key: 'chronocat_token', label: 'Chronocat Token', type: 'password' },
      { key: 'chronocat_url', label: 'Chronocat 地址' },
      { key: 'aibotk_key', label: 'Aibotk Key', type: 'password' },
      { key: 'aibotk_type', label: 'Aibotk 类型' },
      { key: 'aibotk_name', label: 'Aibotk 名称' }
    ]
  }
]

// 全部渠道字段 key（用于加载 / 组装 upsert body）
const CHANNEL_FIELD_KEYS = CHANNEL_GROUPS.flatMap((g) => g.fields.map((f) => f.key))

// 表单初值：显式 initial 优先；否则 switch -> false、number -> 0、其余 -> ''
const form = reactive<Record<string, any>>(
  Object.fromEntries(
    CHANNEL_GROUPS.flatMap((g) =>
      g.fields.map((f) => [
        f.key,
        f.initial !== undefined
          ? f.initial
          : f.type === 'switch'
            ? false
            : f.type === 'number'
              ? 0
              : ''
      ])
    )
  )
)

const activeGroups = ref<string[]>([CHANNEL_GROUPS[0].key])
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const savingToggle = ref(false)

/**
 * 字段是否「已配置」：仅文本/密码类字段、非空且**与初值不同**才算。
 * 开关与数字（如归档、优先级）不计；带默认值的字段（如模板 'html'）未修改时也不算，
 * 避免把后端默认值误当成用户已配置的内容。
 */
function isFieldConfigured(field: ChannelField): boolean {
  if (field.type === 'switch' || field.type === 'number') return false
  const value = form[field.key]
  return typeof value === 'string' && value.trim() !== '' && value !== field.initial
}

/** 统计某渠道分组内已配置的字段数（用于「已配置 n 项」摘要） */
function configuredCount(group: ChannelGroup): number {
  return group.fields.filter(isFieldConfigured).length
}

/** 是否至少配置了一个渠道（保存前的本地校验，避免保存空配置） */
function hasConfiguredChannel(): boolean {
  return CHANNEL_GROUPS.some((g) => configuredCount(g) > 0)
}

// ---------------------------------------------------------------------------
// 区块一：总开关 + 免打扰（be-message 服务，单字段保存）
// ---------------------------------------------------------------------------
interface PushToggleForm {
  push_enabled: boolean
  dnd_start_hour: number | null
  dnd_end_hour: number | null
}

const settingForm = reactive<PushToggleForm>({
  push_enabled: true,
  dnd_start_hour: null,
  dnd_end_hour: null
})

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, '0')}:00`
}))

async function savePushEnabled(value: boolean | string | number) {
  settingForm.push_enabled = value === true
  savingToggle.value = true
  await updateMessageSetting(
    { push_enabled: settingForm.push_enabled },
    { showSuccessToast: true, successMessage: '设置已保存' }
  )
  savingToggle.value = false
}

async function saveDnd() {
  const start = settingForm.dnd_start_hour
  const end = settingForm.dnd_end_hour
  // 后端 can_push_now 只在 start/end 都非空时才启用免打扰；只填一端会被静默忽略，
  // 这里直接拦下并提示，避免用户以为已生效。
  if ((start === null) !== (end === null)) {
    ElMessage.warning('免打扰需要同时选择起始与结束时间，或点「不启用免打扰」')
    return
  }
  await updateMessageSetting(
    { dnd_start_hour: start, dnd_end_hour: end },
    { showSuccessToast: true, successMessage: '免打扰时段已保存' }
  )
}

async function disableDnd() {
  settingForm.dnd_start_hour = null
  settingForm.dnd_end_hour = null
  await saveDnd()
}

// ---------------------------------------------------------------------------
// 区块二：渠道配置（RPA-Browser 全局配置）
// ---------------------------------------------------------------------------
function buildBody(): NotificationConfigCreate {
  const body: Record<string, unknown> = {}
  for (const key of CHANNEL_FIELD_KEYS) body[key as string] = form[key]
  return body as unknown as NotificationConfigCreate
}

async function upsertConfig(options: { showSuccessToast?: boolean; successMessage?: string } = {}): Promise<boolean> {
  saving.value = true
  const result = await businessHandler<NotificationConfigUpsertResp>(
    通知配置管理Service.upsertNotifyConfigRouterApiV1RpaBrowserNotifyConfUpsertPost({
      body: buildBody()
    }) as any,
    {
      showSuccessToast: options.showSuccessToast ?? true,
      successMessage: options.successMessage ?? '推送渠道配置已保存',
      errorMessage: '保存推送渠道配置失败'
    }
  )
  saving.value = false
  return result.success
}

/**
 * be-message `/api/v1/message/push/test` 的响应 data。
 * SDK 未收敛该接口的 data 类型，故本地声明；该接口**同步直发、不过消息队列**，
 * 因此 message / sent_channels 反映的是本次真实发送结果。
 */
interface TestPushRespData {
  success?: boolean
  message?: string
  sent_channels?: string[]
}

/**
 * 用**当前表单内容**发起一次测试推送（内联候选配置：不读数据库、不落库）。
 *
 * 直调 be-message-service 的 `/api/v1/message/push/test`（推送测试归 message 服务，
 * 不在 RPA）：由它同步调用底层推送渠道、**不走 RabbitMQ**，并把真实结果
 * （成功渠道 / 失败原因）回传，以便确认这次请求到底通没通。
 * @returns 测试是否通过（响应 success 为 true）
 */
async function testCurrentConfig(options: { showPassToast?: boolean } = {}): Promise<boolean> {
  testing.value = true
  const result = await businessHandler<TestPushRespData>(
    PushService.testPushApiV1MessagePushTestPost({
      body: {
        title: '推送测试',
        content: `这是一条来自「推送设置」的测试消息（${new Date().toLocaleString()}）`,
        // 内联候选配置：直接测试当前表单内容，尚未落库的改动也能被真实测试。
        config: buildBody() as unknown as { [key: string]: unknown }
      }
    }) as any,
    { showSuccessToast: false, errorMessage: '测试推送失败' }
  )
  testing.value = false

  const data = result.success ? result.data : undefined
  if (!data) return false
  if (data.success) {
    if (options.showPassToast ?? true) {
      const channels = data.sent_channels?.length
        ? `（成功渠道：${data.sent_channels.join('、')}）`
        : ''
      ElMessage.success(`测试通过${channels}`)
    }
    return true
  }
  ElNotification({
    type: 'error',
    title: '测试推送失败',
    message: data.message,
    duration: 0,
    showClose: true
  })
  return false
}

async function handleSave() {
  if (!hasConfiguredChannel()) {
    ElMessage.warning('请至少填写一个推送渠道的密钥或地址')
    return
  }
  // 先测试，测试通过后再保存
  const passed = await testCurrentConfig({ showPassToast: false })
  if (!passed) {
    // 测试未通过：需用户显式确认后才跳过测试直接保存（应对推送服务临时不可用）
    try {
      await ElMessageBox.confirm('测试推送未通过。仍要保存当前配置吗？', '测试未通过', {
        type: 'warning',
        confirmButtonText: '仍要保存',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
  }
  await upsertConfig()
}

async function handleTest() {
  await testCurrentConfig()
}

// ---------------------------------------------------------------------------
// 加载：用户级推送总开关/免打扰 + 全局渠道配置
// ---------------------------------------------------------------------------
async function load() {
  loading.value = true

  const setting = await fetchMessageSetting()
  if (setting) {
    settingForm.push_enabled = setting.push_enabled ?? true
    settingForm.dnd_start_hour = setting.dnd_start_hour ?? null
    settingForm.dnd_end_hour = setting.dnd_end_hour ?? null
  }

  const result = await businessHandler<NotificationConfig | null>(
    通知配置管理Service.readNotifyConfigRouterApiV1RpaBrowserNotifyConfReadPost({ body: {} }) as any,
    { showSuccessToast: false, errorMessage: '读取推送渠道配置失败' }
  )
  if (result.success && result.data) {
    const data = result.data
    for (const key of CHANNEL_FIELD_KEYS) {
      const value = data[key]
      if (value !== undefined && value !== null) form[key] = value
    }
  }

  loading.value = false
}

onMounted(load)
</script>
