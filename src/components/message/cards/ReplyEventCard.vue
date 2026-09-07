<template>
  <div class="reply-event-card flex flex-col">
    <EventCardBase
      :item="item"
      :preview-text="commentDeleted ? t('message.commentDeleted') : replyText"
      :preview-class="replyTextClass"
      @open="emit('open', item)"
    >
      <template #body>
        <!-- 评论被删 / 未过审等非正常状态：展示占位文案（对齐知乎） -->
        <el-text
          v-if="commentDeleted"
          class="reply-event-card__deleted text-text-placeholder block text-sm"
          tag="p"
        >
          {{ t('message.commentDeleted') }}
        </el-text>
        <template v-else>
          <!-- 第一层：被回复的动态原文（上下文背景，小字灰） -->
          <el-text
            v-if="dynamicTitle"
            class="reply-event-card__dynamic text-text-placeholder block text-xs"
            :line-clamp="2"
            tag="p"
          >
            {{ dynamicTitle }}
          </el-text>
          <!-- 第二层：被回复内容（根评论 / 子评论，竖线 + 底色 + 层级标签区分高亮） -->
          <div
            v-if="targetContent"
            class="reply-event-card__target mt-1 rounded-r-sm border-l-2 px-2 py-1"
            :class="targetHighlightClass"
          >
            <el-text
              v-if="targetAuthor"
              class="reply-event-card__target-author block truncate text-xs text-text-secondary"
              tag="p"
            >
              {{ targetAuthor }}
            </el-text>
            <el-text
              v-if="targetLevelText"
              class="reply-event-card__target-level block text-xs"
              :class="targetLevelTextClass"
              tag="p"
            >
              {{ targetLevelText }}
            </el-text>
            <el-text
              class="reply-event-card__target-text block text-xs"
              :class="targetTextClass"
              :line-clamp="2"
              tag="p"
            >
              {{ targetContent }}
            </el-text>
          </div>
          <!-- 第三层：触发者回复内容（粗体大字）。
             md 及以上右侧预览区（EventCardBase 的 right 插槽）已展示同一段正文，
             左侧在此断点起省略，避免左右两侧重复显示相同内容（二选一）。 -->
          <div v-if="replyText" class="reply-event-card__source md:hidden">
            <el-text
              v-if="replyAuthor"
              class="reply-event-card__source-author block truncate text-xs text-text-secondary"
              tag="p"
            >
              {{ replyAuthor }}
            </el-text>
            <el-text
              class="reply-event-card__source-text block"
              :class="replyTextClass"
              :line-clamp="2"
              tag="p"
            >
              {{ replyText }}
            </el-text>
          </div>
        </template>
      </template>
      <template #meta>
        <!-- 评论快捷操作：展开内联回复框，不跳转详情页 -->
        <span
          class="reply-event-card__action reply-event-card__comment-action flex cursor-pointer items-center gap-1 transition-colors"
          :class="[
            showReplyBox ? 'text-primary' : 'text-text-placeholder hover:text-text-primary',
            !canQuickAction && 'cursor-not-allowed opacity-50'
          ]"
          @click.stop="toggleReplyBox"
        >
          <component :is="commentIcon" class="reply-event-card__action-icon h-4 w-4" />
          <span>{{ t('message.eventReply') }}</span>
        </span>
        <!-- 点赞快捷操作：直接切换点赞态，不跳转详情页 -->
        <span
          class="reply-event-card__action reply-event-card__like-action flex cursor-pointer items-center gap-1 transition-colors"
          :class="[
            isLiked ? 'text-primary' : 'text-text-placeholder hover:text-text-primary',
            (!canQuickAction || liking) && 'cursor-not-allowed',
            liking && 'opacity-60'
          ]"
          @click.stop="toggleLike"
        >
          <component
            :is="isLiked ? likeActiveIcon : likeIcon"
            class="reply-event-card__action-icon h-4 w-4"
          />
          <span>{{ t('message.eventLike') }}</span>
        </span>
      </template>
    </EventCardBase>

    <!-- 内联快捷回复框：在消息卡片内直接回复，不跳转详情页 -->
    <div
      v-if="showReplyBox"
      class="reply-event-card__reply-box bg-fill-light mt-2 rounded-lg p-3"
      @click.stop
    >
      <el-input
        v-model="replyContent"
        class="reply-event-card__reply-input"
        type="textarea"
        :rows="3"
        :placeholder="t('message.replyPlaceholder')"
        :disabled="replying"
      />
      <div class="reply-event-card__reply-actions mt-2 flex items-center justify-end gap-2">
        <el-button size="default" text :disabled="replying" @click="cancelReply">
          {{ t('message.replyCancel') }}
        </el-button>
        <el-button
          size="default"
          type="primary"
          :loading="replying"
          :disabled="!replyContent.trim()"
          @click="submitReply"
        >
          {{ t('message.replySend') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 回复通知卡片（InteractionActionTypeEnum.REPLY = 2）。
 *
 * 继承 `EventCardBase`，复用骨架与动作文案（replyAction）：
 * 正文自上而下为「被回复的动态原文」→「被回复的评论（根评论 / 子评论按层级
 * 区分高亮）」→「触发者写的回复」，底部为回复 / 点赞互动按钮，右侧预览取触发者的回复正文。
 *
 * 左右去重：md 及以上断点 `EventCardBase` 的右侧预览区会展示触发者的回复正文，
 * 此时左侧正文第三层加 `md:hidden` 省略，保证同一段内容只出现在一侧；
 * 两侧共用 `replyTextClass` 一套文字格式（以左侧高亮样式为准）。
 *
 * 楼层作者：被回复层 / 触发者回复层各自在正文上方标注该层评论作者昵称，
 * 由后端经 `CommentBiz` 批量回捞的作者 mid（`source_mid` / `target_mid`）解析（计划书 §5.12）。
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import EventCardBase from './EventCardBase.vue'
import { useEventCard, cleanAtPlaceholders } from './useEventCard'
import commentApi from '@/api/lottery_comment'
import { CommentActionEnum, InteractionBizTypeEnum } from '@/api/community/hey-api'
import commentIcon from '@/assets/svgs/dynamic/detail/side_toolbar/comment.svg?component'
import likeIcon from '@/assets/svgs/like.svg?component'
import likeActiveIcon from '@/assets/svgs/like_active.svg?component'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'ReplyEventCard' })

