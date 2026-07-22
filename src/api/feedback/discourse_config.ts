/**
 * Discourse 嵌入式评论系统配置
 *
 * 用于在 Vue 项目中以 iframe 形式嵌入 Discourse 主题评论
 * 主要场景：抽奖卡片"主要内容为空、仅有评论/打分"
 *
 * 环境变量（在 .env.development / .env.prod 中配置）：
 * - VITE_DISCOURSE_URL:          Discourse 实例地址，必须以 / 结尾，例如 https://forum.example.com/
 * - VITE_DISCOURSE_EMBED_ORIGIN: 前端嵌入评论页的 origin，默认取当前 origin
 * - VITE_DISCOURSE_FULL_APP:     是否启用 fullApp 模式（true=可在嵌入页内直接回复/点赞/引用，不跳转）
 */
export interface DiscourseRuntimeConfig {
  /** Discourse 实例 URL，必须以 / 结尾 */
  discourseUrl: string
  /** 前端嵌入评论页的 origin，用于为每个抽奖卡片生成唯一 embed_url */
  embedOrigin: string
  /**
   * 是否启用 fullApp 模式（2026.4 新特性）
   * - true: iframe 内加载完整 Discourse 应用，可直接回复/点赞/引用
   * - false: 旧模式，仅只读列表，需点击跳转
   */
  fullApp: boolean
  /** iframe 默认高度（未收到 Discourse postMessage 高度时使用） */
  fallbackEmbedHeight: number
}

const parseBoolean = (val: string | undefined, fallback: boolean): boolean => {
  if (val === undefined) return fallback
  return val.toLowerCase() === 'true' || val === '1'
}

const normalizeUrl = (url: string): string => {
  if (!url) return url
  return url.endsWith('/') ? url : `${url}/`
}

const normalizeOrigin = (origin: string): string => {
  if (!origin) return origin
  return origin.endsWith('/') ? origin.slice(0, -1) : origin
}

export const discourseConfig: DiscourseRuntimeConfig = {
  discourseUrl: normalizeUrl(import.meta.env.VITE_DISCOURSE_URL || 'http://localhost:4000/'),
  embedOrigin: normalizeOrigin(
    import.meta.env.VITE_DISCOURSE_EMBED_ORIGIN || window.location.origin
  ),
  fullApp: parseBoolean(import.meta.env.VITE_DISCOURSE_FULL_APP, true),
  fallbackEmbedHeight: 800
}

/**
 * 为单个抽奖卡片生成 Discourse 嵌入用的唯一 embed_url
 *
 * 即使前端无该路由，Discourse 也会按 URL 创建对应 topic
 * 因此可承载"主要内容为空、仅评论"的场景
 *
 * @param lotteryId 抽奖卡片业务 ID
 */
export const buildDiscourseEmbedUrl = (lotteryId: string | number): string => {
  return `${discourseConfig.embedOrigin}/lottery/embed/${lotteryId}`
}

/**
 * 生成 Discourse 主题标题
 */
export const buildDiscourseTopicTitle = (
  lotteryTitle: string,
  lotteryId: string | number
): string => {
  return `抽奖评论 - ${lotteryTitle}（#${lotteryId}）`
}

export default discourseConfig
