/**
 * 路由级 / 页面级 SEO 文案与结构化数据节点（业务差异层）。
 *
 * 站点级常量、`<head>` 标签、canonical、robots、sitemap、OG 图、Schema.org 默认图
 * 全部由 `@nuxtjs/seo` 全家桶负责：站点常量见 `seo_routes.ts`，模块配置见 `nuxt.config.ts`。
 * 本文件只保留模块无法推断的业务信息：
 * 1. **路由级覆盖 `ROUTE_SEO` 按路由 name 声明**：路由表里 `meta.description` 是面向
 *    菜单的短描述（如「应用首页」），不适合直接当 SEO 描述，故 SEO 文案单独在这里维护；
 * 2. **详情页必须声明 `requiredQuery`**：`?id=` / `?dynId=` 缺失时页面是空壳，
 *    由 `useRobotsRule()` 输出 `noindex`，避免搜索引擎收录无内容的详情页模板；
 * 3. **结构化数据只给节点，不给完整 JSON-LD 文档**：`@context` / `@graph` / `@id` 与
 *    URL 解析都由 `useSchemaOrg()` 完成（见 `useRouteSeo.ts`）。
 */
import { RouteName } from '@/models/router/index.ts'
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, SITE_URL } from './seo_routes'

/** 站点权威域名：详情页拼分享 URL 仍从这里取（唯一定义在 seo_routes.ts） */
export { SITE_URL }

/** 列表页节点：首屏条目的 ItemList */
export interface ItemListNode {
  '@type': 'ItemList'
  name: string
  numberOfItems: number
  itemListElement: { '@type': 'ListItem'; position: number; name: string; url: string }[]
}

/** 详情页节点：动态 / 抽奖动态用 SocialMediaPosting */
export interface SocialMediaPostingNode {
  '@type': 'SocialMediaPosting'
  headline: string
  articleSection: string
  inLanguage: string
  url: string
  author?: { '@type': 'Person'; name: string }
}

/** 面包屑节点：由 `useRouteSeo` 按 route.matched 生成 */
export interface BreadcrumbNode {
  '@type': 'BreadcrumbList'
  itemListElement: { '@type': 'ListItem'; position: number; name: string; item?: string }[]
}

/** 交给 `useSchemaOrg()` 的自定义节点（`@context` / `@graph` 由模块补） */
export type SchemaOrgNode = ItemListNode | SocialMediaPostingNode | BreadcrumbNode

/** 页面级 SEO 字段（页面覆盖 / 路由覆盖共用） */
export interface PageSeo {
  /** 页面标题（不含站点名；`site.separator` + 标题模板会补站点名） */
  title?: string
  /** 页面描述 */
  description?: string
  /** 页面关键词 */
  keywords?: string[]
  /** OG 类型：内容详情页用 article，其余用 website */
  ogType?: 'website' | 'article'
  /** 追加到 Schema.org 默认图的节点，可传单个或数组 */
  schemaOrg?: SchemaOrgNode | SchemaOrgNode[]
}

/** 路由级 SEO 覆盖 */
export interface RouteSeoOverride extends PageSeo {
  /** 该页必须有这些 query 参数才有实质内容；缺失任一个则输出 noindex */
  requiredQuery?: string[]
  /** 强制不收录（覆盖默认的登录态判定） */
  noindex?: boolean
}

/**
 * 按路由 name 的 SEO 覆盖表（只列有收录价值的页面）。
 * 未列出的页面走「路由 meta + 站点默认值」。
 */
