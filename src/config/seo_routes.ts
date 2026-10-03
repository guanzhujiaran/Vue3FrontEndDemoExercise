/** 站点权威域名（无尾斜杠）：与 src/config/seo.ts 的 SITE_URL 同源（由其 re-export） */
export const SITE_URL = 'https://serena.dynv6.net'

/**
 * 可索引 / 需预渲染的页面路径清单（无尾斜杠）。
 *
 * 单独成文件且**不依赖任何别名与运行时模块**：`vite.config.ts`（vite-plugin-sitemap）
 * 与 `src/config/seo.ts`（Vike 预渲染 + robots 判定）都要引用它，
 * 而 vite.config.ts 由 esbuild 直接加载、不经过 `@` 别名解析，故这里不能出现别名导入。
 *
 * 与 `src/router/index.ts` 中「无需登录」的路由保持一致；登录 / 管理端页面不在其中。
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
