import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserNavModel } from '@/models/user/user_model.ts'

export const useUserNavStore = defineStore(
  'user-nav',
  () => {
    const user_nav = ref<UserNavModel>({
      uid: 0,
      user_name: '',
      role: '',
      face: ''
    })

    function save_user_nav(val: UserNavModel) {
      user_nav.value = val
    }

    function delete_user_nav() {
      user_nav.value = {
        uid: 0,
        user_name: '',
        role: '',
        face: ''
      }
    }

    return { user_nav, save_user_nav, delete_user_nav }
  },
  {
    persist: {
      key: 'user-nav',
      storage: localStorage
    }
  }
)