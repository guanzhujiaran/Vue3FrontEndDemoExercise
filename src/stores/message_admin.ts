import { ref } from 'vue'
import { defineStore } from 'pinia'
import { MessageAdminService } from '@/api/community/hey-api'

export interface MessageAdminMe {
  is_root: boolean
  is_admin: boolean
  /** 各资源域权限字（per-biz 位掩码，值 0~7；root 恒 {"*": 7}） */
  biz_perms: Record<string, number>
}

const DEFAULT_ME: MessageAdminMe = {
  is_root: false,
  is_admin: false,
  biz_perms: {}
}

/**
 * 当前登录用户在「消息管理端」的身份（root / 管理员 / 权限列表）。
 * 对应 be-message-service 的 GET /api/v1/message/admin/me
 */
export const useMessageAdminStore = defineStore('message-admin', () => {
  const status = ref<MessageAdminMe>({ ...DEFAULT_ME })
  const loaded = ref(false)

  const fetchStatus = async () => {
    try {
      const res = await MessageAdminService.myStatusApiV1MessageAdminMeGet()
      // SDK 默认 responseStyle 为 'fields'，返回完整响应 { code, msg, data: {...} }
      const payload = res && typeof res === 'object' ? (res as Record<string, unknown>).data : undefined
      if (payload && typeof payload === 'object') {
        const data = payload as Record<string, unknown>
        status.value = {
          is_root: Boolean(data.is_root),
          is_admin: Boolean(data.is_admin),
          biz_perms:
            data.biz_perms && typeof data.biz_perms === 'object'
              ? (data.biz_perms as Record<string, number>)
              : {}
        }
      } else {
        status.value = { ...DEFAULT_ME }
      }
    } catch {
      status.value = { ...DEFAULT_ME }
    } finally {
      loaded.value = true
    }
  }

  const reset = () => {
    status.value = { ...DEFAULT_ME }
    loaded.value = false
  }

  return { status, loaded, fetchStatus, reset }
})
