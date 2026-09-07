<template>
  <div class="message-settings h-full overflow-y-auto">
    <div class="message-settings__section rounded-lg bg-bg-overlay p-6">
      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsNotify') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsNotifyTip') }}</span>
        </div>
        <el-radio-group
          :model-value="form.recv_notify === true"
          @update:model-value="update('recv_notify', $event === true)"
          size="default"
        >
          <el-radio :label="true">{{ t('message.on') }}</el-radio>
          <el-radio :label="false">{{ t('message.off') }}</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsStrangerDm') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsStrangerDmTip') }}</span>
        </div>
        <!-- recv_stranger_dm=true 表示“接收陌生人私信”；而 UI 是“智能拦截”开关（开启=不接收=字段 false），故开关方向与字段相反 -->
        <el-radio-group
          :model-value="form.recv_stranger_dm === false"
          @update:model-value="update('recv_stranger_dm', $event !== true)"
          size="default"
        >
          <el-radio :label="true">{{ t('message.on') }}</el-radio>
          <el-radio :label="false">{{ t('message.off') }}</el-radio>
        </el-radio-group>
      </div>

      <el-divider class="border-border-lighter my-4" />

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsReply') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsReplyTip') }}</span>
        </div>
        <!-- 后端 recv_reply 为纯布尔二态（接收/不接收），无“仅关注”第三态；null 会被后端当作“不改动”丢弃 -->
        <el-radio-group
          :model-value="form.recv_reply === true"
          @update:model-value="update('recv_reply', $event === true)"
          size="default"
        >
          <el-radio :label="true">{{ t('message.on') }}</el-radio>
          <el-radio :label="false">{{ t('message.off') }}</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsAt') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsAtTip') }}</span>
        </div>
        <!-- 后端 recv_at 同为纯布尔二态（接收/不接收），无“仅关注”第三态 -->
        <el-radio-group
          :model-value="form.recv_at === true"
          @update:model-value="update('recv_at', $event === true)"
          size="default"
        >
          <el-radio :label="true">{{ t('message.on') }}</el-radio>
          <el-radio :label="false">{{ t('message.off') }}</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsLike') }}
        </div>
        <el-radio-group
          :model-value="form.recv_like === true"
          @update:model-value="update('recv_like', $event === true)"
          size="default"
        >
          <el-radio :label="true">{{ t('message.on') }}</el-radio>
          <el-radio :label="false">{{ t('message.off') }}</el-radio>
        </el-radio-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchMessageSetting, updateMessageSetting, type MessageSettingPartial } from '@/api/notify/message-api'

const { t } = useI18n()

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回时保留表单状态）
defineOptions({ name: 'MessageSettingsView' })

const form = reactive<MessageSettingPartial>({
  recv_like: true,
  recv_reply: true,
  recv_at: true,
  recv_stranger_dm: false,
  recv_notify: true,
  push_enabled: true,
  dnd_start_hour: null,
  dnd_end_hour: null
})

async function load() {
  const setting = await fetchMessageSetting()
  if (!setting) return
  Object.assign(form, setting)
}

async function update<K extends keyof MessageSettingPartial>(key: K, value: MessageSettingPartial[K]) {
  form[key] = value
  await updateMessageSetting({ [key]: value }, {
    showSuccessToast: true,
    successMessage: t('message.settingsSaved'),
  })
}

onMounted(load)
</script>