const { t } = useI18n()
const props = defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

const {
  title,
  sourceContent,
  targetContent,
  sourceMid,
  targetMid,
  sourceAuthorName,
  targetAuthorName,
  nicknameOf,
  desc
} = useEventCard(props)

/**
 * 楼层评论作者昵称（后端经 `CommentBiz` 批量回捞作者 mid + `PptrUser.get_many` 回查昵称后下发，计划书 §5.12）。
 *
 * `replyAuthor` = 触发者写的那一层，优先用 `sourceAuthorName`，回退 `nicknameOf`（mid → users → 「用户{mid}」）；
 * `targetAuthor` = 被回复的那一层作者，优先 `targetAuthorName` 后降级。
 * mid 为 0（无该层）时不渲染作者行。
 */
const replyAuthor = computed(() => nicknameOf(sourceMid.value, sourceAuthorName.value))
const targetAuthor = computed(() => nicknameOf(targetMid.value, targetAuthorName.value))

/**
 * 触发者回复正文：优先 `item.source_content`（后端按评论 rpid 实时回捞）。
 *
 * 后端已不再把评论正文快照进事件表（desc 为空）；评论处于非正常状态
 * （被删 / 未过审）时后端下发 `comment_deleted=true`，本卡片整体切换为
 * 「该评论已被删除」占位，正文不再展示。此处 `desc` 仅作兜底（历史数据）。
 */
const replyText = computed(() => sourceContent.value || desc.value)

/**
 * 触发者回复正文的文字格式（主色 + 大号 + 中等字重）。
 *
 * 左右两侧（正文第三层 / 右侧预览区）展示的是同一段内容，共用这一份样式：
 * 右侧经 `EventCardBase` 的 `preview-class` 透传，保证两侧格式一致。
 */
const replyTextClass = 'text-text-primary text-base font-medium'

/** 被回复的动态原文（`item.title`，动态回捞），作为整条回复的上下文背景 */
const dynamicTitle = computed(() => cleanAtPlaceholders(title.value))

/** 评论是否处于非正常状态（被删 / 未过审 / 驳回 / 下架 / 待审） */
const commentDeleted = computed(() => !!props.item?.item?.comment_deleted)

/**
 * 被回复内容的评论层级：`root` = 根评论，`sub` = 楼中楼子评论。
 *
 * 后端下发 `root_id`（该楼根评论 rpid）与 `target_id`（被回复评论 rpid）：
 * 两者相等 → 被回复的是根评论；不等 → 被回复的是楼中楼子评论；
 * 缺失层级信息（历史数据 / 一级评论）时按根评论处理。
 */
