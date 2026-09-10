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
  /** 是否已成功获取过一次身份；请求失败时不置位，以便后续导航能重试 */
  const loaded = ref(false)
  /** 去重：并发的 fetchStatus 共享同一个在途请求，避免多次请求互相覆盖（含失败结果） */
  let inflight: Promise<void> | null = null

  const requestStatus = async () => {
    try {
      const res = await MessageAdminService.myStatusApiV1MessageAdminMeGet()
      // SDK 默认 responseStyle 为 'fields'：
      //   成功 -> { code, msg, data, request, response }
      //   失败（网络抖动 / 401 / 5xx）-> 不 throw，而是 { error, request, response }（无 data）
      const body = res && typeof res === 'object' ? (res as Record<string, unknown>) : undefined
      if (!body || 'error' in body) {
        // 请求失败：保留上一次已确认的身份，且不置 loaded —— 否则一次偶发失败会把管理员
        // 误判为普通用户：管理后台侧边栏 navGroups 变空（看起来像内容没被 side nav 包裹），
        // 后续进入 /app/admin 也会被路由守卫重定向到 404，且因 loaded=true 本会话无法恢复。
        return
      }

      const payload = body.data
      if (payload && typeof payload === 'object') {
        // 明确的成功响应：以后端裁决为准（含「确认不是管理员」）
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
      loaded.value = true
    } catch {
      // 兜底：SDK 真抛错时同样保留上一次身份，不置 loaded（允许后续导航重试）。
    }
  }

  const fetchStatus = async (): Promise<void> => {
    if (!inflight) {
      inflight = requestStatus().finally(() => {
        inflight = null
      })
    }
    return inflight
  }

  const reset = () => {
    status.value = { ...DEFAULT_ME }
    loaded.value = false
  }

  return { status, loaded, fetchStatus, reset }
})
