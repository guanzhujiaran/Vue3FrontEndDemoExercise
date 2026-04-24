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
  <div class="error-container bili-error flex justify-center items-center flex-1 flex-col">
      <img :src="BiliImg.ranking.status.error" class="pic" alt="" referrerpolicy="no-referrer" />
      <el-text tag="div" class="txt">
        {{ props.txt }}，<el-text tag="span" class="cursor-pointer hover:text-primary" @click="emit('clickRetry')">点击重试</el-text>（T-T）~
      </el-text>
  </div>
</template>