/**
 * 路由级 SEO：按当前路由维护 <head> 里的标题、描述、关键词、canonical、robots、
 * Open Graph / Twitter Card 与结构化数据（JSON-LD）。
 *
 * 取值优先级：**页面级覆盖（usePageSeo）> 路由级覆盖（ROUTE_SEO）> 路由 meta > 站点默认值**。
 *
 * 两条容易被忽略但很关键的规则：
 * 1. **canonical 用 `SITE_URL` 而不是 `window.location.origin`**：本地 / 预览 / 生产
 *    多套环境同时在线时，只有权威域名应被收录；
 * 2. **空壳页必须 noindex**：详情页（`?id=` / `?dynId=`）缺参数时没有实质内容，
 *    登录 / 管理端页面是空壳或涉私，一律 `noindex,nofollow`，避免收录垃圾页。
 *
 * 局限：本项目是纯 SPA，首屏 HTML 由 `index.html` 提供，动态内容要等 JS 执行后才写入
 * DOM；`index.html` 中的静态 SEO 标签（带 `data-seo-static`）会在挂载后被本模块移除，
 * 避免与动态值重复。不执行 JS 的爬虫（多数社交平台分享抓取）读到的是静态兜底内容。
 */
import { computed } from 'vue'
import { useRoute, type RouteLocationNormalizedLoaded, type RouteRecordNormalized } from 'vue-router'
// Nuxt 内置的 useHead（自动导入）：@vueuse/head 的版本只能改到它自己的实例，
// 服务端渲染时 JSON-LD（head.script）不会进入 HTML —— 迁移 Nuxt 后二者不能混用。
import { useHead } from '#imports'
import { useI18n } from 'vue-i18n'
import { RouteName, type CustomRouteMeta } from '@/models/router/index.ts'
import {
  DEFAULT_DESCRIPTION,
  HOME_TITLE,
  IGNORED_QUERY_PARAMS,
  OG_IMAGE,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  OG_LOCALE,
  ROBOTS_INDEX,
  ROBOTS_NO_INDEX,
  ROUTE_SEO,
  SITE_NAME,
  SITE_URL,
  buildWebsiteJsonLd,
  joinKeywords,
  type PageSeo,
  type RouteSeoOverride
} from '@/config/seo.ts'
import { getPageSeo } from '@/composables/usePageSeo.ts'

/** 不参与收录的路由 name（回调页 / 测试页 / 404） */
const ALWAYS_NO_INDEX_NAMES = new Set<string>([
  RouteName.NOT_FOUND,
  'CASDOOR_CALLBACK',
  'test'
])

const metaOf = (record: RouteRecordNormalized): CustomRouteMeta =>
  (record.meta ?? {}) as CustomRouteMeta

/** 取当前路由的 SEO 覆盖（路由级 + 页面级） */
const resolveOverride = (route: RouteLocationNormalizedLoaded): RouteSeoOverride => {
  const name = String(route.name ?? '')
  return { ...(ROUTE_SEO[name] ?? {}), ...(getPageSeo() ?? {}) }
}

/**
 * 标题：由「具体到抽象」拼接层级标题（官方抽奖 - B站抽奖数据 - 站点名），
 * 页面级覆盖的标题优先，且已含站点名时不重复拼接。
 */
const buildSeoTitle = (route: RouteLocationNormalizedLoaded, override: PageSeo): string => {
  if (route.name === RouteName.HOME) return override.title || HOME_TITLE

  const levels: string[] = []
  for (const record of [...route.matched].reverse()) {
    const title = metaOf(record).title
    if (title && !levels.includes(title)) levels.push(title)
  }
  const pageTitle = override.title || levels.join(' - ') || SITE_NAME
  return pageTitle.includes(SITE_NAME) ? pageTitle : `${pageTitle} - ${SITE_NAME}`
}

/** 描述：覆盖 > 最深一层 meta.description > 站点默认 */
const buildSeoDescription = (route: RouteLocationNormalizedLoaded, override: PageSeo): string => {
  if (override.description) return override.description
  for (const record of [...route.matched].reverse()) {
    const description = metaOf(record).description
    if (description) return description
  }
  return DEFAULT_DESCRIPTION
}

/** canonical：权威域名 + 路径 + 业务 query（剔除 utm 等跟踪参数），去掉结尾多余斜杠 */
const buildCanonicalUrl = (route: RouteLocationNormalizedLoaded): string => {
  const path = route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path
  const search = new URLSearchParams(
    Object.entries(route.query)
      .filter(([key, value]) => !IGNORED_QUERY_PARAMS.includes(key) && value !== '' && value != null)
      .map(([key, value]) => [key, String(value)])
  ).toString()
  return `${SITE_URL}${path}${search ? `?${search}` : ''}`
}

/** 需要 noindex 的场景：404 / 回调 / 测试页 / 登录与管理员页面 / 缺必要 query 的详情页 */
const shouldNoIndex = (route: RouteLocationNormalizedLoaded, override: RouteSeoOverride): boolean => {
  const name = String(route.name ?? '')
  if (ALWAYS_NO_INDEX_NAMES.has(name)) return true
  if (override.noindex) return true
  if (override.requiredQuery?.some((key) => !route.query[key])) return true
  return route.matched.some((record) => {
    const meta = metaOf(record)
    return !!meta.requiresLogin || !!meta.requiresAdmin || !!meta.adminOnly
  })
}

