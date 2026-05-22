/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-30 22:46:46
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-04 18:06:19
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\base_axios\base_axios.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/axios.js
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'
import axios, { type AxiosInstance, type CreateAxiosDefaults } from 'axios'
import { apiErrorHandler } from './error_handler'
import { AXIOS_CONFIG } from '@/utils/Const/axionsConstans'

declare module 'axios' {
  interface AxiosResponse<T = any> {
    // 这个地方放属性
    code: number
    data: T
    msg: string
    ttl: number
  }

  export function create(config?: AxiosRequestConfig): AxiosInstance
}
export const AXIOS_REQ_AUTH_INJECTION = (config: any = AXIOS_CONFIG) => {
  // 添加 Authorization token
  const JwtStore = useJwtStore()
  const token = JwtStore.jwt
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // 添加浏览器自动化API所需的认证头
  const UserNavStore = useUserNavStore()
  const userInfo = UserNavStore.user_nav
  if (userInfo && userInfo.uid) {
    config.headers['x-bili-mid'] = userInfo.uid
    config.headers['x-bili-level'] = userInfo.level_info?.current_level || '0'
  }

  return config
}
export const AXIOS_REQ_ERROR_INJECTION = (error: any) => Promise.reject(error)
export const AXIOS_RES_INJECTION = (response: any) => {
  if (response.config.responseType === 'blob') {
    return response
  }
  
  const data = response.data
  if (data && typeof data === 'object') {
    response.code = data.code
    response.msg = data.msg
    response.ttl = data.ttl
    response.data = data.data
  }

  if (response.code !== 0) {
    apiErrorHandler.handleError(response, {
      showToast: false,
      emitError: false
    })
  }

  return response
}

export const axiosFactory = (axios_instance: AxiosInstance) => {
  // 请求拦截器，可以在请求发送前做一些处理
  axios_instance.interceptors.request.use(
    AXIOS_REQ_AUTH_INJECTION,
    AXIOS_REQ_ERROR_INJECTION
  )
  // 响应拦截器，处理响应数据，例如错误统一处理
  axios_instance.interceptors.response.use(
    AXIOS_RES_INJECTION
  )
}
// 创建 Axios 实例
const baseAxiosInstance = axios.create(AXIOS_CONFIG)
axiosFactory(baseAxiosInstance)


export default baseAxiosInstance
