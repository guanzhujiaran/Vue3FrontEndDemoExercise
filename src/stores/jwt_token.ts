/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-30 23:07:22
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-05-30 23:21:41
 * @FilePath: \Vue3FrontEndDemoExercise\src\stores\jwt_token.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useJwtStore = defineStore(
  'biliExplosion-jwt',
  () => {
    const jwt = ref('')
    function save_jwt_token(_jwt: string) {
      jwt.value = _jwt
    }

    return { jwt, save_jwt_token }
  },
  {
    persist: {
      key: 'biliExplosion-jwt',
      storage: localStorage
    }
  }
)
