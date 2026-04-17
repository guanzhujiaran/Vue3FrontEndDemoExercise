<script setup lang="ts">
import { BiliImg } from '@/assets/img/BiliImg.ts'
import type { PropType } from 'vue'
import ExpBar from '@/components/CommonCompo/ExpBar.vue'
import type { UserLevelInfo } from '@/models/user/user_model'

const props = defineProps({
  src: {
    type: String,
    required: true,
    default: BiliImg.face.noface
  },
  size: {
    type: String as PropType<number | 'large' | 'default' | 'small'>,
    default: 'default'
  },
  levelInfo: {
    type: Object as PropType<UserLevelInfo | null>,
    default: null
  },
  showExpBar: {
    type: Boolean,
    default: true
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
const expBarSize = computed(() => {
  if (props.size === 'large') {
    return 'large'
  } else if (props.size === 'small') {
    return 'small'
  } else {
    return 'default'
  }
})
</script>

<template>
  <div class="avatar-container flex flex-col items-center">
    <div class="avatar-box relative flex items-center rounded-full justify-center" :style="{ width: size + 'px', height: size + 'px' }">
      <div class="avatar flex items-center justify-center rounded-full box-border hover:cursor-pointer border border-solid border-[var(--el-color-danger-dark-2)] overflow-hidden" :style="{ width: size + 'px', height: size + 'px' }">
        <el-image :src="props.src" fit="fill" class="url rounded-full w-full h-full block [&_img]:w-full [&_img]:h-full [&_img]:object-cover" referrerpolicy="no-referrer" alt="" />
      </div>
    </div>
    <ExpBar
      v-if="showExpBar && levelInfo"
      :level-info="levelInfo"
      :size="expBarSize"
      class="exp-bar-wrapper"
      :style="{ width: size + 'px' }"
    />
  </div>
</template>