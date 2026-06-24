<script setup lang="ts">
import comment_item from '@/components/communicate_list/comment_item.vue'
import type {
  CommentSectionBaseInfo,
  CommentSectionStat,
  ReplyItem,
  ReplyMainResp
} from '@/models/api/communication/comment_model'
import submit_comment_section from '@/components/communicate_list/submit_comment_section.vue'
import { computed, onMounted, ref, watch, useTemplateRef } from 'vue'
import feedbackCommentApi from '@/api/feedback/comment.ts'
import biliMessage from '@/utils/message'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'

const is_expander_active_set = ref<Set<string | number>>(new Set())
const expander_reply_loading_set = ref<Set<string | number>>(new Set())
const comment_content = ref<string>('')
/**
 * 直接传入一个待获取评论的content_id
 */
const comment_section_base_info = defineModel<CommentSectionBaseInfo>('comment_section_base_info', {
  required: true
})
/**
 * 当前页面数
 */
const is_loading_comment = ref<boolean>(false)
const init_page_data = defineProps<{
  current_page?: number
  sort_by?: 'hot' | 'time'
}>()
const data = ref<{
  current_page: number
  sort_by: 'hot' | 'time'
}>({
  current_page: init_page_data.current_page ?? 1,
  sort_by: init_page_data.sort_by ?? 'hot'
})

watch(
  () => ({ ...data.value }), // 监听整个对象的变化
  (newVal, oldVal) => {
    if (oldVal.sort_by !== newVal.sort_by && newVal.current_page !== 1) {
      data.value.current_page = 1
      return
    }
    handle_get_reply_main()
  },
  { deep: true } // 确保组件初始化时也调用一次 API
)
const comment_list_resp = ref<ReplyMainResp>({
  replies: [],
  top_replies: [],
  total_num: 0,
  cur_page: 0,
  upper: {
    mid: 0
  }
})
const handle_get_reply_main = () => {
  is_loading_comment.value = true
  feedbackCommentApi
    .reply_main(
      comment_section_base_info.value.oid,
      comment_section_base_info.value.type,
      10,
      data.value.current_page,
      data.value.sort_by
    )
    .then((resp) => {
      if (resp.code) {
        return biliMessage.error(resp.msg)
      }
      comment_list_resp.value = resp.data
    })
    .finally(() => {
      is_loading_comment.value = false
    })
}

const comment_section_stat = ref<CommentSectionStat>({
  is_reply_section_active: false,
  replyTarget: '',
  rpidTarget: '',
  rid: '',
  root: '',
  parent: '',
  reply_content: ''
})

const comment_reply_input_placeholder = computed(() => {
  return `回复 @`.concat(String(comment_section_stat.value.replyTarget ?? '')).concat(': ')
})
const submit_comment_reply = async () => {
  let { root, rpidTarget, reply_content } = comment_section_stat.value
  if (!reply_content?.trim()?.length) {
    return (biliMessage.error('评论内容不能为空'), false)
  }
  return await feedbackCommentApi
    .add(
      comment_section_base_info.value.oid,
      comment_section_base_info.value.type,
      BigInt(root) ? root : rpidTarget,
      BigInt(root) ? rpidTarget : 0,
      reply_content
    )
    .then((resp) => {
      if (resp.code) {
        return (biliMessage.error(resp.msg), false)
      }
      comment_list_resp.value.replies.map((replies) => {
        if (replies.rpid === rpidTarget || replies.rpid === root) {
          replies.replies.push(resp.data)
          replies.rcount = (BigInt(replies.rcount) + 1n).toString()
        }
      })

      biliMessage.success('评论成功')
      comment_section_stat.value.is_reply_section_active = false
      comment_section_stat.value.replyTarget = ''
      comment_section_stat.value.rpidTarget = ''
      comment_section_stat.value.rid = ''
      comment_section_stat.value.root = ''
      comment_section_stat.value.parent = ''
      comment_section_stat.value.reply_content = ''
      return true
    })
}
const submit_comment = async () => {
  if (!comment_content.value.trim().length) {
    return (biliMessage.error('评论内容不能为空'), false)
  }
  return await feedbackCommentApi
    .add(
      comment_section_base_info.value.oid,
      comment_section_base_info.value.type,
      0,
      0,
      comment_content.value
    )
    .then((resp) => {
      if (resp.code) {
        return (biliMessage.error(resp.msg), false)
      }
      comment_list_resp.value.replies.unshift(resp.data)
      biliMessage.success('评论成功')
      comment_content.value = ''
      comment_list_resp.value.total_num = comment_list_resp.value.total_num + 1
      return true
    })
}
const globalVars = useInject(KeysEnum.GlobalVars) as Ref<GlobalVarsType>
const isSmallScreen = computed(() => {
  return globalVars.value.screen_size !== ScreenTypeEnum.large
})
const paginationLayout = computed(() => {
  return isSmallScreen.value ? 'prev, pager, next, slot' : 'prev, pager, next, jumper, slot'
})

