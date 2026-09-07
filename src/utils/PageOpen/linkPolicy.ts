/**
 * 全站跳转链接统一策略：所有跳转一律 no-referrer。
 *
 * 目的：任何会产生文档请求的跳转（新标签打开外链、location.href 跳转等）都不得把
 * 当前页地址（可能带 query / token）通过 Referer 头泄露给站外；同时也是访问 B 站等
 * 防盗链资源的必要条件。
 *
 * 统一用法（禁止各组件自行拼写 rel / referrerpolicy / windowFeatures 字符串）：
 * - `<a>` / `el-link`：`:rel="LINK_REL" :referrerpolicy="LINK_REFERRER_POLICY"`
 * - `window.open`：改用 `openExternalLink(url)`
 * - `location.href` 跳转：改用 `navigateNoReferrer(url)`
 * - 站内 SPA 跳转（`router.push` / `router-link`）：不发文档请求，无需处理
 */

/** 跳转链接的 rel：防新页面拿到 opener 句柄 + 兜底不发 Referer */
export const LINK_REL = 'noopener noreferrer'

/** 跳转链接的 referrer 策略 */
export const LINK_REFERRER_POLICY: ReferrerPolicy = 'no-referrer'

/** window.open 的 features：与 LINK_REL / LINK_REFERRER_POLICY 等价 */
export const LINK_WINDOW_FEATURES = 'noopener=yes,noreferrer=yes'

/**
 * 判断一个跳转目标是否为站外链接。
 * 仅 `http(s)://` 开头的绝对地址算外链；站内路由目标、相对路径等一律视为站内。
 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /^https?:\/\//i.test(url)
}

/** 打开外链（新标签页），统一带 noopener + noreferrer */
export function openExternalLink(url: string | null | undefined, target = '_blank'): Window | null {
  if (!url) return null
  return window.open(url, target, LINK_WINDOW_FEATURES)
}

/**
 * 在当前页跳转到指定地址，并保持 no-referrer。
 * `location.href` 无法附带 referrer policy，因此改用临时 <a> 触发导航。
 */
export function navigateNoReferrer(url: string | null | undefined): void {
  if (!url) return
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.rel = LINK_REL
  anchor.referrerPolicy = LINK_REFERRER_POLICY
  anchor.hidden = true
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

import type { Router, RouteLocationRaw } from 'vue-router'

/**
 * 在「新标签页」打开一个站内 SPA 路由（如消息页点通知项跳详情）。
 * 经 `router.resolve` 拿到完整 href，`window.open` 新开，保持当前页面（消息列表）不丢失；
 * features 复用 noopener + noreferrer，与外链策略一致。
 */
export function openRouteInNewTab(router: Router, to: RouteLocationRaw): Window | null {
  const resolved = router.resolve(to)
  return window.open(resolved.href, '_blank', LINK_WINDOW_FEATURES)
}
