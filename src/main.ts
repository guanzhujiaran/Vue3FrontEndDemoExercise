import '@/assets/index.css'
import { createApp } from 'vue'
import MavonEditor from 'mavon-editor'
import 'md-editor-v3/lib/style.css'
import 'mavon-editor/dist/css/index.css'
import App from '@/App.vue'
import router from '@/router'
import pinia from '@/stores'
const app = createApp(App)
app.use(MavonEditor)
app.use(pinia)
app.use(router)

app.mount('#app')