export const ROUTE_SEO: Record<string, RouteSeoOverride> = {
  [RouteName.HOME]: {
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS
  },
  [RouteName.LOTTERY_HOME]: {
    description:
      'B站抽奖数据首页：官方抽奖、预约抽奖、充电抽奖、话题抽奖与中奖名人堂的统一入口，按开奖时间与热度筛选。',
    keywords: ['B站抽奖', '抽奖首页', '抽奖汇总', '开奖时间', 'bilibili lottery']
  },
  [RouteName.SCRAPY_STAT]: {
    description: 'B站抽奖数据抓取状态：各类型抽奖数据源的抓取进度、成功失败统计与最近更新时间。',
    keywords: ['爬虫状态', '数据抓取', 'B站抽奖数据', '抓取进度']
  },
  [RouteName.BILI_ATARI_RANKING]: {
    description: 'B站中奖名人堂：按 UP 主维度统计中奖次数与中奖动态，看看谁是抽奖常客。',
    keywords: ['中奖名人堂', '中奖排行', 'B站中奖', '抽奖排行榜']
  },
  [RouteName.OFFICIAL_LOTTERY]: {
    description:
      '本站（非官方第三方工具）整理的 B 站官方账号抽奖动态，含开奖时间、奖品、参与条件与一键跳转原动态。',
    keywords: ['官方抽奖', 'B站官方活动', '转发抽奖', '开奖时间']
  },
  [RouteName.RESERVE_LOTTERY]: {
    description: 'B站预约抽奖汇总：需先预约的抽奖活动清单，含预约截止时间、开奖时间与奖品信息。',
    keywords: ['预约抽奖', 'B站预约活动', '抽奖预约', '开奖时间']
  },
  [RouteName.CHARGE_LOTTERY]: {
    description: 'B站充电抽奖汇总：充电专属抽奖活动清单，含开奖时间、奖品与参与条件。',
    keywords: ['充电抽奖', 'B站充电活动', '充电专属抽奖']
  },
  [RouteName.TOPIC_LOTTERY]: {
    description: 'B站话题抽奖汇总：带话题的抽奖动态清单，按话题聚合查看开奖时间与奖品。',
    keywords: ['话题抽奖', 'B站话题活动', '抽奖话题']
  },
  [RouteName.LOTTERY_CARD_DETAIL]: {
    description: 'B站抽奖卡片详情：开奖时间、奖品清单、参与条件与原动态跳转，支持点赞收藏与评论。',
    keywords: ['抽奖详情', '开奖时间', '奖品清单', 'B站抽奖'],
    // 详情页是单条内容，OG 用 article 语义（社交平台会展示作者/时间信息）
    ogType: 'article',
    requiredQuery: ['id']
  },
  [RouteName.OTHERS_LOT_DYN_DETAIL]: {
    description: 'B站第三方抽奖动态详情：非官方号发布的抽奖动态正文、附加抽奖信息与评论区互动。',
    keywords: ['第三方抽奖', '抽奖动态详情', 'B站抽奖', '非官方抽奖'],
    ogType: 'article',
    requiredQuery: ['dynId']
  },
  [RouteName.SAMSCLUB]: {
    description: '山姆会员商店商品数据查询：商品价格、规格、评分与评价信息，支持关键词检索。',
    keywords: ['山姆会员店', '山姆商品', '商品价格查询', 'Sam’s Club']
  },
  [RouteName.CHANGE_LOG]: {
    description: 'BiliExplosion 更新日志：各版本的功能新增、体验优化与问题修复记录。',
    keywords: ['更新日志', '版本记录', 'changelog']
  },
  // 动态详情 / 用户空间是 UGC 页面，SEO 价值最高：匿名可读，允许收录
  MOMENT_DETAIL: {
    description: 'B站动态详情：动态正文、图片、话题与评论区互动，支持点赞、收藏与转发。',
    keywords: ['B站动态', '动态详情', '哔哩哔哩动态', '评论区'],
    ogType: 'article'
  },
  MOMENT_USER_SPACE: {
    description: 'B站用户空间：TA 发布的动态、收藏与互动记录，关注感兴趣的用户。',
    keywords: ['B站用户空间', 'UP主主页', '用户动态'],
    ogType: 'website'
  },
  // 2.58.0：空间 tab 路由化后，4 条子路由各自输出 SEO 描述
  MOMENT_USER_SPACE_HOME: {
    description: 'B站用户空间主页：TA 的资料、关注与粉丝数据总览。',
    keywords: ['B站用户空间', 'UP主主页', '用户资料'],
    ogType: 'website'
  },
  MOMENT_USER_SPACE_DYNAMIC: {
    description: 'B站用户空间动态：查看该用户发布的全部动态内容与互动数据。',
    keywords: ['B站动态', '用户动态', 'UP主动态'],
    ogType: 'website'
  },
  MOMENT_USER_SPACE_FAVORITES: {
    description: 'B站用户空间收藏：该用户公开的收藏夹与收藏内容。',
    keywords: ['B站收藏', '用户收藏夹', 'UP主收藏'],
    ogType: 'website'
  },
  MOMENT_USER_SPACE_SETTINGS: {
    description: 'B站用户空间设置：管理主页展示项与收藏可见性。',
    keywords: ['空间设置', '收藏设置', 'B站设置'],
    ogType: 'website'
  }
}

/**
 * 列表页 ItemList 节点：把首屏条目交给 `useSchemaOrg()`。
 *
 * 抽奖列表的条目本质上是一个「条目集合」，用 ItemList 描述后搜索引擎能识别出
 * 「这是一个列表页 + 有哪些具体条目」，比只给一段 description 更容易理解页面主题。
 *
 * 约束：
 * - 只取前 10 条（与首屏可见条数一致，避免与页面内容不符）；
 * - 条目 name 截断到 80 字（部分抽奖文案很长，全量塞进去只会稀释信号）；
 * - 没有 url 的条目丢弃（结构化数据里没有 url 的 ListItem 价值很低）；
 * - 返回 null 表示无有效条目，调用方应放弃覆盖、回落到路由级 SEO。
 * - 不写 `@context` / `@graph`：`nuxt-schema-org` 会把节点并入页面默认图。
 */
export const buildItemListNode = (
  name: string,
  items: readonly unknown[],
  total?: number
): ItemListNode | null => {
  const entries = (items as readonly { jump_url?: string; lottery_text?: string }[])
    .map((it) => ({
      url: it?.jump_url ?? '',
      text: (it?.lottery_text ?? '').replace(/\s+/g, ' ').trim()
    }))
    .filter((it) => !!it.url)
    .slice(0, 10)
  if (!entries.length) return null

  return {
    '@type': 'ItemList',
    name,
    numberOfItems: total ?? entries.length,
    itemListElement: entries.map((it, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: it.text.slice(0, 80) || name,
      url: it.url
    }))
  }
}

/** 把 PageSeo 的关键词数组拼成 meta keywords 字符串 */
export const joinKeywords = (keywords?: string[]): string =>
  keywords?.length ? keywords.filter(Boolean).join(',') : DEFAULT_KEYWORDS.join(',')
