/**
 * 雪花 ID 字符串化工具。
 *
 * ## 为什么需要
 * 后端出参统一为「int 数值字段 + `@auto_str` 自动派生的字符串版字段」
 * （`rpid` + `rpid_str`、`mid` + `mid_str` / `mid_str` …），而 JS 的 `Number`
 * 只能精确表示 `2^53-1`，19 位雪花 ID 一旦以 number 流转就会**静默丢精度**。
 *
 * 本项目组件层的 ID 一律以**字符串**流转（`:key`、路由 query、DOM id、
 * Set/Map 去重、`===` 比较、拼 URL、作为其它接口入参），因此在 **API 封装层
 * 这一处唯一出口**把 ID 字段就地字符串化：
 *
 * - 组件层代码几乎零改动，避免 200+ 处消费点漏改导致精度丢失；
 * - 入参侧后端已统一用 `StrInt`（`anyOf[int, str]`），前端继续传 string 不会 422。
 */

/** 后端两种派生后缀：camelCase 出参用 `Str`，snake_case 出参用 `_str`。 */
const STR_SUFFIXES = ['Str', '_str'] as const

function toStrId(value: unknown): unknown {
  if (value == null) return value
  return typeof value === 'string' ? value : String(value)
}

/**
 * 递归把对象中指定 ID 字段的值字符串化（就地修改并返回原对象）。
 *
 * 规则：
 * - 只处理 `fields` 白名单里的字段，避免误伤 `likeCount` / `floor` 等普通数值；
 * - 若响应里已带后端派生的字符串版（`rpid_str` / `rpid_str`），优先用它的值；
 * - 递归穿透数组与嵌套对象（列表接口的 `items`、嵌套 `data` 等）。
 */
export function withStrIds<T>(data: T, fields: readonly string[]): T {
  if (data == null || typeof data !== 'object') return data
  if (Array.isArray(data)) {
    data.forEach((item) => withStrIds(item, fields))
    return data
  }
  const node = data as Record<string, unknown>
  for (const field of fields) {
    if (node[field] == null) continue
    const derived = STR_SUFFIXES.map((s) => node[`${field}${s}`]).find((v) => v != null)
    node[field] = toStrId(derived ?? node[field])
  }
  Object.values(node).forEach((v) => {
    if (v && typeof v === 'object') withStrIds(v, fields)
  })
  return data
}


/**
 * 需要字符串化的响应 ID 字段白名单（各业务域并集，递归生效）。
 *
 * 只收录语义上就是雪花 ID / 业务主键的字段，**刻意不收录** `likeCount`、
 * `floor`、`current_level`、`page_num` 等普通数值，避免误伤。
 * `cursor`（私信翻页游标）后端保持字符串，无需处理。
 */
export const RESPONSE_ID_FIELDS: readonly string[] = [
  // 用户 mid 及其衍生
  'mid', 'uid', 'sender_mid', 'receiver_mid', 'talker_mid', 'authorMid', 'ownerMid',
  'actor_mid', 'reportMid', 'up_mid', 'operator_mid', 'from_mid', 'at_mid',
  'createdBy', 'updatedBy',
  // 评论
  'rpid', 'oid', 'root', 'parent', 'dialog', 'focus_rpid', 'focus_root', 'top_rpid',
  // 动态 / 收藏 / 互动
  'bizId', 'folderId', 'dynId', 'topicId', 'srcDynId',
  // 事件提醒定位
  'resource_id', 'root_id', 'source_id', 'target_id',
  // 私信
  'msgkey', 'last_msgkey',
]

/** 各业务域的 ID 字段白名单（只列真正是雪花 ID / 业务主键的字段）。 */
export const ID_FIELDS = {
  /** 评论：rpid / oid / root / parent / dialog / focus_* / top_rpid */
  comment: [
    'rpid',
    'oid',
    'root',
    'parent',
    'dialog',
    'focus_rpid',
    'focus_root',
    'top_rpid',
  ],
  /** 用户 mid（含触发者 / 作者 / 审核者等衍生字段） */
  mid: [
    'mid',
    'sender_mid',
    'receiver_mid',
    'talker_mid',
    'authorMid',
    'ownerMid',
    'actor_mid',
    'reportMid',
    'up_mid',
    'operator_mid',
    'from_mid',
    'at_mid',
    'updatedBy',
    'createdBy',
  ],
  /** 动态 / 收藏 / 互动：bizId / folderId / dynId / topicId / srcDynId */
  resource: ['bizId', 'folderId', 'dynId', 'topicId', 'srcDynId', 'resource_id'],
  /** 事件提醒：定位评论楼层的四个 id */
  eventLocate: ['resource_id', 'root_id', 'source_id', 'target_id'],
  /** 私信：msgkey（cursor 是字符串游标，后端保持 str，无需处理） */
  dm: ['msgkey', 'last_msgkey'],
  /** 用户搜索 / 黑名单 */
  user: ['mid', 'uid'],
} as const
