/**
 * 站点级 SEO 常量 + 可索引路由清单（@nuxtjs/seo 的构建期配置源）。
 *
 * 本文件是**唯一可被 `nuxt.config.ts` 直接 import** 的配置源：Nuxt 用 esbuild 直接加载
 * nuxt.config.ts，不经过 `@/` 别名解析，因此这里禁止出现别名导入与运行时模块，只放纯常量。
 * `src/config/seo.ts`（路由文案 / 结构化数据节点）与 `nuxt.config.ts`（site / seo / robots /
 * sitemap / schemaOrg 配置）都从这里取值，避免站点名、域名、默认描述多处漂移。
 */

/** 站点权威域名（无尾斜杠）：canonical / sitemap / OG 一律以它为准 */
export const SITE_URL = 'https://serena.dynv6.net'
/** 站点名：由 `site.name` 生成标题模板、og:site_name、WebSite / Organization 节点 */
export const SITE_NAME = '爆破哔哩哔哩弹幕视频网'
/**
 * 站点分享图（`public/og-image.png`）。
 * `og:image` / `twitter:image` 由 seo-utils 从 public 文件自动生成；
 * 这里只用于补 `og:image:secure_url`（与 `og:image` 同址）。
 */
export const OG_IMAGE = `${SITE_URL}/og-image.png`
/**
 * 首页标题后缀：明确本站是独立的「非官方第三方」，不再沿用 bilibili 的官方 slogan。
 * Google 安全浏览把「仿冒可信实体品牌却未标示第三方身份」归入社交工程（欺骗性网页），
 * 而 title / description / og:site_name 是抓取时最先读到的身份信号。
 */
export const SITE_SLOGAN = '独立的非官方第三方 B 站公开抽奖数据工具'
/** 首页完整标题：已是完整标题，故首页用 `titleTemplate: '%s'` 跳过站点名模板 */
export const HOME_TITLE = `${SITE_NAME} - ${SITE_SLOGAN}`
/** 站点默认描述（`site.description`，也是未声明页面描述时的兜底） */
export const DEFAULT_DESCRIPTION =
  'BiliExplosion 是独立于哔哩哔哩（bilibili）的非官方第三方数据工具，整理公开可访问的转发抽奖、预约抽奖、充电抽奖、话题抽奖信息，并提供山姆会员商店商品数据查询。本站不索取 B 站账号、密码或 Cookie。'
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
/** 站点主语言：`site.defaultLocale` 决定 `<html lang>` 与 `og:locale` */
export const DEFAULT_LOCALE = 'zh-CN'
/**
 * 可被搜索引擎索引：与 @nuxtjs/robots 的默认规则保持一致。
 * `useRobotsRule()` 传字符串会**替换**模块默认规则，所以这里要把所有指令写全，
 * 否则 max-snippet / max-video-preview 会被覆盖掉。
 */
export const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
/** 不收录（登录 / 管理端 / 404 / 空壳详情页） */
export const ROBOTS_NO_INDEX = 'noindex,nofollow'
/**
 * canonical 允许保留的 query 参数（`seo.canonicalQueryWhitelist` 会**替换**模块默认白名单，
 * 所以这里要把默认值一并列出）：前 7 个是模块默认，`id` / `dynId` 是本项目详情页的业务参数，
 * 其余（utm_* / ref / from 等跟踪参数）由模块自动剔除。
 */
export const CANONICAL_QUERY_WHITELIST = [
  'page',
  'sort',
  'filter',
  'search',
  'q',
  'category',
  'tag',
  'id',
  'dynId'
]

/**
 * 可索引 / 需预渲染的页面路径清单（无尾斜杠）。
 * 与 `src/router/index.ts` 中「无需登录」的路由保持一致；登录 / 管理端页面不在其中。
 * 同一份清单用于：sitemap.urls、nitro.prerender.routes、SEO 收录白名单。
 */
export const SEO_INDEXABLE_ROUTES: readonly string[] = [
  '/',
  '/app/lot-data/home',
  '/app/lot-data/scrapy-stat',
  '/app/lot-data/bili-atari-ranking',
  '/app/lot-data/bili-data/official',
  '/app/lot-data/bili-data/reserve',
  '/app/lot-data/bili-data/charge',
  '/app/lot-data/bili-data/topic',
  '/app/samsclub/info',
  '/app/changelog',
  '/app/privacy-policy',
  '/app/disclaimer'
]
