import type { RouteRecordRaw } from 'vue-router'
import { type Component } from 'vue'
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
  /** 是否需要 RPA 管理员/root 权限（仅管理员可见可访问） */
  requiresAdmin?: boolean
  /** 管理员专属入口：仅在管理端身份（RPA 管理员/root 或 消息管理端 root）可见 */
  adminOnly?: boolean
  /** 自定义标签 */
  tags?: string[]
}

/**
 * 扩展Vue Router的RouteRecordRaw类型，添加自定义属性
 * 注意：这里使用类型交叉而不是继承，以保持与原始RouteRecordRaw的兼容性
 */
type CustomRouteRecordRaw = RouteRecordRaw & {
  meta?: CustomRouteMeta
  /** 子路由（重写以支持CustomRouteRecordRaw类型） */
  children?: CustomRouteRecordRaw[]
}

export enum RouteName {
  // 根路径
  HOME = '首页',

  // 应用模块
  USER_CENTER = '浏览器管理',
  LOTTERY_DATA = '抽奖数据',
  SAMSCLUB = '山姆会员店数据',
  RPA_BROWSER = 'RPA浏览器',
  RPA_BROWSER_FINGERPRINT_LIST = '浏览器指纹列表',
  RPA_BROWSER_STREAM = '浏览器Stream',
  RPA_BROWSER_CREATE = '创建指纹',
  RPA_BROWSER_COMMUNITY = '社区广场',
  RPA_BROWSER_ACTION_MANAGEMENT = '动作管理',
  RPA_BROWSER_WORKFLOW_MANAGEMENT = '工作流管理',
  RPA_BROWSER_ACTION_LOG = '操作日志',
  RPA_BROWSER_ADMIN = 'RPA管理后台',
  // 管理后台（独立模块，不与服务类界面混放）
  ADMIN = '管理后台',
  ADMIN_RPA = 'RPA管理后台',
  ADMIN_MESSAGE_NOTIFY = '通知管理',
  ADMIN_MESSAGE_DM = '私信审核',
  ADMIN_MESSAGE_COMMENT = '评论审核',
  ADMIN_MESSAGE_PERMISSION = '管理端权限',
  // 消息中心管理端
  MESSAGE_DM_ADMIN = '私信审核',
  MESSAGE_COMMENT_ADMIN = '评论审核',
  MESSAGE_DM_CHAT = '私信聊天',
  // 用户中心子路由
  USER_GLOBAL_CONFIG = '用户全局设置',
  USER_INFO_CONFIG = '用户基本信息设置',

  USER_CENTER_DASHBOARD = '用户中心仪表盘',
  // 抽奖数据子路由
  SCRAPY_STAT = '爬虫状态',
  BILI_ATARI_RANKING = 'B站中奖名人堂',
  BILI_DATA = 'B站抽奖数据', // 这个是父级菜单，也作为路由 name
  LOTTERY_HOME = '抽奖首页',
  // B站抽奖数据子路由
  OFFICIAL_LOTTERY = '官方抽奖',
  RESERVE_LOTTERY = '预约抽奖',
  CHARGE_LOTTERY = '充电抽奖',
  TOPIC_LOTTERY = '话题抽奖',
  OTHERS_LOT_DYN_LIST = '第三方抽奖动态',
  LOTTERY_CARD_DETAIL = '抽奖卡片详情',

  // 404 页面
  NOT_FOUND = 'NotFound',
  CHANGE_LOG = '更新日志'
}

export type { CustomRouteRecordRaw, CustomRouteMeta }
