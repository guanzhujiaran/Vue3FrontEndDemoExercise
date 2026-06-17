import { SessionLifecycleState } from './session_state'

/**
 * 浏览器会话状态响应
 * 
 * 对应后端 BrowserSessionStatus 模型
 */
export interface BrowserSessionStatus {
  session_exists: boolean
  browser_running: boolean
  lifecycle_state: SessionLifecycleState
  active_connections: number
  video_streaming: boolean
  manual_mode: boolean
  created_at: number
  expires_at?: number
}

/**
 * 浏览器会话状态数据
 * 
 * 对应后端 BrowserSessionStatusData 模型
 */
export interface BrowserSessionStatusData extends BrowserSessionStatus {
  status: string
  cleanup_policy: BrowserCleanupPolicy
  message: string
  screen_width: number
  screen_height: number
  viewport_width: number
  viewport_height: number
}

/**
 * 浏览器清理策略
 * 
 * 对应后端 BrowserCleanupPolicy 模型
 */
export interface BrowserCleanupPolicy {
  max_idle_time: number
  cleanup_interval: number
}

/**
 * 创建会话响应
 * 
 * 对应后端 CreateSessionResponse 模型
 */
export interface CreateSessionResponse {
  success: boolean
  session_id: string
  browser_started: boolean
  created_at: number
  expires_at?: number
  message?: string
}

/**
 * 关闭会话响应
 * 
 * 对应后端 CloseSessionResponse 模型
 */
export interface CloseSessionResponse {
  success: boolean
  session_id: string
  browser_id: number
  mid: number
  closed_at: number
  message: string
}
