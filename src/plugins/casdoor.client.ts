/**
 * Casdoor 登录 SDK 注册。
 *
 * 只在客户端加载：SDK 依赖 window / sessionStorage 等浏览器 API，
 * 放进 SSR 会在预渲染阶段直接抛错。
 */
import CasdoorSDK from 'casdoor-vue-sdk'

const CasdoorPlugin = (CasdoorSDK as unknown as { default?: unknown }).default || CasdoorSDK

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(CasdoorPlugin as never, {
    serverUrl: import.meta.env.VITE_CASDOOR_SERVER_URL,
    clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID,
    organizationName: import.meta.env.VITE_CASDOOR_ORGANIZATION,
    appName: import.meta.env.VITE_CASDOOR_APPLICATION,
    redirectPath: import.meta.env.VITE_CASDOOR_REDIRECT_PATH
  })
})
