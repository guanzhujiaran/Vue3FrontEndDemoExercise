import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserNavModel } from '@/models/user/user_model.ts'

export const useUserNavStore = defineStore(
  'user-nav',
  () => {
    const user_nav = ref<UserNavModel>({
      uid: '',
      user_name: '',
      face: null,
      email: '',
      level_info: {
        current_exp: '0',
        current_level: '0',
        current_min: '0',
        next_exp: '--'
      }
    })
    const user_header = computed(()=>{
      return {
        'x-bili-mid': user_nav.value.uid || '',
        'x-bili-level': String(user_nav.value.level_info.current_level) || '',
        'x-bili-role': user_nav.value.role || ''
      }
    })
    function save_user_nav(val: UserNavModel) {
      // 后端已将角色信息统一放在 role_info 下，这里做一次兼容映射：
      // 把 role_info.role 同步到顶层 role，避免旧代码（如 UserCenterView）读取失败
      const role = val.role_info?.role ?? val.role ?? ''
      user_nav.value = {
        ...val,
        role,
        level_info: {
          ...val.level_info,
          current_level: String(val.level_info.current_level)
        }
      }
    }

    function delete_user_nav() {
      user_nav.value = {
        uid: '',
        user_name: '',
        face: null,
        email: '',
        level_info: {
          current_exp: '0',
          current_level: '0',
          current_min: '0',
          next_exp: '--'
        }
      }
    }

    return { user_nav, save_user_nav, delete_user_nav,user_header }
  },
  {
    persist: {
      key: 'user-nav',
      storage: localStorage
    }
  }
)