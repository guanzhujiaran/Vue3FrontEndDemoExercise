import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createHead } from '@vueuse/head'
import App from './App.vue'
import router from './router'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
// 引入mavon-editor样式
import 'mavon-editor/dist/css/index.css'
// 引入markdown编辑器样式
import 'md-editor-v3/lib/style.css'
// 引入全局事件总线
import emitter from '@/utils/mitt'
const app = createApp(App)
const head = createHead()
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia).use(router).use(head)
// 添加全局属性
app.config.globalProperties.$emitter = emitter
app.mount('#app')
