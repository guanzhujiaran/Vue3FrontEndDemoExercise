import '@/assets/index.css'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import MavonEditor from 'mavon-editor'
import 'md-editor-v3/lib/style.css'
import 'mavon-editor/dist/css/index.css'
import App from '@/App.vue'
import router from '@/router'
import pinia from '@/stores'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(MavonEditor)
app.use(ElementPlus, {
  locale: zhCn
})
app.use(pinia)
app.use(router)
app.mount('#app')
