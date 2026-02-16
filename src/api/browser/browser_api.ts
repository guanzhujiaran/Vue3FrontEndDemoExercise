import BaseApi from '../base_axios/base_api'
import ajax from '../base_axios/base_axios'
import type { RootObject } from '@/models/api/base_model'
import type { ErrorHandlerOptions } from '../base_axios/error_handler'
import type {
  VerifyFingerprintDependsReq,
  UserBrowserInfoCreateParams,
  UserBrowserInfoCreateResp,
  UserBrowserInfoReadParams,
  UserBrowserInfoReadResp,
  UserBrowserInfoUpdateParams,
  UserBrowserInfoUpdateResp,
  UserBrowserInfoDeleteParams,
  UserBrowserInfoDeleteResp,
  UserBrowserInfoListParams,
  UserBrowserInfoListResp,
  UserBrowserInfoWithoutPlugin,
  StandardResponse,
  BasePaginationResp,
  BaseFingerprintBrowserInitParams,
  BrowserFingerprintCreateParams,
  BrowserFingerprintUpsertParams,
  BrowserFingerprintQueryParams,
  BrowserFingerprintDeleteResp,
  BrowserFingerprintListParams,
  BrowserFingerprintQueryResp,
  NotificationConfigCreate,
  NotificationConfigUpdate,
  NotificationConfigCreateResp,
  NotificationConfigUpdateResp,
  NotificationConfigDeleteResp,
  NotificationConfig,
  NotifyConfigReadRequest,
  HeartbeatRequest,
  HeartbeatResponse,
  ManualOperationRequest,
  AutomationResumeRequest,
  VideoStreamStartParams,
  VideoStreamResponse,
  VideoStreamStatus,
  ScreenshotParams,
  BrowserClickParams,
  SecurityCheckParams,
  CreateSessionRequest,
  CreateSessionResponse,
  BrowserSessionStatus,
  BrowserInfo,
  BrowserStatus,
  BrowserCleanupPolicy,
  SimplifiedHeartbeatRequest,
  SimplifiedCreateSessionRequest,
  SimplifiedAutomationResumeRequest,
  SimplifiedBrowserClickRequest,
  SimplifiedJavaScriptExecuteRequest,
  SimplifiedJavaScriptExecuteWithParamsRequest,
  SimplifiedNavigateRequest,
  SimplifiedScreenshotRequest,
  SimplifiedPausePluginsRequest,
  SimplifiedForceReleaseRequest,
  SimplifiedBrowserCleanupPolicyRequest,
  SimplifiedLiveControlCommand,
  Body_send_heartbeat_api_v1_rpa_browser_live_control_browser_heartbeat_post,
  Body_create_browser_session_api_v1_rpa_browser_live_control_browser_session_create_post,
  Body_stop_manual_operation_api_v1_rpa_browser_live_control_browser_manual_stop_post,
  Body_browser_click_api_v1_rpa_browser_live_control_browser_click_post,
  Body_execute_browser_command_api_v1_rpa_browser_live_control_browser_control_post,
  Body_execute_javascript_code_api_v1_rpa_browser_live_control_browser_execute_post,
  Body_safe_execute_javascript_api_v1_rpa_browser_live_control_browser_safe_execute_post,
  Body_evaluate_javascript_api_v1_rpa_browser_live_control_browser_evaluate_post,
  Body_force_release_browser_api_v1_rpa_browser_live_control_browser_force_release_post,
  Body_get_screenshot_api_v1_rpa_browser_live_control_stream_screenshot_post,
  Body_navigate_to_url_api_v1_rpa_browser_live_control_browser_navigate_post,
  Body_pause_plugins_api_v1_rpa_browser_live_control_browser_plugins_pause_post,
  Body_set_cleanup_policy_api_v1_rpa_browser_live_control_browser_cleanup_policy_post,
  // 新增的类型导入
  NotificationConfigUpsertResp,
  OperationPriority,
  VerifyBrowserDependsReq,
  ClickResponse,
  ExecuteJsResponse,
  RPAResponse,
  ManualOperationResponse,
  AutomationResumeResponse,
  PluginStatusResponse,
  BrowserInfoResponse,
  VideoStreamStatusResponse,
  CleanupPolicyResponse,
  ForceReleaseResponse,
  SystemStatisticsResponse,
  SystemHealthCheckResponse,
  BrowserFingerprintCreateResp,
  BrowserFingerprintDeleteParams
} from '@/types/browser-automation-api'

