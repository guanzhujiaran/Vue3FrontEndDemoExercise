/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2025-08-16 23:15:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\router\index.ts
 * @Description: 路由配置文件，整合了所有路由信息和元数据
 */
import { createRouter, createWebHistory } from 'vue-router'
import {
  Setting as IconSetting,
  User as IconUser,
  DataAnalysis as IconDataAnalysis,
  ChatLineRound as IconChat,
  ChatDotRound as IconChatDotRound,
  ShoppingCart as IconShoppingCart,
  Promotion as IconPromotion,
  Lightning as IconLightning,
  CreditCard as IconCreditCard,
  List as IconList,
  Trophy as IconTrophy,
  Monitor as IconMonitor,
  Link as IconLink,
  Tools as IconFingerprint,
  Monitor as IconBrowser,
  Share as IconShare2,
  Connection as IconConnection
} from '@element-plus/icons-vue'
import emitter from '@/utils/mitt.ts'
import { type CustomRouteRecordRaw, RouteName } from '@/models/router/index.ts'
import { useJwtStore } from '@/stores/jwt_token.ts'
const user_center_routes = [
  {
    path: '',
    name: RouteName.USER_CENTER_DASHBOARD,
    component: () =>
      import('@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserCenterDefaultPanel.vue'),
    meta: {
      title: '用户中心首页',
      description: '用户中心默认面板',
      isHeaderShow: false,
      requiresLogin: true,
      icon: IconUser
    }
  },

  {
    path: 'user-info-config',
    name: RouteName.USER_INFO_CONFIG,
    component: () =>
      import('@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserBaseInfoConfig.vue'),
    meta: {
      title: RouteName.USER_INFO_CONFIG,
      description: '管理用户基本信息',
      isHeaderShow: false,
      requiresLogin: true,
      icon: IconSetting
    }
  }
]
/**
 * 路由配置数组
 * 包含所有路由信息和元数据，如图标、描述、权限等
 */
