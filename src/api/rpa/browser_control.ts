import BaseAPI from '@/api/base_axios/base_api'

// 浏览器控制相关接口

// 浏览器打开URL参数
export interface BrowserOpenUrlParams {
  browser_token: string
  url: string
  headless?: boolean
}

// 浏览器截图参数
export interface BrowserScreenshotParams {
  browser_token: string
  full_page?: boolean
  headless?: boolean
  type?: string | null
}

// 浏览器释放会话参数
export interface BrowserReleaseParams {
  browser_token: string
}

// 直播创建参数
export interface LiveCreateParams {
  browser_token: string
  headless?: boolean
}

// 直播查看参数
export interface LiveViewParams {
  live_id: string
}

// 直播停止参数
export interface LiveStopParams {
  live_id: string
}

// 直播流参数
export interface LiveStreamParams {
  live_id: string
}

// 标准响应格式
export interface StandardResponse<T> {
  code: number
  data: T | null
  msg: string
}

// 浏览器打开URL响应
export interface BrowserOpenUrlResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

// 浏览器截图响应
export interface BrowserScreenshotResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

// 浏览器释放会话响应
export interface BrowserReleaseResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

// 直播创建响应
export interface LiveCreateResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

class BrowserControlAPI extends BaseAPI {
  // 打开URL
  async openUrl(params: BrowserOpenUrlParams) {
    return await this._post(
      '/rpa/browser_control/open_url',
      params
    )
  }

  // 截图
  async screenshot(params: BrowserScreenshotParams) {
    return await this._post(
      '/rpa/browser_control/screenshot',
      params
    )
  }

  // 释放会话
  async releaseSession(params: BrowserReleaseParams) {
    return await this._post(
      '/rpa/browser_control/release_session',
      params
    )
  }

  // 创建直播
  async liveCreate(params: LiveCreateParams) {
    return await this._post(
      '/rpa/browser_control/live/create',
      params
    )
  }

  // 查看直播
  async liveView(params: LiveViewParams) {
    return await this._get(
      '/rpa/browser_control/live/view',
      params
    )
  }

  // 直播流
  async liveStream(params: LiveStreamParams) {
    return await this._get(
      '/rpa/browser_control/live/stream',
      params
    )
  }

  // 停止直播
  async liveStop(params: LiveStopParams) {
    return await this._post(
      '/rpa/browser_control/live/stop',
      {},
      { params }
    )
  }
}

export default new BrowserControlAPI()