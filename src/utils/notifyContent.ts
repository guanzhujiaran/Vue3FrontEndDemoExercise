/**
 * 系统通知正文解析工具。
 *
 * 通知正文支持与 B 站 system_notify 同构的 `#{文本}{"url"}` 内联链接模板，例如：
 * `您在#{抽奖卡片 #883000000007}{"/app/lot-data/card-detail?id=..."}发布的评论正在审核中`
 *
 * 用户侧列表（NotifyListView）与管理侧列表（NotifyAdminView）共用本模块的解析逻辑，
 * 避免两处各自实现导致口径不一致。
 */

/** 匹配 `#{文本}{"url"}` 内联链接（http(s) 外链或站内 /app 路径） */
export const INLINE_LINK_RE = /#\{([^{}]*?)\}\{"((?:https?:\/\/[^"\s]+|\/app\/\S+))"\}/g

export interface NotifySegment {
  text: string
  url: string | null
}

/**
 * 把正文解析为「纯文本 / 内联链接」片段序列：
 * 返回的段落里 url 为空的是纯文本片段；带 url 的是可点击的链接片段，
 * Vue 模板按顺序遍历渲染即可。
 */
export function renderNotifySegments(content: string): NotifySegment[] {
  if (!content) return []
  const segs: NotifySegment[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_LINK_RE.exec(content)) !== null) {
    if (m.index > lastIndex) {
      segs.push({ text: content.slice(lastIndex, m.index), url: null })
    }
    segs.push({ text: m[1], url: m[2] })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < content.length) {
    segs.push({ text: content.slice(lastIndex), url: null })
  }
  return segs
}

/** 正文是否包含内联链接（用无 g 标志的正则，避免共享 lastIndex 状态导致漏判） */
export function hasNotifyInlineLink(content: string): boolean {
  return new RegExp(INLINE_LINK_RE.source).test(content)
}

/** 是否站外链接（http/https）；站内 /app 路径走 SPA 路由 */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url)
}
