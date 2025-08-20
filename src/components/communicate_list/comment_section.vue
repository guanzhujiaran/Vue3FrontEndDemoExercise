<script setup lang="ts">
import comment_item from '@/components/communicate_list/comment_item.vue'
import type {
  CommentSectionBaseInfo,
  CommentSectionStat,
  ReplyItem,
  ReplyMainResp
} from '@/models/communication/comment_model'
import submit_comment_section from '@/components/communicate_list/submit_comment_section.vue'
import { computed, onMounted, ref, watch, useTemplateRef, onUnmounted } from 'vue'
import feedbackCommentApi from '@/api/feedback/comment.ts'
import emitter from '@/utils/mitt.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import { type GlobalVarsType, ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'
import { useDebounceFn } from '@vueuse/core'

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
        return emitter.emit('toast', { t: resp.msg, e: 'error' })
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
    return (emitter.emit('toast', { t: '评论内容不能为空', e: 'error' }), false)
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
        return (emitter.emit('toast', { t: resp.msg, e: 'error' }), false)
      }
      comment_list_resp.value.replies.map((replies) => {
        if (replies.rpid === rpidTarget || replies.rpid === root) {
          replies.replies.push(resp.data)
          replies.rcount = (BigInt(replies.rcount) + 1n).toString()
        }
      })

      emitter.emit('toast', { t: '评论成功', e: 'success' })
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
    return (emitter.emit('toast', { t: '评论内容不能为空', e: 'error' }), false)
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
        return (emitter.emit('toast', { t: resp.msg, e: 'error' }), false)
      }
      comment_list_resp.value.replies.unshift(resp.data)
      emitter.emit('toast', { t: '评论成功', e: 'success' })
      comment_content.value = ''
      comment_list_resp.value.total_num = comment_list_resp.value.total_num + 1
      return true
    })
}
const globalVars = useInject(KeysEnum.globalVars) as Ref<GlobalVarsType>
const isSmallScreen = computed(() => {
  return globalVars.value.screen_size !== ScreenTypeEnum.large
})
const paginationLayout = computed(() => {
  return isSmallScreen.value ? 'prev, pager, next, slot' : 'prev, pager, next, jumper, slot'
})

const handle_top = (reply_item: ReplyItem) => {
  console.log(reply_item)
  emitter.emit('toast', { t: `待实现置顶评论功能${JSON.stringify(reply_item)}`, e: 'info' })
}
const handle_delete = (reply_item: ReplyItem) => {
  feedbackCommentApi
    .del(comment_section_base_info.value.oid, comment_section_base_info.value.type, reply_item.rpid)
    .then((resp) => {
      emitter.emit('toast', {
        t: resp.msg,
        e: resp.code === 0 ? 'info' : 'error'
      })
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
  emitter.emit('toast', { t: `待实现添加黑名单用户功能${JSON.stringify(reply_item)}`, e: 'info' })
}
const handle_report = (reply_item: ReplyItem) => {
  console.log(reply_item)
  emitter.emit('toast', { t: `待实现举报评论功能${JSON.stringify(reply_item)}`, e: 'info' })
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
      emitter.emit('toast', {
        t: resp.msg,
        e: resp.code === 0 ? 'info' : 'error'
      })
      expander_reply_loading_set.value.delete(reply_item.rpid)
    })
}
onMounted(() => {
  handle_get_reply_main()
  window.addEventListener('resize', handle_view_width_change)
  handle_view_width_change()
})
const comment_list_width = ref(0)
const handle_view_width_change = useDebounceFn(() => {
  let expected_width = Math.ceil(
    globalVars.value.screen_size === 'large' || globalVars.value.screen_size === 'medium'
      ? 0.7 * innerWidth
      : 0.75 * innerWidth
  )
  comment_list_width.value = expected_width > 1920 ? 1920 : expected_width
}, 200)
onUnmounted(() => {
  window.removeEventListener('resize', handle_view_width_change)
})
</script>

