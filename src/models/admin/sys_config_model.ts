/**
 * 运行时系统配置（be-message `msg_sys_config`）的前端类型定义（2.64.0）。
 *
 * 与后端 `be-message-service/app/models/schemas/sys_config.py` 一一对应：
 * - 值模型 `CommentRateRule` / `CommentRateLimitConfig` 约束 JSON 结构（后端读写共用，
 *   前端表单保持同构，保存时原样提交）。
 * - 接口模型 `SysConfigItem` / `SysConfigListResp` / `SysConfigUpdateReq` 用于管理端读写。
 */

/** 单条评论频率规则：window_seconds 秒内最多 max_count 条 */
export interface CommentRateRule {
  window_seconds: number
  max_count: number
  /** true = 只统计正文相同的评论；false = 统计窗口内全部评论 */
  same_content: boolean
}

/** 评论频率限制配置：两档阈值同 key 存储（原子更新） */
export interface CommentRateLimitConfig {
  /** 一级评论（更严） */
  root: CommentRateRule[]
  /** 楼中楼回复（更宽松），空数组 = 关闭该档限流 */
  reply: CommentRateRule[]
}

/** 单个运行时配置项 */
export interface SysConfigItem {
  key: string
  value: Record<string, unknown>
  remark?: string | null
  /** 最后修改者 mid（0 = 系统 / 未修改过） */
  updatedBy: number
  updated_at?: string | null
  /** true = 尚未写入 DB，当前生效的是服务端 settings 默认值 */
  isDefault: boolean
}

export interface SysConfigListResp {
  items: SysConfigItem[]
}

export interface SysConfigUpdateReq {
  key: string
  value: Record<string, unknown>
  remark?: string | null
}

/** 已知配置键：评论频率限制 */
export const SYS_CONFIG_KEY_COMMENT_RATE_LIMIT = 'comment_rate_limit'