// 重新导出类型以保持向后兼容性
export type {
  UserBrowserInfoCreateParams,
  UserBrowserInfoCreateResp,
  UserBrowserInfoReadParams,
  UserBrowserInfoReadResp,
  UserBrowserInfoUpdateParams,
  UserBrowserInfoUpdateResp,
  UserBrowserInfoDeleteParams,
  UserBrowserInfoDeleteResp,
  UserBrowserInfoListParams,
  UserBrowserInfoListResp,
  UserBrowserInfoWithoutPlugin,
  StandardResponse,
  BasePaginationResp,
  BaseFingerprintBrowserInitParams,
  BrowserFingerprintCreateParams,
  BrowserFingerprintUpsertParams,
  BrowserFingerprintQueryParams,
  BrowserFingerprintDeleteResp,
  BrowserFingerprintListParams,
  BrowserFingerprintQueryResp,
  NotificationConfigCreate,
  NotificationConfigUpdate,
  NotificationConfigCreateResp,
  NotificationConfigUpdateResp,
  NotificationConfigDeleteResp,
  NotificationConfig,
  // NotificationConfigEffectiveResp 已删除,不在新API中
  // BrowserEffectiveNotifyRequest 已删除,不在新API中
  NotifyConfigReadRequest,
  HeartbeatRequest,
  HeartbeatResponse,
  ManualOperationRequest,
  AutomationResumeRequest,
  VideoStreamStartParams,
  VideoStreamResponse,
  VideoStreamStatus,
  ScreenshotParams,
  CreateSessionRequest,
  CreateSessionResponse,
  BrowserSessionStatus,
  BrowserInfo,
  BrowserStatus,
  BrowserCleanupPolicy,
  VerifyBrowserDependsReq,
  SimplifiedHeartbeatRequest,
  SimplifiedCreateSessionRequest,
  // SimplifiedManualOperationRequest 已删除,不在新API中
  SimplifiedAutomationResumeRequest,
  SimplifiedBrowserClickRequest,
  SimplifiedJavaScriptExecuteRequest,
  SimplifiedJavaScriptExecuteWithParamsRequest,
  SimplifiedNavigateRequest,
  SimplifiedScreenshotRequest,
  // SimplifiedVideoStreamMjpegRequest 已删除,不在新API中
  SimplifiedPausePluginsRequest,
  SimplifiedForceReleaseRequest,
  SimplifiedBrowserCleanupPolicyRequest,
  SimplifiedLiveControlCommand,
  ClickResponse,
  ExecuteJsResponse,
  RPAResponse,
  ManualOperationResponse,
  AutomationResumeResponse,
  PluginStatusResponse,
  BrowserInfoResponse,
  VideoStreamStatusResponse,
  CleanupPolicyResponse,
  ForceReleaseResponse,
  SystemStatisticsResponse,
  SystemHealthCheckResponse,
  // 新增的类型导出
  NotificationConfigUpsertResp,
  OperationPriority
}

