<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CommentSectionStat, ReplyItem } from '@/models/api/communication/comment_model.ts'
import utils from '@/utils/mixin.ts'
import feedbackCommentApi from '@/api/feedback/comment.ts'
import biliMessage from '@/utils/message'
import { useDebounceFn } from '@vueuse/core'
import likeSvg from '@/assets/svgs/like.svg?url'
import likeActiveSvg from '@/assets/svgs/like_active.svg?url'
import dislikeSvg from '@/assets/svgs/dislike.svg?url'
import dislikeActiveSvg from '@/assets/svgs/dislike_active.svg?url'
import moreSvg from '@/assets/svgs/more.svg?url'
import { useUserNavStore } from '@/stores/user_nav.ts'
import BiliVditorEdit from '@/components/CommonCompo/Bili-Markdown-Compo/BiliVditorEdit.vue'
import { BiliImg } from '@/assets/img/BiliImg.ts'

const { user_nav } = useUserNavStore()
const reply_item = defineModel<ReplyItem>('reply_item', { required: true })
const { up_mid, methods } = defineProps<{
  up_mid: string | number
  methods: {
    handle_top: Function
    handle_delete: Function
    handle_black_list: Function
    handle_report: Function
  }
}>()
const { handle_top, handle_delete, handle_black_list, handle_report } = methods
const is_up = computed(() => up_mid && user_nav.uid && String(up_mid) === String(user_nav.uid))
const comment_section_stat = defineModel<CommentSectionStat>('comment_section_stat', {
  required: true
})

defineExpose({ comment_section_stat })

const is_root = computed(() => {
  return !BigInt(reply_item.value.root)
})
const comment_content = computed(() => {
  return reply_item.value.content.message ?? ''
})
const interaction_btn_clickable = ref<boolean>(true)
/**
 *
 * @param rpid
 * @param action
 */
const handle_comment_interaction = async (rpid: string | number, action: 0 | 1 | 2) => {
  let origin_action = reply_item.value.action
  if (origin_action === action) {
    action = 0
  }
  let like_num_change = 0
  let dislike_num_change = 0
  let evt = {
    prev: 0,
    next: action.valueOf()
  }
  for (;;) {
    evt.prev = evt.next
    switch (evt.prev) {
      case 0: //action==0
        if (origin_action === 0) return
        if (origin_action === 1) {
          like_num_change = -1
          evt.next = 99
          break
        }
        if (origin_action === 2) {
          dislike_num_change = 1
          evt.next = 99
          break
        }
        break
      case 1: //action==1
        if (origin_action === 0) {
          like_num_change = 1
          evt.next = 99
          break
        }
        if (origin_action == 1) return
        if (origin_action == 2) {
          dislike_num_change = 1
          like_num_change = 1
          evt.next = 99
          break
        }
        break
      case 2: //action==2
        if (origin_action === 0) {
          dislike_num_change = -1
          evt.next = 99
          break
        }
        if (origin_action == 1) {
          like_num_change = -1
          dislike_num_change = -1
          evt.next = 99
          break
        }
        if (origin_action == 2) return
        break
      case 99:
        await feedbackCommentApi.action(rpid, action).then((resp) => {
          biliMessage.info(resp.msg)
          if (resp.code === 0) {
            reply_item.value.action = action
            reply_item.value.like = (
              BigInt(reply_item.value.like) + BigInt(like_num_change)
            ).toString()
            reply_item.value.dislike = (
              BigInt(reply_item.value.dislike) + BigInt(dislike_num_change)
            ).toString()
          }
        })
        return
    }
  }
}

const handleLike = useDebounceFn(() => {
  if (!interaction_btn_clickable.value) return
  interaction_btn_clickable.value = false
  let { rpid } = reply_item.value
  handle_comment_interaction(rpid, 1).finally(() => {
    interaction_btn_clickable.value = true
  })
})
const handleHate = useDebounceFn(() => {
  if (!interaction_btn_clickable.value) return
  interaction_btn_clickable.value = false
  const { rpid } = reply_item.value
  handle_comment_interaction(rpid, 2).finally(() => {
    interaction_btn_clickable.value = true
  })
})
const handle_pop_up_reply_area = () => {
  comment_section_stat.value.rpidTarget === reply_item.value.rpid ||
  !comment_section_stat.value.is_reply_section_active
    ? (comment_section_stat.value.is_reply_section_active =
        !comment_section_stat.value.is_reply_section_active)
    : undefined
  comment_section_stat.value.replyTarget = reply_item.value.member.uname
  comment_section_stat.value.rid = reply_item.value.rid
  comment_section_stat.value.root = reply_item.value.root
  comment_section_stat.value.parent = reply_item.value.parent
  comment_section_stat.value.rpidTarget = reply_item.value.rpid
  comment_section_stat.value.reply_content = ''
}
const interact_btn_active = computed<number>(() => reply_item.value.action)
const is_mouse_in = ref<boolean>(false)
const is_comment_menu_open = ref<boolean>(false)
const is_loading_md = ref<boolean>(true)
</script>

