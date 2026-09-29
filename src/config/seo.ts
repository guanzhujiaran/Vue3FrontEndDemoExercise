/**
 * 站点 SEO 唯一配置源（标题 / 描述 / 关键词 / OG / Twitter / canonical / robots）。
 *
 * 设计要点：
 * 1. **站点级常量集中在此**：`useRouteSeo` 与各页面一律从这里取值，禁止在组件里硬编码
 *    站点名 / 域名 / 分享图，避免多处口径漂移；
 * 2. **canonical 用 `SITE_URL` 而非 `window.location.origin`**：本地 `localhost`、
 *    预览环境、生产域名同时在线时，只有权威域名应被收录，否则会产生重复内容；
 * 3. **路由级覆盖 `ROUTE_SEO` 按路由 name 声明**：路由表里 `meta.description` 是面向
 *    菜单的短描述（如「应用首页」），不适合直接当 SEO 描述，故 SEO 文案单独在这里维护，
 *    与路由表解耦（不必改庞大的路由表）；
 * 4. **详情页必须声明 `requiredQuery`**：`?id=` / `?dynId=` 缺失时页面是空壳，
 *    此时输出 `noindex`，避免搜索引擎收录无内容的详情页模板。
 */
import { RouteName } from '@/models/router/index.ts'

/** 站点权威域名（无尾斜杠）：canonical / sitemap / OG 一律以它为准 */
export const SITE_URL = 'https://serena.dynv6.net'
/** 站点名：拼在所有非首页标题末尾 */
export const SITE_NAME = '爆破哔哩哔哩弹幕视频网'
/** 品牌 slogan（仅首页标题使用，沿用已被收录的标题） */
export const SITE_SLOGAN = '( ゜- ゜)つロ 乾杯~ - bilibili'
/** 首页完整标题：保持与 index.html 静态兜底一致 */
export const HOME_TITLE = `${SITE_NAME} - ${SITE_SLOGAN}`
/** 站点默认描述（未声明页面描述时的兜底） */
export const DEFAULT_DESCRIPTION =
  'B站官方抽奖信息集合：转发抽奖、预约抽奖、充电抽奖、话题抽奖一网打尽，并提供山姆会员商店商品数据查询。'
/** 站点默认关键词 */
export const DEFAULT_KEYWORDS = [
  'B站抽奖',
  '哔哩哔哩抽奖',
  '转发抽奖',
  '预约抽奖',
  '充电抽奖',
  '话题抽奖',
  '抽奖汇总',
  '中奖名单',
  '山姆会员店',
  '山姆商品查询',
  'bilibili lottery'
]
/** 社交分享图（1200×630，静态资源；绝对路径便于微信 / Twitter 等外部抓取） */
export const OG_IMAGE = `${SITE_URL}/og-image.png`
export const OG_IMAGE_ALT = `${SITE_NAME} - B站抽奖数据与山姆商品查询`
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
/** 可被搜索引擎索引（max-image-preview:large 便于搜索结果出大图） */
export const ROBOTS_INDEX = 'index,follow,max-image-preview:large'
/** 不收录（登录 / 管理端 / 404 / 空壳详情页） */
export const ROBOTS_NO_INDEX = 'noindex,nofollow'
/** 站点主语言（OG 用 `zh_CN` 下划线格式） */
export const OG_LOCALE = 'zh_CN'
/** canonical 需要剔除的跟踪参数（保留业务参数如 dynId / id） */
export const IGNORED_QUERY_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'from']

/** 页面级 SEO 字段（页面覆盖 / 路由覆盖共用） */
export interface PageSeo {
  /** 页面标题（不含站点名；留空则用路由层级标题） */
  title?: string
  /** 页面描述 */
  description?: string
  /** 页面关键词 */
  keywords?: string[]
  /** 分享图（绝对 URL） */
  image?: string
  /** OG 类型：内容详情页用 article，其余用 website */
  ogType?: 'website' | 'article'
  /** 结构化数据（JSON-LD），可传单个对象或数组 */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
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
      'B站官方抽奖汇总：官方账号发起的转发抽奖动态，含开奖时间、奖品、参与条件与一键跳转原动态。',
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
    description: '爆破哔哩哔哩更新日志：各版本的功能新增、体验优化与问题修复记录。',
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
  }
}

/** 站点级 WebSite 结构化数据（仅首页输出） */
export const buildWebsiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: DEFAULT_DESCRIPTION,
  inLanguage: 'zh-CN'
})

/**
 * 列表页 ItemList 结构化数据：把首屏条目交给搜索引擎。
 *
 * 抽奖列表的条目本质上是一个「条目集合」，用 ItemList 描述后搜索引擎能识别出
 * 「这是一个列表页 + 有哪些具体条目」，比只给一段 description 更容易理解页面主题。
 *
 * 约束：
 * - 只取前 10 条（与首屏可见条数一致，避免与页面内容不符）；
 * - 条目 name 截断到 80 字（部分抽奖文案很长，全量塞进去只会稀释信号）；
 * - 没有 url 的条目丢弃（结构化数据里没有 url 的 ListItem 价值很低）；
 * - 返回 null 表示无有效条目，调用方应放弃覆盖、回落到路由级 SEO。
 */
export const buildItemListJsonLd = (name: string, items: readonly unknown[], total?: number) => {
  const entries = (items as readonly { jump_url?: string; lottery_text?: string }[])
    .map((it) => ({
      url: it?.jump_url ?? '',
      text: (it?.lottery_text ?? '').replace(/\s+/g, ' ').trim()
    }))
    .filter((it) => !!it.url)
    .slice(0, 10)
  if (!entries.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: total ?? entries.length,
    itemListElement: entries.map((it, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: it.text.slice(0, 80) || name,
      url: it.url
    }))
  }
}

/** 把 PageSeo 的关键词数组拼成 meta keywords 字符串 */
export const joinKeywords = (keywords?: string[]): string =>
  keywords?.length ? keywords.filter(Boolean).join(',') : DEFAULT_KEYWORDS.join(',')