// 浏览器指纹管理API
class BrowserApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser'
  }

  // 浏览器指纹管理
  genRandFingerprint(
    params: BrowserFingerprintCreateParams
  ): Promise<RootObject<BaseFingerprintBrowserInitParams>> {
    return this._post('/gen_rand_fingerprint', params)
  }

  /**
   * 创建或更新浏览器指纹（统一Upsert接口）
   * 如果指纹ID存在则更新，否则创建新指纹
   */
  upsertFingerprint(
    params: BrowserFingerprintUpsertParams
  ): Promise<RootObject<BrowserFingerprintCreateResp>> {
    return this._post('/upsert_fingerprint', params)
  }

  readFingerprint(
    params: BrowserFingerprintQueryParams
  ): Promise<RootObject<BrowserFingerprintQueryResp | null>> {
    return this._post('/read_fingerprint', params)
  }

  /**
   * 删除浏览器指纹
   * @param id 指纹ID
   */
  async deleteFingerprint(
    params: BrowserFingerprintDeleteParams
  ): Promise<RootObject<BrowserFingerprintDeleteResp>> {
    const response = await this._post('/delete_fingerprint', params)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<BrowserFingerprintDeleteResp>
    }
    return response
  }

  async countFingerprint(): Promise<RootObject<number>> {
    const response = await this._post('/count_fingerprint', {})
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<number>
    }
    return response
  }

  async listFingerprint(
    params: BrowserFingerprintListParams
  ): Promise<RootObject<BasePaginationResp<UserBrowserInfoWithoutPlugin>>> {
    const response = await this._post('/list_fingerprint', params)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<
        BasePaginationResp<UserBrowserInfoWithoutPlugin>
      >
    }
    return response
  }

  /**
   * 带错误处理的指纹列表方法
   * @param params 列表参数
   * @param errorOptions 错误处理选项
   */
  async listFingerprintWithError(
    params: BrowserFingerprintListParams,
    errorOptions?: ErrorHandlerOptions
  ): Promise<RootObject<BasePaginationResp<UserBrowserInfoWithoutPlugin>>> {
    const response = await this._postWithError('/list_fingerprint', params, {}, errorOptions)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<
        BasePaginationResp<UserBrowserInfoWithoutPlugin>
      >
    }
    return response
  }

  // 认证相关接口(已删除,不再在新API中)
  // async authFingerprint(...) { ... }
  // async verifyFingerprint(...) { ... }

  // ===== 通知配置管理 =====

  /**
   * 创建或更新通知配置（统一Upsert接口）
   * POST /api/v1/rpa/browser/notify/conf/upsert
   */
  async upsertNotifyConfig(
    params: NotificationConfigCreate
  ): Promise<RootObject<NotificationConfigUpsertResp>> {
    const response = await this._post('/notify/conf/upsert', params)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<NotificationConfigUpsertResp>
    }
    return response
  }

  /**
   * 读取通知配置
   * POST /api/v1/rpa/browser/notify/conf/read
   */
  async readNotifyConfig(
    request: NotifyConfigReadRequest
  ): Promise<RootObject<NotificationConfig | null>> {
    // 确保请求体不为空，至少包含一个空对象
    const requestBody = request || {}
    const response = await this._post('/notify/conf/read', requestBody)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<NotificationConfig | null>
    }
    return response
  }

  /**
   * 删除通知配置
   * POST /api/v1/rpa/browser/notify/conf/delete
   */
  async deleteNotifyConfig(
    request: NotifyConfigReadRequest
  ): Promise<RootObject<NotificationConfigDeleteResp>> {
    // 确保请求体不为空，至少包含一个空对象
    const requestBody = request || {}
    const response = await this._post('/notify/conf/delete', requestBody)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<NotificationConfigDeleteResp>
    }
    return response
  }

  /**
   * 测试通知配置
   * POST /api/v1/rpa/browser/notify/test
   */
  async testNotifyConfig(
    request: {
      title?: string
      content?: string
      browser_id?: string | null
    }
  ): Promise<RootObject<any>> {
    const response = await this._post('/notify/test', request)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<any>
    }
    return response
  }

  /**
   * 获取有效通知配置（已删除,不再在新API中）
   * POST /api/v1/rpa/browser/notify/conf/effective
   */
  // async getEffectiveNotifyConfig(...) { ... }

  /**
   * 获取特定浏览器的有效通知配置（已删除,不再在新API中）
   * POST /api/v1/rpa/browser/notify/conf/browser/effective
   */
  // async getBrowserEffectiveNotifyConfig(...) { ... }

  // 兼容性方法
  /**
   * 读取通知配置（兼容性方法）
   * @param browser_id 浏览器ID（可选）
   */
  async readNotifyConfigCompat(
    browser_id?: string | null
  ): Promise<RootObject<NotificationConfig | null>> {
    return await this.readNotifyConfig({ browser_id: browser_id || undefined })
  }

  /**
   * 删除通知配置（兼容性方法）
   * @param browser_id 浏览器ID（可选）
   */
  async deleteNotifyConfigCompat(
    browser_id?: string | null
  ): Promise<RootObject<NotificationConfigDeleteResp>> {
    return await this.deleteNotifyConfig({ browser_id: browser_id || undefined })
  }

  /**
   * 获取有效通知配置（已删除,不再在新API中）
   * @param browser_id 浏览器ID（可选）
   */
  // async getEffectiveNotifyConfigCompat(...) { ... }

  /**
   * 读取通知配置（默认全局配置）
   * 当不需要指定浏览器ID时使用此方法
   */
  async readGlobalNotifyConfig(): Promise<RootObject<NotificationConfig | null>> {
    return await this.readNotifyConfig({})
  }

  /**
   * 删除全局通知配置
   * 删除用户的全局默认通知配置
   */
  async deleteGlobalNotifyConfig(): Promise<RootObject<NotificationConfigDeleteResp>> {
    return await this.deleteNotifyConfig({})
  }

  /**
   * 获取全局有效通知配置（已删除,不再在新API中）
   * 获取用户的全局默认有效通知配置
   */
  // async getGlobalEffectiveNotifyConfig() { ... }
}

