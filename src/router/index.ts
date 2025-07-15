/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-11-18 19:18:13
 * @FilePath: \Vue3FrontEndDemoExercise\src\router\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/app/Feedback',
      name: '反馈区',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('@/views/FeedbackView.vue')
    },
    {
      path: '/app/user-center/',
      name: '用户中心',
      sensitive: true,
      component: () => import('@/views/UserCenterView.vue'),
      children: [
        {
          path: 'account-global-config',
          name: '用户全局设置',
          component: () =>
            import(
              '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserGlobalConfig.vue'
            )
        },
        {
          path: 'account-base-info-config',
          name: '用户基本信息设置',
          component: () =>
            import(
              '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserBaseInfoConfig.vue'
            )
        },
        {
          path: 'account_detail/account_name:account_name',
          name: '账号详情',
          component: () => import('@/components/opus-detail/RightPannel/PannelItem.vue')
        }
      ]
    },
    {
      path: '/app/lot-data',
      name: '抽奖数据',
      component: () => import('@/views/LotteryDataStat.vue')
    },
    {
      path: '/samsclub/info',
      name: 'samsclub',
      component: () => import('@/views/SamsClubView.vue')
    }
    // {
    //   path: '/app/communication',
    //   name: '交流板块',
    //   component: () => import('@/views/CommunicationView.vue')
    // }
  ]
})

export default router
