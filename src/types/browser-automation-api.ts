// 浏览器自动化 API 类型定义
// 基于 OpenAPI 3.1.0 规范生成

// 基础枚举类型
export type BrowserEnum = 'chrome' | 'Edge' | 'Opera' | 'Vivaldi'
export type PlatformEnum = 'windows' | 'linux' | 'macos'

// 浏览器指纹相关类型定义（基于最新OpenAPI规范）
export interface BrowserFingerprintCreateParams {
  fingerprint_int?: number | null
  is_desktop?: boolean
}

export interface BrowserFingerprintUpsertParams {
  id?: string | null
  fingerprint_int?: number | null
  fingerprint_platform?: string | null
  fingerprint_platform_version?: string | null
  fingerprint_browser?: string | null
  fingerprint_brand_version?: string | null
  fingerprint_hardware_concurrency?: number | null
  fingerprint_gpu_vendor?: string | null
  fingerprint_gpu_renderer?: string | null
  lang?: string | null
  accept_lang?: string | null
  timezone?: string | null
  proxy_server?: string | null
}

export interface BrowserFingerprintQueryParams {
  id: string | number
}
export interface BrowserFingerprintDeleteParams {
  browser_id: string
}
export interface BrowserFingerprintListParams {
  page?: number
  per_page?: number
}
export interface BrowserFingerprintRenameParams {
  id: string | number
  custom_name?: string | null
}

export interface VerifyFingerprintDependsReq {
  browser_id: string
}

export interface BrowserFingerprintCreateResp {
  id: string
  mid: string
  message: string
}

export interface BrowserFingerprintQueryResp extends BaseFingerprintBrowserInitParams {
  id: string
  mid: string
  created_at: string
  updated_at: string
}

export interface BrowserFingerprintDeleteResp {
  id: string
  message: string
  success: boolean
}

// 标准响应类型
export interface StandardResponse<T = any> {
  code: number
  msg?: string
  data?: T | null
}

// 基础分页响应类型
export interface BasePaginationResp<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

// 用户浏览器信息列表响应类型
export interface UserBrowserInfoWithoutPlugin {
  id: string
  mid: string
  fingerprint_int?: number | null
  is_desktop?: boolean
  fingerprint_platform?: PlatformEnum | null
  fingerprint_platform_version?: string | null
  fingerprint_browser?: BrowserEnum | null
  fingerprint_brand_version?: string | null
  fingerprint_hardware_concurrency?: number | null
  fingerprint_gpu_vendor?: string | null
  fingerprint_gpu_renderer?: string | null
  lang?: string | null
  accept_lang?: string | null
  timezone?: string | null
  proxy_server?: string | null
  created_at: string
  updated_at: string
}

// 用户浏览器信息列表响应
export interface UserBrowserInfoListResp {
  items: UserBrowserInfoWithoutPlugin[]
  total: number
  page: number
  per_page: number
}

// 浏览器指纹相关类型定义(这些类型已被BrowserFingerprintUpsertParams等替代)
export interface UserBrowserInfoCreateParams {
  id?: string | null
  fingerprint_int?: number | null
  is_desktop?: boolean
  fingerprint_platform?: PlatformEnum | null
  fingerprint_platform_version?: string | null
  fingerprint_browser?: BrowserEnum | null
  fingerprint_brand_version?: string | null
  fingerprint_hardware_concurrency?: number | null
  fingerprint_gpu_vendor?: string | null
  fingerprint_gpu_renderer?: string | null
  lang?: string | null
  accept_lang?: string | null
  timezone?: string | null
  proxy_server?: string | null
}

export interface BaseFingerprintBrowserInitParams {
  fingerprint_int: number | null
  is_desktop: boolean
  fingerprint_platform: PlatformEnum | null
  fingerprint_platform_version: string | null
  fingerprint_browser: BrowserEnum | null
  fingerprint_brand_version: string | null
  fingerprint_hardware_concurrency: number | null
  fingerprint_gpu_vendor: string | null
  fingerprint_gpu_renderer: string | null
  lang: string | null
  accept_lang: string | null
  timezone: string | null
  proxy_server: string | null
  custom_name?: string | null
  id: number | string
  id_str: string
  mid: number | string
  mid_str: string
  created_at: string
  updated_at: string
}

export interface UserBrowserInfoCreateResp extends BaseFingerprintBrowserInitParams {
  id: string
  mid: string
  created_at: string
  updated_at: string
}

export interface UserBrowserInfoReadParams {
  mid?: string | null
  id: string
}

export interface UserBrowserInfoReadResp extends BaseFingerprintBrowserInitParams {
  id: string
  mid: string
  created_at: string
  updated_at: string
}

export interface UserBrowserInfoUpdateParams {
  id: string
  id_str: string
  fingerprint?: number | null
  fingerprint_platform?: PlatformEnum | null
  fingerprint_platform_version?: string | null
  fingerprint_browser?: BrowserEnum | null
  fingerprint_brand_version?: string | null
  fingerprint_hardware_concurrency?: number | null
  fingerprint_gpu_vendor?: string | null
  fingerprint_gpu_renderer?: string | null
  lang?: string | null
  accept_lang?: string | null
  timezone?: string | null
  proxy_server?: string | null
}

export interface UserBrowserInfoUpdateResp {
  id: string
  message: string
  success: boolean
}

export interface UserBrowserInfoDeleteParams {
  mid?: string | null
  id: string
}

export interface UserBrowserInfoDeleteResp {
  id: string
  message: string
  success: boolean
}

export interface UserBrowserInfoListParams {
  page?: number
  per_page?: number
}

// 认证相关类型已删除(不再在新API中)
// export interface AuthFingerprintResp { ... }
// export interface VerifyFingerprintResp { ... }