// 浏览器实时控制API
class BrowserLiveControlApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser_live_control'
  }
}

// 浏览器实时控制API实现
class BrowserLiveControlApiImpl extends BrowserLiveControlApi {
  /**
   * 发送心跳信号
   * POST /api/v1/rpa/browser_live_control/browser/heartbeat
   */
  async sendHeartbeat(params: {
    browser_id: string
    request?: SimplifiedHeartbeatRequest
  }): Promise<RootObject<HeartbeatResponse>> {
    const body: Body_send_heartbeat_api_v1_rpa_browser_live_control_browser_heartbeat_post = {
      request: params.request || {
        client_id: '',
        timestamp: Date.now()
      },
      body: { browser_id: params.browser_id }
    }
    const response = await this._post(`/browser/heartbeat`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<HeartbeatResponse>
    }
    return response
  }

  /**
   * 创建浏览器会话
   * POST /api/v1/rpa/browser_live_control/browser/session/create
   */
  async createBrowserSession(params: {
    browser_id: string
    request?: SimplifiedCreateSessionRequest
  }): Promise<RootObject<CreateSessionResponse>> {
    const body: Body_create_browser_session_api_v1_rpa_browser_live_control_browser_session_create_post =
      {
        request: params.request || {
          headless: true,
          auto_cleanup: true,
          cleanup_policy: {
            max_idle_time: 1800,
            max_no_heartbeat_time: 60,
            cleanup_interval: 300
          },
          expiration_time: 0
        },
        body: { browser_id: params.browser_id }
      }
    const response = await this._post(`/browser/session/create`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<CreateSessionResponse>
    }
    return response
  }

