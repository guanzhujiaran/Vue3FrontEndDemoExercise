<template>
  <el-dialog
    v-model="visible"
    class="ban-user-dialog max-w-[520px]"
    :title="t('message.banTitle')"
    width="90%"
    append-to-body
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div class="ban-user-dialog__body flex flex-col gap-4">
      <div class="ban-user-dialog__mids rounded-lg bg-bg-overlay p-3">
        <div class="text-sm text-text-placeholder">{{ t('message.banMidsLabel') }}</div>
        <div class="mt-1 break-all text-sm text-text-primary">
          {{ mids.join('、') || t('message.banNoSelect') }}
        </div>
      </div>

      <div class="ban-user-dialog__field">
        <div class="mb-1 text-sm text-text-placeholder">{{ t('message.banServiceLabel') }}</div>
        <el-select
          v-model="form.ban_services"
          class="ban-user-dialog__services w-full"
          multiple
          collapse-tags
          size="default"
          :disabled="!availableServices.length"
          :placeholder="t('message.banServicePlaceholder')"
        >
          <el-option
            v-for="svc in availableServices"
            :key="svc.value"
            :label="svc.label"
            :value="svc.value"
          />
        </el-select>
      </div>

      <div class="ban-user-dialog__field">
        <div class="mb-1 text-sm text-text-placeholder">{{ t('message.banDurationLabel') }}</div>
        <el-radio-group v-model="form.duration_type" class="ban-user-dialog__duration">
          <el-radio value="temporary">{{ t('message.banTemporary') }}</el-radio>
          <el-radio value="permanent">{{ t('message.banPermanent') }}</el-radio>
        </el-radio-group>
      </div>

      <div v-if="form.duration_type === 'temporary'" class="ban-user-dialog__field">
        <div class="mb-1 text-sm text-text-placeholder">{{ t('message.banDaysLabel') }}</div>
        <el-input-number
          v-model="form.duration_days"
          class="ban-user-dialog__days"
          :min="1"
          :max="3650"
          size="default"
          controls-position="right"
        />
      </div>

      <div class="ban-user-dialog__field">
        <div class="mb-1 text-sm text-text-placeholder">{{ t('message.banReasonLabel') }}</div>
        <el-input
          v-model="form.reason"
          class="ban-user-dialog__reason"
          type="textarea"
          :rows="3"
          maxlength="512"
          show-word-limit
          :placeholder="t('message.banReasonPlaceholder')"
        />
      </div>
    </div>

    <template #footer>
      <el-button size="default" @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button
        type="danger"
        size="default"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="submit"
      >
        {{ t('message.banConfirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import biliMessage from '@/utils/message'
import { banUsers } from '@/api/notify/hey-api'
import { useMessageAdminStore } from '@/stores/message_admin'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  mids: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const adminStore = useMessageAdminStore()

// 按当前用户权限过滤可选封禁服务：评论需 comment:ban，私信需 dm:ban
const availableServices = computed<{ label: string; value: string }[]>(() => {
  const perms = adminStore.status.permissions
  const isRoot = adminStore.status.is_root
  const list: { label: string; value: string }[] = []
  if (isRoot || perms.includes('comment:ban')) {
    list.push({ label: t('message.banServiceComment'), value: 'comment' })
  }
  if (isRoot || perms.includes('dm:ban')) {
    list.push({ label: t('message.banServiceDm'), value: 'dm' })
  }
  return list
})

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const submitting = ref(false)
const form = reactive<{
  ban_services: string[]
  duration_type: 'temporary' | 'permanent'
  duration_days: number
  reason: string
}>({
  ban_services: [],
  duration_type: 'temporary',
  duration_days: 7,
  reason: ''
})

const canSubmit = computed(() => {
  if (!props.mids.length) return false
  if (!form.ban_services.length) return false
  if (!form.reason.trim()) return false
  if (form.duration_type === 'temporary' && (!form.duration_days || form.duration_days < 1)) {
    return false
  }
  return true
})

function resetForm() {
  form.ban_services = []
  form.duration_type = 'temporary'
  form.duration_days = 7
  form.reason = ''
}

function onClosed() {
  resetForm()
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const res = await banUsers({
      body: {
        mids: props.mids,
        ban_services: form.ban_services,
        reason: form.reason.trim(),
        duration_type: form.duration_type,
        duration_days:
          form.duration_type === 'temporary' ? form.duration_days : null
      }
    })
    if (res && res.code === 0) {
      biliMessage.success(t('message.banSuccess', { count: props.mids.length }))
      emit('success')
      visible.value = false
    } else if (res) {
      biliMessage.error(res.msg || t('message.banFailed'))
    }
  } finally {
    submitting.value = false
  }
}
</script>
