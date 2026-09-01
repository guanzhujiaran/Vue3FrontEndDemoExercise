import { ref } from 'vue'
import { defineStore } from 'pinia'
import { 管理员管理Service } from '@/api/browser/hey-api'
import type { AdminStatusResponse } from '@/api/browser/hey-api'

const DEFAULT_STATUS: AdminStatusResponse = {
  is_root: false,
  is_admin: false,
  permissions: [],
  mid: 0
}

/** in-flight 去重：列表场景多个组件同时触发 fetchStatus 时只发一次请求 */
let fetchPromise: Promise<void> | null = null

export const useRpaAdminStore = defineStore('rpa-admin', () => {
  const status = ref<AdminStatusResponse>({ ...DEFAULT_STATUS })
  const loaded = ref(false)

  const fetchStatus = async () => {
    if (loaded.value) return
    if (fetchPromise) return fetchPromise
    fetchPromise = (async () => {
      try {
        const res = await 管理员管理Service.roleMeApiAdminRpaRoleMePost({})
        if (res && res.code === 0 && res.data) {
          status.value = res.data
        } else {
          status.value = { ...DEFAULT_STATUS }
        }
      } catch {
        status.value = { ...DEFAULT_STATUS }
      } finally {
        loaded.value = true
        fetchPromise = null
      }
    })()
    return fetchPromise
  }

  const reset = () => {
    status.value = { ...DEFAULT_STATUS }
    loaded.value = false
  }

  return { status, loaded, fetchStatus, reset }
})