const routes: CustomRouteRecordRaw[] = [
  {
    path:'/test',
    name:'test',
    component:() => import('@/views/a.vue'),
     meta: {
      title: 'test',
      description: 'test',
      isHeaderShow: import.meta.env.DEV,
      order: 0
    }
  },
  {
    path: '/',
    name: RouteName.HOME,
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: '首页',
      description: '应用首页',
      isHeaderShow: true,
      order: 0
    }
  },
  {
    path: '/app/feedback',
    name: RouteName.FEEDBACK,
    component: () => import('@/views/FeedbackView.vue'),
    meta: {
      id: 'feedback',
      title: '反馈区',
      icon: IconChat,
      description: '提交问题反馈和建议',
      color: 'var(--color-gradient-hero-cool)',
      requiresLogin: false,
      showInHome: true,
      order: 114514,
      isHeaderShow: true
    }
  },

  {
    path: '/app/lot-data',
    name: RouteName.LOTTERY_DATA,
    component: () => import('@/views/LotteryView.vue'),
    redirect: {
      name: RouteName.LOTTERY_HOME
    },
    meta: {
      id: 'lottery',
      title: 'B站抽奖数据',
      icon: IconDataAnalysis,
      description: '查看和分析B站各类抽奖数据',
      color: 'var(--color-gradient-hero-vibrant)',
      requiresLogin: false,
      showInHome: true,
      order: 1,
      isHeaderShow: true
    },
    children: [
      {
        path: 'home',
        name: RouteName.LOTTERY_HOME,
        component: () => import('@/components/lottery_data/LotteryHome.vue'),
        meta: {
          title: RouteName.LOTTERY_HOME,
          icon: IconMonitor,
          description: '查看抽奖数据首页',
          color: 'var(--color-gradient-hero-warm)',
          order: 1,
          showInHome: false,
          isHeaderShow: false
        }
      },
      {
        path: 'scrapy-stat',
        name: RouteName.SCRAPY_STAT,
        component: () => import('@/components/lottery_data/bili_data/ScrapyStatus.vue'),
        meta: {
          title: '爬虫状态',
          icon: IconMonitor,
          description: '查看数据爬虫的运行状态',
          color: 'var(--color-gradient-hero-warm)',
          order: 1,
          showInHome: true,
          isHeaderShow: true
        }
      },
      {
        path: 'bili-atari-ranking',
        name: RouteName.BILI_ATARI_RANKING,
        component: () => import('@/components/lottery_data/BiliAtariRanking.vue'),
        meta: {
          title: 'B站中奖名人堂',
          icon: IconTrophy,
          description: '查看B站中奖排行榜',
          color: 'var(--color-gradient-hero-elegant)',
          showInHome: true,
          order: 2,
          isHeaderShow: true
        }
      },
      {
        path: 'bili-data',
        name: RouteName.BILI_DATA,
        redirect: {
          name: RouteName.LOTTERY_HOME
        },
        meta: {
          title: 'B站抽奖数据',
          icon: IconList,
          description: 'B站各类抽奖数据汇总',
          showInHome: false,
          isHeaderShow: true,
          color: 'var(--color-gradient-bili-data)'
        },
        children: [
          {
            path: 'official',
            name: RouteName.OFFICIAL_LOTTERY,
            component: () => import('@/components/lottery_data/bili_data/OfficialLottery.vue'),
            meta: {
              title: '官方抽奖',
              icon: IconPromotion,
              description: 'B站官方活动抽奖数据',
              color: 'var(--color-gradient-lottery-item)',
              showInHome: true,
              order: 10,
              isHeaderShow: true
            }
          },
          {
            path: 'reserve',
            name: RouteName.RESERVE_LOTTERY,
            component: () => import('@/components/lottery_data/bili_data/ReserveLottery.vue'),
            meta: {
              title: '预约抽奖',
              icon: IconLightning,
              description: 'B站预约活动抽奖数据',
              color: 'var(--color-gradient-lottery-item)',
              showInHome: true,
              order: 11,
              isHeaderShow: true
            }
          },
          {
            path: 'charge',
            name: RouteName.CHARGE_LOTTERY,
            component: () => import('@/components/lottery_data/bili_data/ChargeLottery.vue'),
            meta: {
              title: '充电抽奖',
              icon: IconCreditCard,
              description: 'B站充电活动抽奖数据',
              color: 'var(--color-gradient-lottery-item)',
              showInHome: true,
              order: 12,
              isHeaderShow: true
            }
          },
          {
            path: 'topic',
            name: RouteName.TOPIC_LOTTERY,
            component: () => import('@/components/lottery_data/bili_data/TopicLottery.vue'),
            meta: {
              title: '话题抽奖',
              icon: IconChatDotRound,
              description: 'B站话题活动抽奖数据',
              color: 'var(--color-gradient-lottery-item)',
              showInHome: true,
              order: 13,
              isHeaderShow: true
            }
          }
        ]
      }
    ]
  },
  {
    path: '/app/samsclub/info',
    name: RouteName.SAMSCLUB,
    component: () => import('@/views/SamsClubView.vue'),
    meta: {
      id: 'shopping',
      title: '山姆会员店',
      icon: IconShoppingCart,
      description: '山姆会员店信息查询',
      color: 'var(--color-gradient-shopping)',
      requiresLogin: false,
      showInHome: true,
      order: 2,
      isHeaderShow: true
    }
  },
  {
    path: '/app/changelog',
    name: RouteName.CHANGE_LOG,
    component: () => import('@/views/ChangelogView.vue'),
    meta: {
      title: '更新日志',
      description: '查看项目更新日志',
      isHeaderShow: true,
      order: 7
    }
  },

  {
    path: '/app/casdoor-callback',
    name: 'CASDOOR_CALLBACK',
    component: () => import('@/views/CasdoorCallbackView.vue'),
    meta: {
      title: '第三方登录回调',
      isHeaderShow: false
    }
  },
  {
    path: '/app/user-center/',
    name: RouteName.USER_CENTER,
    component: () => import('@/views/UserCenterView.vue'),
    redirect: { name: RouteName.USER_CENTER_DASHBOARD },
    meta: {
      id: 'user-center',
      title: '用户中心',
      icon: IconUser,
      description: '管理浏览器指纹、插件配置和通知设置 - 辅助自动化测试控制台',
      color: 'var(--color-gradient-hero-cool)',
      requiresLogin: true,
      showInHome: true,
      order: 4,
      isHeaderShow: false
    },
    children: user_center_routes
  },
  {
    path: '/app/rpa-browser',
    name: RouteName.RPA_BROWSER,
    component: () => import('@/views/rpa-browser/BrowserFingerprintList.vue'),
    redirect: { name: RouteName.RPA_BROWSER_FINGERPRINT_LIST },
    meta: {
      id: 'rpa-browser',
      title: 'RPA浏览器',
      icon: IconConnection,
      description: '浏览器指纹管理和自动化控制',
      color: 'var(--color-gradient-hero-cool)',
      requiresLogin: true,
      showInHome: true,
      order: 5,
      isHeaderShow: true
    },
    children: [
      {
        path: '',
        name: RouteName.RPA_BROWSER_FINGERPRINT_LIST,
        component: () => import('@/views/rpa-browser/BrowserFingerprintList.vue'),
        meta: {
          title: RouteName.RPA_BROWSER_FINGERPRINT_LIST,
          icon: IconConnection,
          description: '浏览器指纹列表',
          order: 1,
          showInHome: false,
          isHeaderShow: false
        }
      },
      {
        path: 'create',
        name: RouteName.RPA_BROWSER_CREATE,
        component: () => import('@/views/rpa-browser/FingerprintCreateEdit.vue'),
        meta: {
          title: RouteName.RPA_BROWSER_CREATE,
          icon: IconConnection,
          description: '创建指纹',
          order: 2,
          showInHome: false,
          isHeaderShow: false
        }
      },
      {
        path: 'edit/:browserId',
        name: 'RPA_BROWSER_EDIT',
        component: () => import('@/views/rpa-browser/FingerprintCreateEdit.vue'),
        meta: {
          title: '编辑指纹',
          icon: IconConnection,
          description: '编辑指纹',
          order: 3,
          showInHome: false,
          isHeaderShow: false
        }
      },
      {
        path: 'stream/:browserId',
        name: RouteName.RPA_BROWSER_STREAM,
        component: () => import('@/views/rpa-browser/BrowserStream.vue'),
        meta: {
          title: RouteName.RPA_BROWSER_STREAM,
          icon: IconConnection,
          description: '浏览器Stream控制台',
          order: 4,
          showInHome: false,
          isHeaderShow: false
        }
      },
      {
        path: 'community',
        name: RouteName.RPA_BROWSER_COMMUNITY,
        component: () => import('@/views/rpa-browser/CommunityPage.vue'),
        meta: {
          title: RouteName.RPA_BROWSER_COMMUNITY,
          icon: IconShare2,
          description: '社区广场',
          order: 5,
          showInHome: false,
          isHeaderShow: false
        }
      }
    ]
  },

  {
    // 404页面路由配置
    path: '/:pathMatch(.*)*',
    name: RouteName.NOT_FOUND,
    component: () =>
      import('@/components/CommonCompo/Bili-Feedback-Compo/items/BiliNotFoundError.vue')
  }
]
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})
// 路由守卫 - 全局加载遮罩
router.beforeEach((to, from) => {
  if (!from.name) return true

  // 同一父路由下的子路由切换（如控制台面板内 tab 切换），不显示 loading
  const isChildRouteSwitch =
    from.matched.length > 1 && to.matched.length > 1 &&
    from.matched[0] === to.matched[0]

  if (isChildRouteSwitch) return true

  emitter.emit('loading', { isLoading: true, loadingText: `正在前往：【${to.meta.title}】中` })
  return true
})

router.afterEach(() => {
  // 路由切换完成后隐藏加载遮罩
  emitter.emit('loading', { isLoading: false, loadingText: '' })
})
export default router
export { routes, user_center_routes }
