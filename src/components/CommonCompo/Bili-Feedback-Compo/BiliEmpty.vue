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
  <div class="empty-container">
    <el-space direction="vertical" alignment="center">
      <img :src="BiliImg.ranking.status.empty" class="pic" alt="" referrerpolicy="no-referrer" />
      <div class="txt">{{ props.txt }}</div>
    </el-space>
  </div>
</template>

<style scoped>
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  flex: 1;
}

.pic {
  margin-bottom: 0.16rem;
}

.txt {
  color: #9499a0;
  font-weight: 400;
}
</style>
