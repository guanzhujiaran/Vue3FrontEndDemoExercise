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
      // 指纹存在，直接跳转到 stream 实时控制界面
      router.replace({ name: RouteName.BROWSER_CONSOLE_STREAM, params: { browserId } })
    } else {
      // 检查是否是403/404/422等错误（浏览器ID无效）
      const responseCode = result.response?.code
      if (responseCode === 403 || responseCode === 404 || responseCode === 422 ||
          result.msg?.includes('不属于当前用户') || result.msg?.includes('不存在') ||
          result.msg?.includes('invalid literal') || result.msg?.includes('value_error')) {
        // 浏览器ID无效，跳转到浏览器管理页面
        biliMessage.warning(`浏览器 "${browserId}" 不存在或无权访问`)
        router.replace({ name: RouteName.BROWSER_MANAGEMENT })
      } else {
        // 其他错误也跳转到管理页
        router.replace({ name: RouteName.BROWSER_MANAGEMENT })
      }
    }
  } catch (err: any) {
    // 网络异常或严重错误，跳转到管理页面
    console.error('指纹检查异常:', err)
    biliMessage.error('无法连接到后端服务，请检查网络')
    router.replace({ name: RouteName.BROWSER_MANAGEMENT })
  }
})
</script>