// 通知配置相关类型定义
export interface NotificationConfigCreate {
  browser_id?: string | null
  created_at?: string
  updated_at?: string
  hitokoto?: boolean
  bark_push?: string
  bark_archive?: string
  bark_group?: string
  bark_sound?: string
  bark_icon?: string
  bark_level?: string
  bark_url?: string
  dd_bot_secret?: string
  dd_bot_token?: string
  fskey?: string
  gobot_url?: string
  gobot_qq?: string
  gobot_token?: string
  gotify_url?: string
  gotify_token?: string
  gotify_priority?: number
  igot_push_key?: string
  push_key?: string
  deer_key?: string
  deer_url?: string
  chat_url?: string
  chat_token?: string
  push_plus_token?: string
  push_plus_user?: string
  push_plus_template?: string
  push_plus_channel?: string
  push_plus_webhook?: string
  push_plus_callbackurl?: string
  push_plus_to?: string
  we_plus_bot_token?: string
  we_plus_bot_receiver?: string
  we_plus_bot_version?: string
  qmsg_key?: string
  qmsg_type?: string
  qywx_origin?: string
  qywx_am?: string
  qywx_key?: string
  tg_bot_token?: string
  tg_user_id?: string
  tg_api_host?: string
  tg_proxy_auth?: string
  tg_proxy_host?: string
  tg_proxy_port?: string
  aibotk_key?: string
  aibotk_type?: string
  aibotk_name?: string
  smtp_server?: string
  smtp_port?: string
  smtp_ssl?: string
  smtp_email?: string
  smtp_password?: string
  smtp_name?: string
  pushme_key?: string
  pushme_url?: string
  chronocat_qq?: string
  chronocat_token?: string
  chronocat_url?: string
  webhook_url?: string
  webhook_body?: string
  webhook_headers?: string
  webhook_method?: string
  webhook_content_type?: string
  ntfy_url?: string
  ntfy_topic?: string
  ntfy_priority?: string
  ntfy_token?: string
  ntfy_username?: string
  ntfy_password?: string
  ntfy_actions?: string
  wxpusher_app_token?: string
  wxpusher_topic_ids?: string
  wxpusher_uids?: string
}

export interface NotificationConfigUpdate {
  id: number
  browser_id?: number | null
  created_at?: string
  updated_at?: string
  hitokoto?: boolean
  bark_push?: string
  bark_archive?: string
  bark_group?: string
  bark_sound?: string
  bark_icon?: string
  bark_level?: string
  bark_url?: string
  dd_bot_secret?: string
  dd_bot_token?: string
  fskey?: string
  gobot_url?: string
  gobot_qq?: string
  gobot_token?: string
  gotify_url?: string
  gotify_token?: string
  gotify_priority?: number
  igot_push_key?: string
  push_key?: string
  deer_key?: string
  deer_url?: string
  chat_url?: string
  chat_token?: string
  push_plus_token?: string
  push_plus_user?: string
  push_plus_template?: string
  push_plus_channel?: string
  push_plus_webhook?: string
  push_plus_callbackurl?: string
  push_plus_to?: string
  we_plus_bot_token?: string
  we_plus_bot_receiver?: string
  we_plus_bot_version?: string
  qmsg_key?: string
  qmsg_type?: string
  qywx_origin?: string
  qywx_am?: string
  qywx_key?: string
  tg_bot_token?: string
  tg_user_id?: string
  tg_api_host?: string
  tg_proxy_auth?: string
  tg_proxy_host?: string
  tg_proxy_port?: string
  aibotk_key?: string
  aibotk_type?: string
  aibotk_name?: string
  smtp_server?: string
  smtp_port?: string
  smtp_ssl?: string
  smtp_email?: string
  smtp_password?: string
  smtp_name?: string
  pushme_key?: string
  pushme_url?: string
  chronocat_qq?: string
  chronocat_token?: string
  chronocat_url?: string
  webhook_url?: string
  webhook_body?: string
  webhook_headers?: string
  webhook_method?: string
  webhook_content_type?: string
  ntfy_url?: string
  ntfy_topic?: string
  ntfy_priority?: string
  ntfy_token?: string
  ntfy_username?: string
  ntfy_password?: string
  ntfy_actions?: string
  wxpusher_app_token?: string
  wxpusher_topic_ids?: string
  wxpusher_uids?: string
}

export interface NotificationConfigCreateResp {
  id: number
  message: string
}

export interface NotificationConfigUpdateResp {
  id: number
  message: string
}

export interface NotificationConfigDeleteResp {
  id: number
  message: string
}

export interface NotificationConfigUpsertResp {
  id: number
  message: string
}

export interface NotificationConfig {
  id: number
  browser_id?: number | null
  created_at?: string
  updated_at?: string
  hitokoto?: boolean
  bark_push?: string
  bark_archive?: string
  bark_group?: string
  bark_sound?: string
  bark_icon?: string
  bark_level?: string
  bark_url?: string
  dd_bot_secret?: string
  dd_bot_token?: string
  fskey?: string
  gobot_url?: string
  gobot_qq?: string
  gobot_token?: string
  gotify_url?: string
  gotify_token?: string
  gotify_priority?: number
  igot_push_key?: string
  push_key?: string
  deer_key?: string
  deer_url?: string
  chat_url?: string
  chat_token?: string
  push_plus_token?: string
  push_plus_user?: string
  push_plus_template?: string
  push_plus_channel?: string
  push_plus_webhook?: string
  push_plus_callbackurl?: string
  push_plus_to?: string
  we_plus_bot_token?: string
  we_plus_bot_receiver?: string
  we_plus_bot_version?: string
  qmsg_key?: string
  qmsg_type?: string
  qywx_origin?: string
  qywx_am?: string
  qywx_key?: string
  tg_bot_token?: string
  tg_user_id?: string
  tg_api_host?: string
  tg_proxy_auth?: string
  tg_proxy_host?: string
  tg_proxy_port?: string
  aibotk_key?: string
  aibotk_type?: string
  aibotk_name?: string
  smtp_server?: string
  smtp_port?: string
  smtp_ssl?: string
  smtp_email?: string
  smtp_password?: string
  smtp_name?: string
  pushme_key?: string
  pushme_url?: string
  chronocat_qq?: string
  chronocat_token?: string
  chronocat_url?: string
  webhook_url?: string
  webhook_body?: string
  webhook_headers?: string
  webhook_method?: string
  webhook_content_type?: string
  ntfy_url?: string
  ntfy_topic?: string
  ntfy_priority?: string
  ntfy_token?: string
  ntfy_username?: string
  ntfy_password?: string
  ntfy_actions?: string
  wxpusher_app_token?: string
  wxpusher_topic_ids?: string
  wxpusher_uids?: string
}

