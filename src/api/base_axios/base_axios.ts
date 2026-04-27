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
import axios from 'axios'
import emitter from '@/utils/mitt.ts'
import { apiErrorHandler } from './error_handler'

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

// 创建 Axios 实例
const ajax = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || window.location.origin, // 设置基础 API 地址
  timeout: 30e3, // 设置请求超时时间
  headers: {
    'content-type': 'application/json'
  }
})

// 请求拦截器，可以在请求发送前做一些处理
ajax.interceptors.request.use(
  (config) => {
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
  },
  (error: any) => Promise.reject(error)
)

// 响应拦截器，处理响应数据，例如错误统一处理
ajax.interceptors.response.use(
  (response) => {
    // 如果是 Blob 类型响应，直接返回 response，不进行 JSON 处理
    if (response.config.responseType === 'blob') {
      return response
    }

    const data = response.data

    // 检查响应头中是否有新 token（后端自动刷新）
    const newToken = response.headers['x-new-token'] || response.headers['X-New-Token']
    if (newToken) {
      const JwtStore = useJwtStore()
      JwtStore.save_jwt_token(newToken)
      console.log('Token 已自动刷新')
    }

    // 检查响应数据中是否包含新 token（兼容不同刷新方式）
    if (data.data?.jwt_token && response.config.url?.includes('/refresh_token')) {
      const JwtStore = useJwtStore()
      JwtStore.save_jwt_token(data.data.jwt_token)
    }

    // 检查业务错误
    if (data.code !== 0) {
      // 使用统一错误处理器，但不自动显示消息（让业务层决定）
      apiErrorHandler.handleError(data, {
        showToast: false,
        emitError: false
      })

      // 将请求信息附加到 msg 中，方便 businessHandler 展示
      const reqConfig = response.config
      const requestInfo =
        `[${reqConfig.method?.toUpperCase()}] ${reqConfig.baseURL || ''}${reqConfig.url || ''}` +
        (reqConfig.params ? `?${JSON.stringify(reqConfig.params)}` : '') +
        (reqConfig.data ? `\n  Body: ${typeof reqConfig.data === 'string' ? reqConfig.data : JSON.stringify(reqConfig.data)}` : '')
      data.msg = data.msg
        ? `${data.msg}\n${requestInfo}`
        : requestInfo
    }

    return data
  },
  (error) => {
    // 处理错误，比如根据错误码提示用户或跳转登录页
    // 提取请求信息用于调试
    const reqConfig = error?.config
    const requestInfo = reqConfig
      ? `[${reqConfig.method?.toUpperCase()}] ${reqConfig.baseURL || ''}${reqConfig.url || ''}` +
        (reqConfig.params ? `?${JSON.stringify(reqConfig.params)}` : '') +
        (reqConfig.data ? `\n  Body: ${typeof reqConfig.data === 'string' ? reqConfig.data : JSON.stringify(reqConfig.data)}` : '')
      : ''

    console.error('API Error:', requestInfo || 'unknown', '\n', error)

    // 使用统一错误处理器，默认显示错误消息
    apiErrorHandler.handleError(error, {
      showToast: true,
      emitError: false
    })

    // 在返回的 msg 中附带请求信息，方便 businessHandler 展示
    const baseMsg = error.message || '请求发送失败'
    const msg = requestInfo
      ? `${baseMsg}\n${requestInfo}`
      : baseMsg

    return {
      code: -9999,
      data: null,
      msg
    }
  }
)

export default ajax