  /**
   * 获取浏览器会话状态
   * POST /api/v1/rpa/browser_live_control/browser/session/status
   */
  async getBrowserSessionStatus(params: {
    browser_id: string
  }): Promise<RootObject<BrowserSessionStatus>> {
    const response = await this._post(`/browser/session/status`, {
      browser_id: params.browser_id
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<BrowserSessionStatus>
    }
    return response
  }

  /**
   * 开始人工操作（已删除,不再在新API中）
   * POST /api/v1/rpa/browser_live_control/browser/manual/start
   */
  // async startManualOperation(...) { ... }

  /**
   * 停止人工操作
   * POST /api/v1/rpa/browser_live_control/browser/manual/stop
   */
  async stopManualOperation(params: {
    browser_id: string
    request?: SimplifiedAutomationResumeRequest
  }): Promise<RootObject<any>> {
    const body: Body_stop_manual_operation_api_v1_rpa_browser_live_control_browser_manual_stop_post =
      {
        request: params.request || { force: false },
        body: { browser_id: params.browser_id }
      }
    const response = await this._post(`/browser/manual/stop`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取操作状态
   * POST /api/v1/rpa/browser_live_control/browser/operation/status
   */
  async getOperationStatus(params: { browser_id: string }): Promise<RootObject<any>> {
    const response = await this._post(`/browser/operation/status`, {
      browser_id: params.browser_id
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  // ===== 视频流控制 =====

  /**
   * 获取视频流状态
   * POST /api/v1/rpa/browser_live_control/browser/stream/status
   */
  async getVideoStreamStatus(params: {
    browser_id: string
  }): Promise<RootObject<VideoStreamStatusResponse>> {
    const response = await this._post(`/browser/stream/status`, {
      browser_id: params.browser_id
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<VideoStreamStatusResponse>
    }
    return response
  }

  /**
   * 获取截图
   * POST /api/v1/rpa/browser_live_control/stream/screenshot
   */
  async getScreenshot(browser_id: string | {
    browser_id: string
    request?: SimplifiedScreenshotRequest
  }, request?: SimplifiedScreenshotRequest): Promise<Blob> {
    // 兼容旧的调用方式: getScreenshot(browser_id, request)
    // 和新的调用方式: getScreenshot({ browser_id, request })
    let finalBrowserId: string
    let finalRequest: SimplifiedScreenshotRequest | undefined

    if (typeof browser_id === 'object') {
      finalBrowserId = browser_id.browser_id
      finalRequest = browser_id.request || request
    } else {
      finalBrowserId = browser_id
      finalRequest = request
    }

    const body: Body_get_screenshot_api_v1_rpa_browser_live_control_stream_screenshot_post = {
      request: finalRequest || {},
      body: { browser_id: finalBrowserId }
    }
    const response = await ajax.post<Blob>(`${this.path}/stream/screenshot`, body, {
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 执行JavaScript代码
   * POST /api/v1/rpa/browser_live_control/browser/execute
   */
  async executeJavaScript(browser_id: string | {
    browser_id: string
    request: SimplifiedJavaScriptExecuteWithParamsRequest
  }, request?: SimplifiedJavaScriptExecuteWithParamsRequest): Promise<RootObject<any>> {
    // 兼容旧的调用方式: executeJavaScript(browser_id, request)
    let finalBrowserId: string
    let finalRequest: SimplifiedJavaScriptExecuteWithParamsRequest

    if (typeof browser_id === 'object') {
      finalBrowserId = browser_id.browser_id
      finalRequest = browser_id.request
    } else {
      finalBrowserId = browser_id
      finalRequest = request || { code: '' }
    }

    const body: Body_execute_javascript_code_api_v1_rpa_browser_live_control_browser_execute_post =
      {
        request: finalRequest,
        body: { browser_id: finalBrowserId }
      }
    const response = await this._post(`/browser/execute`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 安全执行JavaScript代码（带沙箱检查）
   * POST /api/v1/rpa/browser_live_control/browser/safe_execute
   */
  async safeExecuteJavaScript(browser_id: string | {
    browser_id: string
    request: SimplifiedJavaScriptExecuteWithParamsRequest
  }, request?: SimplifiedJavaScriptExecuteWithParamsRequest): Promise<RootObject<any>> {
    // 兼容旧的调用方式: safeExecuteJavaScript(browser_id, request)
    let finalBrowserId: string
    let finalRequest: SimplifiedJavaScriptExecuteWithParamsRequest

    if (typeof browser_id === 'object') {
      finalBrowserId = browser_id.browser_id
      finalRequest = browser_id.request
    } else {
      finalBrowserId = browser_id
      finalRequest = request || { code: '' }
    }

    const body: Body_safe_execute_javascript_api_v1_rpa_browser_live_control_browser_safe_execute_post =
      {
        request: finalRequest,
        body: { browser_id: finalBrowserId }
      }
    const response = await this._post(`/browser/safe_execute`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 浏览器点击操作
   * POST /api/v1/rpa/browser_live_control/browser/click
   */
  async clickElement(params: {
    browser_id: string
    request: SimplifiedBrowserClickRequest
  }): Promise<RootObject<any>> {
    const body: Body_browser_click_api_v1_rpa_browser_live_control_browser_click_post = {
      request: params.request,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post(`/browser/click`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 执行浏览器命令
   * POST /api/v1/rpa/browser_live_control/browser/control
   */
  async executeBrowserCommand(params: {
    browser_id: string
    command: SimplifiedLiveControlCommand
  }): Promise<RootObject<any>> {
    const body: Body_execute_browser_command_api_v1_rpa_browser_live_control_browser_control_post =
      {
        command: params.command,
        body: { browser_id: params.browser_id }
      }
    const response = await this._post(`/browser/control`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 评估JavaScript代码
   * POST /api/v1/rpa/browser_live_control/browser/evaluate
   */
  async evaluateJavaScript(params: {
    browser_id: string
    request: SimplifiedJavaScriptExecuteRequest
  }): Promise<RootObject<any>> {
    const body: Body_evaluate_javascript_api_v1_rpa_browser_live_control_browser_evaluate_post = {
      request: params.request,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post(`/browser/evaluate`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 代码安全检查
   * POST /api/v1/rpa/browser_live_control/security/check
   */
  async checkCodeSecurity(params: SecurityCheckParams): Promise<RootObject<any>> {
    const response = await this._post('/security/check', params)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 导航到指定URL
   * POST /api/v1/rpa/browser_live_control/browser/navigate
   */
  async navigateToUrl(params: {
    browser_id: string
    request: SimplifiedNavigateRequest
  }): Promise<RootObject<any>> {
    const body: Body_navigate_to_url_api_v1_rpa_browser_live_control_browser_navigate_post = {
      request: params.request,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post(`/browser/navigate`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 暂停插件
   * POST /api/v1/rpa/browser_live_control/browser/plugins/pause
   */
  async pausePlugins(params: { browser_id: string }): Promise<RootObject<any>> {
    const body: Body_pause_plugins_api_v1_rpa_browser_live_control_browser_plugins_pause_post = {
      request: {},
      body: { browser_id: params.browser_id }
    }
    const response = await this._post(`/browser/plugins/pause`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取插件状态
   * POST /api/v1/rpa/browser_live_control/browser/plugins/status
   */
  async getPluginStatus(params: { browser_id: string }): Promise<RootObject<any>> {
    const response = await this._post(`/browser/plugins/status`, {
      browser_id: params.browser_id
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取浏览器详细信息
   * POST /api/v1/rpa/browser_live_control/browser/info
   */
  async getBrowserInfo(browser_id: string): Promise<RootObject<any>> {
    const response = await this._post(`/browser/info`, { browser_id: browser_id })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取浏览器状态
   * POST /api/v1/rpa/browser_live_control/browser/status
   */
  async getBrowserStatus(browser_id: string): Promise<RootObject<any>> {
    const response = await this._post(`/browser/status`, { browser_id: browser_id })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 设置清理策略
   * POST /api/v1/rpa/browser_live_control/browser/cleanup/policy
   */
  async setCleanupPolicy(
    browser_id: string,
    policy: BrowserCleanupPolicy
  ): Promise<RootObject<any>> {
    const body: Body_set_cleanup_policy_api_v1_rpa_browser_live_control_browser_cleanup_policy_post =
      {
        request: { policy },
        body: { browser_id: browser_id }
      }
    const response = await this._post(`/browser/cleanup/policy`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 强制释放浏览器实例
   * POST /api/v1/rpa/browser_live_control/browser/force/release
   */
  async forceReleaseBrowser(browser_id: string): Promise<RootObject<any>> {
    const body: Body_force_release_browser_api_v1_rpa_browser_live_control_browser_force_release_post =
      {
        request: {},
        body: { browser_id: browser_id }
      }
    const response = await this._post(`/browser/force/release`, body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取系统统计信息
   * POST /api/v1/rpa/browser_live_control/system/statistics
   */
  async getSystemStatistics(): Promise<RootObject<any>> {
    const response = await this._post('/system/statistics', {})
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 触发系统清理
   * POST /api/v1/rpa/browser_live_control/system/cleanup
   */
  async triggerSystemCleanup(): Promise<RootObject<any>> {
    const response = await this._post('/system/cleanup', {})
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取浏览器标签页列表
   * POST /api/v1/rpa/browser_live_control/browser/tabs/list
   */
  async listTabs(browser_id: string): Promise<RootObject<any>> {
    const response = await this._post(`/browser/tabs/list`, { browser_id })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 切换到指定标签页
   * POST /api/v1/rpa/browser_live_control/browser/tabs/switch
   */
  async switchTab(params: {
    browser_id: string
    tab_id: string
  }): Promise<RootObject<any>> {
    const response = await this._post(`/browser/tabs/switch`, params)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 暂停视频流
   * POST /api/v1/rpa/browser_live_control/browser/stream/pause
   */
  async pauseVideoStream(browser_id: string): Promise<RootObject<any>> {
    const response = await this._post(`/browser/stream/pause`, { browser_id })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 恢复视频流
   * POST /api/v1/rpa/browser_live_control/browser/stream/resume
   */
  async resumeVideoStream(browser_id: string): Promise<RootObject<any>> {
    const response = await this._post(`/browser/stream/resume`, { browser_id })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取H.264视频流（已删除,使用WebRTC替代）
   * GET /api/v1/rpa/browser_live_control/stream/mjpeg
   */
  // async getVideoStreamMjpeg(...) { ... }

  /**
   * 获取视频流URL（已删除,使用WebRTC替代）
   * GET /api/v1/rpa/browser_live_control/stream/mjpeg
   */
  // getVideoStreamUrl(...) { ... }

  // ===== WebRTC 视频流 =====

  /**
   * 创建 WebRTC offer
   * POST /api/v1/rpa/browser_live_control/webrtc/offer
   */
  async createWebrtcOffer(params: {
    browser_id: string
  }): Promise<RootObject<{ sdp?: string }>> {
    const response = await this._post(`/webrtc/offer`, {
      browser_id: params.browser_id
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<{ sdp?: string }>
    }
    return response
  }

  /**
   * 设置 WebRTC answer
   * POST /api/v1/rpa/browser_live_control/webrtc/answer
   */
  async setWebrtcAnswer(params: {
    browser_id: string
    sdp: string
  }): Promise<RootObject<any>> {
    const response = await this._post(`/webrtc/answer`, params)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<any>
    }
    return response
  }

  /**
   * 添加 WebRTC ICE candidate
   * POST /api/v1/rpa/browser_live_control/webrtc/ice-candidate
   */
  async addWebrtcIceCandidate(params: {
    browser_id: string
    candidate: {
      candidate: string
      sdpMid: string | null
      sdpMLineIndex: number | null
    }
  }): Promise<RootObject<any>> {
    console.log('📤 [API] 准备发送 ICE candidate 请求:', params)
    console.log('📤 [API] 完整URL:', `${this.path}/webrtc/ice-candidate`)
    const response = await this._post(`/webrtc/ice-candidate`, params)
    console.log('📤 [API] ICE candidate 请求响应:', response)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<any>
    }
    return response
  }

  /**
   * 获取 WebRTC ICE candidates
   * GET /api/v1/rpa/browser_live_control/webrtc/ice-candidates
   */
  async getWebrtcIceCandidates(params: {
    browser_id: string
  }): Promise<RootObject<{
    candidates: Array<{
      candidate?: string
      sdpMid?: string | null
      sdpMLineIndex?: number | null
    }>
    ice_gathering_state?: string
  }>> {
    console.log('📥 [API] 准备获取 ICE candidates 请求:', params)
    console.log('📥 [API] 完整URL:', `${this.path}/webrtc/ice-candidates`)
    const response = await ajax.get(`${this.path}/webrtc/ice-candidates`, {
      params: { browser_id: params.browser_id }
    })
    console.log('📥 [API] ICE candidates 请求响应:', response)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<{
        candidates: Array<{
          candidate?: string
          sdpMid?: string | null
          sdpMLineIndex?: number | null
        }>
        ice_gathering_state?: string
      }>
    }
    return response
  }

  /**
   * 获取 WebRTC 连接状态
   * GET /api/v1/rpa/browser_live_control/webrtc/status
   */
  async getWebrtcStatus(browser_id: string): Promise<RootObject<any>> {
    const response = await ajax.get(`${this.path}/webrtc/status`, {
      params: { browser_id }
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<any>
    }
    return response
  }

  /**
   * 关闭 WebRTC 连接
   * POST /api/v1/rpa/browser_live_control/webrtc/close
   */
  async closeWebrtcConnection(browser_id: string): Promise<RootObject<any>> {
    const response = await this._post(`/webrtc/close`, {
      browser_id: browser_id
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<any>
    }
    return response
  }

  // ===== 兼容性方法 =====


  /**
   * 发送心跳信号（兼容性方法）
   */
  async sendHeartbeatCompat(
    browser_id: string,
    params: HeartbeatRequest
  ): Promise<RootObject<HeartbeatResponse>> {
    return await this.sendHeartbeat({
      browser_id: browser_id,
      request: {
        client_id: params.client_id,
        timestamp: params.timestamp
      }
    })
  }

  /**
   * 开始人工操作（已删除,不再在新API中）
   */
  // async startManualOperationCompat(...) { ... }

  /**
   * 停止人工操作（兼容性方法）
   */
  async stopManualOperationCompat(
    browser_id: string,
    params?: AutomationResumeRequest
  ): Promise<RootObject<any>> {
    return await this.stopManualOperation({
      browser_id: browser_id,
      request: params
        ? {
            force: params.force || false,
            reason: params.reason
          }
        : undefined
    })
  }

  /**
   * 获取截图（兼容性方法）
   */
  async getScreenshotCompat(browser_id: string, params?: ScreenshotParams): Promise<Blob> {
    return await this.getScreenshot({
      browser_id: browser_id,
      request: params
        ? {
            quality: params.quality
          }
        : undefined
    })
  }

  /**
   * 浏览器点击操作（兼容性方法）
   */
  async clickElementCompat(
    browser_id: string,
    params: BrowserClickParams
  ): Promise<RootObject<any>> {
    return await this.clickElement({
      browser_id: browser_id,
      request: {
        x: params.x,
        y: params.y,
        button: params.button,
        double: params.double,
        wait_after: params.wait_after
      }
    })
  }

  /**
   * 导航到指定URL（兼容性方法）
   */
  async navigateToUrlCompat(browser_id: string, url: string): Promise<RootObject<any>> {
    return await this.navigateToUrl({
      browser_id: browser_id,
      request: { url }
    })
  }

  /**
   * 暂停插件（兼容性方法）
   */
  async pausePluginsCompat(browser_id: string): Promise<RootObject<any>> {
    return await this.pausePlugins({ browser_id: browser_id })
  }

  /**
   * 获取插件状态（兼容性方法）
   */
  async getPluginStatusCompat(browser_id: string): Promise<RootObject<any>> {
    return await this.getPluginStatus({ browser_id: browser_id })
  }

  /**
   * 获取浏览器详细信息（兼容性方法）
   */
  async getBrowserInfoCompat(browser_id: string): Promise<RootObject<any>> {
    return await this.getBrowserInfo(browser_id)
  }

  /**
   * 获取浏览器状态（兼容性方法）
   */
  async getBrowserStatusCompat(browser_id: string): Promise<RootObject<any>> {
    return await this.getBrowserStatus(browser_id)
  }

  /**
   * 设置清理策略（兼容性方法）
   */
  async setCleanupPolicyCompat(
    browser_id: string,
    policy: BrowserCleanupPolicy
  ): Promise<RootObject<any>> {
    return await this.setCleanupPolicy(browser_id, policy)
  }

  /**
   * 强制释放浏览器实例（兼容性方法）
   */
  async forceReleaseBrowserCompat(browser_id: string): Promise<RootObject<any>> {
    return await this.forceReleaseBrowser(browser_id)
  }

  /**
   * 获取视频流状态（兼容性方法）
   */
  async getVideoStreamStatusCompat(browser_id: string): Promise<RootObject<any>> {
    return await this.getVideoStreamStatus({ browser_id: browser_id })
  }

  /**
   * 获取MJPEG视频流（已删除,不再在新API中）
   */
  // async getVideoStreamMjpegCompat(...) { ... }
}

const browserApi = new BrowserApi()
const browserLiveControlApi = new BrowserLiveControlApiImpl()

export default browserApi
export { browserLiveControlApi }