// 有效通知配置响应类型(已删除,不在新API中)
// export interface NotificationConfigEffectiveResp { ... }

// 错误验证类型
export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface HTTPValidationError {
  detail: ValidationError[]
}

// 测试通知相关类型
export interface TestNotificationRequest {
  title?: string
  content?: string
  browser_id?: string | null
}

export interface TestNotificationResponse {
  success: boolean
  message: string
  sent_channels: string[]
  failed_channels: string[]
  results?: Record<string, {
    success: boolean
    message?: string
  }>
}

// WebRTC相关类型
export interface WebRTCOfferRequest {
  browser_id: number
}

export interface WebRTCOfferResponse {
  success: boolean
  sdp?: string
  message?: string
}

export interface WebRTCAnswerRequest {
  browser_id: string
  sdp: string
}

export interface WebRTCAnswerResponse {
  success: boolean
  message?: string
}

export interface WebRTCIceCandidateRequest {
  candidate: Record<string, any>
}

export interface WebRTCIceCandidateResponse {
  success: boolean
  message?: string
}

export interface WebRTCConnectionStatusResponse {
  success: boolean
  connected: boolean
  state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'
  message?: string
}

export interface WebRTCCloseConnectionRequest {
  browser_id: number
}

export interface WebRTCCloseConnectionResponse {
  success: boolean
  message?: string
}

// SystemHealthCheckResponse 和 SystemCleanupResponse 已在前面定义

// 浏览器实时控制相关类型定义

// 心跳请求参数
export interface HeartbeatRequest {
  client_id: string
  timestamp: number
}

// 心跳响应
export interface HeartbeatResponse {
  next_interval: number
  status: string
  message?: string
}

// 人工操作请求参数
export interface ManualOperationRequest {
  operation_type: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  reason?: string
}

// 自动化恢复请求参数
export interface AutomationResumeRequest {
  force?: boolean
  reason?: string
}

// 视频流相关类型定义

// 视频流启动参数
export interface VideoStreamStartParams {
  fps?: number // 帧率 (1-30)
  quality?: number // 图片质量 (1-100)
  scale?: number // 缩放比例
  width?: number | null // 宽度 (像素)
  height?: number | null // 高度 (像素)
  full_page?: boolean // 是否全页截图
}

// 视频流响应
export interface VideoStreamResponse {
  success: boolean
  message: string
  stream_url?: string
  port?: number
  fps?: number
  quality?: number
}

// 视频流状态
export interface VideoStreamStatus {
  is_streaming: boolean
  fps?: number
  quality?: number
  connected_clients?: number
  last_update?: string
  stream_url?: string
  port?: number
}

// JavaScript交互相关类型定义

// 浏览器点击操作参数
export interface BrowserClickParams {
  x: number // 点击位置 X 坐标（相对坐标 0-1）
  y: number // 点击位置 Y 坐标（相对坐标 0-1）
  button?: 'left' | 'right' | 'middle' // 鼠标按钮
  double?: boolean // 是否双击
  wait_after?: number // 点击后等待时间（毫秒）
}

// JavaScript代码执行参数
export interface JavaScriptExecuteParams {
  code: string // 要执行的JavaScript代码
  timeout?: number // 超时时间（毫秒）
  await_result?: boolean // 是否等待结果
}

// JavaScript代码执行响应
export interface JavaScriptExecuteResponse {
  success: boolean
  result?: any // 执行结果
  error?: string // 错误信息
  execution_time?: number // 执行耗时（毫秒）
}

// 浏览器操作响应
export interface BrowserActionResponse {
  success: boolean
  message: string
  screenshot_before?: string // 操作前截图URL
  screenshot_after?: string // 操作后截图URL
  element_info?: {
    tag_name?: string
    text?: string
    attributes?: Record<string, string>
  }
}

// 安全检查相关类型定义

// 安全检查参数
export interface SecurityCheckParams {
  code: string // 要检查的JavaScript代码
  strict_mode?: boolean // 是否启用严格模式
  timeout?: number // 检查超时时间
}

// 安全检查结果
export interface SecurityCheckResult {
  level: 'low' | 'medium' | 'high' // 风险等级
  score: number // 安全评分 (0-100)
  risks: SecurityRisk[] // 检测到的风险
  allowed_operations: string[] // 允许的操作
  blocked_operations: string[] // 禁止的操作
  execution_time?: number // 检查耗时
  suggestions?: string[] // 安全建议
}

// 安全风险项
export interface SecurityRisk {
  type: string // 风险类型
  level: 'low' | 'medium' | 'high' // 风险等级
  title: string // 风险标题
  description: string // 风险描述
  suggestion?: string // 修复建议
  line?: number // 所在行号
  column?: number // 所在列号
  pattern?: string // 匹配的模式
}

// 截图参数
export interface ScreenshotParams {
  quality?: number
  format?: 'jpeg' | 'png'
}

// ===== 浏览器会话管理相关类型定义 =====

