import './assets/tailwind.css'
import './assets/app-tailwind.css'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createHead } from '@vueuse/head'
import App from './App.vue'
import router from './router'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'mavon-editor/dist/css/index.css'
import 'md-editor-v3/lib/style.css'
import { useHueThemeStore } from '@/stores/hue_theme.ts'
import urql, { cacheExchange, fetchExchange } from '@urql/vue'
import Clarity from '@microsoft/clarity'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// casdoor-vue-sdk has a non-standard export structure in ESM environments
// The plugin object is in the .default property
import CasdoorSDK from 'casdoor-vue-sdk'
const CasdoorPlugin = (CasdoorSDK as any).default || CasdoorSDK

const app = createApp(App)
const head = createHead()
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app
  .use(pinia)
  .use(router)
  .use(head)
  .use(urql, {
    url: import.meta.env.VITE_GRAPH_API,
    requestPolicy: 'cache-and-network',
    exchanges: [cacheExchange, fetchExchange],
    preferGetMethod: false //https://qiita.com/someone7140/items/42f7e35eeb07f65ce900 参考 默认设置变成了`within-url-limit` 会导致请求参数长度在get允许的params长度内时变成get请求，设置为false强制使用post请求
  })
  .use(CasdoorPlugin, {
    serverUrl: import.meta.env.VITE_CASDOOR_SERVER_URL,
    clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID,
    organizationName: import.meta.env.VITE_CASDOOR_ORGANIZATION,
    appName: import.meta.env.VITE_CASDOOR_APPLICATION,
    redirectPath: import.meta.env.VITE_CASDOOR_REDIRECT_PATH
  })

// 初始化主题（在挂载前）
const themeStore = useHueThemeStore()
themeStore.restoreFromLocalStorage()

// 初始化 Clarity
if (import.meta.env.VITE_CLARITY_ID) {
  Clarity.init(import.meta.env.VITE_CLARITY_ID ?? '')
}
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 添加全局属性
app.mount('#app')