const targetLevel = computed<'root' | 'sub'>(() => {
  const targetId = props.item?.item?.target_id ?? ''
  const rootId = props.item?.item?.root_id ?? ''
  if (!targetId || !rootId) return 'root'
  return targetId === rootId ? 'root' : 'sub'
})

/** 被回复内容高亮：根评论走主色，子评论走信息色，两者视觉可区分 */
const targetHighlightClass = computed(() =>
  targetLevel.value === 'root'
    ? 'border-primary-light-3 bg-primary-light-9'
    : 'border-info-light-3 bg-info-light-9'
)
/**
 * 被回复内容的层级标签：仅楼中楼子评论展示。
 *
 * 根评论是默认形态，靠主色高亮（竖线 + 底色 + 正文色）区分即可，不再加文字提示。
 */
const targetLevelText = computed(() => (targetLevel.value === 'sub' ? t('message.commentSub') : ''))
/** 层级标签配色：跟随子评论的信息色高亮（根评论不展示标签） */
const targetLevelTextClass = 'text-info'
const targetTextClass = computed(() =>
  targetLevel.value === 'root' ? 'text-text-regular' : 'text-text-secondary'
)

/**
 * 评论区定位参数（来自事件 item）：
 * - `targetRpid` = 触发者写的回复 rpid（source_id），即本卡片要互动的那条评论；
 * - `resourceId` / `resourceType` = 评论挂的资源（如动态）oid 与 biz 类型；
 * - `rootId` = 楼中楼根评论 rpid（缺失按 '0' 处理）。
 * 这些 id 缺失（历史脏数据 / 评论已删）时，快捷操作不可用。
 */
const targetRpid = computed(() => props.item?.item?.source_id ?? '')
const rootId = computed(() => props.item?.item?.root_id ?? '')
const resourceId = computed(() => props.item?.item?.resource_id ?? '')
const resourceType = computed(
  () => (props.item?.item?.resource_type ?? InteractionBizTypeEnum.DYNAMIC) as InteractionBizTypeEnum
)
/** 快捷操作可用：评论未被删除且能定位到目标评论 rpid */
const canQuickAction = computed(() => !!targetRpid.value && !commentDeleted.value)

// ---------------------------------------------------------------------------
// 点赞快捷操作：直接切换点赞态，不跳转详情页
// 点赞态不再随事件冗余下发（按 mid 走评论交互独立接口获取），本地维护翻转态
// ---------------------------------------------------------------------------
const isLiked = ref(false)
const liking = ref(false)
async function toggleLike() {
  if (!canQuickAction.value || liking.value) return
  const next = isLiked.value ? CommentActionEnum.NONE : CommentActionEnum.LIKE
  liking.value = true
  try {
    const res = await commentApi.action(targetRpid.value, next)
    if (res && res.code === 0) {
      isLiked.value = !isLiked.value
      ElMessage.success(isLiked.value ? t('message.likeSuccess') : t('message.likeCanceled'))
    } else {
      ElMessage.error(res?.msg || t('message.likeFailed'))
    }
  } catch {
    ElMessage.error(t('message.likeFailed'))
  } finally {
    liking.value = false
  }
}

// ---------------------------------------------------------------------------
// 评论快捷操作：卡片内联回复框，直接回复触发者，不跳转详情页
// ---------------------------------------------------------------------------
const showReplyBox = ref(false)
const replyContent = ref('')
const replying = ref(false)

function toggleReplyBox() {
  if (!canQuickAction.value) return
  showReplyBox.value = !showReplyBox.value
}

function cancelReply() {
  showReplyBox.value = false
  replyContent.value = ''
}

async function submitReply() {
  const msg = replyContent.value.trim()
  if (!msg || replying.value || !canQuickAction.value) return
  // 楼中楼回复：root 取根评论 rpid，parent 取被回复的那条（source_id）
  const root = rootId.value && rootId.value !== '0' ? rootId.value : targetRpid.value
  replying.value = true
  try {
    const res = await commentApi.add(resourceId.value, resourceType.value, root, targetRpid.value, msg)
    if (res && res.code === 0) {
      ElMessage.success(t('message.replySent'))
      replyContent.value = ''
      showReplyBox.value = false
    } else {
      ElMessage.error(res?.msg || t('message.replyFailed'))
    }
  } catch {
    ElMessage.error(t('message.replyFailed'))
  } finally {
    replying.value = false
  }
}
</script>
