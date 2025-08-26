/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-29 23:52:55
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2025-08-16 23:15:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\router\index.ts
 * @Description: 路由配置文件，整合了所有路由信息和元数据
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
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
import type { Component } from 'vue'
import emitter from '@/utils/mitt.ts'
import LotteryHome from '@/views/LotteryHome.vue'
/**
 * 自定义路由元数据类型定义
 */
interface CustomRouteMeta {
  /** 模块唯一标识符 */
  id?: string
  /** 路由标题 */
  title?: string
  /** 图标组件 */
  icon?: Component
  /** 路由描述信息 */
  description?: string
  /** 颜色（十六进制颜色代码） */
  color?: string
  /** 是否需要登录才能访问 */
  requiresLogin?: boolean
  /** 权限级别 */
  permissionLevel?: number
  /** 是否在菜单中显示 */
  hideInMenu?: boolean
  /** 是否在面包屑中显示 */
  hideInBreadcrumb?: boolean
  /** 是否缓存该路由页面 */
  keepAlive?: boolean
  /** 路由排序权重 */
  order?: number
  /** 是否在首页显示 */
  showInHome?: boolean
  /** 是否在头部显示 */
  isHeaderShow?: boolean
  /** 自定义标签 */
  tags?: string[]
}

/**
 * 扩展Vue Router的RouteRecordRaw类型，添加自定义属性
 * 注意：这里使用类型交叉而不是继承，以保持与原始RouteRecordRaw的兼容性
 */
type CustomRouteRecordRaw = RouteRecordRaw & {
  /** 是否为外部链接 */
  isExternal?: boolean
  /** 外部链接地址 */
  externalLink?: string
  /** 路由转场动画名称 */
  transition?: string
  /** 路由加载优先级 */
  priority?: number
  /** 子路由（重写以支持CustomRouteRecordRaw类型） */
  children?: CustomRouteRecordRaw[]
}

/**
 * 路由配置数组
 * 包含所有路由信息和元数据，如图标、描述、权限等
 */
const routes: CustomRouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: '首页',
      description: '应用首页',
      isHeaderShow: true
    }
  },
  {
    path: '/app/Feedback',
    name: '反馈区',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('@/views/FeedbackView.vue'),
    meta: {
      id: 'feedback',
      title: '反馈区',
      icon: IconChat,
      description: '提交问题反馈和建议',
      color: '#9B59B6',
      requiresLogin: false,
      showInHome: true,
      order: 3,
      isHeaderShow: true
    }
  },
  {
    path: '/app/user-center/',
    name: '用户中心',
    component: UserCenterView,
    meta: {
      id: 'user',
      title: '用户中心',
      icon: IconUser,
      description: '管理您的账户信息和个人设置',
      color: '#409EFF',
      requiresLogin: true,
      showInHome: true,
      order: 4,
      isHeaderShow: true
    },
    children: [
      {
        path: 'account-global-config',
        name: '用户全局设置',
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
        name: '用户基本信息设置',
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
        name: '账号详情',
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
    name: '抽奖数据',
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
        name: '爬虫状态',
        component: () => import('@/components/lottery_data_statistic/bili_data/ScrapyStatus.vue'),
        meta: {
          title: '爬虫状态',
          icon: IconSetting,
          description: '查看数据爬虫的运行状态',
          color: '#F56C6C',
          order: 1,
          showInHome: true,
          isHeaderShow: true
        }
      },
      {
        path: 'bili-atari-ranking',
        name: 'B站中奖名人堂',
        component: () => import('@/components/lottery_data_statistic/BiliAtariRanking.vue'),
        meta: {
          title: 'B站中奖名人堂',
          icon: IconLocation,
          description: '查看B站中奖排行榜',
          color: '#E6A23C',
          showInHome: true,
          order: 2,
          isHeaderShow: true
        }
      },
      {
        path: 'bili-data',
        name: 'B站抽奖数据',
        meta: {
          title: 'B站抽奖数据',
          description: 'B站各类抽奖数据汇总',
          showInHome: true,
          isHeaderShow: true
        },
        children: [
          {
            path: 'official',
            name: '官方抽奖',
            component: () => import('@/views/bili-data/OfficialLottery.vue'),
            meta: {
              title: '官方抽奖',
              icon: IconPromotion,
              description: 'B站官方活动抽奖数据',
              color: '#67C23A',
              showInHome: true,
              order: 1,
              isHeaderShow: true
            }
          },
          {
            path: 'reserve',
            name: '预约抽奖',
            component: () => import('@/views/bili-data/ReserveLottery.vue'),
            meta: {
              title: '预约抽奖',
              icon: IconLightning,
              description: 'B站预约活动抽奖数据',
              color: '#67C23A',
              showInHome: true,
              order: 2,
              isHeaderShow: true
            }
          },
          {
            path: 'charge',
            name: '充电抽奖',
            component: () => import('@/views/bili-data/ChargeLottery.vue'),
            meta: {
              title: '充电抽奖',
              icon: IconCreditCard,
              description: 'B站充电活动抽奖数据',
              color: '#67C23A',
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
    name: 'samsclub',
    component: () => import('@/views/SamsClubView.vue'),
    meta: {
      id: 'shopping',
      title: '山姆会员店',
      icon: IconShoppingCart,
      description: '山姆会员店信息查询',
      color: '#909399',
      requiresLogin: false,
      showInHome: true,
      order: 2,
      isHeaderShow: true
    }
  },
  // 404页面路由配置
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/components/CommonCompo/Bili-Feedback-Compo/BiliNotFoundError.vue')
  }
  // {
  //   path: '/app/communication',
  //   name: '交流板块',
  //   component: () => import('@/views/CommunicationView.vue')
  // }
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
    emitter.emit('loading', true, `正在前往：${to.meta.title}中。。。`)
  }
  next()
})

router.afterEach(() => {
  // 路由切换完成后隐藏加载遮罩
  emitter.emit('loading', false)
})
export default router
export { routes }
export type { CustomRouteRecordRaw, CustomRouteMeta }