const handle_top = (reply_item: ReplyItem) => {
  console.log(reply_item)
  biliMessage.info(`待实现置顶评论功能${JSON.stringify(reply_item)}`)
}
const handle_delete = (reply_item: ReplyItem) => {
  feedbackCommentApi
    .del(comment_section_base_info.value.oid, comment_section_base_info.value.type, reply_item.rpid)
    .then((resp) => {
      resp.code === 0 ? biliMessage.info(resp.msg) : biliMessage.error(resp.msg)
      if (resp.code === 0) {
        comment_list_resp.value.replies = comment_list_resp.value.replies.filter((item) => {
          let origin_length = item.replies.length
          item.replies = item.replies.filter((_item) => _item.rpid !== reply_item.rpid)
          if (origin_length > item.replies.length) {
            item.rcount = (BigInt(item.rcount) - 1n).toString()
          }
          return item.rpid !== reply_item.rpid
        })
        comment_list_resp.value.top_replies = comment_list_resp.value.top_replies.filter((item) => {
          let origin_length = item.replies.length
          item.replies = item.replies.filter((_item) => _item.rpid !== reply_item.rpid)
          if (origin_length > item.replies.length) {
            item.rcount = (BigInt(item.rcount) - 1n).toString()
          }
          return item.rpid !== reply_item.rpid
        })
        if (!reply_item.root && reply_item.parent)
          comment_list_resp.value.total_num = comment_list_resp.value.total_num - 1
      }
    })
}
const handle_black_list = (reply_item: ReplyItem) => {
  console.log(reply_item)
  biliMessage.info(`待实现添加黑名单用户功能${JSON.stringify(reply_item)}`)
}
const handle_report = (reply_item: ReplyItem) => {
  console.log(reply_item)
  biliMessage.info(`待实现举报评论功能${JSON.stringify(reply_item)}`)
}

const handle_comment_reply_page_change = (reply_item: ReplyItem, page_num: number) => {
  expander_reply_loading_set.value.add(reply_item.rpid)
  feedbackCommentApi
    .reply_reply(
      comment_section_base_info.value.oid,
      comment_section_base_info.value.type,
      reply_item.rpid,
      10,
      page_num
    )
    .then((resp) => {
      resp.code === 0
        ? ((reply_item.replies = resp.data.replies),
          (reply_item.rcount = resp.data.total_num),
          (reply_item.current_page = resp.data.cur_page))
        : {}
      resp.code === 0 ? biliMessage.info(resp.msg) : biliMessage.error(resp.msg)
      expander_reply_loading_set.value.delete(reply_item.rpid)
    })
}
onMounted(() => {
  handle_get_reply_main()
})
</script>

