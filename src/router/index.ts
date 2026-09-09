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
  ShoppingCart as IconShoppingCart,
  Promotion as IconPromotion,
  Lightning as IconLightning,
  CreditCard as IconCreditCard,
  List as IconList,
  CircleClose as IconCircleClose,
  Warning as IconWarning,
  Trophy as IconTrophy,
  Monitor as IconMonitor,
  Link as IconLink,
  Tools as IconFingerprint,
  Monitor as IconBrowser,
  Share as IconShare2,
  Connection as IconConnection
} from '@element-plus/icons-vue'
import emitter from '@/utils/mitt.ts'
import { useMessageAdminStore } from '@/stores/message_admin.ts'
import { type CustomRouteRecordRaw, RouteName } from '@/models/router/index.ts'
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
  },
  {
    path: 'records',
    name: RouteName.USER_CENTER_RECORDS,
    component: () =>
      import('@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserCenterRecords.vue'),
    meta: {
      title: RouteName.USER_CENTER_RECORDS,
      description: '查看登录记录与经验记录',
      isHeaderShow: false,
      requiresLogin: true,
      icon: IconList
    }
  },
  {
    path: 'blocklist',
    name: RouteName.USER_CENTER_BLOCKLIST,
    component: () =>
      import('@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserCenterBlocklist.vue'),
    meta: {
      title: RouteName.USER_CENTER_BLOCKLIST,
      description: '管理黑名单（拉黑用户）',
      isHeaderShow: false,
      requiresLogin: true,
      icon: IconCircleClose
    }
  },
  {
    path: 'deactivate',
    name: RouteName.USER_CENTER_DEACTIVATE,
    component: () =>
      import('@/components/opus-detail/RightPannel/PannelItems/SettingComponent/UserCenterDeactivate.vue'),
    meta: {
      title: RouteName.USER_CENTER_DEACTIVATE,
      description: '注销当前账户',
      isHeaderShow: false,
      requiresLogin: true,
      icon: IconWarning
    }
  }
]
/**
 * 路由配置数组
 * 包含所有路由信息和元数据，如图标、描述、权限等
 */
