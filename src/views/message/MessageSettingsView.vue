<template>
  <div class="message-settings h-full overflow-y-auto">
    <div class="message-settings__section rounded-lg bg-bg-overlay p-6">
      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsNotify') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsNotifyTip') }}</span>
        </div>
        <el-radio-group v-model="form.recv_notify" size="default" @change="update('recv_notify', $event)">
          <el-radio :label="true">{{ t('message.on') }}</el-radio>
          <el-radio :label="false">{{ t('message.off') }}</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsStrangerDm') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsStrangerDmTip') }}</span>
        </div>
        <el-radio-group v-model="form.recv_stranger_dm" size="default" @change="update('recv_stranger_dm', $event)">
          <el-radio :label="false">{{ t('message.on') }}</el-radio>
          <el-radio :label="true">{{ t('message.off') }}</el-radio>
        </el-radio-group>
      </div>

      <el-divider class="border-border-lighter my-4" />

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsReply') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsReplyTip') }}</span>
        </div>
        <el-radio-group v-model="form.recv_reply" size="default" @change="update('recv_reply', $event)">
          <el-radio :label="true">{{ t('message.allPeople') }}</el-radio>
          <el-radio :label="null">{{ t('message.followedPeople') }}</el-radio>
          <el-radio :label="false">{{ t('message.noReceive') }}</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsAt') }}
          <span class="message-settings__tip text-text-placeholder">{{ t('message.settingsAtTip') }}</span>
        </div>
        <el-radio-group v-model="form.recv_at" size="default" @change="update('recv_at', $event)">
          <el-radio :label="true">{{ t('message.allPeople') }}</el-radio>
          <el-radio :label="null">{{ t('message.followedPeople') }}</el-radio>
          <el-radio :label="false">{{ t('message.noReceive') }}</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row">
        <div class="message-settings__label mb-2 text-sm font-medium text-text-primary">
          {{ t('message.settingsLike') }}
        </div>
        <el-radio-group v-model="form.recv_like" size="default" @change="update('recv_like', $event)">
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