/**
 * 面包屑结构化数据：按 `route.matched` 层级生成。
 * 中间层 URL 含动态参数（如 `:momentId`）时不输出 item，只保留名称。
 */
const buildBreadcrumbJsonLd = (route: RouteLocationNormalizedLoaded, canonicalUrl: string) => {
  const items: Record<string, unknown>[] = []
  let acc = ''
  route.matched.forEach((record, index) => {
    const title = metaOf(record).title
    if (!title) return
    const rawPath = record.path || ''
    acc = rawPath.startsWith('/') ? rawPath : `${acc.replace(/\/+$/, '')}/${rawPath}`
    const isLast = index === route.matched.length - 1
    const item: Record<string, unknown> = { '@type': 'ListItem', position: items.length + 1, name: title }
    // 末级用真实 canonical，父级仅在路径不含动态参数时才给出 URL
    if (isLast) item.item = canonicalUrl
    else if (acc && !acc.includes(':')) item.item = `${SITE_URL}${acc}`
    items.push(item)
  })
  if (items.length < 2) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
  }
}

/** 结构化数据：首页 WebSite；其余页面 BreadcrumbList；页面级 jsonLd 追加在后 */
const buildJsonLd = (route: RouteLocationNormalizedLoaded, override: PageSeo, canonicalUrl: string) => {
  const list: Record<string, unknown>[] = []
  if (route.name === RouteName.HOME) list.push(buildWebsiteJsonLd())
  const breadcrumb = buildBreadcrumbJsonLd(route, canonicalUrl)
  if (breadcrumb) list.push(breadcrumb)
  if (override.jsonLd) {
    if (Array.isArray(override.jsonLd)) list.push(...override.jsonLd)
    else list.push(override.jsonLd)
  }
  return list
}

/**
 * 移除 `index.html` 里的静态 SEO 兜底标签（带 `data-seo-static`）。
 * 静态标签是给不执行 JS 的爬虫看的；一旦应用挂载，就必须交给 useHead 独占维护，
 * 否则同一页面会出现两份 description / og:title，搜索引擎取到的是首页的旧值。
 */
const removeStaticSeoTags = () => {
  if (typeof document === 'undefined') return
  document.head.querySelectorAll('[data-seo-static]').forEach((el) => el.remove())
}

/** 按当前路由维护 SEO 相关的 <head>（在 App.vue 里调用一次即可） */
export function useRouteSeo() {
  const route = useRoute()
  const { locale } = useI18n()

  const headPayload = computed(() => {
    const override = resolveOverride(route)
    const title = buildSeoTitle(route, override)
    const description = buildSeoDescription(route, override)
    const canonicalUrl = buildCanonicalUrl(route)
    const robots = shouldNoIndex(route, override) ? ROBOTS_NO_INDEX : ROBOTS_INDEX
    const image = override.image || OG_IMAGE
    const ogType = override.ogType || 'website'
    const jsonLd = buildJsonLd(route, override, canonicalUrl)

    return {
      title,
      htmlAttrs: { lang: locale.value },
      link: [{ key: 'seo-canonical', rel: 'canonical', href: canonicalUrl }],
      meta: [
        { key: 'seo-description', name: 'description', content: description },
        { key: 'seo-keywords', name: 'keywords', content: joinKeywords(override.keywords) },
        { key: 'seo-robots', name: 'robots', content: robots },
        { key: 'seo-og-type', property: 'og:type', content: ogType },
        { key: 'seo-og-site-name', property: 'og:site_name', content: SITE_NAME },
        { key: 'seo-og-title', property: 'og:title', content: title },
        { key: 'seo-og-description', property: 'og:description', content: description },
        { key: 'seo-og-url', property: 'og:url', content: canonicalUrl },
        { key: 'seo-og-image', property: 'og:image', content: image },
        { key: 'seo-og-image-secure', property: 'og:image:secure_url', content: image },
        { key: 'seo-og-image-alt', property: 'og:image:alt', content: OG_IMAGE_ALT },
        { key: 'seo-og-image-width', property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
        { key: 'seo-og-image-height', property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
        { key: 'seo-og-locale', property: 'og:locale', content: OG_LOCALE },
        { key: 'seo-twitter-card', name: 'twitter:card', content: 'summary_large_image' },
        { key: 'seo-twitter-title', name: 'twitter:title', content: title },
        { key: 'seo-twitter-description', name: 'twitter:description', content: description },
        { key: 'seo-twitter-image', name: 'twitter:image', content: image },
        { key: 'seo-twitter-image-alt', name: 'twitter:image:alt', content: OG_IMAGE_ALT }
      ],
      // JSON-LD：Unhead 通过 `innerHTML` 注入脚本内容（其内部 contentAttrs 就是 innerHTML/textContent）。
      // 注意不要给 script 加 `key`：它会被当成去重用的 hid，实测脚本会进不了 SSR 输出。
      script: jsonLd.map((data) => ({
        type: 'application/ld+json',
        innerHTML: JSON.stringify(data)
      }))
    }
  })

  removeStaticSeoTags()
  useHead(headPayload)
}