const routes: CustomRouteRecordRaw[] = [
  {
    path: '/test',
    name: 'test',
    component: () => import('@/views/a.vue'),
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
      titleI18nKey: 'nav.home',
      description: '应用首页',
      isHeaderShow: true,
      order: 1
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
      titleI18nKey: 'nav.lotteryData',
      icon: IconDataAnalysis,
      description: '查看和分析B站各类抽奖数据',
      color: 'var(--color-gradient-hero-vibrant)',
      requiresLogin: false,
      showInHome: true,
      order: 3,
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
          titleI18nKey: 'nav.scrapyStat',
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
          titleI18nKey: 'nav.biliAtariRanking',
          icon: IconTrophy,
          description: '查看B站中奖排行榜',
          color: 'var(--color-gradient-hero-elegant)',
          showInHome: true,
          order: 2,
          isHeaderShow: true
        }
      },
      {
        path: 'card-detail',
        name: RouteName.LOTTERY_CARD_DETAIL,
        component: () => import('@/views/LotteryCardDetailView.vue'),
        meta: {
          title: RouteName.LOTTERY_CARD_DETAIL,
          icon: IconChat,
          description: '抽奖卡片详情与评论区',
          showInHome: false,
          isHeaderShow: false
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
          titleI18nKey: 'nav.lotteryBiliData',
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
              titleI18nKey: 'nav.officialLottery',
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
              titleI18nKey: 'nav.reserveLottery',
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
              titleI18nKey: 'nav.chargeLottery',
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
              titleI18nKey: 'nav.topicLottery',
              icon: IconChat,
              description: 'B站话题活动抽奖数据',
              color: 'var(--color-gradient-lottery-item)',
              showInHome: true,
              order: 13,
              isHeaderShow: true
            }
          },
          {
            path: 'others-dyn-list',
            name: RouteName.OTHERS_LOT_DYN_LIST,
            component: () => import('@/components/lottery_data/bili_data/OthersLotDynList.vue'),
            meta: {
              title: '第三方抽奖动态',
              titleI18nKey: 'nav.othersLotDynList',
              icon: IconShare2,
              description: 'B站第三方非官方号发布的抽奖动态列表',
              color: 'var(--color-gradient-lottery-item)',
              requiresLogin: true,
              showInHome: true,
              order: 14,
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
      titleI18nKey: 'nav.samsClub',
      icon: IconShoppingCart,
      description: '山姆会员店信息查询',
      color: 'var(--color-gradient-shopping)',
      requiresLogin: false,
      showInHome: true,
      order: 4,
      isHeaderShow: true
    }
  },
  {
    path: '/app/changelog',
    name: RouteName.CHANGE_LOG,
    component: () => import('@/views/ChangelogView.vue'),
    meta: {
      title: '更新日志',
      titleI18nKey: 'nav.changelog',
      description: '查看项目更新日志',
      isHeaderShow: true,
      order: 6
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
    component: () => import('@/views/rpa-browser/RpaBrowserLayout.vue'),
    redirect: { name: RouteName.RPA_BROWSER_FINGERPRINT_LIST },
    meta: {
      id: 'rpa-browser',
      title: 'RPA浏览器',
      titleI18nKey: 'nav.rpaBrowser',
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
          titleI18nKey: 'nav.browserFingerprintList',
          icon: IconConnection,
          description: '浏览器指纹列表',
          order: 1,
          showInHome: false,
          isHeaderShow: true
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
      },
      {
        path: 'actions',
        name: RouteName.RPA_BROWSER_ACTION_MANAGEMENT,
        component: () => import('@/views/rpa-browser/ActionManagement.vue'),
        meta: {
          title: RouteName.RPA_BROWSER_ACTION_MANAGEMENT,
          titleI18nKey: 'nav.actionManagement',
          icon: IconConnection,
          description: '管理自定义动作',
          order: 6,
          showInHome: false,
          isHeaderShow: true
        }
      },
      {
        path: 'approval-center',
        name: 'RPA_BROWSER_APPROVAL_CENTER',
        component: () => import('@/views/admin/ApprovalCenter.vue'),
        meta: {
          title: '审批中心',
          icon: IconConnection,
          description: '提交公开审批申请并查看我的审批进度',
          order: 9,
          showInHome: false,
          isHeaderShow: true
        }
      },
      {
        path: 'workflows',
        name: RouteName.RPA_BROWSER_WORKFLOW_MANAGEMENT,
        component: () => import('@/views/rpa-browser/WorkflowManagement.vue'),
        meta: {
          title: RouteName.RPA_BROWSER_WORKFLOW_MANAGEMENT,
          titleI18nKey: 'nav.workflowManagement',
          icon: IconConnection,
          description: '管理工作流配置与执行',
          order: 7,
          showInHome: false,
          isHeaderShow: true
        }
      },
      {
        path: 'action-logs',
        name: RouteName.RPA_BROWSER_ACTION_LOG,
        component: () => import('@/views/rpa-browser/ActionLogView.vue'),
        meta: {
          title: RouteName.RPA_BROWSER_ACTION_LOG,
          titleI18nKey: 'nav.actionLog',
          icon: IconDataAnalysis,
          description: '查看浏览器操作的执行日志',
          order: 8,
          showInHome: false,
          isHeaderShow: true
        }
      }
    ]
  },

  {
    path: '/app/message',
    name: 'MESSAGE',
    component: () => import('@/views/message/MessageLayout.vue'),
    redirect: { name: 'MESSAGE_WHISPER' },
    meta: {
      id: 'message',
      title: '消息中心',
      description: '系统通知、事件提醒与私信的统一消息中心',
      requiresLogin: true,
      // 入口不放在主页/顶部导航，统一收敛到头像下拉菜单（Bilibili 风格）
      showInHome: false,
      isHeaderShow: false
    },
    children: [
      {
        path: 'whisper',
        name: 'MESSAGE_WHISPER',
        component: () => import('@/views/message/DmWhisperLayout.vue'),
        redirect: { name: 'MESSAGE_WHISPER_HOME' },
        meta: { title: '我的消息' },
        children: [
          {
            path: '',
            name: 'MESSAGE_WHISPER_HOME',
            component: () => import('@/views/message/MessageEmptyView.vue'),
            meta: { title: '我的消息' }
          },
          {
            // 陌生人私信分类子页：与普通 DM 共用聊天视图，仅列表查询参数不同
            path: 'stranger',
            name: 'MESSAGE_WHISPER_STRANGER',
            component: () => import('@/views/message/DmStrangerListView.vue'),
            meta: { title: '陌生人私信' }
          },
          {
            path: ':talkerId',
            name: 'MESSAGE_WHISPER_CHAT',
            component: () => import('@/views/message/DmListView.vue'),
            meta: { title: '私信聊天', hidden: true }
          }
        ]
      },
      {
        path: 'replies',
        name: 'MESSAGE_REPLIES',
        component: () => import('@/views/message/ReplyListView.vue'),
        meta: { title: '回复我的' }
      },
      {
        path: 'ats',
        name: 'MESSAGE_ATS',
        component: () => import('@/views/message/AtListView.vue'),
        meta: { title: "@我的" }
      },
      {
        path: 'likes',
        name: 'MESSAGE_LIKES',
        component: () => import('@/views/message/LikeListView.vue'),
        meta: { title: '收到的赞' }
      },
      {
        path: 'notify',
        name: 'MESSAGE_NOTIFY',
        component: () => import('@/views/message/NotifyListView.vue'),
        meta: { title: '系统通知' }
      },
      {
        path: 'settings',
        name: 'MESSAGE_SETTINGS',
        component: () => import('@/views/message/MessageSettingsView.vue'),
        meta: { title: '消息设置' }
      }
    ]
  },
  {
    path: '/app/moment',
    name: 'MOMENT',
    component: () => import('@/views/moment/MomentLayout.vue'),
    redirect: { name: 'MOMENT_ALL_FEED' },
    meta: {
      id: 'moment',
      title: '动态',
      titleI18nKey: 'nav.moment',
      description: '动态广场、话题与个人空间',
      color: 'var(--color-gradient-hero-cool)',
      requiresLogin: true,
      showInHome: true,
      isHeaderShow: true,
      order: 2
    },
    children: [
      {
        path: '',
        name: 'MOMENT_ALL_FEED',
        component: () => import('@/views/moment/AllFeedView.vue'),
        meta: { title: '动态广场' }
      },
      {
        path: 'topics',
        name: 'MOMENT_TOPIC_SQUARE',
        component: () => import('@/views/moment/TopicSquareView.vue'),
        meta: { title: '话题广场' }
      },
      {
        path: 'topic/:topicId',
        name: 'MOMENT_TOPIC_FEED',
        component: () => import('@/views/moment/TopicFeedView.vue'),
        meta: { title: '话题动态', hidden: true }
      }
    ]
  },
  {
    path: '/app/moment-detail/:momentId',
    name: 'MOMENT_DETAIL',
    component: () => import('@/views/moment/MomentDetailView.vue'),
    meta: {
      title: '动态详情',
      requiresLogin: false,
      showInHome: false,
      isHeaderShow: false,
      hidden: true
    }
  },
  {
    path: '/app/space',
    name: 'MOMENT_MY_SPACE',
    component: () => import('@/views/moment/MomentSpaceView.vue'),
    meta: {
      title: '我的空间',
      requiresLogin: true,
      showInHome: false,
      isHeaderShow: false
    }
  },
  {
    path: '/app/space/:mid',
    name: 'MOMENT_USER_SPACE',
    component: () => import('@/views/moment/MomentSpaceView.vue'),
    meta: {
      title: '用户空间',
      requiresLogin: false,
      showInHome: false,
      isHeaderShow: false
    }
  },
  {
    path: '/app/admin',
    name: 'ADMIN',
    component: () => import('@/views/admin/AdminLayout.vue'),
    redirect: { name: 'ADMIN_OVERVIEW' },
    meta: {
      id: 'admin',
      title: '管理后台',
      titleI18nKey: 'nav.admin',
      icon: IconSetting,
      description: 'RPA 与消息中心的管理员功能集中管理',
      requiresLogin: true,
      showInHome: false,
      isHeaderShow: true,
      adminOnly: true,
      order: 5
    },
    children: [
      {
        path: '',
        name: 'ADMIN_OVERVIEW',
        component: () => import('@/views/admin/AdminOverview.vue'),
        meta: { title: '管理后台', hidden: true }
      },
      {
        path: 'rpa',
        name: 'ADMIN_RPA',
        redirect: { name: 'ADMIN_RPA_APPROVAL' },
        meta: {
          title: 'RPA 管理后台',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'rpa/approval',
        name: 'ADMIN_RPA_APPROVAL',
        component: () => import('@/views/rpa-browser/admin/ApprovalAdmin.vue'),
        meta: { title: '操作审批', requiresAdmin: true, hidden: true }
      },
      {
        path: 'rpa/approval-center',
        name: 'ADMIN_APPROVAL_CENTER',
        component: () => import('@/views/admin/ApprovalCenter.vue'),
        meta: {
          title: '审批中心',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'rpa/audit',
        name: 'ADMIN_RPA_AUDIT',
        component: () => import('@/views/rpa-browser/admin/AuditLogAdmin.vue'),
        meta: { title: '操作审计', requiresAdmin: true, hidden: true }
      },
      {
        path: 'rpa/cert',
        name: 'ADMIN_RPA_CERT',
        component: () => import('@/views/rpa-browser/admin/CertificationAdmin.vue'),
        meta: { title: '官方认证', requiresAdmin: true, hidden: true }
      },
      {
        path: 'rpa/tag',
        name: 'ADMIN_RPA_TAG',
        component: () => import('@/views/rpa-browser/admin/TagAdmin.vue'),
        meta: { title: '标签管理', requiresAdmin: true, hidden: true }
      },
      {
        path: 'message-notify',
        name: 'ADMIN_MESSAGE_NOTIFY',
        component: () => import('@/views/message/NotifyAdminView.vue'),
        meta: {
          title: '通知管理',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'message-dm',
        name: 'ADMIN_MESSAGE_DM',
        component: () => import('@/views/message/DmAdminView.vue'),
        meta: {
          title: '私信审核',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'message-comment',
        name: 'ADMIN_MESSAGE_COMMENT',
        component: () => import('@/views/message/CommentAdminView.vue'),
        meta: {
          title: '评论审核',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'permission',
        name: 'ADMIN_PERMISSION',
        component: () => import('@/views/admin/AdminPermissionView.vue'),
        meta: {
          title: '管理端权限',
          requiresMessageRoot: true,
          hidden: true
        }
      },
      {
        path: 'report',
        name: 'ADMIN_REPORT',
        component: () => import('@/views/admin/ReportAdminView.vue'),
        meta: {
          title: '举报审核',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'moment-audit',
        name: 'ADMIN_MOMENT_AUDIT',
        component: () => import('@/views/admin/MomentAuditListView.vue'),
        meta: {
          title: '动态审核',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'moment-topic-audit',
        name: 'ADMIN_MOMENT_TOPIC_AUDIT',
        component: () => import('@/views/admin/TopicAuditListView.vue'),
        meta: {
          title: '话题审核',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'user-avatar-audit',
        name: 'ADMIN_USER_AVATAR_AUDIT',
        component: () => import('@/views/admin/AvatarAuditListView.vue'),
        meta: {
          title: '头像审核',
          requiresAdmin: true,
          hidden: true
        }
      },
      {
        path: 'user-folder-cover-audit',
        name: 'ADMIN_USER_FOLDER_COVER_AUDIT',
        component: () => import('@/views/admin/FolderCoverAuditListView.vue'),
        meta: {
          title: '封面审核',
          requiresAdmin: true,
          hidden: true
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
// 路由守卫 - 全局加载遮罩 + 管理员权限校验
router.beforeEach(async (to, from) => {
  // 管理员专属页面（管理后台入口及其子页面）：未登录或非管理员时，
  // 不展示入口也不提示，直接假装页面不存在（前端仅做拦截，后端仍会强制校验）
  // 管理员身份统一由 be-message /me 裁决（RPA 旧 role/me 接口已下线）
  if (to.meta?.adminOnly || to.meta?.requiresAdmin) {
    const adminStore = useMessageAdminStore()
    if (!adminStore.loaded) {
      await adminStore.fetchStatus()
    }
    if (!adminStore.status.is_admin && !adminStore.status.is_root) {
      // 复用 404 页面：展示「页面不存在」提示并在 10 秒后自动返回首页
      return { name: RouteName.NOT_FOUND }
    }
  }

  // 消息管理端 root 专属页面（权限授予 / 撤销）
  if (to.meta?.requiresMessageRoot) {
    const messageAdminStore = useMessageAdminStore()
    if (!messageAdminStore.loaded) {
      await messageAdminStore.fetchStatus()
    }
    if (!messageAdminStore.status.is_root) {
      // 非 root 身份：同样伪装为页面不存在
      return { name: RouteName.NOT_FOUND }
    }
  }

  if (!from.name) return true

  // 同一父路由下的子路由切换（如控制台面板内 tab 切换），不显示 loading
  const isChildRouteSwitch =
    from.matched.length > 1 && to.matched.length > 1 && from.matched[0] === to.matched[0]

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
