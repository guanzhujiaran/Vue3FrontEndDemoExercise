import { computed } from 'vue'
import { useRoute, type RouteLocationNormalizedLoaded, type RouteRecordNormalized } from 'vue-router'
import { useHead } from '@vueuse/head'
import { useI18n } from 'vue-i18n'
import { RouteName, type CustomRouteMeta } from '@/models/router/index.ts'

/** 站点名：统一拼接在所有页面标题末尾 */
const SITE_NAME = '爆破哔哩哔哩弹幕视频网'
/** 首页标题：沿用品牌 slogan，避免改动已被收录的首页标题 */
const HOME_TITLE = '爆破哔哩哔哩弹幕视频网 - ( ゜- ゜)つロ 乾杯~ - bilibili'
/** 路由未声明 description 时的兜底描述 */
const FALLBACK_DESCRIPTION =
  'B站官方抽奖信息集合：转发抽奖、预约抽奖、充电抽奖、话题抽奖一网打尽，并提供山姆会员商店商品数据查询。'
/** 可被搜索引擎索引 */
const ROBOTS_INDEX = 'index,follow'
/** 登录 / 管理员专属页面：内容为空壳或涉私，不收录 */
const ROBOTS_NO_INDEX = 'noindex,nofollow'

const metaOf = (record: RouteRecordNormalized): CustomRouteMeta =>
  (record.meta ?? {}) as CustomRouteMeta

/**
 * 由「具体到抽象」拼接标题：官方抽奖 - B站抽奖数据 - 爆破哔哩哔哩弹幕视频网
 * `route.matched` 是父 -> 子顺序，这里反转后取叶子标题在前，并去掉重复层级。
 */
const buildSeoTitle = (route: RouteLocationNormalizedLoaded): string => {
  if (route.name === RouteName.HOME) return HOME_TITLE

  const levels: string[] = []
  for (const record of [...route.matched].reverse()) {
    const title = metaOf(record).title
    if (title && !levels.includes(title)) levels.push(title)
  }
  return levels.length ? `${levels.join(' - ')} - ${SITE_NAME}` : SITE_NAME
}

/** 取最深一层匹配路由的 description 作为页面描述 */
const buildSeoDescription = (route: RouteLocationNormalizedLoaded): string => {
  for (const record of [...route.matched].reverse()) {
    const description = metaOf(record).description
    if (description) return description
  }
  return FALLBACK_DESCRIPTION
}

/** canonical：去掉路径末尾多余斜杠与 query / hash，保证同一页面只有一个权威地址 */
const buildCanonicalUrl = (route: RouteLocationNormalizedLoaded): string => {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const path = route.path.length > 1 ? route.path.replace(/\/+$/, '') : route.path
  return `${origin}${path}`
}

/** 需要登录 / 管理员权限的页面与 404 页不参与收录 */
const shouldNoIndex = (route: RouteLocationNormalizedLoaded): boolean => {
  if (route.name === RouteName.NOT_FOUND) return true
  return route.matched.some((record) => {
    const meta = metaOf(record)
    return !!meta.requiresLogin || !!meta.requiresAdmin || !!meta.adminOnly
  })
}

/** 首页的 WebSite 结构化数据，帮助搜索引擎理解站点主体 */
const buildWebsiteJsonLd = (url: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url,
  description: FALLBACK_DESCRIPTION
})

/**
 * 按当前路由动态维护 SEO 相关的 <head>：标题、描述、canonical、robots、OG 与结构化数据。
 *
 * 说明：本项目是纯 SPA，爬虫抓到的首屏 HTML 里没有这些内容，
 * 但它们会在水合后被 @vueuse/head 写入 DOM，Google 等会执行 JS 的爬虫能正确读取。
 */
export function useRouteSeo() {
  const route = useRoute()
  const { locale } = useI18n()

  const seoTitle = computed(() => buildSeoTitle(route))
  const seoDescription = computed(() => buildSeoDescription(route))
  const canonicalUrl = computed(() => buildCanonicalUrl(route))
  const robots = computed(() => (shouldNoIndex(route) ? ROBOTS_NO_INDEX : ROBOTS_INDEX))
  const isHome = computed(() => route.name === RouteName.HOME)

  const headPayload = computed(() => ({
    title: seoTitle.value,
    htmlAttrs: { lang: locale.value },
    link: [{ key: 'seo-canonical', rel: 'canonical', href: canonicalUrl.value }],
    meta: [
      { key: 'seo-description', name: 'description', content: seoDescription.value },
      { key: 'seo-robots', name: 'robots', content: robots.value },
      { key: 'seo-og-type', property: 'og:type', content: 'website' },
      { key: 'seo-og-site-name', property: 'og:site_name', content: SITE_NAME },
      { key: 'seo-og-title', property: 'og:title', content: seoTitle.value },
      { key: 'seo-og-description', property: 'og:description', content: seoDescription.value },
      { key: 'seo-og-url', property: 'og:url', content: canonicalUrl.value }
    ],
    script: isHome.value
      ? [
          {
            key: 'seo-ld-website',
            type: 'application/ld+json',
            innerHTML: JSON.stringify(buildWebsiteJsonLd(canonicalUrl.value))
          }
        ]
      : []
  }))

  useHead(headPayload)
}
