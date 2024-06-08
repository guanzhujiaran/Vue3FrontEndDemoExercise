/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-07 15:56:40
 * @FilePath: \Vue3FrontEndDemoExercise\src\router\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/login_page/HomeView.vue'
import UserCenterView from '@/views/user_center/UserCenterView.vue'
import RightPannel from '@/components/opus-detail/RightPannel/PannelItem.vue'
import UserConfig from '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserConfig.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    },

    {
      path: '/user-center/',
      name: '用户中心',
      sensitive: true,
      component: UserCenterView,
      children: [
        {
          path: 'config',
          name: '用户设置',
          component: UserConfig
        },
        {
          path: 'account_detail_:account_name',
          name: '账号详情',
          component: RightPannel
        }
        
      ]
    }
  ]
})

export default router
