<script setup lang="ts">
import { BiliImg } from '@/assets/img/BiliImg.ts'
import type { PropType } from 'vue'

const props = defineProps({
  src: {
    type: String,
    required: true,
    default: BiliImg.face.noface
  },
  size: {
    type: String as PropType<number | 'large' | 'default' | 'small'>,
    default: 'default'
  }
})
</script>

<template>
  <div class="avatar-box">
    <div class="avatar border">
      <img :src="props.src" class="url" referrerpolicy="no-referrer" alt="" />
    </div>
  </div>
</template>

<style scoped>
.avatar-box {
  width: 1.333333rem;
  height: 1.333333rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.32rem;
}

.avatar-box .avatar.border {
  border: 1px solid #f69;
}

.avatar-box .avatar {
  width: 1.066667rem;
  height: 1.066667rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-sizing: border-box;
}

.avatar-box .url {
  width: 0.96rem;
  height: 0.96rem;
  border-radius: 50%;
}
</style>
