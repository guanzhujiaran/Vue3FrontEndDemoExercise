#!/usr/bin/env node
/**
 * 生成 `dist/client/sitemap.xml`。
 *
 * 为什么不再用 vite-plugin-sitemap：这个插件挂在 Vite 的 `transformIndexHtml` / 构建钩子上，
 * 依赖「有一个 index.html 产物」的 SPA 流程；Nuxt + Nitro 的构建不走那条路，
 * 所以在 `nuxt generate` 之后再跑本脚本，产物结构更可控。
 *
 * 约定：
 * - 路由清单**唯一来源**仍是 `src/config/seo_routes.ts`（与 `nitro.prerender.routes` 同源）。
 *   这里用正则读取而不是 import：该文件是 TS，为了一个几十行的脚本不值得再引入 TS 转译。
 * - 优先级按页面价值分级，避免全部 `1.0`（等于没给爬虫任何相对重要性信号）。
 * - `lastmod` 用构建时间：产物本身就是构建时刻的快照，如实标注即可。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = process.cwd()
const ROUTES_SRC = join(ROOT, 'src/config/seo_routes.ts')
const OUT_FILE = join(ROOT, 'dist/client/sitemap.xml')
/** 站点权威域名（与 src/config/seo.ts 的 SITE_URL 保持一致） */
const SITE_URL = 'https://serena.dynv6.net'

/** 首页 > 抽奖数据主列表页 > 其余抽奖列表 > 工具 / 内容页 > 状态页 */
const PRIORITY = {
  '*': '0.6',
  '/': '1.0',
  '/app/lot-data/home': '0.9',
  '/app/lot-data/bili-data/official': '0.9',
  '/app/lot-data/bili-data/reserve': '0.8',
  '/app/lot-data/bili-data/charge': '0.8',
  '/app/lot-data/bili-data/topic': '0.8',
  '/app/samsclub/info': '0.7',
  '/app/lot-data/bili-atari-ranking': '0.7',
  '/app/lot-data/scrapy-stat': '0.5',
  '/app/changelog': '0.5'
}
/** 绝大多数是抽奖数据（每天变），只有更新日志是随版本发布变 */
const CHANGEFREQ = { '*': 'daily', '/app/changelog': 'weekly' }

const pick = (map, route) => map[route] ?? map['*']

function readRoutes() {
  const src = readFileSync(ROUTES_SRC, 'utf-8')
  const routes = [...src.matchAll(/'(\/[^']*)'/g)].map((m) => m[1])
  if (!routes.length) throw new Error(`未能从 ${ROUTES_SRC} 解析出路由清单`)
  return routes
}

const routes = readRoutes()
const lastmod = new Date().toISOString()

const urlEntries = routes
  .map((route) => {
    const loc = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${pick(CHANGEFREQ, route)}</changefreq>`,
      `    <priority>${pick(PRIORITY, route)}</priority>`,
      '  </url>'
    ].join('\n')
  })
  .join('\n')

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urlEntries,
  '</urlset>',
  ''
].join('\n')

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, xml, 'utf-8')
console.log(`[sitemap] ✓ ${routes.length} 条 → ${OUT_FILE}`)
