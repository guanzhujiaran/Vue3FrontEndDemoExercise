<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\BrowserConsoleView.vue
 * @Description: RPA浏览器控制台 - 路由入口，做登录/指纹检查后重定向到对应子路由
-->
<template>
  <div class="h-full"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import browserApi from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import { isLogin } from '@/api/user/utils'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type'
import { inject } from 'vue'
import { RouteName } from '@/models/router/index'
import biliMessage from '@/utils/message'

const route = useRoute()
const router = useRouter()
const openGlobalLoginModal = inject(openGlobalLoginModalKey, () => {})

const browserId = route.params.browserId as string

onMounted(async () => {
  // 1. 检查登录状态
  const [loggedIn] = await isLogin()
  if (!loggedIn) {
    biliMessage.info('该页面需要登录后才能访问')
    openGlobalLoginModal()
    router.replace({ name: RouteName.HOME })
    return
  }

  if (!browserId) {
    router.replace({ name: RouteName.BROWSER_MANAGEMENT })
    return
  }

  // 2. 检查指纹是否存在
  try {
    const result = await businessHandler(browserApi.readFingerprint({ id: browserId }), {
      showSuccessToast: false,
      showErrorToast: false
    })
    if (result.success && result.data) {
      // 指纹存在，跳转到控制台面板
      router.replace({ name: RouteName.BROWSER_CONSOLE_PANEL, params: { browserId } })
    } else {
      // 指纹不存在或不属于当前账号
      router.replace({ name: RouteName.BROWSER_CONSOLE_NOT_FOUND, params: { browserId } })
    }
  } catch {
    // 网络异常，仍然尝试跳转到面板，让面板自己处理
    router.replace({ name: RouteName.BROWSER_CONSOLE_PANEL, params: { browserId } })
  }
})
</script>
