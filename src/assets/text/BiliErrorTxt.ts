import { BiliImg } from '@/assets/img/BiliImg.ts'

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
  route_link: string
}
type BiliErrorRouteToType = {
  not_fund: BiliErrorDetailType
  unauthorized: BiliErrorDetailType
  unknown: BiliErrorDetailType
}

export const BiliErrorRouteToTxt: BiliErrorRouteToType = {
  not_fund: {
    error_img_src: BiliImg.error.not_found,
    error_msg: '页面未找到',
    error_description: '抱歉，您访问的页面不存在或已被移除',
    btn_text: '返回首页',
    route_link: '/'
  },
  unauthorized: {
    error_img_src: BiliImg.error.un_authorized,
    error_msg: '未授权访问',
    error_description: '抱歉，您需要登录后才能访问此页面',
    btn_text: '返回首页',
    route_link: '/'
  },
  unknown: {
    error_img_src: BiliImg.error.not_found,
    error_msg: '未知错误',
    error_description: '抱歉，您访问的页面出现了未知错误',
    btn_text: '返回首页',
    route_link: '/'
  }
}
