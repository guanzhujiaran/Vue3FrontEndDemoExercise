/**
 * 爬虫「开始 / 结束」推送开关（be-bilibili-crawler，本地 JSON 持久化，不入库）。
 *
 * 生效优先级：文件里配置过的爬虫以文件为准（source=file），其余回退到环境变量
 * CRAWLER_PUSH_START / CRAWLER_PUSH_END（source=env），都没有则关闭。
 */

/** 单个爬虫的开关（保存时的提交项） */
export interface CrawlerPushSwitchItem {
  crawler_name: string
  start: boolean
  end: boolean
}

/** 文件里持久化的内容 */
export interface CrawlerPushState {
  items: CrawlerPushSwitchItem[]
  /** 最近保存时间（秒级时间戳） */
  updated_at: number | null
}

/** 每个爬虫合并「文件 + 环境变量」之后的生效状态 */
export interface CrawlerPushEffectiveItem {
  crawler_name: string
  start: boolean
  end: boolean
  /** 配置来源 */
  source: 'file' | 'env'
}

/** GET /BackgroundService/CrawlerPushSwitch 的 data */
export interface CrawlerPushStateResp {
  state: CrawlerPushState
  /** 环境变量 CRAWLER_PUSH_START 原值 */
  env_start: string
  /** 环境变量 CRAWLER_PUSH_END 原值 */
  env_end: string
  /** 开关文件落盘路径（排查用） */
  state_file: string
  effective: CrawlerPushEffectiveItem[]
}

/** POST /BackgroundService/CrawlerPushSwitch/Set 的 body */
export interface CrawlerPushSetReq {
  items: CrawlerPushSwitchItem[]
}