<template>
  <div class="bili-comment-section flex flex-col" ref="comment_section" v-loading="is_loading_comment">
    <!-- 评论头部：标题 + 排序 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="m-0 text-base font-bold text-text-primary">评论</h2>
        <span class="text-sm text-text-placeholder">{{ comment_list_resp.total_num }}</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="text-sm cursor-pointer border-none bg-transparent px-0 transition-colors"
          :class="data.sort_by === 'hot' ? 'text-primary font-medium' : 'text-text-placeholder hover:text-text-secondary'"
          @click="() => (data.sort_by = 'hot')"
        >
          按热度
        </button>
        <span class="text-text-placeholder text-xs">|</span>
        <button
          class="text-sm cursor-pointer border-none bg-transparent px-0 transition-colors"
          :class="data.sort_by === 'time' ? 'text-primary font-medium' : 'text-text-placeholder hover:text-text-secondary'"
          @click="() => (data.sort_by = 'time')"
        >
          按时间
        </button>
      </div>
    </div>

    <!-- 提交评论输入区 -->
    <div class="submit-comment-section-wrap w-full max-w-4xl mb-6">
      <submit_comment_section
        :submit_comment="submit_comment"
        placeholder="发一条友善的评论"
        v-model:comment_content="comment_content"
      />
    </div>

    <!-- 评论列表 -->
    <div class="comment-list-section w-full max-w-4xl" v-if="comment_list_resp.replies.length">
      <ul class="p-0 m-0 list-none">
        <li v-for="(__comment_item, idx) in comment_list_resp.replies" :key="idx" class="border-b border-border-lighter last:border-b-0">
          <!-- 主评论 -->
          <comment_item
            v-if="comment_list_resp.replies[idx]"
            :up_mid="comment_list_resp.upper.mid"
            :methods="{
              handle_top,
              handle_delete,
              handle_black_list,
              handle_report
            }"
            v-model:comment_section_stat="comment_section_stat"
            v-model:reply_item="comment_list_resp.replies[idx]"
          />

          <!-- 子回复区 -->
          <div class="bili-sub-reply-section" v-if="comment_list_resp.replies[idx]">
            <!-- 已加载的子回复列表 -->
            <ul
              class="list-none m-0 p-0"
              v-if="comment_list_resp.replies[idx].replies && comment_list_resp.replies[idx].replies.length > 0"
              v-loading="expander_reply_loading_set.has(comment_list_resp.replies[idx].rpid || '')"
            >
              <li
                v-for="(__comment_reply_item, cr_idx) in comment_list_resp.replies[idx].replies"
                :key="`${idx}_${cr_idx}`"
                class="ml-12 pl-4 py-2 border-l-2 border-border-lighter bg-bg-secondary/30 rounded-r-md"
              >
                <comment_item
                  v-if="comment_list_resp.replies[idx] && comment_list_resp.replies[idx].replies && comment_list_resp.replies[idx].replies[cr_idx]"
                  :up_mid="comment_list_resp.upper.mid"
                  :methods="{
                    handle_top,
                    handle_delete,
                    handle_black_list,
                    handle_report
                  }"
                  v-model:comment_section_stat="comment_section_stat"
                  v-model:reply_item="comment_list_resp.replies[idx].replies[cr_idx]"
                />
              </li>
            </ul>

            <!-- 查看更多子回复 / 分页 -->
            <div class="ml-12 pl-4 text-sm text-text-placeholder mt-1">
              <!-- 未展开：显示"共X条回复" -->
              <div
                class="view-more py-1"
                v-if="
                  comment_list_resp.replies[idx] &&
                  BigInt(comment_list_resp.replies[idx].rcount) >
                    BigInt(comment_list_resp.replies[idx].replies?.length || 0) &&
                  !is_expander_active_set.has(comment_list_resp.replies[idx].rpid || '')
                "
              >
                <span
                  class="inline-flex items-center gap-1 cursor-pointer text-primary hover:text-primary/80 transition-colors"
                  @click="
                    () => {
                      if (comment_list_resp.replies[idx]) {
                        is_expander_active_set.add(comment_list_resp.replies[idx].rpid)
                        handle_comment_reply_page_change(comment_list_resp.replies[idx], 1)
                      }
                    }
                  "
                >
                  共 {{ comment_list_resp.replies[idx].rcount }} 条回复
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                </span>
              </div>

              <!-- 已展开：分页器 -->
              <el-pagination
                v-if="comment_list_resp.replies[idx] && is_expander_active_set.has(comment_list_resp.replies[idx].rpid || '')"
                class="mt-2"
                size="small"
                background
                :hide-on-single-page="true"
                :total="parseInt(BigInt(comment_list_resp.replies[idx].rcount || 0).toString())"
                :page-size="10"
                :pager-count="5"
                layout="prev, pager, next"
                prev-text="上一页"
                next-text="下一页"
                v-model:current-page="comment_list_resp.replies[idx].current_page"
                @update:current-page="
                  (cur_page) => {
                    if (comment_list_resp.replies[idx]) {
                      handle_comment_reply_page_change(comment_list_resp.replies[idx], cur_page)
                    }
                  }
                "
              />
            </div>
          </div>

          <!-- 子回复提交区 -->
          <div
            class="ml-12 pl-4 mt-3 mb-2"
            v-if="
              comment_section_stat.is_reply_section_active &&
              (comment_section_stat.root === __comment_item.rpid ||
                comment_section_stat.rpidTarget === __comment_item.rpid)
            "
          >
            <submit_comment_section
              :submit_comment="submit_comment_reply"
              :placeholder="comment_reply_input_placeholder"
              v-model:comment_content="comment_section_stat.reply_content"
            />
          </div>
        </li>
      </ul>

      <!-- 底部分页 -->
      <div class="flex justify-center py-6">
        <el-pagination
          size="small"
          background
          :layout="paginationLayout"
          :total="comment_list_resp.total_num"
          v-model:current-page="data.current_page"
          :pager-count="5"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-text-placeholder">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <p class="mt-3 text-sm">还没有评论，快来抢沙发吧~</p>
    </div>
  </div>
</template>