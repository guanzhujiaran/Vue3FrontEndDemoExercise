/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2025-08-16 23:15:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\router\index.ts
 * @Description: 路由配置文件，整合了所有路由信息和元数据
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import {
  Location as IconLocation,
  Setting as IconSetting,
  User as IconUser,
  DataAnalysis as IconDataAnalysis,
  ChatLineRound as IconChat,
  ShoppingCart as IconShoppingCart,
  Promotion as IconPromotion,
  Lightning as IconLightning,
  CreditCard as IconCreditCard
} from '@element-plus/icons-vue'
import UserCenterView from '@/views/UserCenterView.vue'
import emitter from '@/utils/mitt.ts'
import LotteryHome from '@/views/LotteryHome.vue'
import { type CustomRouteRecordRaw, RouteName } from '@/models/router/index.ts'
/**
 * 路由配置数组
 * 包含所有路由信息和元数据，如图标、描述、权限等
 */
const routes: CustomRouteRecordRaw[] = [
  {
    path: '/',
    name: RouteName.HOME, // 使用 enum
    component: HomeView,
    meta: {
      title: '首页',
      description: '应用首页',
      isHeaderShow: true
    }
  },
  {
    path: '/app/Feedback',
    name: RouteName.FEEDBACK, // 使用 enum
    component: () => import('@/views/FeedbackView.vue'),
    meta: {
      id: 'feedback',
      title: '反馈区',
      icon: IconChat,
      description: '提交问题反馈和建议',
      color: 'var(--el-color-purple)',
      requiresLogin: false,
      showInHome: true,
      order: 3,
      isHeaderShow: true
    }
  },
  {
    path: '/app/user-center/',
    name: RouteName.USER_CENTER, // 使用 enum
    component: UserCenterView,
    meta: {
      id: 'user',
      title: '用户中心',
      icon: IconUser,
      description: '管理您的账户信息和个人设置',
      color: 'var(--el-color-primary)',
      requiresLogin: true,
      showInHome: true,
      order: 4,
      isHeaderShow: true
    },
    children: [
      {
        path: 'account-global-config',
        name: RouteName.USER_GLOBAL_CONFIG, // 使用 enum
        component: () =>
          import(
            '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserGlobalConfig.vue'
          ),
        meta: {
          title: '用户全局设置',
          description: '管理全局用户设置',
          isHeaderShow: true,
          requiresLogin: true
        }
      },
      {
        path: 'account-base-info-config',
        name: RouteName.USER_BASE_INFO_CONFIG, // 使用 enum
        component: () =>
          import(
            '@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserBaseInfoConfig.vue'
          ),
        meta: {
          title: '用户基本信息设置',
          description: '管理用户基本信息',
          isHeaderShow: true,
          requiresLogin: true
        }
      },
      {
        path: 'account_detail/account_name:account_name',
        name: RouteName.ACCOUNT_DETAIL, // 使用 enum
        component: () => import('@/components/opus-detail/RightPannel/PannelItem.vue'),
        meta: {
          title: '账号详情',
          description: '查看账号详细信息',
          isHeaderShow: false,
          requiresLogin: true
        }
      }
    ]
  },
  {
    path: '/app/lot-data',
    name: RouteName.LOTTERY_DATA, // 使用 enum
    component: LotteryHome,
    meta: {
      id: 'lottery',
      title: 'B站抽奖数据',
      icon: IconDataAnalysis,
      description: '查看和分析B站各类抽奖数据',
      color: 'var(--el-color-success-light-8)',
      requiresLogin: false,
      showInHome: true,
      order: 1,
      isHeaderShow: true
    },
    children: [
      {
        path: 'scrapy-stat',
        name: RouteName.SCRAPY_STAT, // 使用 enum
        component: () => import('@/components/lottery_data_statistic/bili_data/ScrapyStatus.vue'),
        meta: {
          title: '爬虫状态',
          icon: IconSetting,
          description: '查看数据爬虫的运行状态',
          color: 'var(--el-color-danger)',
          order: 1,
          showInHome: true,
          isHeaderShow: true
        }
      },
      {
        path: 'bili-atari-ranking',
        name: RouteName.BILI_ATARI_RANKING, // 使用 enum
        component: () => import('@/components/lottery_data_statistic/BiliAtariRanking.vue'),
        meta: {
          title: 'B站中奖名人堂',
          icon: IconLocation,
          description: '查看B站中奖排行榜',
          color: 'var(--el-color-warning)',
          showInHome: true,
          order: 2,
          isHeaderShow: true
        }
      },
      {
        path: 'bili-data',
        name: RouteName.BILI_DATA, // 使用 enum
        meta: {
          title: 'B站抽奖数据',
          description: 'B站各类抽奖数据汇总',
          showInHome: true,
          isHeaderShow: true
        },
        children: [
          {
            path: 'official',
            name: RouteName.OFFICIAL_LOTTERY, // 使用 enum
            component: () => import('@/views/bili-data/OfficialLottery.vue'),
            meta: {
              title: '官方抽奖',
              icon: IconPromotion,
              description: 'B站官方活动抽奖数据',
              color: 'var(--el-color-success)',
              showInHome: true,
              order: 1,
              isHeaderShow: true
            }
          },
          {
            path: 'reserve',
            name: RouteName.RESERVE_LOTTERY, // 使用 enum
            component: () => import('@/views/bili-data/ReserveLottery.vue'),
            meta: {
              title: '预约抽奖',
              icon: IconLightning,
              description: 'B站预约活动抽奖数据',
              color: 'var(--el-color-success)',
              showInHome: true,
              order: 2,
              isHeaderShow: true
            }
          },
          {
            path: 'charge',
            name: RouteName.CHARGE_LOTTERY, // 使用 enum
            component: () => import('@/views/bili-data/ChargeLottery.vue'),
            meta: {
              title: '充电抽奖',
              icon: IconCreditCard,
              description: 'B站充电活动抽奖数据',
              color: 'var(--el-color-success)',
              showInHome: true,
              order: 3,
              isHeaderShow: true
            }
          }
        ]
      }
    ]
  },
  {
    path: '/samsclub/info',
    name: RouteName.SAMSCLUB, // 使用 enum
    component: () => import('@/views/SamsClubView.vue'),
    meta: {
      id: 'shopping',
      title: '山姆会员店',
      icon: IconShoppingCart,
      description: '山姆会员店信息查询',
      color: 'var(--el-color-info)',
      requiresLogin: false,
      showInHome: true,
      order: 2,
      isHeaderShow: true
    }
  },
  // 404页面路由配置
  {
    path: '/:pathMatch(.*)*',
    name: RouteName.NOT_FOUND, // 使用 enum
    component: () => import('@/components/CommonCompo/Bili-Feedback-Compo/BiliNotFoundError.vue')
  }
]
// 将自定义路由类型转换为Vue Router所需的RouteRecordRaw类型
// 由于我们使用了类型交叉，TypeScript会自动兼容这两种类型
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
// 路由守卫 - 全局加载遮罩
router.beforeEach((to, from, next) => {
  // 如果不是首次访问（from.name存在）
  if (from.name) {
    emitter.emit('loading', { isLoading: true, loadingText: `正在前往：【${to.meta.title}】中` })
  }
  next()
})

router.afterEach(() => {
  // 路由切换完成后隐藏加载遮罩
  emitter.emit('loading', { isLoading: false, loadingText: '' })
})
export default router
export { routes }
