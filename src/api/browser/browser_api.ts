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
  BrowserFingerprintDeleteParams,
  // 自定义操作相关类型
  ActionMetadataResponse,
  ActionResultResponse,
  ActionPreviewResponse,
  ActionValidateResponse,
  ExecuteStepResponse,
  CustomActionListItem,
  CustomActionDetail,
  CustomActionCreateResponse,
  ReloadActionsResponse,
  ActionExecuteRequest,
  ActionPreviewRequest,
  ActionValidateRequest,
  ExecuteStepRequest,
  BatchActionRequest,
  CustomActionCreate,
  CustomActionUpdate,
  CustomActionGet,
  CustomActionDelete,
  CustomActionList,
  // 插件相关类型
  PluginMetadataResponse,
  PluginListItem,
  PluginDetail,
  PluginCreateResponse,
  PluginCreate,
  PluginRegister,
  PluginUpdate,
  PluginGet,
  PluginDelete,
  PluginList,
  PluginDictResponse,
  // 工作流相关类型
  WorkflowListItem,
  WorkflowDetail,
  WorkflowCreateResponse,
  WorkflowDuplicateResponse,
  WorkflowExecuteResponse,
  WorkflowCreate,
  WorkflowUpdate,
  WorkflowGet,
  WorkflowDelete,
  WorkflowList,
  WorkflowExecuteRequest,
  // 新增的API请求体类型
  BodySendHeartbeatRequest,
  BodyCreateBrowserSessionRequest,
  BodyExecuteActionRequest,
  BodyBatchExecuteRequest,
  BodyPreviewActionParamsRequest,
  BodyValidateActionParamsRequest,
  BodyExecuteActionStepRequest,
  BodyExecuteWorkflowRequest,
  BodySetCleanupPolicyRequest,
  BodyAddWebrtcIceCandidateRequest,
  BodySetWebrtcAnswerRequest,
  BodyStopManualOperationRequest,
  BodyGetScreenshotRequest,
  BodyExecuteJavaScriptCodeRequest,
  BodySafeExecuteJavaScriptRequest,
  BodyBrowserClickRequest,
  BodyExecuteBrowserCommandRequest,
  BodyEvaluateJavaScriptRequest,
  BodyNavigateToUrlRequest,
  BodyPausePluginsRequest,
  BodyForceReleaseBrowserRequest,
  // 新增的响应类型
  TestNotificationResponse,
  WebRTCOfferResponse,
  WebRTCAnswerResponse,
  WebRTCIceCandidateResponse,
  WebRTCGetIceCandidatesResponse,
  WebRTCConnectionStatusResponse,
  WebRTCCloseConnectionResponse,
  SystemCleanupResponse,
  BrowserFingerprintRenameResp,
  CustomActionListItemResponse,
  CustomActionDetailResponse,
  PluginListItemResponse,
  PluginDetailResponse,
  PluginResponse,
  WorkflowListItemResponse,
  WorkflowDetailResponse,
  IdRequest,
  IdListRequest,
  CustomActionCreateRequest,
  CustomActionUpdateRequest,
  PluginCreateRequest,
  PluginUpdateRequest,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  // 新增的插件管理请求类型
  PluginGetRequest,
  PluginListRequest,
  PluginDeleteRequest,
  // 默认设置管理相关类型
  UserBrowserDefaultSettingRequest,
  UserBrowserDefaultSettingResponse,
  ApplySettingsRequest,
  BrowserFingerprintRenameParams
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
  OperationPriority,
  // 自定义操作相关类型导出
  ActionMetadataResponse,
  ActionResultResponse,
  ActionPreviewResponse,
  ActionValidateResponse,
  ExecuteStepResponse,
  CustomActionListItem,
  CustomActionDetail,
  CustomActionCreateResponse,
  ReloadActionsResponse,
  ActionExecuteRequest,
  ActionPreviewRequest,
  ActionValidateRequest,
  ExecuteStepRequest,
  BatchActionRequest,
  CustomActionCreate,
  CustomActionUpdate,
  CustomActionGet,
  CustomActionDelete,
  CustomActionList,
  // 插件相关类型导出
  PluginMetadataResponse,
  PluginListItem,
  PluginDetail,
  PluginCreateResponse,
  PluginCreate,
  PluginRegister,
  PluginUpdate,
  PluginGet,
  PluginDelete,
  PluginList,
  // 工作流相关类型导出
  WorkflowListItem,
  WorkflowDetail,
  WorkflowCreateResponse,
  WorkflowDuplicateResponse,
  WorkflowExecuteResponse,
  WorkflowCreate,
  WorkflowUpdate,
  WorkflowGet,
  WorkflowDelete,
  WorkflowList,
  WorkflowExecuteRequest,
  // 新增的API请求体类型导出
  BodySendHeartbeatRequest,
  BodyCreateBrowserSessionRequest,
  BodyExecuteActionRequest,
  BodyBatchExecuteRequest,
  BodyPreviewActionParamsRequest,
  BodyValidateActionParamsRequest,
  BodyExecuteActionStepRequest,
  BodyExecuteWorkflowRequest,
  BodySetCleanupPolicyRequest,
  BodyAddWebrtcIceCandidateRequest,
  BodySetWebrtcAnswerRequest,
  // 新增的响应类型导出
  TestNotificationResponse,
  WebRTCOfferResponse,
  WebRTCAnswerResponse,
  WebRTCIceCandidateResponse,
  WebRTCGetIceCandidatesResponse,
  WebRTCConnectionStatusResponse,
  WebRTCCloseConnectionResponse,
  SystemCleanupResponse,
  BrowserFingerprintRenameResp,
  CustomActionListItemResponse,
  CustomActionDetailResponse,
  PluginListItemResponse,
  PluginDetailResponse,
  PluginResponse,
  WorkflowListItemResponse,
  WorkflowDetailResponse,
  IdRequest,
  IdListRequest,
  CustomActionCreateRequest,
  CustomActionUpdateRequest,
  PluginCreateRequest,
  PluginUpdateRequest,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  // 新增的插件管理请求类型导出
  PluginGetRequest,
  PluginListRequest,
  PluginDeleteRequest,
  // 默认设置管理相关类型导出
  UserBrowserDefaultSettingRequest,
  UserBrowserDefaultSettingResponse,
  ApplySettingsRequest,
  BrowserFingerprintRenameParams
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

  // ===== 浏览器插件管理 =====

  /**
   * 更新现有插件配置
   * POST /api/v1/rpa/browser/plugin
   */
  async updatePlugin(params: PluginUpdateRequest): Promise<RootObject<PluginResponse>> {
    const response = await this._post('/plugin', params)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginResponse>
    }
    return response
  }

  /**
   * 获取插件配置列表
   * POST /api/v1/rpa/browser/plugins/list
   */
  async listPlugins(params?: PluginListRequest): Promise<RootObject<PluginDictResponse>> {
    const requestBody = params || {}
    const response = await this._post('/plugins/list', requestBody)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginDictResponse>
    }
    return response
  }

  /**
   * 获取特定类型的插件配置
   * POST /api/v1/rpa/browser/plugin/get
   */
  async getPlugin(params: PluginGetRequest): Promise<RootObject<PluginResponse>> {
    const response = await this._post('/plugin/get', params)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginResponse>
    }
    return response
  }

  /**
   * 删除指定ID的插件配置
   * POST /api/v1/rpa/browser/plugin/delete
   */
  async deletePlugin(params: PluginDeleteRequest): Promise<RootObject<boolean>> {
    const response = await this._post('/plugin/delete', params)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<boolean>
    }
    return response
  }

  /**
   * 重命名浏览器指纹
   * POST /api/v1/rpa/browser/rename_fingerprint
   */
  async renameFingerprint(
    params: BrowserFingerprintRenameParams
  ): Promise<RootObject<BrowserFingerprintRenameResp>> {
    const response = await this._post('/rename_fingerprint', params)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<BrowserFingerprintRenameResp>
    }
    return response
  }

  // ===== 浏览器默认设置管理 =====

  /**
   * 获取用户的默认设置
   * POST /api/v1/rpa/browser/default-settings/get
   */
  async getDefaultSettings(): Promise<RootObject<UserBrowserDefaultSettingResponse | null>> {
    const response = await this._post('/default-settings/get', {})
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<UserBrowserDefaultSettingResponse | null>
    }
    return response
  }

  /**
   * 创建或更新用户的默认设置
   * POST /api/v1/rpa/browser/default-settings/create-or-update
   */
  async createOrUpdateDefaultSettings(
    params: UserBrowserDefaultSettingRequest
  ): Promise<RootObject<UserBrowserDefaultSettingResponse>> {
    const response = await this._post('/default-settings/create-or-update', params)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<UserBrowserDefaultSettingResponse>
    }
    return response
  }

  /**
   * 删除用户的默认设置
   * POST /api/v1/rpa/browser/default-settings/delete
   */
  async deleteDefaultSettings(): Promise<RootObject<boolean>> {
    const response = await this._post('/default-settings/delete', {})
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<boolean>
    }
    return response
  }

  /**
   * 将用户的默认设置应用到指定的浏览器实例
   * POST /api/v1/rpa/browser/default-settings/apply
   */
  async applyDefaultSettingsToBrowser(
    params: ApplySettingsRequest
  ): Promise<RootObject<boolean>> {
    const response = await this._post('/default-settings/apply', params)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<boolean>
    }
    return response
  }
}

