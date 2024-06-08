/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-03-31 23:36:42
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-08 20:52:05
 * @FilePath: \BiliLottery\src\main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import '@/assets/index.css'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from '@/App.vue'
import router from '@/router'
import pinia from '@/stores'

const app = createApp(App)
app.use(ElementPlus)
app.use(pinia)
app.use(router)

app.mount('#app')
