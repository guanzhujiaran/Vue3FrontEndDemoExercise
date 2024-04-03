import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import UserCenterView from '../views/UserCenterView.vue'
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
      name: 'user-center',
      sensitive: true,
      component: UserCenterView,
      children: [
        {
          path: '/user-center/account_detail_:account_name',
          name: 'account_detail',
          component: UserCenterView
        }
      ]
    }
  ]
})

export default router