// 浏览器实时控制API
class BrowserLiveControlApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/rpa/browser/control'
  }
}

// 浏览器实时控制API实现
class BrowserLiveControlApiImpl extends BrowserLiveControlApi {
  /**
   * 发送心跳信号
   * POST /api/v1/rpa/browser/control/heartbeat
   */
  async sendHeartbeat(params: {
    browser_id: string
    request?: SimplifiedHeartbeatRequest
  }): Promise<RootObject<HeartbeatResponse>> {
    const body: BodySendHeartbeatRequest = {
      request: params.request || {
        client_id: '',
        timestamp: Date.now()
      },
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/heartbeat', body)
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
   * POST /api/v1/rpa/browser/control/create
   */
  async createBrowserSession(params: {
    browser_id: string
    request?: SimplifiedCreateSessionRequest
  }): Promise<RootObject<CreateSessionResponse>> {
    const body: BodyCreateBrowserSessionRequest = {
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
    const response = await this._post('/create', body)
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
   * POST /api/v1/rpa/browser/control/status
   */
  async getBrowserSessionStatus(params: {
    browser_id: string
  }): Promise<RootObject<BrowserSessionStatus>> {
    const response = await this._post('/status', {
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
   * POST /api/v1/rpa/browser/control/session/manual/stop
   */
  async stopManualOperation(params: {
    browser_id: string
    request?: SimplifiedAutomationResumeRequest
  }): Promise<RootObject<any>> {
    const body: BodyStopManualOperationRequest = {
      request: params.request || { force: false },
      body: { browser_id: params.browser_id }
    }
    const response = await ajax.post('/api/v1/rpa/browser/control/session/manual/stop', body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取操作状态
   * POST /api/v1/rpa/browser/control/session/operation/status
   */
  async getOperationStatus(params: { browser_id: string }): Promise<RootObject<any>> {
    const response = await ajax.post('/api/v1/rpa/browser/control/session/operation/status', {
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
   * POST /api/v1/rpa/browser/control/stream/status
   */
  async getVideoStreamStatus(params: {
    browser_id: string
  }): Promise<RootObject<VideoStreamStatusResponse>> {
    const response = await this._post('/stream/status', {
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
   * 获取截图（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser_live_control/stream/screenshot
   */
  // async getScreenshot(...) { ... }

  /**
   * 执行JavaScript代码（已删除，请使用 executeAction 接口）
   * POST /api/v1/rpa/browser_live_control/browser/execute
   */
  // async executeJavaScript(...) { ... }

  /**
   * 安全执行JavaScript代码（已删除，请使用 executeAction 接口）
   * POST /api/v1/rpa/browser_live_control/browser/safe_execute
   */
  // async safeExecuteJavaScript(...) { ... }

  /**
   * 浏览器点击操作（已删除，请使用 executeAction 接口）
   * POST /api/v1/rpa/browser_live_control/browser/click
   */
  // async clickElement(...) { ... }

  /**
   * 执行浏览器命令（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser/control/session/control
   */
  // async executeBrowserCommand(...) { ... }

  /**
   * 评估JavaScript代码（已删除，请使用 executeAction 接口）
   * POST /api/v1/rpa/browser_live_control/browser/evaluate
   */
  // async evaluateJavaScript(...) { ... }

  /**
   * 代码安全检查（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser_live_control/security/check
   */
  // async checkCodeSecurity(...) { ... }

  /**
   * 导航到指定URL（已删除，请使用 executeAction 接口）
   * POST /api/v1/rpa/browser_live_control/browser/navigate
   */
  // async navigateToUrl(...) { ... }

  /**
   * 暂停插件
   * POST /api/v1/rpa/browser/control/plugins/pause
   */
  async pausePlugins(params: { browser_id: string }): Promise<RootObject<any>> {
    const body: BodyPausePluginsRequest = {
      request: {},
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/plugins/pause', body)
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取插件状态
   * POST /api/v1/rpa/browser/control/plugins/status
   */
  async getPluginStatus(params: { browser_id: string }): Promise<RootObject<any>> {
    const response = await this._post('/plugins/status', {
      browser_id: params.browser_id
    })
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return { data: response.data, msg: response.msg, code: response.code } as RootObject<any>
    }
    return response
  }

  /**
   * 获取浏览器详细信息（已删除，请使用 getBrowserSessionStatus 接口）
   * POST /api/v1/rpa/browser_live_control/browser/info
   */
  // async getBrowserInfo(...) { ... }

  /**
   * 获取浏览器状态（已删除，请使用 getBrowserSessionStatus 接口）
   * POST /api/v1/rpa/browser_live_control/browser/status
   */
  // async getBrowserStatus(...) { ... }

  /**
   * 设置清理策略（已删除，请使用系统清理接口）
   * POST /api/v1/rpa/browser_live_control/browser/cleanup/policy
   */
  // async setCleanupPolicy(...) { ... }

  /**
   * 强制释放浏览器实例（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser_live_control/browser/force/release
   */
  // async forceReleaseBrowser(...) { ... }

  /**
   * 获取系统统计信息
   * POST /api/v1/rpa/browser/control/system/statistics
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
   * 系统健康检查
   * POST /api/v1/rpa/system/health
   */
  async healthCheck(): Promise<RootObject<SystemHealthCheckResponse>> {
    // 注意:健康检查接口路径不同,使用 /api/v1/rpa/system/health
    const response = await ajax.post('/api/v1/rpa/system/health', {})
    // 适配新的StandardResponse结构
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<SystemHealthCheckResponse>
    }
    return response
  }

  /**
   * 触发系统清理
   * POST /api/v1/rpa/browser/control/system/cleanup
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
   * 获取浏览器标签页列表（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser_live_control/browser/tabs/list
   */
  // async listTabs(...) { ... }

  /**
   * 切换到指定标签页（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser_live_control/browser/tabs/switch
   */
  // async switchTab(...) { ... }

  /**
   * 暂停视频流（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser_live_control/browser/stream/pause
   */
  // async pauseVideoStream(...) { ... }

  /**
   * 恢复视频流（已删除，后端不再提供此接口）
   * POST /api/v1/rpa/browser_live_control/browser/stream/resume
   */
  // async resumeVideoStream(...) { ... }

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
   * POST /api/v1/rpa/browser/control/webrtc/offer
   */
  async createWebrtcOffer(params: {
    browser_id: string
  }): Promise<RootObject<{ sdp?: string }>> {
    const response = await this._post('/webrtc/offer', {
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
   * POST /api/v1/rpa/browser/control/webrtc/answer
   */
  async setWebrtcAnswer(params: {
    browser_id: string
    sdp: string
  }): Promise<RootObject<any>> {
    const body: BodySetWebrtcAnswerRequest = {
      request: { browser_id: params.browser_id, sdp: params.sdp },
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/webrtc/answer', body)
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
   * POST /api/v1/rpa/browser/control/webrtc/ice-candidate
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
    const body: BodyAddWebrtcIceCandidateRequest = {
      request: { candidate: params.candidate },
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/webrtc/ice-candidate', body)
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
   * GET /api/v1/rpa/browser/control/webrtc/ice-candidates
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
   * GET /api/v1/rpa/browser/control/webrtc/status
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
   * POST /api/v1/rpa/browser/control/webrtc/close
   */
  async closeWebrtcConnection(browser_id: string): Promise<RootObject<any>> {
    const response = await this._post('/webrtc/close', {
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
   * 获取截图（兼容性方法，已删除）
   */
  // async getScreenshotCompat(...) { ... }

  /**
   * 浏览器点击操作（兼容性方法，已删除）
   */
  // async clickElementCompat(...) { ... }

  /**
   * 导航到指定URL（兼容性方法，已删除）
   */
  // async navigateToUrlCompat(...) { ... }

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
   * 获取浏览器详细信息（兼容性方法，已删除）
   */
  // async getBrowserInfoCompat(...) { ... }

  /**
   * 获取浏览器状态（兼容性方法，已删除）
   */
  // async getBrowserStatusCompat(...) { ... }

  /**
   * 设置清理策略（兼容性方法，已删除）
   */
  // async setCleanupPolicyCompat(...) { ... }

  /**
   * 强制释放浏览器实例（兼容性方法，已删除）
   */
  // async forceReleaseBrowserCompat(...) { ... }

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

  // ===== 自定义操作管理 =====

  /**
   * 获取系统预注册操作列表
   * POST /api/v1/rpa/browser_live_control/actions/registered
   */
  async listRegisteredActions(): Promise<RootObject<ActionMetadataResponse[]>> {
    const response = await this._post('/actions/registered', {})
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<ActionMetadataResponse[]>
    }
    return response
  }

  /**
   * 执行单个操作
   * POST /api/v1/rpa/browser_live_control/actions/execute
   */
  async executeAction(params: {
    browser_id: string
    req: ActionExecuteRequest
  }): Promise<RootObject<ActionResultResponse>> {
    const body = {
      req: params.req,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/actions/execute', body)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<ActionResultResponse>
    }
    return response
  }

  /**
   * 批量执行操作
   * POST /api/v1/rpa/browser_live_control/actions/batch
   */
  async batchExecute(params: {
    browser_id: string
    req: BatchActionRequest
  }): Promise<RootObject<ActionResultResponse[]>> {
    const body = {
      req: params.req,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/actions/batch', body)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<ActionResultResponse[]>
    }
    return response
  }

  /**
   * 预览参数替换结果
   * POST /api/v1/rpa/browser_live_control/actions/preview
   */
  async previewActionParams(params: {
    browser_id: string
    req: ActionPreviewRequest
  }): Promise<RootObject<ActionPreviewResponse>> {
    const body = {
      req: params.req,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/actions/preview', body)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<ActionPreviewResponse>
    }
    return response
  }

  /**
   * 验证操作参数
   * POST /api/v1/rpa/browser_live_control/actions/validate
   */
  async validateActionParams(params: {
    browser_id: string
    req: ActionValidateRequest
  }): Promise<RootObject<ActionValidateResponse>> {
    const body = {
      req: params.req,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/actions/validate', body)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<ActionValidateResponse>
    }
    return response
  }

  /**
   * 单步执行操作
   * POST /api/v1/rpa/browser_live_control/actions/execute-step
   */
  async executeActionStep(params: {
    browser_id: string
    req: ExecuteStepRequest
  }): Promise<RootObject<ExecuteStepResponse>> {
    const body = {
      req: params.req,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/actions/execute-step', body)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<ExecuteStepResponse>
    }
    return response
  }

  /**
   * 获取用户自定义操作列表
   * POST /api/v1/rpa/browser_live_control/custom-actions/list
   */
  async listCustomActions(params?: {
    skip?: number
    limit?: number
  }): Promise<RootObject<CustomActionListItem[]>> {
    const requestBody: CustomActionList = {
      skip: params?.skip || 0,
      limit: params?.limit || 100
    }
    const response = await this._post('/custom-actions/list', requestBody)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<CustomActionListItem[]>
    }
    return response
  }

  /**
   * 获取单个自定义操作
   * POST /api/v1/rpa/browser_live_control/custom-actions/get
   */
  async getCustomAction(id: number): Promise<RootObject<CustomActionDetail>> {
    const response = await this._post('/custom-actions/get', { id })
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<CustomActionDetail>
    }
    return response
  }

  /**
   * 创建自定义操作
   * POST /api/v1/rpa/browser_live_control/custom-actions/create
   */
  async createCustomAction(data: CustomActionCreate): Promise<RootObject<CustomActionCreateResponse>> {
    const response = await this._post('/custom-actions/create', data)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<CustomActionCreateResponse>
    }
    return response
  }

  /**
   * 更新自定义操作
   * POST /api/v1/rpa/browser_live_control/custom-actions/update
   */
  async updateCustomAction(data: CustomActionUpdate): Promise<RootObject<string>> {
    const response = await this._post('/custom-actions/update', data)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<string>
    }
    return response
  }

  /**
   * 删除自定义操作
   * POST /api/v1/rpa/browser_live_control/custom-actions/delete
   */
  async deleteCustomAction(id: number): Promise<RootObject<string>> {
    const response = await this._post('/custom-actions/delete', { id })
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<string>
    }
    return response
  }

  /**
   * 重新加载自定义操作缓存
   * POST /api/v1/rpa/browser_live_control/custom-actions/reload
   */
  async reloadCustomActions(): Promise<RootObject<ReloadActionsResponse>> {
    const response = await this._post('/custom-actions/reload', {})
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<ReloadActionsResponse>
    }
    return response
  }

  // ===== 插件管理 =====

  /**
   * 获取系统预注册插件列表
   * POST /api/v1/rpa/browser_live_control/plugins/registered
   */
  async listRegisteredPlugins(): Promise<RootObject<PluginMetadataResponse[]>> {
    const response = await this._post('/plugins/registered', {})
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginMetadataResponse[]>
    }
    return response
  }

  /**
   * 获取用户插件列表
   * POST /api/v1/rpa/browser_live_control/plugins/list-user
   */
  async listUserPlugins(params?: {
    skip?: number
    limit?: number
  }): Promise<RootObject<PluginListItem[]>> {
    const requestBody: PluginList = {
      skip: params?.skip || 0,
      limit: params?.limit || 100
    }
    const response = await this._post('/plugins/list-user', requestBody)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginListItem[]>
    }
    return response
  }

  /**
   * 获取单个插件
   * POST /api/v1/rpa/browser_live_control/plugins/get
   */
  async getPlugin(id: number): Promise<RootObject<PluginDetail>> {
    const response = await this._post('/plugins/get', { id })
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginDetail>
    }
    return response
  }

  /**
   * 注册插件到数据库
   * POST /api/v1/rpa/browser_live_control/plugins/register
   */
  async registerPlugin(data: PluginRegister): Promise<RootObject<PluginCreateResponse>> {
    const response = await this._post('/plugins/register', data)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginCreateResponse>
    }
    return response
  }

  /**
   * 创建插件（兼容旧接口）
   * POST /api/v1/rpa/browser_live_control/plugins/create
   */
  async createPlugin(data: PluginCreate): Promise<RootObject<PluginCreateResponse>> {
    const response = await this._post('/plugins/create', data)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<PluginCreateResponse>
    }
    return response
  }

  /**
   * 更新插件
   * POST /api/v1/rpa/browser_live_control/plugins/update
   */
  async updatePlugin(data: PluginUpdate): Promise<RootObject<string>> {
    const response = await this._post('/plugins/update', data)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<string>
    }
    return response
  }

  /**
   * 删除插件
   * POST /api/v1/rpa/browser_live_control/plugins/delete
   */
  async deletePlugin(id: number): Promise<RootObject<string>> {
    const response = await this._post('/plugins/delete', { id })
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<string>
    }
    return response
  }

  // ===== 工作流管理 =====

  /**
   * 获取用户工作流列表
   * POST /api/v1/rpa/browser_live_control/workflows/list
   */
  async listWorkflows(params?: {
    skip?: number
    limit?: number
  }): Promise<RootObject<WorkflowListItem[]>> {
    const requestBody: WorkflowList = {
      skip: params?.skip || 0,
      limit: params?.limit || 100
    }
    const response = await this._post('/workflows/list', requestBody)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<WorkflowListItem[]>
    }
    return response
  }

  /**
   * 获取单个工作流
   * POST /api/v1/rpa/browser_live_control/workflows/get
   */
  async getWorkflow(id: number): Promise<RootObject<WorkflowDetail>> {
    const response = await this._post('/workflows/get', { id })
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<WorkflowDetail>
    }
    return response
  }

  /**
   * 创建工作流
   * POST /api/v1/rpa/browser_live_control/workflows/create
   */
  async createWorkflow(data: WorkflowCreate): Promise<RootObject<WorkflowCreateResponse>> {
    const response = await this._post('/workflows/create', data)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<WorkflowCreateResponse>
    }
    return response
  }

  /**
   * 更新工作流
   * POST /api/v1/rpa/browser_live_control/workflows/update
   */
  async updateWorkflow(data: WorkflowUpdate): Promise<RootObject<string>> {
    const response = await this._post('/workflows/update', data)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<string>
    }
    return response
  }

  /**
   * 删除工作流
   * POST /api/v1/rpa/browser_live_control/workflows/delete
   */
  async deleteWorkflow(id: number): Promise<RootObject<string>> {
    const response = await this._post('/workflows/delete', { id })
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<string>
    }
    return response
  }

  /**
   * 复制工作流
   * POST /api/v1/rpa/browser_live_control/workflows/duplicate
   */
  async duplicateWorkflow(id: number): Promise<RootObject<WorkflowDuplicateResponse>> {
    const response = await this._post('/workflows/duplicate', { id })
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<WorkflowDuplicateResponse>
    }
    return response
  }

  /**
   * 执行工作流
   * POST /api/v1/rpa/browser_live_control/workflows/execute
   */
  async executeWorkflow(params: {
    browser_id: string
    req: WorkflowExecuteRequest
  }): Promise<RootObject<WorkflowExecuteResponse>> {
    const body = {
      req: params.req,
      body: { browser_id: params.browser_id }
    }
    const response = await this._post('/workflows/execute', body)
    if (response && 'code' in response) {
      return {
        data: response.data,
        msg: response.msg,
        code: response.code
      } as RootObject<WorkflowExecuteResponse>
    }
    return response
  }
}

const browserApi = new BrowserApi()
const browserLiveControlApi = new BrowserLiveControlApiImpl()

export default browserApi
export { browserLiveControlApi }
