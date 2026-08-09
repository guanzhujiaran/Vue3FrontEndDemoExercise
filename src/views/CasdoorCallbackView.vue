<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJwtStore } from '@/stores/jwt_token'
import biliMessage from '@/utils/message'
import { useUserNavStore } from '@/stores/user_nav'

const route = useRoute()
const router = useRouter()
const jwtStore = useJwtStore()
const userNavStore = useUserNavStore()

const processCallback = () => {
  const token = route.query.token as string
  const uid = route.query.uid as string
  const user_name = route.query.user_name as string

  if (!token || !uid || !user_name) {
    biliMessage.error('登录失败：缺少必要的登录信息')
    return
  }

  try {
    jwtStore.save_jwt_token(decodeURIComponent(token))

    // 不在此处写 user_nav store，留给 App.vue 的 isLogin() 从服务端获取完整数据
    // 避免先用不完整数据覆盖 store，导致 UserCenterDefaultPanel 误认为已有数据而跳过 nav 请求

    biliMessage.success('登录成功，正在跳转...')

    setTimeout(() => {
      // 用 router.push 替代 window.location.href 硬刷新，
      // 避免整个 Vue 应用重新初始化导致重复 isLogin() 调用
      router.push('/')
    }, 500)
  } catch (error) {
    console.error('登录处理失败:', error)
    biliMessage.error('登录失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
}

onMounted(() => {
  processCallback()
})
</script>

<template>
  <div class="casdoor-callback">
    <!-- 登录回调处理中 -->
  </div>
</template>
