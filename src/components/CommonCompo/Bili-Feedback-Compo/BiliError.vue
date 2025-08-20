<script setup lang="ts">
import { BiliImg } from '@/assets/img/BiliImg.js'

const props = defineProps({
  txt: {
    type: String,
    default: '网络异常'
  }
})
const emit = defineEmits(['clickRetry'])
</script>

<template>
  <div class="error-container">
    <el-space direction="vertical" alignment="center">
      <img :src="BiliImg.ranking.status.error" class="pic" alt="" referrerpolicy="no-referrer" />
      <div class="txt">
        {{ props.txt }}，<span @click="emit('clickRetry')">点击重试</span>（T-T）~
      </div>
    </el-space>
  </div>
</template>

<style scoped>
.error-container {
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
  height: 0.533333rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9499a0;
  font-weight: 400;
}

.txt span {
  color: #f69;
  cursor: pointer;
}
</style>
