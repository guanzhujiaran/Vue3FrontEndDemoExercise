import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useJwtStore = defineStore(
  'biliExplosion-jwt',
  () => {
    const jwt = ref('')
    const jwt_refresh_ms = ref(0) //刷新jwt token的时间戳，尽量每天刷新一次

    /**
     * 刷新日期不是今天的就开刷
     */
    function is_need_jwt_refresh() {
      if (!jwt_refresh_ms.value) return true
      return new Date(jwt_refresh_ms.value).toDateString() !== new Date().toDateString()
    }

    function save_jwt_token(_jwt: string) {
      jwt.value = _jwt
      jwt_refresh_ms.value = Date.now()
    }

    function delete_jwt_token() {
      jwt.value = ''
      jwt_refresh_ms.value = 0
    }

    return { jwt, jwt_refresh_ms, save_jwt_token, delete_jwt_token, is_need_jwt_refresh }
  },
  {
    persist: {
      key: 'biliExplosion-jwt',
      storage: localStorage
    }
  }
)
