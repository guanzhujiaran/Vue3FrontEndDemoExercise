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
    class="flex mb-(--spacing-8)"
    @mouseenter="is_mouse_in = true"
    @mouseleave="is_mouse_in = false"
    v-loading="is_loading_md"
  >
    <el-avatar
      class="relative left-(--spacing-2) top-(--spacing-2) w-(--component-height-lg) h-(--component-height-lg) origin-left-top shrink-0"
      :size="is_root ? 'var(--spacing-16)' : 'var(--spacing-10)'"
    >
      <img
        :src="reply_item.member.avatar ? reply_item.member.avatar : BiliImg.face.noface"
        referrerpolicy="no-referrer"
        alt="头像加载失败"
      />
    </el-avatar>
    <div class="w-full relative pl-(--spacing-3) pt-(--spacing-2) leading-normal">
      <el-card class="comment-main-card" shadow="never" body-style="border:none;padding:0px;">
        <template #header class="header">
          <div class="inline-flex items-center">
            <div class="text-text-primary text-base font-medium">
              {{ reply_item.member.uname }}
            </div>
            <div class="ml-(--spacing-2) w-(--spacing-3) h-(--spacing-3)">
              <img
                width="100%"
                height="100%"
                :src="`https://i0.hdslb.com/bfs/seed/jinkela/short/webui/user-profile/img/level_${reply_item.member.level_info.current_level ?? 0}.svg`"
                referrerpolicy="no-referrer"
                :alt="JSON.stringify(reply_item.member.level_info.current_level)"
                style="max-width: var(--spacing-5); max-height: var(--spacing-5)"
              />
            </div>
            <div
              id="user-up"
              class="ml-(--spacing-2) w-(--spacing-3) h-(--spacing-3)"
              v-if="up_mid && String(up_mid) === String(reply_item.member.mid)"
            >
              <img
                width="100%"
                height="100%"
                src="//i0.hdslb.com/bfs/seed/jinkela/short/webui/comments/img/icons/up_pb.svg"
                referrerpolicy="no-referrer"
                style="max-width: var(--spacing-5); max-height: var(--spacing-5)"
              />
            </div>
          </div>
        </template>
        <template #default>
          <div class="comment-content">
            <BiliVditorEdit
              v-model="comment_content"
              style="min-height: var(--spacing-10); line-height: var(--spacing-4); overflow: visible; font-size: var(--spacing-4)"
              v-model:is_loading="is_loading_md"
              :is_preview="true"
            />
          </div>
        </template>
        <template #footer>
          <div
            class="w-[-webkit-fill-available] flex items-center relative mt-(--spacing-2) text-md text-text-secondary h-(--component-height-md) flex-wrap [&>:not(:first-child)]:ml-(--spacing-4)"
          >
            <div class="whitespace-nowrap">
              {{ utils.formatDateTS(reply_item.ctime) }}
            </div>
            <div id="like">
              <button
                class="p-0 outline-none border-none bg-transparent h-(--component-height-xs) text-md text-text-secondary inline-flex items-center cursor-pointer align-middle hover:text-primary"
                @click="handleLike"
                :style="{
                  color: String(interact_btn_active) === '1' ? 'var(--color-primary)' : ''
                }"
              >
                <img :src="likeActiveSvg" v-if="interact_btn_active == 1" class="svg-icon" />
                <img :src="likeSvg" v-else class="svg-icon" />
                <span class="ml-(--spacing-2)">{{ reply_item.like }}</span>
              </button>
            </div>
            <div id="dislike">
              <button
                class="p-0 outline-none border-none bg-transparent h-(--component-height-xs) text-md text-text-secondary inline-flex items-center cursor-pointer align-middle hover:text-primary"
                @click="handleHate"
                :style="{
                  color: String(interact_btn_active) === '2' ? 'var(--color-primary)' : ''
                }"
              >
                <img :src="dislikeActiveSvg" fill="currentColor" v-if="interact_btn_active == 2" class="svg-icon" />
                <img :src="dislikeSvg" v-else class="svg-icon" />
                <span class="ml-(--spacing-2)">{{ reply_item.dislike }}</span>
              </button>
            </div>
            <div id="reply">
              <button
                class="p-0 outline-none border-none bg-transparent h-(--component-height-xs) text-md text-text-secondary inline-flex items-center cursor-pointer align-middle hover:text-primary"
                @click="handle_pop_up_reply_area"
              >
                回复
              </button>
            </div>
            <div
              id="more"
              class="ml-auto mr-(--spacing-6) w-(--component-height-base) h-(--component-height-base) relative scale-[1.4] z-[1600]"
              v-show="is_mouse_in || is_comment_menu_open"
              :style="{ 'padding-right': is_root ? '0' : 'var(--spacing-8)' }"
            >
              <button
                class="p-0 outline-none border-none bg-transparent h-(--component-height-xs) text-md text-text-secondary inline-flex items-center cursor-pointer align-middle hover:text-primary"
                @click="() => (is_comment_menu_open = !is_comment_menu_open)"
              >
                <img :src="moreSvg" fill="currentColor" class="svg-icon" />
              </button>
              <div
                class="right-0 absolute top-(--spacing-3) z-[2000]"
                v-show="is_comment_menu_open"
                @mouseleave="is_comment_menu_open = false"
              >
                <ul
                  id="options"
                  class="block absolute top-(--spacing-5) right-0 m-0 p-0 z-10 w-(--spacing-12) list-none rounded-sm text-base text-text-primary bg-bg shadow-[var(--el-box-shadow-light)] overflow-hidden"
                >
                  <li
                    v-if="is_up && is_root"
                    class="box-border w-full flex items-center h-(--spacing-5) px-(--spacing-4) cursor-pointer select-none"
                    @click="handle_top(reply_item)"
                  >
                    置顶
                  </li>
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
                      <li
                        v-if="String(reply_item.member.mid) === String(user_nav.uid) || is_up"
                        class="box-border w-full flex items-center h-(--spacing-5) px-(--spacing-4) cursor-pointer select-none"
                      >
                        删除
                      </li>
                    </template>
                  </el-popconfirm>
                  <li
                    v-if="String(reply_item.member.mid) !== String(user_nav.uid) || is_up"
                    class="box-border w-full flex items-center h-(--spacing-5) px-(--spacing-4) cursor-pointer select-none"
                    @click="handle_black_list(reply_item)"
                  >
                    加入黑名单
                  </li>
                  <li
                    v-if="String(reply_item.member.mid) !== String(user_nav.uid) || is_up"
                    class="box-border w-full flex items-center h-(--spacing-5) px-(--spacing-4) cursor-pointer select-none"
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
      <div
        class="w-fit text-text-regular bg-fill-light p-(--spacing-1) rounded-sm box-border text-xs leading-none"
        v-if="is_root && reply_item.up_action.like"
      >
        UP主觉得很赞
      </div>
    </div>
  </div>
</template>
