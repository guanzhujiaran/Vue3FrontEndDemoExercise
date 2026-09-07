/**
 * 后端下发跳转目标的统一消费入口（计划书 §2.10）。
 *
 * 后端只给「前端路由名」，路径只在 `src/router/index.ts` 里写一次：
 *
 * | 目标形态                    | 行为                                |
 * | --------------------------- | ----------------------------------- |
 * | `route:{name}?{query}`      | `router.push({ name, query })`（现行）|
 * | `/app/...`（存量数据）       | `router.push(path)`，不再新增        |
 * | `http(s)://...`             | 新标签页打开（no-referrer）          |
 *
 * `ROUTE_SCHEME` 必须与后端 `be-message-service/app/utils/route_target.py` 保持一致。
 */

import type { Router } from 'vue-router'
import { isExternalUrl, openExternalLink, openRouteInNewTab } from '@/utils/PageOpen/linkPolicy'

/** 站内路由名跳转目标的前缀 */
export const ROUTE_SCHEME = 'route:'

export interface RouteTarget {
  /** 前端路由名（router 的 name） */
  name: string
  /** 路由查询参数 */
  query: Record<string, string>
}

/**
 * 路径参数路由：后端经 `route:{name}?{query}` 只能把所有定位参数塞进 query，
 * 但部分前端路由把详情 id 定义成了 **path 段**（如 `/app/moment-detail/:momentId`）。
 * 这里登记「路由名 → 需从 query 挪进 params 的 key（key 即后端下发的参数名）」，
 * 让 `jumpToTarget` 把这类 key 放进 `params`，其余（如 `rpid` 楼层锚点）仍留在 query。
 * 若该路由的 path 参数名与后端下发 key 不同，可改用 `{ 下发key: 路由参数名 }`。
 */
const ROUTE_PATH_PARAM_KEYS: Record<string, string[]> = {
  MOMENT_DETAIL: ['momentId'],
}

/** 解析 `route:{name}?{query}`；非该形态返回 null */
export function parseRouteTarget(url: string | null | undefined): RouteTarget | null {
  if (!url || !url.startsWith(ROUTE_SCHEME)) return null
  const [rawName, rawQuery = ''] = url.slice(ROUTE_SCHEME.length).split('?')
  const name = rawName.trim()
  if (!name) return null
  const query: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(rawQuery)) {
    query[key] = value
  }
  return { name, query }
}

/** 由解析后的 RouteTarget 构造 vue-router 跳转对象：path 参数路由的 key 放进 params。 */
export function buildRouteLocation(target: RouteTarget): import('vue-router').RouteLocationRaw {
  const paramKeys = ROUTE_PATH_PARAM_KEYS[target.name]
  if (!paramKeys || paramKeys.length === 0) {
    return { name: target.name, query: target.query }
  }
  const params: Record<string, string> = {}
  const query: Record<string, string> = {}
  const paramKeySet = new Set(paramKeys)
  for (const [key, value] of Object.entries(target.query)) {
    if (paramKeySet.has(key)) params[key] = value
    else query[key] = value
  }
  return { name: target.name, params, query }
}

/**
 * 消费后端下发的跳转目标。
 *
 * @returns 是否命中并已执行跳转；未命中（空值 / 无法识别的形态）返回 false，调用方自行兜底。
 */
export function jumpToTarget(router: Router, url: string | null | undefined): boolean {
  if (!url) return false
  const target = parseRouteTarget(url)
  if (target) {
    openRouteInNewTab(router, buildRouteLocation(target))
    return true
  }
  if (isExternalUrl(url)) {
    openExternalLink(url)
    return true
  }
  // 存量数据：历史通知里落过 /app/... 站内路径，新标签页打开
  if (url.startsWith('/')) {
    openRouteInNewTab(router, url)
    return true
  }
  return false
}
