<script setup lang="ts">
import comment_item from '@/components/communicate_list/comment_item.vue'
import type {
  CommentSectionBaseInfo,
  CommentSectionStat,
  ReplyResp
} from '@/models/communication/comment_model'
import submit_comment_section from '@/components/communicate_list/submit_comment_section.vue'
import { computed, onMounted, ref, watch } from 'vue'
import feedbackCommentApi from '@/api/feedback/comment.ts'
import emitter from '@/utils/mitt.ts'
import { KeysEnum, useInject } from '@/models/base/provide_model.ts'
import { ScreenTypeEnum } from '@/models/global_var/global_var_model.ts'

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
    hanle_get_reply_main()
  },
  { deep: true } // 确保组件初始化时也调用一次 API
)
const comment_list_resp = ref<ReplyResp>({
  replies: [],
  total_num: 0,
  cur_page: 0
})
const hanle_get_reply_main = () => {
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
onMounted(() => {
  hanle_get_reply_main()
})
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
const submit_comment_reply = () => {
  let { root, rpidTarget, reply_content } = comment_section_stat.value
  if (!reply_content?.trim()?.length) {
    return emitter.emit('toast', { t: '评论内容不能为空', e: 'error' })
  }
  feedbackCommentApi
    .add(
      comment_section_base_info.value.oid,
      comment_section_base_info.value.type,
      BigInt(root) ? root : rpidTarget,
      BigInt(root) ? rpidTarget : 0,
      reply_content
    )
    .then((resp) => {
      if (resp.code) {
        return emitter.emit('toast', { t: resp.msg, e: 'error' })
      }
      comment_list_resp.value.replies.map((replies) => {
        if (replies.rpid === rpidTarget || replies.rpid === root) {
          replies.replies.unshift(resp.data)
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
    })
}
const submit_comment = () => {
  if (!comment_content.value.trim().length) {
    return emitter.emit('toast', { t: '评论内容不能为空', e: 'error' })
  }
  feedbackCommentApi
    .add(
      comment_section_base_info.value.oid,
      comment_section_base_info.value.type,
      0,
      0,
      comment_content.value
    )
    .then((resp) => {
      if (resp.code) {
        return emitter.emit('toast', { t: resp.msg, e: 'error' })
      }
      comment_list_resp.value.replies.unshift(resp.data)
      emitter.emit('toast', { t: '评论成功', e: 'success' })
      comment_content.value = ''
      comment_list_resp.value.total_num = comment_list_resp.value.total_num + 1
    })
}
const globalVars = useInject(KeysEnum.globalVars)
const isSmallScreen = computed(() => {
  return globalVars.value.screen_size !== ScreenTypeEnum.large
})
const paginationLayout = computed(() => {
  return isSmallScreen.value ? 'prev, pager, next, total' : 'prev, pager, next, jumper, total'
})
</script>

<template>
  <div class="comment-section" v-loading="is_loading_comment">
    <div class="navbar">
      <div class="comment-title">
        <h2>评论</h2>
        <div class="comment-count">
          {{ comment_list_resp?.total_num ?? 0 }}
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
      />
    </div>
    <div class="comment-list-section" v-if="comment_list_resp?.replies.length">
      <ul class="comment-list">
        <li v-for="(__comment_item, idx) in comment_list_resp.replies" :key="idx">
          <comment_item
            v-model:comment_section_stat="comment_section_stat"
            v-model:reply_item="comment_list_resp.replies[idx]"
          />
          <ul v-if="comment_list_resp.replies[idx].replies.length > 0">
            <li
              v-for="(__comment_reply_item, cr_idx) in comment_list_resp.replies[idx].replies"
              :key="`${idx}_${cr_idx}`"
            >
              <comment_item
                v-model:comment_section_stat="comment_section_stat"
                v-model:reply_item="comment_list_resp.replies[idx].replies[cr_idx]"
              />
            </li>
            <div
              class="expander-footer view-more"
              v-if="
                BigInt(comment_list_resp.replies[idx].rcount) >
                BigInt(comment_list_resp.replies[idx].replies.length)
              "
            >
              <span>查看 {{ comment_list_resp.replies[idx].rcount }} 条回复，</span>
              <button>点击查看</button>
            </div>
          </ul>
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
        size="small"
        background
        :layout="paginationLayout"
        :total="comment_list_resp.total_num"
        v-model:current-page="data.current_page"
        :pager-count="5"
      />
    </div>
  </div>
</template>

<style scoped>
.comment-pagination {
  padding-top: 0.5rem;
  padding-bottom: 1rem;
  margin: auto;
  width: 50%;
}

.expander-footer {
  margin-left: 4rem;
  font-size: 0.875rem;
  color: #9499a0;
}

.navbar,
.comment-reply-wrap,
.submit-comment-section-wrap {
  margin-right: 3rem;
  margin-left: 3rem;
  margin-top: 1rem;
}

.comment-list {
  margin-right: 3rem;
}

.comment-section {
  width: 100%;
}

.div-line {
  padding-bottom: 0.88rem;
  margin-left: 5rem;
  border-bottom: 0.0625rem solid #e3e5e7;
}

.sort-actions .sort-div {
  display: inline-block;
  height: 1rem;
  margin: 0 0.1875rem;
  border-left: solid 0.1875rem #9499a0;
  vertical-align: -0.125rem;
}

.comment-title .comment-count {
  margin: 0 1.875rem 0 0.375rem;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #9499a0;
}

.comment-title h2 {
  margin: 0;
  color: #18191c;
  font-weight: 500;
  font-size: 1.25rem;
}

.comment-title {
  display: flex;
  align-items: center;
}

.navbar {
  display: flex;
  align-items: center;
  height: 1.75rem;
  margin-bottom: 1.375rem;
}

.sort-btn.active {
  color: #18191c;
}

.sort-btn:hover {
  cursor: pointer;
}

.sort-btn {
  height: 1.75rem;
  padding-inline-start: 0.375rem;
  padding-inline-end: 0.375rem;
  font-size: 0.8125rem;
  color: #9499a0;
}
</style>