// 清理策略
export interface BrowserCleanupPolicy {
  max_idle_time?: number // 最大闲置时间（秒）
  max_no_heartbeat_time?: number // 最大无心跳时间（秒）
  cleanup_interval?: number // 清理检查间隔（秒）
}

// 创建会话请求
export interface CreateSessionRequest {
  headless?: boolean // 是否无头模式
  auto_cleanup?: boolean // 是否启用自动清理
  cleanup_policy?: BrowserCleanupPolicy | null // 清理策略
  expiration_time?: number | null // 会话过期时间（秒）
}

// 创建会话响应
export interface CreateSessionResponse {
  success: boolean
  message: string
  session_id?: string
  browser_id?: number
  websocket_url?: string
  stream_url?: string
  browser_started?: boolean // 浏览器是否已启动
  created_at?: number // 创建时间戳
  expires_at?: number // 过期时间戳
}

// 会话生命周期状态
export type SessionLifecycleStatus =
  | 'initializing'
  | 'running'
  | 'paused'
  | 'pending' // 等待后台任务完成
  | 'stopping'
  | 'stopped'
  | 'error'

// 浏览器会话状态
export interface BrowserSessionStatus {
  session_id: string
  browser_id: number
  lifecycle_status: SessionLifecycleStatus
  is_running: boolean
  is_active: boolean
  created_at: string
  last_heartbeat?: string
  expiration_time?: string
  connected_clients: number
  manual_operation: boolean
  operation_priority?: string
  video_stream_active: boolean
  stream_url?: string
  current_url?: string
  headless: boolean
  cleanup_policy?: BrowserCleanupPolicy
}

// 会话状态响应（兼容旧API）
export interface SessionStatusResponse {
  session_exists: boolean
  browser_running: boolean
  lifecycle_state: string
  last_heartbeat: number
  active_connections: number
  video_streaming: boolean
  manual_mode: boolean
  created_at: number
  expires_at: number
}

// 浏览器状态
export interface BrowserStatus {
  browser_id: number
  is_running: boolean
  status: 'unknown' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  session_count: number
  connected_clients: number
  video_stream_active: boolean
  manual_operation_active: boolean
  last_activity?: string
}

// 浏览器信息
export interface BrowserInfo {
  browser_id: number
  fingerprint_id: number
  user_id: string
  browser_type: BrowserEnum
  platform: PlatformEnum
  headless: boolean
  is_running: boolean
  created_at: string
  last_used?: string
}

// 操作优先级
export type OperationPriority = 'low' | 'normal' | 'high' | 'critical'

// ===== 新增OpenAPI规范中的类型定义 =====

// 浏览器依赖验证请求
export interface VerifyBrowserDependsReq {
  browser_id: string
}

// 通知配置读取请求
export interface NotifyConfigReadRequest {
  browser_id?: string | null
}

// 浏览器有效通知请求
export interface BrowserEffectiveNotifyRequest {
  browser_id: string
}

// 简化版请求类型
export interface SimplifiedHeartbeatRequest {
  client_id: string
  timestamp: number
}

export interface SimplifiedCreateSessionRequest {
  headless?: boolean
  auto_cleanup?: boolean
  cleanup_policy?: BrowserCleanupPolicy | null
  expiration_time?: number | null
}

export interface SimplifiedManualOperationRequest {
  operation_type: string
  priority?: OperationPriority
  reason?: string | null
  estimated_duration?: number | null
}

export interface SimplifiedAutomationResumeRequest {
  force?: boolean
  reason?: string | null
}

export interface SimplifiedBrowserClickRequest {
  x: number
  y: number
  button?: string
  double?: boolean
  wait_after?: number
}

export interface SimplifiedJavaScriptExecuteRequest {
  code: string
}

export interface SimplifiedJavaScriptExecuteWithParamsRequest {
  code: string
  timeout?: number
}

export interface SimplifiedNavigateRequest {
  url: string
}

export interface SimplifiedScreenshotRequest {
  quality?: number
}

export interface SimplifiedVideoStreamMjpegRequest {
  // 无参数
}

export interface SimplifiedPausePluginsRequest {
  // 无参数
}

export interface SimplifiedForceReleaseRequest {
  // 无参数
}

export interface SimplifiedBrowserCleanupPolicyRequest {
  policy: BrowserCleanupPolicy
}

export interface SimplifiedLiveControlCommand {
  type: string
  params: Record<string, any>
  timestamp: number
  priority?: OperationPriority
  require_manual_mode?: boolean
  interrupt_automation?: boolean
}

// 组合请求体类型
export interface Body_send_heartbeat_api_v1_rpa_browser_live_control_browser_heartbeat_post {
  request: SimplifiedHeartbeatRequest
  body: VerifyBrowserDependsReq
}

export interface Body_create_browser_session_api_v1_rpa_browser_live_control_browser_session_create_post {
  request: SimplifiedCreateSessionRequest
  body: VerifyBrowserDependsReq
}

// Body_start_manual_operation 已删除(不再在新API中)
// export interface Body_start_manual_operation_api_v1_rpa_browser_live_control_browser_manual_start_post { ... }

export interface Body_stop_manual_operation_api_v1_rpa_browser_live_control_browser_manual_stop_post {
  request: SimplifiedAutomationResumeRequest
  body: VerifyBrowserDependsReq
}

export interface Body_browser_click_api_v1_rpa_browser_live_control_browser_click_post {
  request: SimplifiedBrowserClickRequest
  body: VerifyBrowserDependsReq
}

export interface Body_execute_browser_command_api_v1_rpa_browser_live_control_browser_control_post {
  command: SimplifiedLiveControlCommand
  body: VerifyBrowserDependsReq
}

export interface Body_execute_javascript_code_api_v1_rpa_browser_live_control_browser_execute_post {
  request: SimplifiedJavaScriptExecuteWithParamsRequest
  body: VerifyBrowserDependsReq
}

