/**
 * 路由级 SEO：把「业务差异」交给 @nuxtjs/seo 全家桶的 composable，
 * 不再自己拼 <head> 标签、canonical 或 JSON-LD `<script>`。
 *
 * 全家桶负责（配置见 `nuxt.config.ts`）：
 * - `site` / `seo`：站点名、标题模板 `%s - 站点名`、`<html lang>` / `og:locale`、
 *   canonical 默认规则（query 白名单）、`og:site_name` / OG-Twitter 默认标签，
 *   `public/og-image.png` 自动转成绝对 `og:image` / `twitter:image`；
 *   canonical / og:url 另由本文件按路由显式维护一份（模块默认只在 SSR 注入，SPA 导航不更新）；
 * - `robots` / `sitemap`：robots.txt、sitemap.xml、`<meta name="robots">`；
 * - `schemaOrg`：`WebSite` / `WebPage` / `Organization` 默认图，以及 `@graph` / `@context` / `@id`；
 * - `ogImage` / `linkChecker` / `aiReady`：社交图运行时、预渲染死链检查、llms.txt / `.md` 页面。
 *
 * 本文件只保留模块推断不出来的业务信息：
 * 1. 按 vue-router 的 `route.matched` 拼页面标题、取描述兜底；
 * 2. 路由级（`ROUTE_SEO`）与页面级（`usePageSeo`）文案覆盖；
 * 3. 空壳 / 私有页 noindex；
 * 4. 面包屑节点与页面级 `ItemList` / `SocialMediaPosting` 节点。
 *
 * 取值优先级：**页面级覆盖 > 路由级覆盖 > 路由 meta > 站点默认值**。
 */
