<template>
  <div class="message-settings h-full overflow-y-auto">
    <div class="message-settings__section rounded-lg bg-msg-card p-6">
      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-msg-text-active">
          消息提醒
          <span class="message-settings__tip text-msg-muted">（关闭后，消息将不再进行提醒）</span>
        </div>
        <el-radio-group v-model="form.recv_notify" size="default" @change="update('recv_notify', $event)">
          <el-radio :label="true">开启</el-radio>
          <el-radio :label="false">关闭</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-msg-text-active">
          私信智能拦截
          <span class="message-settings__tip text-msg-muted">（开启后，将自动拦截疑似骚扰和不良的会话）</span>
        </div>
        <el-radio-group v-model="form.recv_stranger_dm" size="default" @change="update('recv_stranger_dm', $event)">
          <el-radio :label="false">开启</el-radio>
          <el-radio :label="true">关闭</el-radio>
        </el-radio-group>
      </div>

      <el-divider class="border-msg-divider my-4" />

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-msg-text-active">
          回复我的消息提醒
          <span class="message-settings__tip text-msg-muted">（接收谁的评论消息提醒）</span>
        </div>
        <el-radio-group v-model="form.recv_reply" size="default" @change="update('recv_reply', $event)">
          <el-radio :label="true">所有人</el-radio>
          <el-radio :label="null">关注的人</el-radio>
          <el-radio :label="false">不接收任何消息提醒</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row mb-6">
        <div class="message-settings__label mb-2 text-sm font-medium text-msg-text-active">
          @我的消息提醒
          <span class="message-settings__tip text-msg-muted">（接收谁的@消息提醒）</span>
        </div>
        <el-radio-group v-model="form.recv_at" size="default" @change="update('recv_at', $event)">
          <el-radio :label="true">所有人</el-radio>
          <el-radio :label="null">关注的人</el-radio>
          <el-radio :label="false">不接收任何消息提醒</el-radio>
        </el-radio-group>
      </div>

      <div class="message-settings__row">
        <div class="message-settings__label mb-2 text-sm font-medium text-msg-text-active">
          收到的赞消息提醒
        </div>
        <el-radio-group v-model="form.recv_like" size="default" @change="update('recv_like', $event)">
          <el-radio :label="true">开启</el-radio>
          <el-radio :label="false">关闭</el-radio>
        </el-radio-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import biliMessage from '@/utils/message'
import { fetchMessageSetting, updateMessageSetting, type MessageSettingPartial } from '@/api/notify/message-api'

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
  const updated = await updateMessageSetting({ [key]: value })
  if (updated) {
    biliMessage.success('设置已保存')
  }
}

onMounted(load)
</script>
