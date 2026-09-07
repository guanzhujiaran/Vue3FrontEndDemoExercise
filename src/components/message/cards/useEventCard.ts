/**
 * 互动通知卡片「基类」逻辑。
 *
 * 对齐后端 `InteractionActionTypeEnum` + 模板方法模式（后端见
 * `be-message-service/app/services/interaction_actions/base.py`）：
 *
 * - 本文件 = 抽象基类：集中维护**所有事件类型共用**的字段推导（触发者 / 头像 /
 *   默认动作文案 / 时间 / 来源 / 原资源回捞字段）；
 * - `EventCardBase.vue` = 卡片骨架（模板方法：头像 → 头部 → body 插槽 → meta 插槽 → 右侧插槽）；
 * - `LikeEventCard.vue` / `ReplyEventCard.vue` / ... = 继承者，只关心自己的 InteractionActionTypeEnum
 *   该显示什么，其余全部复用基类。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EventFeedItem, EventFeedUser, EventType } from '@/api/notify/message-api'
import { InteractionActionTypeEnum } from '@/api/notify/message-api'
import { InteractionBizTypeEnum } from '@/api/community/hey-api'

/** 左侧最多堆叠展示的头像数量（对齐 B 站 msgfeed 样式） */
export const MAX_EVENT_CARD_AVATARS = 2

/** 评论正文里的 @ 提及占位符（`@{mid}`），正常应由后端替换为 `@昵称`。 */
const AT_PLACEHOLDER_PATTERN = /@\{(\d{1,19})\}/g

/**
 * 兜底清理正文里残留的 `@{mid}` 占位符。
 *
 * 后端会按 `at_mids` 回捞昵称并替换为 `@昵称`；但历史脏数据 / mid 已删等
 * 场景可能残留 `@{mid}` 机器码。此处把无法解析的占位符降级为「@用户」，
 * 保证界面不出现 `@{...}` 这类原始占位符。
 */
export function cleanAtPlaceholders(text: string): string {
  if (!text) return text
  return text.replace(AT_PLACEHOLDER_PATTERN, '@用户')
}

/** InteractionActionTypeEnum 全部取值（用于校验后端下发的 type 是否合法） */
const EVENT_TYPE_VALUES = Object.values(InteractionActionTypeEnum) as number[]

/** InteractionBizTypeEnum 全部取值（用于校验后端下发的 resource_type 是否合法） */
const RESOURCE_TYPE_VALUES = Object.values(InteractionBizTypeEnum) as number[]

/**
 * `resource_type`（InteractionBizTypeEnum）→ 被互动原资源的显示名称 i18n key。
 *
 * 决定动作文案里「xxx 人互动了 **yyy**」的 yyy：
 * 赞了我的**动态** / 赞了我的**抽奖** / 赞了我的**工作流** …
 *
 * 与 `openEventDetail` 的跳转判定同源（同一 `resource_type`），保证「文案说的资源」
 * 与「点进去看到的页面」一致。
 */
const RESOURCE_TYPE_NAME_KEY: Partial<Record<InteractionBizTypeEnum, string>> = {
  [InteractionBizTypeEnum.DYNAMIC]: 'message.resourceDynamic',
  [InteractionBizTypeEnum.LOTTERY]: 'message.resourceLottery',
  [InteractionBizTypeEnum.RPA_ACTION]: 'message.resourceRpaAction',
  [InteractionBizTypeEnum.RPA_WORKFLOW]: 'message.resourceRpaWorkflow',
  [InteractionBizTypeEnum.RPA_BROWSER]: 'message.resourceRpaBrowser',
  [InteractionBizTypeEnum.RPA_PLUGIN]: 'message.resourceRpaPlugin'
}

/** 未知 / 缺省 resource_type 的兜底名称 key（后端兜底 InteractionBizTypeEnum.DYNAMIC） */
const RESOURCE_TYPE_NAME_FALLBACK = InteractionBizTypeEnum.DYNAMIC

/**
 * 卡片基类逻辑：抽取单条 msgfeed 聚合条目的公共展示字段。
 *
 * 继承者统一以 `defineProps<{ item: EventFeedItem }>()` + `defineEmits<{ open: [EventFeedItem] }>()`
 * 声明自己的契约，再把 props 原样传进来即可复用全部公共字段。
 */
