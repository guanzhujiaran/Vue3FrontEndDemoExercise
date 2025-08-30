import { BiliImg } from '@/assets/img/BiliImg.ts'
import { RouteName } from '@/models/router'

type ErrorMsg = '未授权访问' | '页面未找到' | '未知错误' | string
type ErrorDescription =
  | '抱歉，您访问的页面不存在或已被移除'
  | '抱歉，您需要登录后才能访问此页面'
  | '抱歉，您访问的页面出现了未知错误'
  | string
type BtnText = '立即返回首页' | '返回上一页' | '返回首页' | string
export type BiliErrorDetailType = {
  error_img_src: string
  error_msg: ErrorMsg
  error_description: ErrorDescription
  btn_text: BtnText
  route_link: { name: RouteName; params?: any }
}
type BiliErrorRouteToType = {
  not_found: BiliErrorDetailType
  unauthorized: BiliErrorDetailType
  unknown: BiliErrorDetailType
  not_found_account_detail: BiliErrorDetailType
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
    error_msg: '未授权访问',
    error_description: '抱歉，您需要登录后才能访问此页面',
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
  not_found_account_detail: {
    error_msg: '账号未找到',
    error_description: '您访问的账号不存在',
    btn_text: '返回用户中心',
    route_link: {
      name: RouteName.USER_CENTER
    }
  }
}
