<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CommentSectionStat, ReplyItem } from '@/models/communication/comment_model.ts'
import utils from '@/utils/mixin.ts'
import feedbackCommentApi from '@/api/feedback/comment.ts'
import emitter from '@/utils/mitt.ts'
import { useDebounceFn } from '@vueuse/core'
import { SVG } from '@/assets/svgs.ts'
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
          emitter.emit('toast', { t: resp.msg, e: 'info' })
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
    <el-avatar class="user-avater" :size="is_root ? 'large' : 'small'">
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
              />
            </div>
            <div id="user-up" v-if="up_mid && String(up_mid) === String(reply_item.member.mid)">
              <img
                width="100%"
                height="100%"
                src="//i0.hdslb.com/bfs/seed/jinkela/short/webui/comments/img/icons/up_pb.svg"
                referrerpolicy="no-referrer"
              />
            </div>
          </div>
        </template>
        <template #default>
          <div class="comment-content">
            <BiliVditorEdit
              v-model="comment_content"
              style="min-height: 2rem; line-height: 0.5rem; overflow: visible; font-size: 0.5rem"
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
                :style="{ color: String(interact_btn_active) === '1' ? '#00AEEC' : '' }"
              >
                <svg
                  v-if="interact_btn_active == 1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path :d="SVG.like_active.path" fill="currentColor"></path>
                </svg>
                <svg v-else viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path :d="SVG.like.path" fill="currentColor" />
                </svg>
                <span id="count">{{ reply_item.like }}</span>
              </button>
            </div>
            <div id="dislike">
              <button
                class="dislike-btn"
                @click="handleHate"
                :style="{ color: String(interact_btn_active) === '2' ? '#00AEEC' : '' }"
              >
                <svg
                  v-if="interact_btn_active == 2"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path :d="SVG.dislike_active.path" fill="currentColor"></path>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path :d="SVG.dislike.path" fill="currentColor" />
                </svg>
                <span id="count">{{ reply_item.dislike }}</span>
              </button>
            </div>
            <div id="reply">
              <button class="reply-btn" @click="handle_pop_up_reply_area">回复</button>
            </div>
            <div
              id="more"
              v-show="is_mouse_in || is_comment_menu_open"
              :style="{ 'padding-right': is_root ? '0' : '2rem' }"
            >
              <button
                class="more-btn"
                @click="() => (is_comment_menu_open = !is_comment_menu_open)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path :d="SVG.more.path" fill="currentColor"></path>
                </svg>
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
  height: 36px;
  padding: 0 15px;
  cursor: pointer;
  user-select: none;
}

#options {
  display: block;
  position: absolute;
  top: 20px;
  right: 0;
  margin: 0;
  padding: 0;
  z-index: 10;
  width: 120px;
  list-style: none;
  border-radius: 4px;
  font-size: 14px;
  color: #61666d;
  background-color: #ffffff;
  box-shadow: rgba(0, 0, 0, 0.2) 0 0 5px;
  overflow: hidden;
}

.comment-menu {
  right: 0;
  position: absolute;
  top: 10px;
  z-index: 2000;
}

#more {
  margin-left: auto;
  margin-right: 20px;
  width: 24px;
  height: 24px;
  position: relative;
  scale: 1.2;
  z-index: 1600;
}

#count {
  margin-left: 5px;
}

.comment-tag {
  width: fit-content;
  color: #757575;
  background-color: #f4f4f4;
  padding: 0.175rem;
  border-radius: 0.125rem;
  box-sizing: border-box;
  font-size: 0.35rem;
  line-height: 1;
}

svg:not(:root) {
  width: 0.675rem;
  height: 0.675rem;
}

.like-btn:hover,
.dislike-btn:hover,
.reply-btn:hover,
.more-btn:hover {
  color: #00aeec;
}

.like-btn,
.dislike-btn,
.reply-btn,
.more-btn {
  padding: 0;
  outline: none;
  border: none;
  background: transparent;
  height: 0.875rem;
  font-size: 0.5rem;
  color: #9499a0;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  vertical-align: middle;
}

.comment-footer > :not(:first-child) {
  margin-left: 0.7rem;
}

.comment-content :deep(.v-note-wrapper) {
  border: unset;
}

.comment-footer {
  width: 100%;
  display: flex;
  align-items: center;
  position: relative;
  margin-top: 0.2rem;
  font-size: 0.5rem;
  color: #9499a0;
  height: 100%;
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
  margin-bottom: 0.2rem;
  padding: 0;
}

.user-level {
  margin-left: 0.3125rem;
  width: 0.7rem;
  height: 0.7rem;
}

.user-info #user-up {
  margin-left: 0.3125rem;
  width: 0.7rem;
  height: 0.7rem;
}

.user-name {
  color: #61666d;
  font-size: 0.5rem;
  font-weight: 500;
}

.user-info {
  display: inline-flex;
  align-items: center;
}

.comment-item {
  display: flex;
}

.comment-main {
  width: 100%;
  position: relative;
  padding-left: 0.25rem;
  padding-top: 0.2rem;
  line-height: 1.5;
}

.user-avater {
  position: relative;
  left: 0.25rem;
  top: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  transform-origin: left top;
  transform: scale(0.83333333);
  flex-shrink: 0;
}
</style>