export interface Body_safe_execute_javascript_api_v1_rpa_browser_live_control_browser_safe_execute_post {
  request: SimplifiedJavaScriptExecuteWithParamsRequest
  body: VerifyBrowserDependsReq
}

export interface Body_evaluate_javascript_api_v1_rpa_browser_live_control_browser_evaluate_post {
  request: SimplifiedJavaScriptExecuteRequest
  body: VerifyBrowserDependsReq
}

export interface Body_force_release_browser_api_v1_rpa_browser_live_control_browser_force_release_post {
  request: SimplifiedForceReleaseRequest
  body: VerifyBrowserDependsReq
}

export interface Body_get_screenshot_api_v1_rpa_browser_live_control_stream_screenshot_post {
  request: SimplifiedScreenshotRequest
  body: VerifyBrowserDependsReq
}

export interface Body_navigate_to_url_api_v1_rpa_browser_live_control_browser_navigate_post {
  request: SimplifiedNavigateRequest
  body: VerifyBrowserDependsReq
}

export interface Body_pause_plugins_api_v1_rpa_browser_live_control_browser_plugins_pause_post {
  request: SimplifiedPausePluginsRequest
  body: VerifyBrowserDependsReq
}

export interface Body_set_cleanup_policy_api_v1_rpa_browser_live_control_browser_cleanup_policy_post {
  request: SimplifiedBrowserCleanupPolicyRequest
  body: VerifyBrowserDependsReq
}

// Body_video_stream_h264_api_v1_rpa_browser_live_control_stream_mjpeg_post 已删除
// export interface Body_video_stream_h264_api_v1_rpa_browser_live_control_stream_mjpeg_post { ... }

// ===== 新增WebRTC相关请求类型 =====
export interface NotificationConfigEffectiveResp {
  hitokoto?: boolean
  bark_push?: string
  bark_archive?: string
  bark_group?: string
  bark_sound?: string
  bark_icon?: string
  bark_level?: string
  bark_url?: string
  dd_bot_secret?: string
  dd_bot_token?: string
  fskey?: string
  gobot_url?: string
  gobot_qq?: string
  gobot_token?: string
  gotify_url?: string
  gotify_token?: string
  gotify_priority?: number
  igot_push_key?: string
  push_key?: string
  deer_key?: string
  deer_url?: string
  chat_url?: string
  chat_token?: string
  push_plus_token?: string
  push_plus_user?: string
  push_plus_template?: string
  push_plus_channel?: string
  push_plus_webhook?: string
  push_plus_callbackurl?: string
  push_plus_to?: string
  we_plus_bot_token?: string
  we_plus_bot_receiver?: string
  we_plus_bot_version?: string
  qmsg_key?: string
  qmsg_type?: string
  qywx_origin?: string
  qywx_am?: string
  qywx_key?: string
  tg_bot_token?: string
  tg_user_id?: string
  tg_api_host?: string
  tg_proxy_auth?: string
  tg_proxy_host?: string
  tg_proxy_port?: string
  aibotk_key?: string
  aibotk_type?: string
  aibotk_name?: string
  smtp_server?: string
  smtp_port?: string
  smtp_ssl?: string
  smtp_email?: string
  smtp_password?: string
  smtp_name?: string
  pushme_key?: string
  pushme_url?: string
  chronocat_qq?: string
  chronocat_token?: string
  chronocat_url?: string
  webhook_url?: string
  webhook_body?: string
  webhook_headers?: string
  webhook_method?: string
  webhook_content_type?: string
  ntfy_url?: string
  ntfy_topic?: string
  ntfy_priority?: string
  ntfy_token?: string
  ntfy_username?: string
  ntfy_password?: string
  ntfy_actions?: string
  wxpusher_app_token?: string
  wxpusher_topic_ids?: string
  wxpusher_uids?: string
  browser_id?: number | null
  config_source: 'browser' | 'global'
}

// 响应类型
export interface ClickResponse {
  success: boolean
  message: string
  x?: number
  y?: number
  button?: string
  timestamp?: number
}

export interface ExecuteJsResponse {
  success: boolean
  result?: any
  error?: string
  execution_time?: number
}

export interface RPAResponse {
  success: boolean
  data?: any
  message?: string
  command_type?: string
  execution_time?: number
}

export interface ManualOperationResponse {
  success: boolean
  operation_id?: string
  start_time?: string
  priority?: OperationPriority
  reason?: string
  estimated_duration?: number
}

export interface AutomationResumeResponse {
  success: boolean
  resume_time?: string
  force?: boolean
  reason?: string
}

export interface PluginStatusResponse {
  success: boolean
  paused: boolean
  plugin_count?: number
  active_plugins?: string[]
  paused_time?: string
}

export interface BrowserInfoResponse {
  success: boolean
  browser_info?: {
    browser_id: number
    status: string
    pages: Array<{
      id: string
      url: string
      title: string
    }>
    plugins: string[]
    capabilities: string[]
  }
  session_count?: number
}

export interface VideoStreamStatusResponse {
  success: boolean
  is_streaming: boolean
  stream_url?: string
  format?: string
  fps?: number
  resolution?: {
    width: number
    height: number
  }
  connected_clients?: number
  start_time?: string
}

export interface CleanupPolicyResponse {
  success: boolean
  policy?: BrowserCleanupPolicy
  browser_id?: string
  applied_time?: string
}

export interface ForceReleaseResponse {
  success: boolean
  browser_id?: string
  release_time?: string
  force_released?: boolean
  cleaned_resources?: string[]
}

export interface SystemStatisticsResponse {
  success: boolean
  total_sessions?: number
  active_sessions?: number
  total_browsers?: number
  running_browsers?: number
  system_uptime?: number
  memory_usage?: {
    used: number
    total: number
    percentage: number
  }
  cpu_usage?: number
}