<template>
  <div
    class="comment-item"
    @mouseenter="is_mouse_in = true"
    @mouseleave="is_mouse_in = false"
    v-loading="is_loading_md"
  >
    <el-avatar class="user-avater" :size="is_root ? 60 : 40">
      <img
        :src="reply_item.member.avatar ? reply_item.member.avatar : BiliImg.face.noface"
        referrerpolicy="no-referrer"
        alt="头像加载失败"
      />
    </el-avatar>
    <div class="comment-main">
      <el-card shadow="never" body-style="border:none;padding:0px;">
        <template #header class="header">
          <div class="user-info">
            <div class="user-name">
              {{ reply_item.member.uname }}
            </div>
            <div class="user-level">
              <img
                width="100%"
                height="100%"
                :src="`https://i0.hdslb.com/bfs/seed/jinkela/short/webui/user-profile/img/level_${reply_item.member.level_info.current_level ?? 0}.svg`"
                referrerpolicy="no-referrer"
                :alt="JSON.stringify(reply_item.member.level_info.current_level)"
                style="max-width: 19px; max-height: 19px"
              />
            </div>
            <div id="user-up" v-if="up_mid && String(up_mid) === String(reply_item.member.mid)">
              <img
                width="100%"
                height="100%"
                src="//i0.hdslb.com/bfs/seed/jinkela/short/webui/comments/img/icons/up_pb.svg"
                referrerpolicy="no-referrer"
                style="max-width: 19px; max-height: 19px"
              />
            </div>
          </div>
        </template>
        <template #default>
          <div class="comment-content">
            <BiliVditorEdit
              v-model="comment_content"
              style="min-height: 40px; line-height: 16px; overflow: visible; font-size: 16px"
              v-model:is_loading="is_loading_md"
              :is_preview="true"
            />
          </div>
        </template>
        <template #footer>
          <div class="comment-footer">
            <div class="pubdate">
              {{ utils.formatDateTS(reply_item.ctime) }}
            </div>
            <div id="like">
              <button
                class="like-btn"
                @click="handleLike"
                :style="{
                  color: String(interact_btn_active) === '1' ? 'var(--el-color-primary)' : ''
                }"
              >
                <img :src="likeActiveSvg" v-if="interact_btn_active == 1" class="svg-icon" />
                <img :src="likeSvg" v-else class="svg-icon" />
                <span id="count">{{ reply_item.like }}</span>
              </button>
            </div>
            <div id="dislike">
              <button
                class="dislike-btn"
                @click="handleHate"
                :style="{
                  color: String(interact_btn_active) === '2' ? 'var(--el-color-primary)' : ''
                }"
              >
                <img :src="dislikeActiveSvg" fill="currentColor" v-if="interact_btn_active == 2" class="svg-icon" />
                <img :src="dislikeSvg" v-else class="svg-icon" />
                <span id="count">{{ reply_item.dislike }}</span>
              </button>
            </div>
            <div id="reply">
              <button class="reply-btn" @click="handle_pop_up_reply_area">回复</button>
            </div>
            <div
              id="more"
              v-show="is_mouse_in || is_comment_menu_open"
              :style="{ 'padding-right': is_root ? '0' : '32px' }"
            >
              <button
                class="more-btn"
                @click="() => (is_comment_menu_open = !is_comment_menu_open)"
              >
                <img :src="moreSvg" fill="currentColor" class="svg-icon" />
              </button>
              <div
                class="comment-menu"
                v-show="is_comment_menu_open"
                @mouseleave="is_comment_menu_open = false"
              >
                <ul id="options">
                  <li v-if="is_up && is_root" @click="handle_top(reply_item)">置顶</li>
                  <el-popconfirm
                    :show-arrow="false"
                    confirm-button-text="是"
                    cancel-button-text="否"
                    icon=""
                    title="是否删除评论？"
                    @confirm="handle_delete(reply_item)"
                    placement="top"
                    :offset="12"
                  >
                    <template #reference>
                      <li v-if="String(reply_item.member.mid) === String(user_nav.uid) || is_up">
                        删除
                      </li>
                    </template>
                  </el-popconfirm>
                  <li
                    v-if="String(reply_item.member.mid) !== String(user_nav.uid) || is_up"
                    @click="handle_black_list(reply_item)"
                  >
                    加入黑名单
                  </li>
                  <li
                    v-if="String(reply_item.member.mid) !== String(user_nav.uid) || is_up"
                    @click="handle_report(reply_item)"
                  >
                    举报
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </template>
      </el-card>
      <div class="comment-tag" v-if="is_root && reply_item.up_action.like">UP主觉得很赞</div>
    </div>
  </div>
