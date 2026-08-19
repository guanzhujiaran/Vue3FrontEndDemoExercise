/**
 * 动态富文本节点构建工具（统一创建/编辑/转发共用）。
 *
 * 把「纯文本 + 图片 URL + @映射」拼装成后端 `contentJson` 富文本节点数组：
 * - 纯文本 → WORDS 节点（按换行/段落拆分）
 * - `@昵称` → AT 节点（bizId=mid）
 * - 图片 URL → LINK 节点（jumpUrl=url，picMeta.renderAsImage=true）
 *
 * 2.22.0：正文**不允许**通过 `#话题#` 标记添加话题（不再解析 TOPIC 节点，
 * `#话题#` 按普通文本展示）；话题只能经发布表单从已创建且审核通过的话题中
 * 多选（`MomentCreateReq.topics` 单独提交）。存量正文 TOPIC 节点由
 * `MomentContentRenderer` 兼容渲染。
 *
 * 与 `moment_publish._nodes_to_text` 的解析口径对应，前端拼装结果可直接提交后端。
 */

export interface MomentAttachResource {
  /** 资源类型（如 lottery） */
  bizType: string
  /** 资源 id（字符串，避免 19 位 ID 精度丢失） */
  bizId: string
  /** 资源标题（attach 卡片显示名） */
  name?: string
  /** 封面链接（可选） */
  cover?: string
}

export interface MomentContentPayload {
  /** 纯文本正文 */
  content: string
  /** [兼容保留，2.22.0 起不再使用] 选中话题 id（正文不再解析 #话题#，话题经 MomentCreateReq.topics 单独提交） */
  topicId?: number
  /** [兼容保留，2.22.0 起不再使用] 选中话题名 */
  topicName?: string
  /** 站外 http(s) 图片链接列表（可选，最多 18） */
  images?: string[]
  /** @昵称 → mid 映射（可选，用于把 @昵称 解析为 AT 节点） */
  atNameToMid?: Record<string, number>
  /**
   * attach 资源（可选，2.21.0 起不再追加 RESOURCE 节点）：
   * 仅用于编辑器底部贴卡预览；提交时由发布表单经 `MomentCreateReq.attach` 独立提交。
   */
  attachResource?: MomentAttachResource
}

export interface MomentContentNodeLike {
  type: string
  text: string
  name?: string
  bizId?: string
  jumpUrl?: string
  picMeta?: { renderAsImage: boolean }
}

/** 单条动态最多图片数（与后端 `_MAX_IMAGE_COUNT` 对齐） */
export const MAX_MOMENT_IMAGE_COUNT = 18

/** 单条动态正文最长字数（与后端 `_CONTENT_MAX_LENGTH` 对齐） */
export const MAX_MOMENT_CONTENT_LENGTH = 2000

/** 解析纯文本中的 @昵称 标记的正则（2.22.0：正文禁止 #话题#，不再解析 TOPIC 节点） */
const TOKEN_RE = /(@[^\s@#]+)/g

/**
 * 把发布 payload 拼装为富文本节点数组（WORDS / AT / LINK）。
 * 空正文返回空数组。
 */
export function buildMomentContentNodes(payload: MomentContentPayload): MomentContentNodeLike[] {
  const nodes: MomentContentNodeLike[] = []
  const atNameToMid = payload.atNameToMid || {}

  for (const line of payload.content.split('\n')) {
    let last = 0
    TOKEN_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = TOKEN_RE.exec(line)) !== null) {
      if (m.index > last) {
        nodes.push({ type: 'WORDS', text: line.slice(last, m.index) })
      }
      const token = m[0]
      const name = token.slice(1)
      const mid = atNameToMid[name]
      if (mid != null) {
        nodes.push({ type: 'AT', text: token, name, bizId: String(mid) })
      } else {
        nodes.push({ type: 'WORDS', text: token })
      }
      last = m.index + token.length
    }
    if (last < line.length) {
      nodes.push({ type: 'WORDS', text: line.slice(last) })
    }
    nodes.push({ type: 'WORDS', text: '\n' })
  }
  // 去掉末尾多余换行节点
  if (nodes.length && nodes[nodes.length - 1].text === '\n') nodes.pop()

  // 图片：以 LINK 节点追加
  const images = (payload.images || []).slice(0, MAX_MOMENT_IMAGE_COUNT)
  for (const url of images) {
    const trimmed = url.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      nodes.push({
        type: 'LINK',
        text: trimmed,
        jumpUrl: trimmed,
        picMeta: { renderAsImage: true },
      })
    }
  }

  // 2.21.0：attach 资源不再追加 RESOURCE 节点（改由发布表单经 MomentCreateReq.attach 独立提交），
  // 仅在编辑器贴卡预览使用（见 MomentPublishForm）
  return nodes
}