export interface SystemHealthCheckResponse {
  success: boolean
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks?: Array<{
    name: string
    status: 'pass' | 'fail' | 'warn'
    message?: string
    response_time?: number
  }>
  timestamp?: string
}

// ===== 自定义操作相关类型 =====

export interface ActionMetadataResponse {
  id: string
  name: string
  type: string
  description: string
  parameters: Array<{
    name: string
    type: string
    required: boolean
    default?: any
    description?: string
  }>
}

export interface ActionResultResponse {
  success: boolean
  data?: any
  error?: string | null
  execution_time?: number
  action_id?: string
  action_name?: string
}

export interface ActionPreviewResponse {
  action_id: string
  action_name: string
  is_composite: boolean
  steps_preview: Array<{
    step_index: number
    action_id: string
    original_params: Record<string, any>
    replaced_params: Record<string, any>
  }>
  found_params: string[]
}

export interface ActionValidateResponse {
  valid: boolean
  action_id: string
  action_name: string
  missing_params: string[]
  invalid_params: string[]
  errors: string[]
}

export interface ExecuteStepResponse {
  step_index: number
  action_id: string
  action_name: string
  result: {
    success: boolean
    data?: any
    error?: string | null
    execution_time?: number
    action_id?: string
    action_name?: string
  }
}

export interface CustomActionListItem {
  id: number
  action_id: string
  name: string
  action_type: string
  is_composite: boolean
  description: string
  created_at: string
  updated_at: string
}