export function useEventCard(props: { item: EventFeedItem }) {
  const { t } = useI18n()

  /** 事件类型：后端返回的 type 即数字枚举，未知 / 缺省回落 LIKE */
  const itemType = computed<EventType>(() => {
    const code = props.item?.item?.type
    return EVENT_TYPE_VALUES.includes(code as EventType) ? (code as EventType) : InteractionActionTypeEnum.LIKE
  })

  /** 头像堆叠（对齐 B 站：左侧最多展示 2 个） */
  const showUsers = computed<EventFeedUser[]>(() =>
    (props.item?.users ?? []).slice(0, MAX_EVENT_CARD_AVATARS)
  )

  /** 聚合总数：优先后端 counts，缺省按 users 长度 */
  const totalCount = computed(() => props.item?.counts ?? props.item?.users?.length ?? 0)

  /**
   * 触发者文案：单人显示昵称；多人显示「用户A、用户B」，
   * 总人数由动作文案（likeMultiple）承担，避免重复「等N人」。
   */
  const actorText = computed(() => {
    const users = props.item?.users ?? []
    if (users.length === 0) return t('common.user')
    if (users.length === 1) return users[0].nickname || `${t('common.user')}${users[0].mid}`
    const names = users
      .slice(0, MAX_EVENT_CARD_AVATARS)
      .map((u) => u.nickname || `${t('common.user')}${u.mid}`)
    return names.join('、')
  })

  /**
   * 被互动的**原资源类型**（`resource_type`，InteractionBizTypeEnum）。
   *
   * 后端由 `source_type` 经 `_SOURCE_TYPE_TO_BIZ_TYPE` 推导后下发，
   * 与 `openEventDetail` 的跳转判定同源；未知 / 缺省回落 DYNAMIC。
   */
  const resourceType = computed<InteractionBizTypeEnum>(() => {
    const code = props.item?.item?.resource_type
    return RESOURCE_TYPE_VALUES.includes(code as InteractionBizTypeEnum)
      ? (code as InteractionBizTypeEnum)
      : RESOURCE_TYPE_NAME_FALLBACK
  })

  /** 原资源类型名称（「赞了我的**动态**」里的「动态」） */
  const resourceName = computed(() =>
    t(RESOURCE_TYPE_NAME_KEY[resourceType.value] ?? 'message.resourceUnknown')
  )

  /** 事件来源实体类型（`business` = InteractionBizTypeEnum） */
  const business = computed(() => props.item?.item?.business)

  /**
   * 动作文案里的**被互动对象**（即「xxx 人互动了 **yyy**」的 yyy）。
   *
   * 以 `resource_type` 为准；评论类事件需按 `business` 修正：
   * 后端 `_SOURCE_TYPE_TO_BIZ_TYPE` 未收录 `InteractionBizTypeEnum.COMMENT`，
   * 评论的 `resource_type` 会回落到 DYNAMIC（表示「该评论挂在哪条动态下」），
   * 若直接取用会把「赞了我的**评论**」显示成「赞了我的**动态**」。
   */
  const targetName = computed(() =>
    resourceType.value === InteractionBizTypeEnum.DYNAMIC &&
    business.value === InteractionBizTypeEnum.COMMENT
      ? t('message.targetComment')
      : resourceName.value
  )

  /** 各事件类型的默认动作文案（继承者需要特殊逻辑时用 `action-text` 覆盖） */
  const actionTextMap: Partial<Record<EventType, (target: string) => string>> = {
    [InteractionActionTypeEnum.LIKE]: (target) => t('message.likeAction', { target }),
    [InteractionActionTypeEnum.REPLY]: (target) => t('message.replyAction', { target }),
    [InteractionActionTypeEnum.AT]: (target) => t('message.atAction', { target }),
    [InteractionActionTypeEnum.AUDIT_REJECT]: (target) => t('message.auditRejectAction', { target }),
    [InteractionActionTypeEnum.HIDE]: (target) => t('message.hideAction', { target }),
    // 举报结果通知针对「举报」本身，与被互动资源无关，不带 target
    [InteractionActionTypeEnum.REPORT_REJECT]: () => t('message.reportRejectAction'),
    [InteractionActionTypeEnum.REPORT_RESOLVED]: () => t('message.reportResolvedAction')
  }

  /** 默认动作文案（按 InteractionActionTypeEnum 查表，yyy 由 `targetName` 填充） */
  const defaultActionText = computed(() => {
    const build = actionTextMap[itemType.value]
    return build ? build(targetName.value) : ''
  })

  /**
   * 原资源回捞字段（后端读取时按 source_type + source_id 实时回捞，不冗余存储）：
   * `title` = 原资源标题，`desc` = 事件正文（如驳回原因 / 下架说明）。
   */
  const title = computed(() => props.item?.item?.title || '')
  const desc = computed(() => props.item?.item?.desc || '')
  /** 卡片正文：优先原资源标题，回落事件正文 */
  const content = computed(() => title.value || desc.value)
  const coverUrl = computed(() => props.item?.item?.image || '')

  /** 评论正文：source = 触发者写的内容；target = 被回复的内容（楼中楼 / 根评论） */
  const sourceContent = computed(() =>
    cleanAtPlaceholders(props.item?.item?.source_content || '')
  )
  const targetContent = computed(() =>
    cleanAtPlaceholders(props.item?.item?.target_content || '')
  )

  /**
   * 楼层评论作者 mid（后端经 `CommentBiz.batch_get_resources` 批量回捞，计划书 §5.12）。
   *
   * - `sourceMid` = 触发评论作者（写下 @ / 回复的那一层）；
   * - `targetMid` = 被 @ / 被回复的那一层作者。
   *
   * 为 0 表示该层不存在（一级评论无 target）或作者未知，前端据此跳过作者展示。
   */
  const sourceMid = computed(() => props.item?.item?.source_mid ?? 0)
  const targetMid = computed(() => props.item?.item?.target_mid ?? 0)

  /**
   * 楼层评论作者昵称（后端经 `PptrUser.get_many` 批量回查后下发，计划书 §5.12）。
   *
   * 优先于 mid 查 `users` 使用：被 @ / 被回复那一层的作者不在触发者列表里，
   * 后端直接下发昵称；为空时回退到 `nicknameOf` 的 mid → users → 「用户{mid}」降级链。
   */
  const sourceAuthorName = computed(() => props.item?.item?.source_name || '')
  const targetAuthorName = computed(() => props.item?.item?.target_name || '')

  /**
   * 按 mid 取楼层作者昵称（零额外请求）。
   *
   * `fallbackName` 优先：后端已下发昵称（`source_name` / `target_name`）时直接采用，
   * 不再查 `users`；为空时按 mid 从触发者列表 `users` 匹配——**触发评论作者恒为触发者之一**，
   * 必然命中；被 @ / 被回复那一层的作者不在触发者列表里，最终降级为「用户{mid}」占位。
   */
  function nicknameOf(mid: number, fallbackName?: string): string {
    if (fallbackName) return fallbackName
    if (!mid) return ''
    const hit = (props.item?.users ?? []).find((u) => u.mid === mid)
    return hit?.nickname || `${t('common.user')}${mid}`
  }

  /**
   * 来源：补充说明被互动对象**所属的原资源**（`resource_type`）。
   *
   * 与动作文案里的对象名重复时不展示——例如「赞了我的动态」不再补一句「来源：动态」；
   * 只有两者不同（典型：评论类事件 yyy=评论、来源=动态）时才补，避免冗余。
   */
  const sourceText = computed(() =>
    resourceName.value === targetName.value
      ? ''
      : `${t('message.sourcePrefix')}${resourceName.value}`
  )

  /** 时间统一使用 item.ctime（Unix 时间戳，秒级）→ ISO 字符串供 TimeText 展示 */
  const timeDisplay = computed(() => {
    const c = props.item?.item?.ctime
    return c ? new Date(c * 1000).toISOString() : null
  })

  return {
    itemType,
    showUsers,
    totalCount,
    actorText,
    resourceType,
    resourceName,
    targetName,
    defaultActionText,
    title,
    desc,
    content,
    coverUrl,
    sourceContent,
    targetContent,
    sourceMid,
    targetMid,
    sourceAuthorName,
    targetAuthorName,
    nicknameOf,
    sourceText,
    timeDisplay
  }
}
