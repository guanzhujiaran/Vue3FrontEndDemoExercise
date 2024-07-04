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
import axios from 'axios'
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
  baseURL: import.meta.env.VITE_API_BASE_URL, // 设置基础 API 地址
  timeout: 10e3, // 设置请求超时时间
  headers: {
    'content-type': 'application/json'
    // 'Access-Control-Allow-Headers': '*',
    // 'Access-Control-Allow-Origin': '*',
    // 'Access-Control-Allow-Credentials': '*',
    // 'Access-Control-Expose-Headers': '*',
    // 'Access-Control-Allow-Methods': '*'
  }
})

// 请求拦截器，可以在请求发送前做一些处理
ajax.interceptors.request.use(
  (config) => {
    // 比如添加 Authorization token
    const JwtStore = useJwtStore()
    const token = JwtStore.jwt
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: any) => Promise.reject(error)
)

// 响应拦截器，处理响应数据，例如错误统一处理
ajax.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 处理错误，比如根据错误码提示用户或跳转登录页
    console.error('API Error:', error)
    return {
      code:-1,
      msg:error.message
    }
  }
)

export default ajax
