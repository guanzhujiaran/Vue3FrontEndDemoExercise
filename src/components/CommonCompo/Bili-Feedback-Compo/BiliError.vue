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
  <div class="error-container bili-error">
    <el-space direction="vertical" alignment="center">
      <img :src="BiliImg.ranking.status.error" class="pic" alt="" referrerpolicy="no-referrer" />
      <div class="txt">
        {{ props.txt }}，<span @click="emit('clickRetry')">点击重试</span>（T-T）~
      </div>
    </el-space>
  </div>
</template>

<style scoped>
@import '@/assets/components/feedback/bili-error-tailwind.css';
</style>