export interface CustomActionDetail {
  id: number
  action_id: string
  name: string
  action_type: string
  parameters_schema: Array<Record<string, any>>
  steps: Array<Record<string, any>>
  is_composite: boolean
  code?: string | null
  description: string
  timeout?: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CustomActionCreateResponse {
  id: number
  action_id: string
  message: string
}

export interface ReloadActionsResponse {
  success: boolean
  message: string
  reloaded_count?: number
}

// ===== 插件相关类型 =====

export interface PluginMetadataResponse {
  id: string
  name: string
  hooks: string[]
  description: string
}

export interface PluginListItem {
  id: number
  plugin_id: string
  name: string
  hooks: string[]
  description: string
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface PluginDetail {
  id: number
  plugin_id: string
  name: string
  hooks: string[]
  code?: string | null
  description: string
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface PluginCreateResponse {
  id: number
  plugin_id: string
  message: string
}

// ===== 工作流相关类型 =====

export interface WorkflowListItem {
  id: number
  workflow_id: string
  name: string
  description: string
  step_count: number
  tags: string[]
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowDetail {
  id: number
  workflow_id: string
  name: string
  steps: Array<Record<string, any>>
  on_error: string
  description: string
  tags: string[]
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowCreateResponse {
  id: number
  workflow_id: string
  message: string
}

export interface WorkflowDuplicateResponse {
  id: number
  workflow_id: string
  message: string
}

export interface WorkflowExecuteResponse {
  success: boolean
  workflow_id: string
  execution_id?: string
  results?: Array<{
    step_index: number
    action_id: string
    success: boolean
    data?: any
    error?: string | null
    execution_time?: number
  }>
  total_time?: number
  error?: string | null
}

// ===== 请求体类型 =====

export interface ActionExecuteRequest {
  action_id: string
  params?: Record<string, any>
  plugin_ids?: string[]
}

export interface ActionPreviewRequest {
  action_id: string
  params?: Record<string, any>
}

export interface ActionValidateRequest {
  action_id: string
  params?: Record<string, any>
}

export interface ExecuteStepRequest {
  action_id: string
  params?: Record<string, any>
  step_index?: number
  plugin_ids?: string[]
}

export interface BatchActionRequest {
  actions: ActionExecuteRequest[]
  parallel?: boolean
}

export interface CustomActionCreate {
  action_id: string
  name: string
  action_type?: string
  parameters_schema?: Array<Record<string, any>>
  steps?: Array<Record<string, any>>
  is_composite?: boolean
  code?: string | null
  description?: string
}

export interface CustomActionUpdate {
  id: number
  name?: string | null
  description?: string | null
  parameters_schema?: Array<Record<string, any>> | null
  steps?: Array<Record<string, any>> | null
  is_composite?: boolean | null
  code?: string | null
  timeout?: number | null
  is_enabled?: boolean | null
}

export interface CustomActionGet {
  id: number
}

export interface CustomActionDelete {
  id: number
}

export interface CustomActionList {
  skip?: number
  limit?: number
}

export interface PluginCreate {
  plugin_id: string
  name: string
  hooks: string[]
  code?: string | null
  description?: string
}

export interface PluginRegister {
  plugin_id: string
  name: string
  hooks: string[]
  code?: string | null
  description?: string
}

export interface PluginUpdate {
  id: number
  name?: string | null
  description?: string | null
  hooks?: string[] | null
  code?: string | null
  priority?: number | null
  is_enabled?: boolean | null
}

export interface PluginGet {
  id: number
}

export interface PluginDelete {
  id: number
}

export interface PluginList {
  skip?: number
  limit?: number
}

// 新增的插件管理请求类型（与后端 API 同步）
export interface PluginGetRequest {
  plugin_type: string // 插件类型: log, page_limit, random_wait, retry
  browser_info_id?: string | number | null // 浏览器实例ID
}

export interface PluginListRequest {
  browser_info_id?: string | number | null // 浏览器实例ID
}

export interface PluginDeleteRequest {
  plugin_id: string // 插件ID
}

export interface WorkflowCreate {
  workflow_id: string
  name: string
  steps: Array<Record<string, any>>
  on_error?: string
  description?: string
}

export interface WorkflowUpdate {
  id: number
  name?: string | null
  description?: string | null
  steps?: Array<Record<string, any>> | null
  on_error?: string | null
  tags?: string[] | null
  is_enabled?: boolean | null
}

export interface WorkflowGet {
  id: number
}

export interface WorkflowDelete {
  id: number
}

export interface WorkflowList {
  skip?: number
  limit?: number
}

export interface WorkflowExecuteRequest {
  steps: Array<Record<string, any>>
  plugin_ids?: string[]
  on_error?: string
}

// ===== 新增的API请求体类型（与新后端API结构匹配）=====

// ID请求类型
export interface IdRequest {
  id: number
}

// ID列表请求类型（用于分页列表查询）
export interface IdListRequest {
  skip?: number
  limit?: number
}

// 自定义操作创建请求
export interface CustomActionCreateRequest {
  name: string
  action_type?: string
  description?: string
  parameters_schema?: Array<Record<string, any>>
  steps?: Array<Record<string, any>>
  tags?: string[]
  user_data?: Record<string, any> | null
  code?: string | null
}

// 自定义操作更新请求
export interface CustomActionUpdateRequest {
  id: number
  name?: string | null
  description?: string | null
  parameters_schema?: Array<Record<string, any>> | null
  steps?: Array<Record<string, any>> | null
  tags?: string[] | null
  user_data?: Record<string, any> | null
  code?: string | null
  is_enabled?: boolean | null
}

// 插件创建请求
export interface PluginCreateRequest {
  plugin_id: string
  name: string
  hooks: string[]
  code?: string | null
  description?: string
  priority?: number
  is_enabled?: boolean
}

// 插件更新请求
export interface PluginUpdateRequest {
  id: number
  name?: string | null
  description?: string | null
  hooks?: string[] | null
  code?: string | null
  priority?: number | null
  is_enabled?: boolean | null
}

// 工作流创建请求
export interface WorkflowCreateRequest {
  workflow_id: string
  name: string
  steps: Array<Record<string, any>>
  on_error?: string
  description?: string
  tags?: string[]
}

// 工作流更新请求
export interface WorkflowUpdateRequest {
  id: number
  name?: string | null
  description?: string | null
  steps?: Array<Record<string, any>> | null
  on_error?: string | null
  tags?: string[] | null
  is_enabled?: boolean | null
}

// 组合请求体类型（与新后端API结构匹配）

// 发送心跳请求体
export interface BodySendHeartbeatRequest {
  request: SimplifiedHeartbeatRequest
  body: VerifyBrowserDependsReq
}

// 创建浏览器会话请求体
export interface BodyCreateBrowserSessionRequest {
  request: SimplifiedCreateSessionRequest
  body: VerifyBrowserDependsReq
}

// 停止人工操作请求体
export interface BodyStopManualOperationRequest {
  request: SimplifiedAutomationResumeRequest
  body: VerifyBrowserDependsReq
}

// 获取截图请求体
export interface BodyGetScreenshotRequest {
  request: SimplifiedScreenshotRequest
  body: VerifyBrowserDependsReq
}

// 执行JavaScript代码请求体
export interface BodyExecuteJavaScriptCodeRequest {
  request: SimplifiedJavaScriptExecuteWithParamsRequest
  body: VerifyBrowserDependsReq
}

// 安全执行JavaScript代码请求体
export interface BodySafeExecuteJavaScriptRequest {
  request: SimplifiedJavaScriptExecuteWithParamsRequest
  body: VerifyBrowserDependsReq
}

// 浏览器点击请求体
export interface BodyBrowserClickRequest {
  request: SimplifiedBrowserClickRequest
  body: VerifyBrowserDependsReq
}

// 执行浏览器命令请求体
export interface BodyExecuteBrowserCommandRequest {
  command: SimplifiedLiveControlCommand
  body: VerifyBrowserDependsReq
}

// 评估JavaScript请求体
export interface BodyEvaluateJavaScriptRequest {
  request: SimplifiedJavaScriptExecuteRequest
  body: VerifyBrowserDependsReq
}

// 导航到URL请求体
export interface BodyNavigateToUrlRequest {
  request: SimplifiedNavigateRequest
  body: VerifyBrowserDependsReq
}

// 暂停插件请求体
export interface BodyPausePluginsRequest {
  request: SimplifiedPausePluginsRequest
  body: VerifyBrowserDependsReq
}

// 强制释放浏览器请求体
export interface BodyForceReleaseBrowserRequest {
  request: SimplifiedForceReleaseRequest
  body: VerifyBrowserDependsReq
}

// 设置清理策略请求体
export interface BodySetCleanupPolicyRequest {
  request: SimplifiedBrowserCleanupPolicyRequest
  body: VerifyBrowserDependsReq
}

// 执行操作请求体
export interface BodyExecuteActionRequest {
  req: ActionExecuteRequest
  body: VerifyBrowserDependsReq
}

// 批量执行请求体
export interface BodyBatchExecuteRequest {
  req: BatchActionRequest
  body: VerifyBrowserDependsReq
}

// 预览操作参数请求体
export interface BodyPreviewActionParamsRequest {
  req: ActionPreviewRequest
  body: VerifyBrowserDependsReq
}

// 验证操作参数请求体
export interface BodyValidateActionParamsRequest {
  req: ActionValidateRequest
  body: VerifyBrowserDependsReq
}

// 单步执行请求体
export interface BodyExecuteActionStepRequest {
  req: ExecuteStepRequest
  body: VerifyBrowserDependsReq
}

// 执行工作流请求体
export interface BodyExecuteWorkflowRequest {
  req: WorkflowExecuteRequest
  body: VerifyBrowserDependsReq
}

// 设置清理策略请求体 (注意：OpenAPI中为 system_cleanup_post，但逻辑上是 cleanup policy)
export interface BodySetCleanupPolicyRequest {
  request: SimplifiedBrowserCleanupPolicyRequest
  body: VerifyBrowserDependsReq
}

// WebRTC ICE Candidate请求体
export interface BodyAddWebrtcIceCandidateRequest {
  request: WebRTCIceCandidateRequest
  body: VerifyBrowserDependsReq
}

// 设置WebRTC Answer请求体
export interface BodySetWebrtcAnswerRequest {
  request: WebRTCAnswerRequest
  body: VerifyBrowserDependsReq
}

// ===== 响应类型扩展 =====

// 管理员所有会话响应
export interface AdminAllSessionsResponse {
  sessions: Array<{
    browser_id: string
    session_id: string
    status: string
    created_at: string
  }>
}

// 管理员所有流响应
export interface AdminAllStreamsResponse {
  streams: Array<{
    browser_id: string
    stream_url: string
    status: string
  }>
}

// 管理员所有统计响应
export interface AdminAllStatsResponse {
  total_sessions: number
  active_sessions: number
  total_browsers: number
  running_browsers: number
}

// 权限配置列表
export interface PermissionConfigList {
  permissions: Array<{
    mid: string
    level: string
    updated_at: string
  }>
}

// 权限级别配置
export interface PermissionLevelConfig {
  level: string
  description: string
}

// 测试通知响应
export interface TestNotificationResponse {
  success: boolean
  message: string
  sent_channels: string[]
  failed_channels: string[]
  results?: Record<string, {
    success: boolean
    message?: string
  }>
}

// WebRTC相关响应类型
export interface WebRTCOfferResponse {
  success: boolean
  sdp?: string
  message?: string
}

export interface WebRTCAnswerResponse {
  success: boolean
  message?: string
}

export interface WebRTCIceCandidateResponse {
  success: boolean
  message?: string
}

export interface WebRTCGetIceCandidatesResponse {
  success: boolean
  candidates: Array<{
    candidate?: string
    sdpMid?: string | null
    sdpMLineIndex?: number | null
  }>
  ice_gathering_state?: string
}

export interface WebRTCConnectionStatusResponse {
  success: boolean
  connected: boolean
  state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'
  message?: string
}

export interface WebRTCCloseConnectionResponse {
  success: boolean
  message?: string
}

// 系统清理响应
export interface SystemCleanupResponse {
  success: boolean
  message: string
  cleaned_count?: number
}

// 重命名指纹响应
export interface BrowserFingerprintRenameResp {
  id: string
  message: string
  success: boolean
}

// 自定义操作列表项响应
export interface CustomActionListItemResponse {
  id: number
  action_id: string
  name: string
  action_type: string
  is_composite: boolean
  description: string
  tags: string[]
  created_at: string
  updated_at: string
}

// 自定义操作详情响应
export interface CustomActionDetailResponse {
  id: number
  action_id: string
  name: string
  action_type: string
  parameters_schema: Array<Record<string, any>>
  steps: Array<Record<string, any>>
  is_composite: boolean
  code?: string | null
  description: string
  tags: string[]
  timeout?: number
  is_enabled: boolean
  user_data?: Record<string, any> | null
  created_at: string
  updated_at: string
}

// 插件列表项响应
export interface PluginListItemResponse {
  id: number
  plugin_id: string
  name: string
  hooks: string[]
  description: string
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// 插件详情响应
export interface PluginDetailResponse {
  id: number
  plugin_id: string
  name: string
  hooks: string[]
  code?: string | null
  description: string
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// 插件字典响应
export interface PluginDictResponse {
  [key: string]: any
}

// 插件响应
export interface PluginResponse {
  id: number
  plugin_id: string
  name: string
  hooks: string[]
  code?: string | null
  description: string
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// 工作流列表项响应
export interface WorkflowListItemResponse {
  id: number
  workflow_id: string
  name: string
  description: string
  step_count: number
  tags: string[]
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// 工作流详情响应
export interface WorkflowDetailResponse {
  id: number
  workflow_id: string
  name: string
  steps: Array<Record<string, any>>
  on_error: string
  description: string
  tags: string[]
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// ===== 浏览器默认设置管理相关类型 =====

// 日志插件日志级别枚举
export type LogPluginLogLevelEnum = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

// 用户浏览器默认设置请求模型
export interface UserBrowserDefaultSettingRequest {
  default_proxy_server?: string | null
  default_log_level?: LogPluginLogLevelEnum | null
  default_max_pages?: number | null
  default_retry_times?: number | null
  default_retry_delay?: number | null
  default_min_wait?: number | null
  default_max_wait?: number | null
  default_platform?: PlatformEnum | null
  default_browser?: BrowserEnum | null
  default_lang?: string | null
  default_timezone?: string | null
  default_viewport_width?: number | null
  default_viewport_height?: number | null
  default_timeout?: number | null
  default_headless?: boolean | null
}

// 用户浏览器默认设置响应模型
export interface UserBrowserDefaultSettingResponse {
  id: number
  mid: string
  default_proxy_server?: string | null
  default_log_level?: LogPluginLogLevelEnum | null
  default_max_pages?: number | null
  default_retry_times?: number | null
  default_retry_delay?: number | null
  default_min_wait?: number | null
  default_max_wait?: number | null
  default_platform?: PlatformEnum | null
  default_browser?: BrowserEnum | null
  default_lang?: string | null
  default_timezone?: string | null
  default_viewport_width?: number | null
  default_viewport_height?: number | null
  default_timeout?: number | null
  default_headless?: boolean | null
  created_at: string
  updated_at: string
}

// 获取默认设置请求（占位符）
export interface GetSettingsRequest {
  // 无参数，但后端要求非空对象
}

// 删除默认设置请求（占位符）
export interface DeleteSettingsRequest {
  // 无参数，但后端要求非空对象
}

// 应用默认设置请求
export interface ApplySettingsRequest {
  browser_id: number
}
