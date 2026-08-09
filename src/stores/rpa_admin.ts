import { ref } from 'vue'
import { defineStore } from 'pinia'
import { roleMeApiAdminRpaRoleMePost } from '@/api/browser/hey-api/sdk.gen'
import type { AdminStatusResponse } from '@/api/browser/hey-api/types.gen'

const DEFAULT_STATUS: AdminStatusResponse = {
  is_root: false,
  is_admin: false,
  permissions: [],
  mid: 0
}

export const useRpaAdminStore = defineStore('rpa-admin', () => {
  const status = ref<AdminStatusResponse>({ ...DEFAULT_STATUS })
  const loaded = ref(false)

  const fetchStatus = async () => {
    try {
      const res = await roleMeApiAdminRpaRoleMePost({})
      if (res && res.code === 0 && res.data) {
        status.value = res.data
      } else {
        status.value = { ...DEFAULT_STATUS }
      }
    } catch {
      status.value = { ...DEFAULT_STATUS }
    } finally {
      loaded.value = true
    }
  }

  const reset = () => {
    status.value = { ...DEFAULT_STATUS }
    loaded.value = false
  }

  return { status, loaded, fetchStatus, reset }
})
