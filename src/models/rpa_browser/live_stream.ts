/**
 * 直播（LiveBox）相关模型
 *
 * 供 `LiveBox.vue` 及其拆出的子组件 / composable 共用：
 * 组件之间只传这些模型，不互相依赖内部状态。
 */

/** WebRTC 连接状态（与后端 / 前端 UI 三层共用同一套取值） */
export type LiveWebrtcStatus = 'disconnected' | 'connecting' | 'connected'

/** 观看者连接信息（多观看者并发直播；由会话状态 SSE 下发） */
export interface LiveViewerInfo {
  viewer_id?: string
  stream_key?: string
  page_index?: number
  state?: string
  paused?: boolean
  level?: string
  effective_level?: string
  /** 客户端 IP（由 nginx 写入 x-bili-client-ip；取不到为空） */
  client_ip?: string
  /** 设备描述，如「Windows · Chrome 126」 */
  client_device?: string
  /** 设备类型稳定码：desktop / mobile / tablet（空串=识别不出；文案由前端 i18n 出） */
  client_device_type?: string
  /** 浏览器大版本，如 126（已拼进 client_device，此处供需要单独展示时用） */
  client_browser_version?: string
  /** IP 属地，如「浙江 杭州」（be-message GeoIP 解析；失败为空） */
  client_ip_region?: string
  /** IP 运营商 / ISP，如「中国电信」（与属地同一次 RPC 返回；失败为空） */
  client_ip_isp?: string
  /** 接入时间（Unix 秒） */
  connected_at?: number
}

/** 浏览器标签页（直播工具栏的页签） */
export interface LivePageTab {
  index: number
  title: string
  url?: string
}

/** 清晰度档位下拉项（文案由 i18n 提供，随语言切换刷新） */
export interface LiveQualityOption {
  value: string
  label: string
}

/**
 * 画面覆盖层状态（互斥，同时只可能命中一种）
 *
 * - `suspended`：会话闲置挂起（关流保实例），可一键恢复
 * - `closing`：会话进入待关闭宽限期，可一键续命
 * - `connecting`：建连中（转圈）
 * - `stopped`：已断开（显示「直播已停止」）
 * - `idle`：未开播（显示播放器空态 + 中央播放按钮）
 * - `none`：播放中，不压任何覆盖层
 */
export type LiveOverlayState = 'suspended' | 'closing' | 'connecting' | 'stopped' | 'idle' | 'none'

/** 会话侧状态（来自会话状态 SSE，用于覆盖层与顶栏提示） */
export interface LiveSessionState {
  /** lifecycle=idle：流已被闲置挂起 */
  suspended: boolean
  /** lifecycle=terminating：进入待关闭宽限期 */
  closingSoon: boolean
  /** 闲置秒数（挂起提示用） */
  idleSeconds: number | null
  /** 距关闭的剩余秒数（宽限期倒计时） */
  closingCountdown: number | null
  /** 会话被自动化任务占用（顶栏「任务执行中」） */
  pinned: boolean
}
