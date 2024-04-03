<template>
  <div class="space-right-bottom ps">
    <div class="message-list" ref="Message_box_show_div">
      <div class="message-list-content min_h_100">
        <div class="msg-more">
          <span class="no-more" style="display: none">没有更多消息了～</span
          ><span class="loading" style="display: none"
            ><div class="lds-spinner">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div></div></span
          ><span class="error" style="display: none"
            >消息加载失败，<span class="btn">点击重新加载</span></span
          >
        </div>
        <SingleMessage
          class="msg-item not-me"
          v-for="item of MsgList"
          :key="item.msg_key"
          :session_msg="item"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUpdate, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import SettingPop from './AccountSettingPop.vue'
import SingleMessage from './MessageComponent/SingleMessage.vue'
import { type TSession } from '@/components/opus-detail/type'
const Message_box_show_div = ref()
const MsgList = ref<Array<TSession>>([])

//TODO 添加轮询消息的接口，然后把它渲染上去
onMounted(() => {
  let interval_times = 0
  let handler = setInterval(() => {
    if (interval_times >= 30) {
      clearInterval(handler)
    }
    interval_times++
    console.log('轮询消息')
    MsgList.value.push({
      content: `${interval_times}`,
      msg_key: interval_times.toString(),
      msg_type: interval_times.toString(),
      receiver_id: interval_times.toString(),
      timestamp: Date.now(),
      msg_tips: interval_times.toString()
    })
  }, 100)
})
let wasAtBottom = true
onBeforeUpdate(() => {
  wasAtBottom =
    Message_box_show_div.value.scrollTop + Message_box_show_div.value.clientHeight >=
    Message_box_show_div.value.scrollHeight
})
onUpdated(() => {
  //在onUpdated函数里面元素变化的时候令scrollTop和scrollHeight相等，这样内容高度增加的时候
  //滚动条能够向下滑动和内容高度相同的距离
  if (wasAtBottom) {
    Message_box_show_div.value.scrollTop = Message_box_show_div.value.scrollHeight
  }
})
</script>

<style></style>
