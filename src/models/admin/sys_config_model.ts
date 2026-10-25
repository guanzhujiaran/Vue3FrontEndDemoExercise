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

/**
 * 推荐机器学习三件套配置（be-message `FeedMLConfig`，2.66.0）。
 *
 * 与后端 `app/models/schemas/sys_config.py::FeedMLConfig` 一一对应；默认全关，
 * 需先跑训练脚本产出模型/索引，再按需灰度开启。
 */
export interface FeedMLConfig {
  /** LightGBM 精排开关（需先产出模型文件） */
  ranker_enabled: boolean
  /** 模型分话语权 0~1（0 = 纯 EdgeRank 规则排序） */
  ranker_blend_weight: number
  /** ALS 协同召回开关（需先产出索引文件） */
  als_enabled: boolean
  /** ALS 召回条数上限 */
  als_limit: number
  /** LinUCB 上下文探索开关（需先回放训练臂参数） */
  linucb_enabled: boolean
  /** 探索分叠加强度 0~1（0 = 关闭探索） */
  linucb_weight: number
  /** UCB 置信区间系数 0~5（越大越探索） */
  linucb_alpha: number
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
/** 已知配置键：推荐机器学习三件套开关 */
export const SYS_CONFIG_KEY_FEED_ML = 'feed_ml'
