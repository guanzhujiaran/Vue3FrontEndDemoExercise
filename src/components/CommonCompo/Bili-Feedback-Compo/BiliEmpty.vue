<script setup lang="ts">
import { BiliImg } from '@/assets/img/BiliImg.js'
const props = defineProps({
  txt: {
    type: String,
    default: '还没有人上榜，快去上榜~'
  }
})
</script>

<template>
  <div class="empty-container bili-empty flex justify-center items-center flex-1 flex-col"> 
      <img :src="BiliImg.ranking.status.empty" class="pic" alt="" referrerpolicy="no-referrer" />
      <el-text tag="div" class="txt">{{ props.txt }}</el-text>
  </div>
</template>
