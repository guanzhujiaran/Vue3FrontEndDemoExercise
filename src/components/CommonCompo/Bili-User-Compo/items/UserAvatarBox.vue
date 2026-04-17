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
const size = computed(() => {
  if (props.size === 'large') {
    return 64
  } else if (props.size === 'small') {
    return 16
  } else {
    return 32
  }
})
</script>

<template>
  <div class="avatar-box" :style="{ width: size + 'px', height: size + 'px' }">
    <div class="avatar border" :style="{ width: size + 'px', height: size + 'px' }">
      <el-image
        :src="props.src"
        :size="size"
        fit="fill"
        class="url"
        referrerpolicy="no-referrer"
        alt=""
      />
    </div>
  </div>
</template>
