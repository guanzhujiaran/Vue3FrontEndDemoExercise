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
  HOME = 'home',

  // 应用模块
  FEEDBACK = '反馈区',
  USER_CENTER = '用户中心',
  LOTTERY_DATA = '抽奖数据',
  SAMSCLUB = 'samsclub',

  // 用户中心子路由
  USER_GLOBAL_CONFIG = '用户全局设置',
  USER_BASE_INFO_CONFIG = '用户基本信息设置',
  ACCOUNT_DETAIL = '账号详情', // 注意: 原路由 name 为 '账号详情'

  // 抽奖数据子路由
  SCRAPY_STAT = '爬虫状态',
  BILI_ATARI_RANKING = 'B站中奖名人堂',
  BILI_DATA = 'B站抽奖数据', // 这个是父级菜单，也作为路由 name

  // B站抽奖数据子路由
  OFFICIAL_LOTTERY = '官方抽奖',
  RESERVE_LOTTERY = '预约抽奖',
  CHARGE_LOTTERY = '充电抽奖',

  // 404 页面
  NOT_FOUND = 'NotFound'
}

export type { CustomRouteRecordRaw, CustomRouteMeta }
