<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CommentSectionStat, ReplyItem } from '@/models/api/communication/comment_model.ts'
import utils from '@/utils/mixin.ts'
import feedbackCommentApi from '@/api/feedback/comment.ts'
import biliMessage from '@/utils/message'
import { useDebounceFn } from '@vueuse/core'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'

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

const is_root = computed(() => !BigInt(reply_item.value.root))
const comment_content = computed(() => reply_item.value.content.message ?? '')
const interaction_btn_clickable = ref<boolean>(true)

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
      case 0:
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
      case 1:
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
      case 2:
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

// B站风格: 解析评论内容中的 @提及 和 emoji
const renderedContent = computed(() => {
  let msg = comment_content.value
  // 替换 @用户名 为链接样式
  if (reply_item.value.content.members && reply_item.value.content.members.length > 0) {
    reply_item.value.content.members.forEach((m) => {
      msg = msg.replace(`@${m.uname}`, `<span class="text-primary">@${m.uname}</span>`)
    })
  }
  return msg
})
</script>

<template>
  <div
    class="bili-comment-item flex gap-3 py-3"
    :class="{ 'opacity-70': is_root === false }"
    @mouseenter="is_mouse_in = true"
    @mouseleave="is_mouse_in = false"
  >
    <!-- 左侧头像 -->
    <el-avatar
      :size="is_root ? 48 : 28"
      class="shrink-0 mt-0.5"
    >
      <img
        :src="reply_item.member.avatar || BiliImg.face.noface"
        referrerpolicy="no-referrer"
        alt="头像"
      />
    </el-avatar>

    <!-- 右侧内容 -->
    <div class="flex-1 min-w-0">
      <!-- 用户信息行 -->
      <div class="flex items-center gap-2 mb-1 flex-wrap">
        <span class="text-sm font-medium text-text-primary">{{ reply_item.member.uname }}</span>
        
        <!-- 等级图标 -->
        <img
          v-if="reply_item.member.level_info?.current_level"
          :src="`https://i0.hdslb.com/bfs/seed/jinkela/short/webui/user-profile/img/level_${reply_item.member.level_info.current_level}.svg`"
          class="w-4 h-4"
          referrerpolicy="no-referrer"
          :alt="'Lv' + reply_item.member.level_info.current_level"
        />
        
        <!-- UP主标识 -->
        <span
          v-if="is_root && String(up_mid) === String(reply_item.member.mid)"
          class="inline-flex items-center px-1.5 py-px text-[10px] leading-none rounded-sm bg-primary/15 text-primary font-medium"
        >UP</span>
        
        <!-- 时间 -->
        <span class="text-xs text-text-placeholder ml-auto">{{ utils.formatDateTS(reply_item.ctime) }}</span>
      </div>

      <!-- 评论内容 -->
      <div class="text-sm text-text-primary leading-relaxed mb-2 break-words">
        <span v-html="renderedContent"></span>
      </div>

      <!-- UP主赞过 -->
      <div
        v-if="is_root && reply_item.up_action?.like"
        class="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded-sm bg-primary/8 text-[11px] text-primary"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M14.6 8H12V5.6c0-.7-.6-1.3-1.3-1.3-.3 0-.5.1-.7.3L6.3 9c-.3.3-.3.7-.3 1v9.3c0 .4.3.7.7.7h10.4c.8 0 1.5-.4 1.9-1.1l2.6-5.5c.1-.3.2-.7.1-1-.1-.4-.4-.7-.7-.9-.2-.1-.3-.1-.5-.1H17V6.7c0-.7-.6-1.3-1.3-1.3-.4 0-.8.2-1.1.6zM4 10H2v10h2c.6 0 1-.4 1-1v-8c0-.6-.4-1-1-1z" fill="currentColor"/></svg>
        UP主觉得很赞
      </div>

      <!-- 操作栏 -->
      <div class="flex items-center gap-4 text-text-placeholder text-sm select-none">
        <!-- 点赞 -->
        <button
          class="bili-action-btn flex items-center gap-1 hover:text-primary transition-colors"
          :class="{ 'text-primary!': interact_btn_active === 1 }"
          @click="handleLike"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" :fill="interact_btn_active === 1 ? 'currentColor' : 'none'" :stroke="interact_btn_active === 1 ? 'none' : 'currentColor'" stroke-width="2">
            <path d="M14.6 8H12V5.6c0-.7-.6-1.3-1.3-1.3-.3 0-.5.1-.7.3L6.3 9c-.3.3-.3.7-.3 1v9.3c0 .4.3.7.7.7h10.4c.8 0 1.5-.4 1.9-1.1l2.6-5.5c.1-.3.2-.7.1-1-.1-.4-.4-.7-.7-.9-.2-.1-.3-.1-.5-.1H17V6.7c0-.7-.6-1.3-1.3-1.3-.4 0-.8.2-1.1.6z"/>
          </svg>
          <span v-if="Number(reply_item.like) > 0">{{ reply_item.like }}</span>
        </button>

        <!-- 点踩 -->
        <button
          class="bili-action-btn flex items-center gap-1 hover:text-primary transition-colors"
          :class="{ 'text-primary!': interact_btn_active === 2 }"
          @click="handleHate"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" :fill="interact_btn_active === 2 ? 'currentColor' : 'none'" :stroke="interact_btn_active === 2 ? 'none' : 'currentColor'" stroke-width="2" style="transform: rotate(180deg)">
            <path d="M14.6 8H12V5.6c0-.7-.6-1.3-1.3-1.3-.3 0-.5.1-.7.3L6.3 9c-.3.3-.3.7-.3 1v9.3c0 .4.3.7.7.7h10.4c.8 0 1.5-.4 1.9-1.1l2.6-5.5c.1-.3.2-.7.1-1-.1-.4-.4-.7-.7-.9-.2-.1-.3-.1-.5-.1H17V6.7c0-.7-.6-1.3-1.3-1.3-.4 0-.8.2-1.1.6z"/>
          </svg>
        </button>

        <!-- 回复 -->
        <button
          class="bili-action-btn hover:text-primary transition-colors"
          @click="handle_pop_up_reply_area"
        >
          回复
        </button>

        <!-- 更多菜单 -->
        <div
          class="relative ml-auto"
          v-show="is_mouse_in || is_comment_menu_open"
        >
          <button
            class="bili-action-btn hover:text-primary transition-colors"
            @click="() => (is_comment_menu_open = !is_comment_menu_open)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
          <div
            v-show="is_comment_menu_open"
            class="absolute right-0 top-6 z-50 min-w-[100px] rounded-md bg-bg shadow-lg border border-border-light overflow-hidden"
            @mouseleave="is_comment_menu_open = false"
          >
            <div
              v-if="is_up && is_root"
              class="px-3 py-2 text-sm cursor-pointer hover:bg-bg-secondary transition-colors"
              @click="handle_top(reply_item)"
            >置顶</div>
            <el-popconfirm
              confirm-button-text="删除"
              cancel-button-text="取消"
              title="确定删除这条评论吗？"
              @confirm="handle_delete(reply_item)"
              placement="left"
            >
              <template #reference>
                <div
                  v-if="String(reply_item.member.mid) === String(user_nav.uid) || is_up"
                  class="px-3 py-2 text-sm cursor-pointer hover:bg-bg-secondary transition-colors text-red-400"
                >删除</div>
              </template>
            </el-popconfirm>
            <div
              v-if="String(reply_item.member.mid) !== String(user_nav.uid)"
              class="px-3 py-2 text-sm cursor-pointer hover:bg-bg-secondary transition-colors"
              @click="handle_report(reply_item)"
            >举报</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
