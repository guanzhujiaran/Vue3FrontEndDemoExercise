<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CommentSectionStat, ReplyItem } from '@/models/communication/comment_model.ts'
import utils from '@/utils/mixin.ts'
import feedbackCommentApi from '@/api/feedback/comment.ts'
import emitter from '@/utils/mitt.ts'
import { useDebounceFn } from '@vueuse/core'
import { SVG } from '@/assets/svgs.ts'

const reply_item = defineModel<ReplyItem>('reply_item', { required: true })
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
const handle_mouse_enter = () => {
  is_mouse_in.value = true
}
const handle_mouse_leave = () => {
  // is_mouse_in.value = false
}
</script>

<template>
  <div class="comment-item" @mouseenter="handle_mouse_enter" @mouseleave="handle_mouse_leave">
    <el-avatar class="user-avater" :size="is_root ? 'large' : 'small'">
      <img
        :src="
          reply_item.member.avatar
            ? reply_item.member.avatar
            : 'https://static.hdslb.com/images/member/noface.gif'
        "
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
                width="30"
                height="30"
                :src="`https://i0.hdslb.com/bfs/seed/jinkela/short/webui/user-profile/img/level_${reply_item.member.level_info.current_level ?? 0}.svg`"
                alt="加载失败"
                referrerpolicy="no-referrer"
              />
            </div>
          </div>
        </template>
        <template #default>
          <div class="comment-content">
            <mavon-editor
              :model-value="comment_content"
              :subfield="false"
              defaultOpen="preview"
              :toolbarsFlag="false"
              :editable="false"
              :scrollStyle="true"
              editor-background="transparent"
              previewBackground="transparent"
              :box-shadow="false"
              style="min-height: 2rem; line-height: 2rem; min-width: 2rem; font-size: 1.25rem"
            >
            </mavon-editor>
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
                :style="{ color: interact_btn_active == 1 ? '#00AEEC' : '' }"
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
                :style="{ color: interact_btn_active == 2 ? '#00AEEC' : '' }"
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
              v-show="is_mouse_in"
              :style="{ 'padding-right': is_root ? '0' : '2rem' }"
            >
              <button class="more-btn">
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
            </div>
          </div>
        </template>
      </el-card>
      <div class="comment-tag" v-if="is_root && reply_item.up_action.like">UP主觉得很赞</div>
    </div>
  </div>
</template>

<style scoped>
#more {
  margin-left: auto;
  margin-right: 20px;
  width: 24px;
  height: 24px;
  position: relative;
}

#count {
  margin-left: 5px;
}

.comment-tag {
  width: fit-content;
  color: #757575;
  background-color: #f4f4f4;
  padding: 0.375rem;
  border-radius: 0.125rem;
  box-sizing: border-box;
  font-size: 0.75rem;
  line-height: 1;
}

svg:not(:root) {
  overflow-clip-margin: content-box;
  overflow: hidden;
  width: 1rem;
  height: 1rem;
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
  height: 1.5rem;
  font-size: 1rem;
  color: #9499a0;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  vertical-align: middle;
}

.comment-footer > :not(:first-child) {
  margin-left: 1.25rem;
}

.comment-content :deep(.v-note-wrapper) {
  border: unset;
}

.comment-content :deep(.v-show-content) {
  padding: 0 !important;
}

.comment-footer {
  width: 100%;
  display: flex;
  align-items: center;
  position: relative;
  margin-top: 0.2rem;
  font-size: 1rem;
  color: #9499a0;
  height: 100%;
}

.comment-main :deep(.el-card) {
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
  width: 1.875rem;
  height: 1.875rem;
}

.user-name {
  color: #61666d;
  font-size: 0.9rem;
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
  position: relative;
  padding-left: 0.5rem;
  padding-top: 1rem;
  width: 100%;
  line-height: 1.5;
}

.user-avater {
  position: relative;
  left: 0.5rem;
  top: 0.5rem;
  width: 3.5rem;
  height: 3.5rem;
  transform-origin: left top;
  transform: scale(0.83333333);
  flex-shrink: 0;
}
</style>