<template>
  <div class="comment-section" ref="comment_section" v-loading="is_loading_comment">
    <div class="navbar">
      <div class="comment-title">
        <h2>评论</h2>
        <div class="comment-count">
          {{ comment_list_resp.total_num }}
        </div>
      </div>
      <div class="sort-actions">
        <button
          class="sort-btn"
          :class="data.sort_by === 'hot' ? 'active' : ''"
          @click="() => (data.sort_by = 'hot')"
        >
          最热
        </button>
        <div class="sort-div"></div>
        <button
          class="sort-btn"
          :class="data.sort_by === 'time' ? 'active' : ''"
          @click="() => (data.sort_by = 'time')"
        >
          最新
        </button>
      </div>
    </div>
    <div class="submit-comment-section-wrap">
      <submit_comment_section
        :submit_comment="submit_comment"
        placeholder="输入提交反馈评论..."
        v-model:comment_content="comment_content"
        :style="{
          'max-width': `${comment_list_width}px`
        }"
      />
    </div>
    <div class="comment-list-section" v-if="comment_list_resp.replies.length">
      <ul
        class="comment-list"
        :style="{
          width: comment_list_width + 'px'
        }"
      >
        <li v-for="(__comment_item, idx) in comment_list_resp.replies" :key="idx">
          <comment_item
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
          <div class="replies">
            <div class="expander">
              <div class="expander-contents">
                <ul
                  v-if="comment_list_resp.replies[idx].replies.length > 0"
                  v-loading="expander_reply_loading_set.has(comment_list_resp.replies[idx].rpid)"
                >
                  <li
                    v-for="(__comment_reply_item, cr_idx) in comment_list_resp.replies[idx].replies"
                    :key="`${idx}_${cr_idx}`"
                  >
                    <comment_item
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
                <div class="expander-footer">
                  <div
                    class="view-more"
                    v-if="
                      BigInt(comment_list_resp.replies[idx].rcount) >
                        BigInt(comment_list_resp.replies[idx].replies.length) &&
                      !is_expander_active_set.has(comment_list_resp.replies[idx].rpid)
                    "
                  >
                    <span>共 {{ comment_list_resp.replies[idx].rcount }} 条回复，</span>
                    <button
                      class="button"
                      @click="
                        () => {
                          is_expander_active_set.add(comment_list_resp.replies[idx].rpid)
                          handle_comment_reply_page_change(comment_list_resp.replies[idx], 1)
                        }
                      "
                    >
                      点击查看
                    </button>
                  </div>
                  <el-pagination
                    v-if="is_expander_active_set.has(comment_list_resp.replies[idx].rpid)"
                    class="reply-pagination"
                    size="default"
                    :hide-on-single-page="true"
                    :total="parseInt(BigInt(comment_list_resp.replies[idx].rcount).toString())"
                    :page-size="10"
                    :pager-count="5"
                    layout="slot, prev, pager, next"
                    prev-text="上一页"
                    next-text="下一页"
                    v-model:current-page="comment_list_resp.replies[idx].current_page"
                    @update:current-page="
                      (cur_page) => {
                        handle_comment_reply_page_change(comment_list_resp.replies[idx], cur_page)
                      }
                    "
                  >
                    <slot name="default">
                      共
                      {{
                        Math.ceil(
                          parseInt(BigInt(comment_list_resp.replies[idx].rcount).toString()) / 10
                        )
                      }}页
                    </slot>
                  </el-pagination>
                </div>
              </div>
            </div>
          </div>
          <div
            class="comment-reply-wrap"
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
          <div class="div-line"></div>
        </li>
      </ul>
      <el-pagination
        class="comment-pagination"
        :size="isSmallScreen ? 'small' : 'large'"
        background
        :layout="paginationLayout"
        :total="comment_list_resp.total_num"
        v-model:current-page="data.current_page"
        :pager-count="5"
      >
        <slot name="default">
          共
          {{ Math.ceil(parseInt(BigInt(comment_list_resp.total_num).toString()) / 10) }}页
        </slot>
      </el-pagination>
    </div>
  </div>
</template>

<style scoped>
.comment-section {
  display: flex;
  flex-direction: column;
}

.reply-pagination {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #18191c;
}

.comment-pagination {
  padding-top: 0.5rem;
  padding-bottom: 1rem;
  margin: auto;
  width: 50%;
  font-size: 0.5rem;
}

.expander-footer .button:not([disabled]):hover {
  color: #00aeec;
}

.expander-footer .button:before {
  background-color: transparent;
  border-radius: inherit;
  content: '';
  inset: 0;
  position: absolute;
}

.expander-footer .button {
  text-rendering: auto;
  letter-spacing: normal;
  word-spacing: normal;
  text-align: center;
  text-transform: none;
  text-indent: 0;
  text-shadow: none;
  margin: 0;
  padding-block: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: none;
  outline: none;
  user-select: none;
  appearance: none;
  background: rgba(0, 0, 0, 0);
  text-decoration: none;
  position: relative;
  z-index: 0;
  height: 100%;
  font: inherit;
  color: #9499a0;
  cursor: pointer;
}

.expander-footer {
  margin-left: 3rem;
  font-size: 0.4rem;
  color: #9499a0;
  margin-top: 0.2rem;
}

.comment-reply-wrap {
  margin-right: 3rem;
  margin-left: 3rem;
  margin-top: 1rem;
}

.comment-list {
  padding-inline-start: 0;
  min-width: fit-content;
}

.div-line {
  padding-bottom: 0.5rem;
  margin-left: 0.1rem;
  border-bottom: 0.0625rem solid #e3e5e7;
}

.sort-actions .sort-div {
  display: inline-block;
  height: 0.75rem;
  margin: 0 0.1875rem;
  border-left: solid 0.0875rem #9499a0;
  vertical-align: bottom;
}

.comment-title .comment-count {
  margin: 0 1.875rem 0 0.675rem;
  font-size: 0.5125rem;
  font-weight: 400;
  color: #9499a0;
}

.comment-title h2 {
  margin: 0;
  color: #18191c;
  font-weight: 700;
  font-size: 0.375rem;
}

.comment-title {
  display: flex;
  align-items: center;
}

.navbar {
  display: flex;
  height: 100%;
  margin-bottom: 1.375rem;
}

.sort-btn.active {
  color: #18191c;
}

.sort-btn:hover {
  cursor: pointer;
}

.sort-btn {
  height: 100%;
  padding-inline-start: 0.375rem;
  padding-inline-end: 0.375rem;
  font-size: 0.375rem;
  color: #9499a0;
}
</style>
