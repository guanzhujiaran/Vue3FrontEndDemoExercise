import BaseApi from '@/api/base_axios/base_api'
import ajax from '@/api/base_axios/base_axios'
import type { RootObject } from '@/models/api/base_model'
import type { AxiosRequestConfig } from 'axios'
import type {
  SimplifiedCreateSessionRequest,
  CreateSessionResponse,
  BrowserSessionStatus,
  BodyCreateBrowserSessionRequest
} from '@/types/browser-automation-api'
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'

export interface PageInfo {
  page_index: number
  page_id: string       // 页面唯一 ID
  title: string
  url: string
}

class BrowserControlApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }

  createBrowserSession(params: {
    browser_id: string
    request?: SimplifiedCreateSessionRequest
  }): Promise<RootObject<CreateSessionResponse>> {
    const body: BodyCreateBrowserSessionRequest = {
      request: params.request || {
        headless: true,
        auto_cleanup: true,
        cleanup_policy: {
          max_idle_time: 1800,
          cleanup_interval: 300
        },
        expiration_time: 0
      },
      body: { browser_id: params.browser_id }
    }
    return this._post('/create', body)
  }

  closeBrowserSession(params: { browser_id: string }): Promise<RootObject<any>> {
    return this._post('/close', { browser_id: params.browser_id })
  }

  getBrowserSessionStatus(params: {
    browser_id: string
  }): Promise<RootObject<BrowserSessionStatus>> {
    return this._post('/status', { browser_id: params.browser_id })
  }

  executeAction(params: {
    browser_id: string
    req: {
      action_id: string
      params: any
      user_data?: any
      page_index?: number
    }
  }): Promise<RootObject<any>> {
    return this._post('/actions/execute', {
      request: {
        action_id: params.req.action_id,
        params: params.req.params,
        user_data: params.req.user_data,
        page_index: params.req.page_index
      },
      body: {
        browser_id: params.browser_id
      }
    })
  }

  getPageList(params: { browser_id: string }): Promise<RootObject<PageInfo[]>> {
    return this._post('/pages/list', {
      browser_id: params.browser_id
    })
  }

  switchPage(params: { browser_id: string; page_index: number }): Promise<RootObject<any>> {
    return this._post('/pages/switch', {
      request: { browser_id: params.browser_id, page_index: params.page_index },
      body: { browser_id: params.browser_id, page_index: params.page_index }
    })
  }

  closePage(params: { browser_id: string; page_index: number }): Promise<RootObject<any>> {
    return this._post('/pages/close', {
      request: { browser_id: params.browser_id, page_index: params.page_index },
      body: { browser_id: params.browser_id, page_index: params.page_index }
    })
  }

  /**
   * 获取 MJPEG 视频流 URL
   * @param params - 参数对象
   * @param params.browser_id - 浏览器 ID
   * @param params.page_index - 页面索引，默认为 0
   * @returns MJPEG 流的 URL
   */
  getMjpegStreamUrl(params: { browser_id: string; page_index?: number }): string {
    const pageIndex = params.page_index ?? 0
    let baseUrl = import.meta.env.VITE_API_BASE_URL
    if (!baseUrl || baseUrl === '/') {
      baseUrl = window.location.origin
    }
    return `${baseUrl}${this.path}/mjpeg/stream?page_index=${pageIndex}&browser_id=${params.browser_id}`
  }

  /**
   * 停止 MJPEG 视频流
   * @param params - 参数对象
   * @param params.browser_id - 浏览器 ID
   * @param params.page_index - 页面索引
   */
  stopMjpegStream(params: { browser_id: string; page_index: number }): Promise<RootObject<any>> {
    return this._post(`/mjpeg/stop/${params.page_index}`, {
      browser_id: params.browser_id
    })
  }

  /**
   * 切换 MJPEG 视频流页面
   * @param params - 参数对象
   * @param params.browser_id - 浏览器 ID
   * @param params.old_page_index - 旧页面索引
   * @param params.new_page_index - 新页面索引
   */
  switchMjpegStream(params: {
    browser_id: string
    old_page_index: number
    new_page_index: number
  }): Promise<RootObject<any>> {
    return this._post('/mjpeg/switch', {
      request: {
        old_page_index: params.old_page_index,
        new_page_index: params.new_page_index
      },
      body: {
        browser_id: params.browser_id
      }
    })
  }

  /**
   * 获取 MJPEG 视频流（使用 fetch，支持流式读取）
   * @param params - 参数对象
   * @param params.browser_id - 浏览器 ID
   * @param params.page_index - 页面索引，默认为 0
   * @param signal - AbortSignal 用于取消请求
   * @returns Promise<Response>
   */
  async getMjpegStream(params: { browser_id: string; page_index?: number }, signal?: AbortSignal): Promise<Response> {
    const pageIndex = params.page_index ?? 0
    let baseUrl = import.meta.env.VITE_API_BASE_URL
    if (!baseUrl || baseUrl === '/') {
      baseUrl = window.location.origin
    }
    const url = `${baseUrl}${this.path}/mjpeg/stream?browser_id=${params.browser_id}&page_index=${pageIndex}`

    const jwtStore = useJwtStore()
    const userNavStore = useUserNavStore()

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (jwtStore.jwt) {
      headers['Authorization'] = `Bearer ${jwtStore.jwt}`
    }

    if (userNavStore.user_nav?.uid) {
      headers['x-bili-mid'] = userNavStore.user_nav.uid
      if (userNavStore.user_nav.level_info?.current_level) {
        headers['x-bili-level'] = String(userNavStore.user_nav.level_info.current_level)
      }
    }

    return fetch(url, { headers, signal })
  }

  async stopFlvStream(pageIndex: number, browserId: string): Promise<RootObject<any>> {
    let baseUrl = import.meta.env.VITE_API_BASE_URL
    if (!baseUrl || baseUrl === '/') {
      baseUrl = window.location.origin
    }
    const url = `${baseUrl}${this.path}/flv/stop/${pageIndex}?browser_id=${browserId}`

    const jwtStore = useJwtStore()
    const userNavStore = useUserNavStore()

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (jwtStore.jwt) {
      headers['Authorization'] = `Bearer ${jwtStore.jwt}`
    }

    if (userNavStore.user_nav?.uid) {
      headers['x-bili-mid'] = userNavStore.user_nav.uid
      if (userNavStore.user_nav.level_info?.current_level) {
        headers['x-bili-level'] = String(userNavStore.user_nav.level_info.current_level)
      }
    }

    const response = await fetch(url, { headers, method: 'POST' })
    const data = await response.json()
    return data
  }

  async createWebrtcOffer(params: { browser_id: string; page_index?: number }): Promise<RootObject<any>> {
    let baseUrl = import.meta.env.VITE_API_BASE_URL
    if (!baseUrl || baseUrl === '/') {
      baseUrl = window.location.origin
    }
    const pageIndex = params.page_index || 0
    const url = `${baseUrl}${this.path}/webrtc/offer`

    const jwtStore = useJwtStore()
    const userNavStore = useUserNavStore()

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (jwtStore.jwt) {
      headers['Authorization'] = `Bearer ${jwtStore.jwt}`
    }

    if (userNavStore.user_nav?.uid) {
      headers['x-bili-mid'] = userNavStore.user_nav.uid
      if (userNavStore.user_nav.level_info?.current_level) {
        headers['x-bili-level'] = String(userNavStore.user_nav.level_info.current_level)
      }
    }

    const requestBody = {
      req: { page_index: pageIndex },
      body: { browser_id: params.browser_id }
    }

    const response = await fetch(url, { headers, method: 'POST', body: JSON.stringify(requestBody) })
    const data = await response.json()
    return data
  }

  async submitWebrtcAnswer(params: { browser_id: string; page_index?: number; answer: { sdp: string; type: string }; stream_key: string }): Promise<RootObject<any>> {
    let baseUrl = import.meta.env.VITE_API_BASE_URL
    if (!baseUrl || baseUrl === '/') {
      baseUrl = window.location.origin
    }
    const url = `${baseUrl}${this.path}/webrtc/answer`

    const jwtStore = useJwtStore()
    const userNavStore = useUserNavStore()

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (jwtStore.jwt) {
      headers['Authorization'] = `Bearer ${jwtStore.jwt}`
    }

    if (userNavStore.user_nav?.uid) {
      headers['x-bili-mid'] = userNavStore.user_nav.uid
      if (userNavStore.user_nav.level_info?.current_level) {
        headers['x-bili-level'] = String(userNavStore.user_nav.level_info.current_level)
      }
    }

    const requestBody = {
      req: {
        stream_key: params.stream_key,
        sdp: params.answer.sdp,
        type: params.answer.type
      },
      body: { browser_id: params.browser_id }
    }

    const response = await fetch(url, { headers, method: 'POST', body: JSON.stringify(requestBody) })
    const data = await response.json()
    return data
  }

  /**
   * 添加 ICE Candidate
   * @param params - 参数对象
   */
  async addIceCandidate(params: {
    browser_id: string
    stream_key: string
    candidate: string
    sdpMid: string
    sdpMLineIndex: number
  }): Promise<RootObject<null>> {
    let baseUrl = import.meta.env.VITE_API_BASE_URL
    if (!baseUrl || baseUrl === '/') {
      baseUrl = window.location.origin
    }
    const url = `${baseUrl}${this.path}/webrtc/ice-candidate`

    const jwtStore = useJwtStore()
    const userNavStore = useUserNavStore()

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (jwtStore.jwt) {
      headers['Authorization'] = `Bearer ${jwtStore.jwt}`
    }

    if (userNavStore.user_nav?.uid) {
      headers['x-bili-mid'] = userNavStore.user_nav.uid
      if (userNavStore.user_nav.level_info?.current_level) {
        headers['x-bili-level'] = String(userNavStore.user_nav.level_info.current_level)
      }
    }

    const requestBody = {
      req: {
        stream_key: params.stream_key,
        candidate: params.candidate,
        sdpMid: params.sdpMid,
        sdpMLineIndex: params.sdpMLineIndex
      },
      body: { browser_id: params.browser_id }
    }

    const response = await fetch(url, { headers, method: 'POST', body: JSON.stringify(requestBody) })
    const data = await response.json()
    return data
  }

  /**
   * 关闭 WebRTC 视频流
   * 关闭现有的 WebRTC 连接。
   * 用于解决视频流卡住或无画面的问题，或停止视频流时调用。
   * @param params - 参数对象
   * @param params.browser_id - 浏览器 ID
   * @param params.stream_key - 流密钥（从 offer 响应中获取）
   */
  async closeWebrtcStream(params: { browser_id: string; stream_key: string }): Promise<RootObject<null>> {
    let baseUrl = import.meta.env.VITE_API_BASE_URL
    if (!baseUrl || baseUrl === '/') {
      baseUrl = window.location.origin
    }
    const url = `${baseUrl}${this.path}/webrtc/close`

    const jwtStore = useJwtStore()
    const userNavStore = useUserNavStore()

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (jwtStore.jwt) {
      headers['Authorization'] = `Bearer ${jwtStore.jwt}`
    }

    if (userNavStore.user_nav?.uid) {
      headers['x-bili-mid'] = userNavStore.user_nav.uid
      if (userNavStore.user_nav.level_info?.current_level) {
        headers['x-bili-level'] = String(userNavStore.user_nav.level_info.current_level)
      }
    }

    const requestBody = {
      req: { stream_key: params.stream_key },
      body: { browser_id: params.browser_id }
    }

    const response = await fetch(url, { headers, method: 'POST', body: JSON.stringify(requestBody) })
    const data = await response.json()
    return data
  }
}

const browserControlApi = new BrowserControlApi()
const browserLiveControlApi = browserControlApi
export default browserControlApi
export { BrowserControlApi, browserLiveControlApi }
