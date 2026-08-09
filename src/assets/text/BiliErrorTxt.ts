import { BiliImg } from '@/assets/img/BiliImg.ts'
import { RouteName } from '@/models/router'

type ErrorMsg = '未授权访问' | '页面未找到' | '未登录' | '未知错误' | string
type ErrorDescription =
  | '抱歉，您访问的页面不存在或已被移除'
  | '抱歉，您需要登录后才能访问此页面'
  | '抱歉，您还没有登录'
  | '抱歉，您访问的页面出现了未知错误'
  | string
type BtnText = '立即返回首页' | '返回上一页' | '返回首页' | '立即登录' | string
export type BiliErrorDetailType = {
  error_img_src: string
  error_msg: ErrorMsg
  error_description: ErrorDescription
  btn_text: BtnText
  /** 按钮行为：route=跳转 route_link（默认）；login=打开登录模态框 */
  action?: 'route' | 'login'
  route_link?: { name: RouteName; params?: any }
}
type BiliErrorRouteToType = {
  not_found: BiliErrorDetailType
  unauthorized: BiliErrorDetailType
  not_logged_in: BiliErrorDetailType
  others_lot_dyn_login_required: BiliErrorDetailType
  rpa_browser_login_required: BiliErrorDetailType
  unknown: BiliErrorDetailType
  network_error: BiliErrorDetailType
}

export const BiliErrorRouteToTxt: BiliErrorRouteToType = {
  not_found: {
    error_img_src: BiliImg.error.not_found,
    error_msg: '页面未找到',
    error_description: '抱歉，您访问的页面不存在或已被移除',
    btn_text: '返回首页',
    route_link: {
      name: RouteName.HOME
    }
  },
  unauthorized: {
    error_img_src: BiliImg.error.un_authorized,
    error_msg: '不准访问',
    error_description: '抱歉，您没有权限访问该页面',
    btn_text: '返回首页',
    route_link: {
      name: RouteName.HOME
    }
  },
  not_logged_in: {
    error_img_src: BiliImg.error.un_authorized,
    error_msg: '未登录',
    error_description: '抱歉，您还未登录，请先登录后再访问用户中心',
    btn_text: '立即登录',
    action: 'login'
  },
  others_lot_dyn_login_required: {
    error_img_src: BiliImg.error.un_authorized,
    error_msg: '未授权访问',
    error_description: '抱歉，您需要登录后才能访问第三方抽奖动态页面',
    btn_text: '返回首页',
    route_link: {
      name: RouteName.HOME
    }
  },
  rpa_browser_login_required: {
    error_img_src: BiliImg.error.un_authorized,
    error_msg: '未授权访问',
    error_description: '抱歉，您需要登录后才能访问RPA浏览器页面',
    btn_text: '返回首页',
    route_link: {
      name: RouteName.HOME
    }
  },
  unknown: {
    error_img_src: BiliImg.error.not_found,
    error_msg: '未知错误',
    error_description: '抱歉，您访问的页面出现了未知错误',
    btn_text: '返回首页',
    route_link: {
      name: RouteName.HOME
    }
  },
  network_error: {
    error_img_src: BiliImg.error.not_found,
    error_msg: '网络连接失败',
    error_description: '抱歉，无法连接到服务器，请检查您的网络连接',
    btn_text: '返回首页',
    route_link: {
      name: RouteName.HOME
    }
  }
}

