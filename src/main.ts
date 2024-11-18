/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-11-18 19:54:15
 * @FilePath: \Vue3FrontEndDemoExercise\src\main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import '@/assets/index.css'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import mavonEditor from 'mavon-editor'
import 'mavon-editor/dist/css/index.css'
import App from '@/App.vue'
import router from '@/router'
import pinia from '@/stores'
const app = createApp(App)
app.use(mavonEditor)
app.use(ElementPlus)
app.use(pinia)
app.use(router)
app.mount('#app')
