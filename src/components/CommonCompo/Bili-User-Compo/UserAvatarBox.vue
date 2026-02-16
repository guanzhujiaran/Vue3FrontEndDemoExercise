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
  <div class="avatar-container">
    <div class="avatar-box" :style="{ width: size + 'px', height: size + 'px' }">
      <div class="avatar border" :style="{ width: size + 'px', height: size + 'px' }">
        <el-image :src="props.src" fit="fill" class="url" referrerpolicy="no-referrer" alt="" />
      </div>
    </div>
    <ExpBar
      v-if="showExpBar && levelInfo"
      :level-info="levelInfo"
      :size="expBarSize"
      class="exp-bar-wrapper"
    />
  </div>
</template>

<style scoped>
@import '@/assets/components/user/user-avatar-box-tailwind.css';

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.exp-bar-wrapper {
  width: size;
}
</style>