</template>

<style scoped>
#options li {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  height: calc(var(--component-size) * 1.3125);
  padding: 0 calc(var(--component-spacing) * 4);
  cursor: pointer;
  user-select: none;
}

#options {
  display: block;
  position: absolute;
  top: calc(var(--component-spacing) * 5);
  right: 0;
  margin: 0;
  padding: 0;
  z-index: 10;
  width: calc(var(--component-size) * 4.6875);
  list-style: none;
  border-radius: calc(var(--component-size) * 0.1875);
  font-size: var(--component-size);
  color: var(--el-text-color-primary);
  background-color: var(--el-bg-color);
  box-shadow: var(--el-box-shadow-light);
  overflow: hidden;
}

.comment-menu {
  right: 0;
  position: absolute;
  top: calc(var(--component-spacing) * 3);
  z-index: 2000;
}

#more {
  margin-left: auto;
  margin-right: calc(var(--component-spacing) * 6);
  width: calc(var(--component-size) * 1);
  height: calc(var(--component-size) * 1);
  position: relative;
  scale: 1.4;
  z-index: 1600;
}

#count {
  margin-left: calc(var(--component-spacing) * 1.6);
}

.comment-tag {
  width: fit-content;
  color: var(--el-text-color-regular);
  background-color: var(--el-fill-color-light);
  padding: calc(var(--component-spacing) * 1);
  border-radius: calc(var(--component-size) * 0.09375);
  box-sizing: border-box;
  font-size: calc(var(--component-size) * 0.34375);
  line-height: 1;
}

.like-btn:hover,
.dislike-btn:hover,
.reply-btn:hover,
.more-btn:hover {
  color: var(--el-color-primary);
}

.like-btn,
.dislike-btn,
.reply-btn,
.more-btn {
  padding: 0;
  outline: none;
  border: none;
  background: transparent;
  height: calc(var(--component-size) * 0.75);
  font-size: calc(var(--component-size) * 0.4375);
  color: var(--el-text-color-secondary);
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  vertical-align: middle;
}

.comment-footer > :not(:first-child) {
  margin-left: calc(var(--component-spacing) * 3.8);
}

.comment-content :deep(.v-note-wrapper) {
  border: unset;
}

.comment-footer {
  width: -webkit-fill-available;
  display: flex;
  align-items: center;
  position: relative;
  margin-top: calc(var(--component-spacing) * 1.6);
  font-size: calc(var(--component-size) * 0.4375);
  color: var(--el-text-color-secondary);
  height: calc(var(--component-size) * 1.5625);
  flex-wrap: wrap;
}

.comment-footer .pubdate {
  white-space: nowrap;
}

.comment-main :deep(.el-card) {
  overflow: visible;
  border: none;
}

.comment-main :deep(.el-card__footer) {
  border-top: none;
  padding: 0;
}

.comment-main :deep(.el-card__header) {
  border-bottom: none;
  margin-bottom: calc(var(--component-spacing) * 1.6);
  padding: 0;
}

.user-level {
  margin-left: calc(var(--component-spacing) * 1.6);
  width: calc(var(--component-size) * 0.59375);
  height: calc(var(--component-size) * 0.59375);
}

.user-info #user-up {
  margin-left: calc(var(--component-spacing) * 1.6);
  width: calc(var(--component-size) * 0.59375);
  height: calc(var(--component-size) * 0.59375);
}

.user-name {
  color: var(--el-text-color-primary);
  font-size: var(--component-size);
  font-weight: 500;
}

.user-info {
  display: inline-flex;
  align-items: center;
}

.comment-item {
  display: flex;
  margin-bottom: calc(var(--component-spacing) * 4.8);
}

.comment-main {
  width: 100%;
  position: relative;
  padding-left: calc(var(--component-spacing) * 2.6);
  padding-top: calc(var(--component-spacing) * 1.6);
  line-height: var(--component-line-height);
}

.user-avater {
  position: relative;
  left: calc(var(--component-spacing) * 1.6);
  top: calc(var(--component-spacing) * 1.6);
  width: calc(var(--component-size) * 1.25);
  height: calc(var(--component-size) * 1.25);
  transform-origin: left top;
  transform: scale(1);
  flex-shrink: 0;
}
</style>