import { computed } from 'vue'
import { useRoute, type RouteLocationNormalizedLoaded, type RouteRecordNormalized } from 'vue-router'
import { useHead, useSchemaOrg, useSeoMeta } from '#imports'
import { RouteName, type CustomRouteMeta } from '@/models/router/index.ts'
import {
  CANONICAL_QUERY_WHITELIST,
  DEFAULT_DESCRIPTION,
  HOME_TITLE,
  OG_IMAGE,
  ROBOTS_INDEX,
  ROBOTS_NO_INDEX,
  SITE_NAME,
  SITE_URL
} from '@/config/seo_routes.ts'
import {
  ROUTE_SEO,
  joinKeywords,
  type BreadcrumbNode,
  type PageSeo,
  type RouteSeoOverride,
  type SchemaOrgNode
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
 * 标题：由「具体到抽象」拼接层级标题（官方抽奖 - B站抽奖数据）。
 * 站点名由模块的 `site.separator` + 标题模板补上，这里不再拼，避免重复。
 */
const buildSeoTitle = (route: RouteLocationNormalizedLoaded, override: PageSeo): string => {
  if (route.name === RouteName.HOME) return override.title || HOME_TITLE

  const levels: string[] = []
  for (const record of [...route.matched].reverse()) {
    const title = metaOf(record).title
    if (title && !levels.includes(title)) levels.push(title)
  }
  return override.title || levels.join(' - ') || SITE_NAME
}

/**
 * canonical：站点权威域名 + 去尾斜杠的路径 + 业务 query（只保留白名单内的参数）。
 * 模块自带的 canonical 只在 SSR 注入，SPA 客户端导航不会跟着变，故这里显式维护一份，
 * 让浏览器里切换路由后「当前页地址」仍然正确（也供 og:url 使用）。
 */
const buildCanonicalUrl = (route: RouteLocationNormalizedLoaded): string => {
  const path = route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path
  const search = new URLSearchParams(
    Object.entries(route.query)
      .filter(
        ([key, value]) =>
          CANONICAL_QUERY_WHITELIST.includes(key) && value !== '' && value != null
      )
      .map(([key, value]) => [key, String(value)])
  ).toString()
  return `${SITE_URL}${path}${search ? `?${search}` : ''}`
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
 * 面包屑节点：按 `route.matched` 层级生成，交给 `useSchemaOrg()` 并入页面 @graph。
 * 中间层 URL 含动态参数（如 `:momentId`）时不输出 item，只保留名称。
 */
const buildBreadcrumbNode = (route: RouteLocationNormalizedLoaded): BreadcrumbNode | null => {
  const items: BreadcrumbNode['itemListElement'] = []
  let acc = ''
  route.matched.forEach((record, index) => {
    const title = metaOf(record).title
    if (!title) return
    const rawPath = record.path || ''
    acc = rawPath.startsWith('/') ? rawPath : `${acc.replace(/\/+$/, '')}/${rawPath}`
    const isLast = index === route.matched.length - 1
    const item: BreadcrumbNode['itemListElement'][number] = {
      '@type': 'ListItem' as const,
      position: items.length + 1,
      name: title
    }
    // 末级用当前页面路径（canonical 由模块生成），父级仅在路径不含动态参数时给出 URL
    if (isLast) item.item = `${SITE_URL}${route.path.replace(/\/+$/, '') || '/'}`
    else if (acc && !acc.includes(':')) item.item = `${SITE_URL}${acc}`
    items.push(item)
  })
  return items.length < 2 ? null : { '@type': 'BreadcrumbList', itemListElement: items }
}

/** 在 App.vue 里调用一次即可：按当前路由维护全家桶的 SEO 输入 */
export function useRouteSeo() {
  const route = useRoute()

  const seo = computed(() => {
    const override = resolveOverride(route)
    const title = buildSeoTitle(route, override)
    return {
      override,
      title,
      // 首页 / 自带站点名的动态标题不再套模板，否则会出现两次站点名。
      // 必须是字符串：给 `undefined` 会把 seo-utils 的默认模板一并顶掉，Unhead 连 title 都不输出。
      titleTemplate: title.includes(SITE_NAME) ? '%s' : `%s - ${SITE_NAME}`,
      description: buildSeoDescription(route, override),
      keywords: joinKeywords(override.keywords),
      ogType: override.ogType,
      canonical: buildCanonicalUrl(route),
      noIndex: shouldNoIndex(route, override)
    }
  })

  // 标题、描述、关键词、og:type / og:url 用站点级默认值兜底；
  // og:title / og:description / twitter:card / OG 图等由模块自动推断。
  useSeoMeta({
    title: () => seo.value.title,
    titleTemplate: () => seo.value.titleTemplate,
    description: () => seo.value.description,
    keywords: () => seo.value.keywords,
    ogType: () => seo.value.ogType,
    ogUrl: () => seo.value.canonical,
    // seo-utils 会从 public/og-image.png 自动生成 og:image / twitter:image，
    // 但不会补 secure_url；HTTPS 站点补上可让部分抓取器直接走安全地址。
    ogImageSecureUrl: () => OG_IMAGE,
    // robots meta 由这里统一输出：SSR 写进 HTML，SPA 导航时也会跟着更新。
    // robots.txt 仍由 @nuxtjs/robots 生成（nuxt.config 里 metaTag: false，避免两条 meta）。
    robots: () => (seo.value.noIndex ? ROBOTS_NO_INDEX : ROBOTS_INDEX)
  })

  // 页面级 canonical 覆盖模块默认值（低优先级，不会重复输出），且客户端导航时保持响应式。
  useHead({
    link: [{ rel: 'canonical', href: () => seo.value.canonical }]
  })

  // 默认 WebSite / WebPage / Organization 由 schemaOrg.defaults 生成，
  // 这里只追加面包屑与页面级节点，模块负责补 @context / @graph / @id 与绝对 URL。
  const schemaNodes = computed<Record<string, unknown>[]>(() => {
    const nodes: SchemaOrgNode[] = []
    const breadcrumb = buildBreadcrumbNode(route)
    if (breadcrumb) nodes.push(breadcrumb)
    const extra = seo.value.override.schemaOrg
    if (extra) {
      if (Array.isArray(extra)) nodes.push(...extra)
      else nodes.push(extra)
    }
    return nodes.map((node) => ({ ...node }))
  })
  // 传 getter 而不是 computed 值：页面级节点由子组件（`usePageSeo`）在 setup 里才写入，
  // 若在这里立刻取值会拿到空覆盖，SSR 的 @graph 就会漏掉 ItemList / SocialMediaPosting。
  useSchemaOrg(() => schemaNodes.value)
}
