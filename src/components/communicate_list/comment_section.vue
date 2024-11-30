<script setup lang="ts">
import comment_item from '@/components/communicate_list/comment_item.vue'
import type { CommentSectionStat, ReplyResp } from '@/models/communication/comment_model.ts'
import submit_comment_section from '@/components/communicate_list/submit_comment_section.vue'
import { computed, ref, useShadowRoot } from 'vue'

// const comment_list = defineModel<ReplyResp>('comment_list')
const comment_content = ref<string>('')
const comment_section_stat = ref<CommentSectionStat>({
  is_reply_section_active: false,
  replyTarget: '',
  rpidTarget: '',
  oid: '',
  root: '',
  parent: '',
  reply_content: ''
})
const comment_reply_input_placeholder = computed(() => {
  return `回复 @`.concat(comment_section_stat.value.replyTarget).concat(': ')
})
const submit_comment_reply = () => {
  console.log(
    `待实现对评论的回复`,
    comment_section_stat.value.replyTarget,
    comment_section_stat.value.oid,
    comment_section_stat.value.parent,
    comment_section_stat.value.reply_content
  )
}
const submit_comment = () => {
  console.log(comment_content.value)
}

const comment_list_resp = ref<ReplyResp>({
  replies: Array.from({ length: 10 }).map((va, idx) => {
    return {
      action: 0,
      assist: 0,
      content: '114514aaaaaaaaaaaaaaaaaaaaaaaa',
      count: 114514, //子回复数量
      ctime: 1919810, //秒级回复
      like: 114514,
      dislike: 114514,
      member: {
        avatar: '',
        level_info: {
          current_exp: 0,
          current_level: 0,
          current_min: 0,
          next_exp: 0
        },
        mid: 1,
        uname: `${idx * Math.random()}`,
        sign: '啊啊啊啊',
        sex: '啊啊啊啊啊',
        vip: {
          vip_due_date: 0,
          vip_pay_type: 0,
          vip_status: 0,
          vip_type: 0
        }
      },
      mid: 1,
      oid: 1, // 视频或者动态的id
      oid_str: '1',
      rpid: (idx + 1) * 10, // 评论的主键id
      rpid_str: `${(idx + 1) * 10}`,
      root: 0, // 根回复的主键id，也就是哪条回复底下的
      root_str: '0',
      parent: 0,
      parent_str: '0',
      rcount: 114514,
      up_action: {
        like: true,
        reply: true
      },
      replies: Array.from({ length: 3 }).map((_, _idx) => {
        return {
          action: 0,
          assist: 0,
          content: '114514aaaaaaaaaaaaaaaaaaaaaaaa',
          count: 114514, //子回复数量
          ctime: 1919810, //秒级回复
          like: 114514,
          dislike: 114514,
          member: {
            avatar: '',
            level_info: {
              current_exp: 0,
              current_level: 0,
              current_min: 0,
              next_exp: 0
            },
            mid: 2,
            uname: `${idx}_${_idx}`,
            sign: '啊啊啊啊',
            sex: '啊啊啊啊啊',
            vip: {
              vip_due_date: 0,
              vip_pay_type: 0,
              vip_status: 0,
              vip_type: 0
            }
          },
          mid: 2,
          oid: idx, // 视频或者动态的id
          oid_str: `${idx}`,
          rpid: (idx + _idx) * 1000, // 评论的主键id
          rpid_str: `${(idx + _idx) * 1000}`,
          root: (idx + 1) * 10, // 根回复的主键id，也就是哪条回复底下的
          root_str: `${(idx + 1) * 10}`,
          parent: (idx + 1) * 10,
          parent_str: `${(idx + 1) * 10}`,
          rcount: 1,
          up_action: {
            like: true,
            reply: true
          },
          replies: []
        }
      })
    }
  }),
  cur_page: 1,
  total_num: 1000
})
const sort_by = ref<'hot' | 'time'>('hot')
</script>

<template>
  <div class="comment-section">
    <div class="navbar">
      <div class="comment-title">
        <h2>评论</h2>
        <div class="comment-count">
          {{ comment_list_resp.total_num }}
        </div>
      </div>
      <div class="sort-actions">
        <button class="sort-btn" :class="sort_by === 'hot' ? 'active' : ''">最热</button>
        <div class="sort-div"></div>
        <button class="sort-btn" :class="sort_by === 'time' ? 'active' : ''">最新</button>
      </div>
    </div>
    <div class="submit-comment-section-wrap">
      <submit_comment_section
        :submit_comment="submit_comment"
        placeholder="输入提交反馈评论..."
        v-model:comment_content="comment_content"
      />
    </div>
    <ul class="comment-list" v-if="comment_list_resp">
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
          <div class="expander-footer">
            <div class="view-more">
              <span>查看 {{ comment_list_resp.replies[idx].rcount }} 条回复，</span>
              <button>点击查看</button>
            </div>
          </div>
        </ul>
        <div class="comment-reply-wrap">
          <submit_comment_section
            v-if="
              comment_section_stat.is_reply_section_active &&
              (comment_section_stat.root === __comment_item.rpid_str ||
                comment_section_stat.rpidTarget === __comment_item.rpid_str)
            "
            :submit_comment="submit_comment_reply"
            :placeholder="comment_reply_input_placeholder"
            v-model:comment_content="comment_section_stat.reply_content"
          />
        </div>
        <div class="div-line"></div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
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

.sort-btn {
  height: 1.75rem;
  padding-inline-start: 0.375rem;
  padding-inline-end: 0.375rem;
  font-size: 0.8125rem;
  color: #9499a0;
}
</style>
