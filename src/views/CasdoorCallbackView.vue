<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import i18n from '@/i18n'
import { useJwtStore } from '@/stores/jwt_token'
import biliMessage from '@/utils/message'
import { isLogin } from '@/api/user/utils'

// 登录回调的文案必须可靠翻译。这里直接读取 i18n 全局消息表：
// 优先当前 locale，缺省 fallback zh-CN，再找不到才显示 key 本身。
// 不走 useI18n()/i18n.global.t() 的 scope 解析链，避免任何解析异常导致显示 raw key。
function t(key: string): string {
  const lookups: string[] = [i18n.global.locale.value as string, 'zh-CN']
  for (const locale of lookups) {
    const msg = i18n.global.getLocaleMessage(locale)
    const val = key.split('.').reduce<any>((acc, k) => acc?.[k], msg)
    if (typeof val === 'string' && val) return val
  }
  return key
}
const route = useRoute()
const router = useRouter()
const jwtStore = useJwtStore()

const processCallback = async () => {
  const token = route.query.token as string
  const uid = route.query.uid as string
  const user_name = route.query.user_name as string

  if (!token || !uid || !user_name) {
    biliMessage.error(t('callback.loginFailMissing'))
    return
  }

  try {
    jwtStore.save_jwt_token(decodeURIComponent(token))

    biliMessage.success(t('callback.loginSuccess'))

    // 保存 token 后主动刷新登录态，从服务端拉取完整用户信息。
    // 仅依赖 App.vue 的 router.afterEach 间接刷新时，在"登出后重新登录别的账号"
    // 场景下偶尔会因 afterEach 未触发而停留在未登录状态，需要手动刷新才能恢复。
    // 这里主动 await isLogin() 可保证 nav 立即显示新账号的登录信息，无需手动刷新。
    await isLogin()

    setTimeout(() => {
      router.push('/')
    }, 500)
  } catch (error) {
    console.error(t('callback.loginProcessFail'), error)
    biliMessage.error(t('callback.loginFail') + (error instanceof Error ? error.message : t('common.error')))
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
