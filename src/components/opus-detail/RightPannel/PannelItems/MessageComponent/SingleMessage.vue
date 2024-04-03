<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-04-03 19:49:58
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-04-03 21:01:24
 * @FilePath: \BiliLottery\src\components\opus-detail\RightPannel\PannelItems\MessageComponent\SingleMessage.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { type TSession } from '../../../type'
defineProps<{
  session_msg: TSession
}>()
</script>
<template>
  <div>
    <div class="message">
      <div class="message-content">
        {{ session_msg.content }}

        <div class="split-line"></div>
        <div class="msg-tips">{{ session_msg.msg_tips }}</div>
      </div>
    </div>
    <div class="my-msg-time">
      <span class="time">{{ new Date(session_msg.timestamp).toLocaleString() }}</span>
    </div>
  </div>
</template>
