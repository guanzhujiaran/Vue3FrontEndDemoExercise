<template>
  <EventCardBase
    :item="item"
    :preview-text="commentDeleted ? t('message.commentDeleted') : sourceContent"
    :preview-class="commentDeleted ? 'text-text-placeholder text-xs' : sourceTextClass"
    @open="emit('open', item)"
  >
    <template #body>
      <!-- 评论被删 / 未过审等非正常状态：展示占位文案（对齐回复卡片） -->
      <el-text
        v-if="commentDeleted"
        class="at-event-card__deleted text-text-placeholder block text-sm"
        tag="p"
      >
        {{ t('message.commentDeleted') }}
      </el-text>
      <template v-else>
        <!-- 第一层：被 @ 的原评论（楼层上下文背景，根/子评论按层级区分高亮） -->
        <div
          v-if="targetContent"
          class="at-event-card__target mt-1 rounded-r-sm border-l-2 px-2 py-1"
          :class="targetHighlightClass"
        >
          <!-- 被 @ 评论的作者名无需展示，引用块仅保留层级标签与正文 -->
          <el-text
            v-if="targetLevelText"
            class="at-event-card__target-level block text-xs"
            :class="targetLevelTextClass"
            tag="p"
          >
            {{ targetLevelText }}
          </el-text>
          <el-text
            class="at-event-card__target-text block text-xs"
            :class="targetTextClass"
            :line-clamp="2"
            tag="p"
          >
            {{ targetContent }}
          </el-text>
        </div>
        <!-- 第二层：触发 @ 的评论（粗体大字）。
             md 及以上右侧预览区（EventCardBase 的 right 插槽）已展示同一段正文，
             左侧在此断点起省略，避免左右两侧重复显示相同内容（二选一）。 -->
        <div v-if="sourceContent" class="at-event-card__source mt-1 md:hidden">
          <!-- 触发 @ 的作者名与顶部 actorText (source_name) 重复，按需求隐藏，仅保留正文 -->
          <el-text
            class="at-event-card__source-text block"
            :class="sourceTextClass"
            :line-clamp="2"
            tag="p"
          >
            {{ sourceContent }}
          </el-text>
        </div>
      </template>
    </template>
    <template #meta>
      <el-text
        v-if="sourceText"
        class="at-event-card__source-meta text-text-placeholder truncate text-xs"
        tag="span"
      >
        {{ sourceText }}
      </el-text>
    </template>
  </EventCardBase>
</template>

<script setup lang="ts">
/**
 * @ 我的通知卡片（InteractionActionTypeEnum.AT = 3）。
 *
 * 继承 `EventCardBase`：动作文案（atAction）由基类按 InteractionActionTypeEnum 查表下发。
 * 正文自上而下为「被 @ 的原评论（楼层上下文，根/子评论按层级区分高亮）」
 *   →「触发 @ 的评论（粗体大字）」，
 * 右侧预览区与左侧正文第二层共用同一段 @ 内容（左右去重：md+ 仅右侧）。
 *
 * 后端 `item.source_content` / `item.target_content` 为实时回捞的评论正文；
 * 后端不再把原资源标题 / 评论正文快照进事件表，`title` / `desc` 通常为空，
 * 因此本卡片不再取基类的 `content`（= title || desc）作为正文展示。
 *
 * 评论非正常状态（被删 / 未过审 / 驳回 / 下架 / 待审）时后端下发
 * `comment_deleted=true`，本卡片整体切换为「该评论已被删除」占位。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EventCardBase from './EventCardBase.vue'
import { useEventCard } from './useEventCard'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'AtEventCard' })

const { t } = useI18n()
const props = defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

const {
  sourceContent,
  targetContent,
  sourceMid,
  targetMid,
  sourceAuthorName,
  targetAuthorName,
  nicknameOf,
  sourceText
} = useEventCard(props)

/**
 * 楼层评论作者昵称（后端经 `CommentBiz` 批量回捞作者 mid + `PptrUser.get_many` 回查昵称后下发，计划书 §5.12）。
 *
 * `sourceAuthor` = 触发 @ 的那一层作者，优先用后端下发的 `sourceAuthorName`，
 * 回退到 `nicknameOf`（mid → users → 「用户{mid}」）；
 * `targetAuthor` = 被 @ 的那一层作者，同样优先 `targetAuthorName` 后降级。
 * mid 为 0（无该层）时不渲染作者行。
 */
const sourceAuthor = computed(() => nicknameOf(sourceMid.value, sourceAuthorName.value))
const targetAuthor = computed(() => nicknameOf(targetMid.value, targetAuthorName.value))

/**
 * 触发 @ 的评论正文样式（主色 + 大号 + 中等字重）。
 *
 * 左右两侧（左侧正文第二层 / 右侧预览区）展示的是同一段内容，共用这一份样式：
 * 右侧经 `EventCardBase` 的 `preview-class` 透传，保证两侧格式一致。
 */
const sourceTextClass = 'text-text-primary text-base font-medium'

/** 评论是否处于非正常状态（被删 / 未过审 / 驳回 / 下架 / 待审） */
const commentDeleted = computed(() => !!props.item?.item?.comment_deleted)

/**
 * 被 @ 内容的评论层级：`root` = 根评论，`sub` = 楼中楼子评论。
 *
 * 后端下发 `root_id`（该楼根评论 rpid）与 `target_id`（被 @ 评论 rpid）：
 * 两者相等 → 被 @ 的是根评论；不等 → 被 @ 的是楼中楼子评论；
 * 缺失层级信息（历史数据）时按根评论处理。
 */
const targetLevel = computed<'root' | 'sub'>(() => {
  const targetId = props.item?.item?.target_id ?? ''
  const rootId = props.item?.item?.root_id ?? ''
  if (!targetId || !rootId) return 'root'
  return targetId === rootId ? 'root' : 'sub'
})

/** 被 @ 内容高亮：根评论走主色，子评论走信息色，两者视觉可区分 */
const targetHighlightClass = computed(() =>
  targetLevel.value === 'root'
    ? 'border-primary-light-3 bg-primary-light-9'
    : 'border-info-light-3 bg-info-light-9'
)
/**
 * 被 @ 内容的层级标签：仅楼中楼子评论展示。
 *
 * 根评论是默认形态，靠主色高亮（竖线 + 底色 + 正文色）区分即可，不再加文字提示。
 */
const targetLevelText = computed(() => (targetLevel.value === 'sub' ? t('message.commentSub') : ''))
/** 层级标签配色：跟随子评论的信息色高亮（根评论不展示标签） */
const targetLevelTextClass = 'text-info'
/** 被 @ 内容文字色：根评论走常规色，子评论走次要色 */
const targetTextClass = computed(() =>
  targetLevel.value === 'root' ? 'text-text-regular' : 'text-text-secondary'
)
</script>