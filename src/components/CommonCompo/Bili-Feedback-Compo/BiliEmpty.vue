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
  <div class="empty-container bili-empty">
    <el-space direction="vertical" alignment="center">
      <img :src="BiliImg.ranking.status.empty" class="pic" alt="" referrerpolicy="no-referrer" />
      <div class="txt">{{ props.txt }}</div>
    </el-space>
  </div>
</template>

<style scoped>
@import '@/assets/components/feedback/bili-empty-tailwind.css';
</style>
