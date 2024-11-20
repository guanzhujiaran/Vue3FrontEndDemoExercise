<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-11-18 19:33:27
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-11-18 23:45:20
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\CommunicationView.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { ref } from 'vue'
import type { ReplyItem, ReplyResp } from '@/models/communication/comment_model.ts'
import type { UserInfo, UserLevelInfo, UserVipinfo } from '@/models/user/user_model.ts'

const my_tool_bars = ref({
  bold: true, // 粗体
  italic: true, // 斜体
  header: true, // 标题
  underline: true, // 下划线
  strikethrough: true, // 中划线
  mark: true, // 标记
  superscript: true, // 上角标
  subscript: true, // 下角标
  quote: true, // 引用
  ol: true, // 有序列表
  ul: true, // 无序列表
  link: true, // 链接
  // imagelink: true, // 图片链接
  code: true, // code
  table: true, // 表格
  fullscreen: true, // 全屏编辑
  readmodel: true, // 沉浸式阅读
  htmlcode: true, // 展示html源码
  help: true, // 帮助
  /* 1.3.5 */
  undo: true, // 上一步
  redo: true, // 下一步
  trash: true, // 清空
  // save: true, // 保存（触发events中的save事件）
  /* 1.4.2 */
  navigation: true, // 导航目录
  /* 2.1.8 */
  alignleft: true, // 左对齐
  aligncenter: true, // 居中
  alignright: true, // 右对齐
  /* 2.2.1 */
  subfield: true, // 单双栏模式
  preview: true // 预览
})
const user_reply_items = ref<ReplyResp[]>([
  {
    action: 0,
    assist: 0,
    content: '114514',
    count: 114514, //子回复数量
    ctime: 1919810, //秒级回复
    like: 114514,
    dislike: 114514,
    member: {
      avatar: 'https://i0.hdslb.com/bfs/garb/item/21e72a6812371baf9729dba58864780d33deb557.png',
      level_info: {
        current_exp: 0,
        current_level: 0,
        current_min: 0,
        next_exp: 0
      },
      mid: 4237378,
      uname: 'string',
      sign: 'string',
      sex: 'string',
      vip: {
        vip_due_date: 0,
        vip_pay_type: 0,
        vip_status: 0,
        vip_type: 0
      }
    },
    mid: 114514,
    oid: 114514, // 视频或者动态的id
    oid_str: '114514',
    rpid: 114514, // 评论的主键id
    rpid_str: '114514',
    root: 114514, // 根回复的主键id，也就是哪条回复底下的
    root_str: '114514',
    parent: 114514,
    parent_str: '114514',
    rcount: 114514,
    up_action: {
      like: true,
      reply: true
    },
    replies: []
  }
])
</script>

<template>
  <div class="container" style="background-color: #ffffff">

    <div class="comment-list"></div>
  </div>
</template>

<style scoped>

</style>
