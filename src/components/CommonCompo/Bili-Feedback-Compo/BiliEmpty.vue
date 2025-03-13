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
  <div>
    <img :src="BiliImg.ranking.status.empty" class="pic" alt="" referrerpolicy="no-referrer" />
    <div class="txt">{{ props.txt }}</div>
  </div>
</template>

<style scoped>
.pic {
  margin-bottom: 0.16rem;
}
</style>
