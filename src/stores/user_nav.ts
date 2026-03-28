import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserNavModel } from '@/models/user/user_model.ts'

export const useUserNavStore = defineStore(
  'user-nav',
  () => {
    const user_nav = ref<UserNavModel>({
      uid: '',
      user_name: '',
      role: '',
      face: '',
      email: '',
      level_info: {
        current_exp: '0',
        current_level: '0',
        current_min: '0',
        next_exp: '--'
      }
    })

    function save_user_nav(val: UserNavModel) {
      user_nav.value = val
    }

    function delete_user_nav() {
      user_nav.value = {
        uid: '',
        user_name: '',
        role: '',
        face: '',
        email: '',
        level_info: {
          current_exp: '0',
          current_level: '0',
          current_min: '0',
          next_exp: '--'
        }
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