<script setup lang="ts">
import type { BaseRankItem } from '@/models/compo/ranking/Ranking.ts'
import UserAvatarBox from '@/components/CommonCompo/Bili-User-Compo/UserAvatarBox.vue'
import { gotoBiliUserSpace } from '@/utils/PageOpen/BiliJump.ts'
import { useAnimate } from '@vueuse/core'

const Item = defineModel<BaseRankItem>('item', { required: true })
const props = defineProps<{
  score_prefix: string
  score_suffix: string
  animation: {
    duration: number
  }
}>()
const emit = defineEmits<{
  (e: 'score_click', item: BaseRankItem): void
}>()
const from_right_key_frames = [
  {
    transform: 'translateX(100%)',
    opacity: 0
  },
  {
    transform: 'translateX(0)',
    opacity: 1
  }
]
const el = useTemplateRef('el')
const {
  isSupported,
  animate,
  // actions
  play,
  pause,
  reverse,
  finish,
  cancel,
  // states
  pending,
  playState,
  replaceState,
  startTime,
  currentTime,
  timeline,
  playbackRate
} = useAnimate(el, from_right_key_frames, { duration: props.animation.duration })
</script>

<template>
  <div class="rank-item-row" ref="el">
    <div class="rank-num">
      <div class="num">{{ Item.rank }}</div>
    </div>
    <UserAvatarBox
      @click="gotoBiliUserSpace(Item.user.uid)"
      class="hall-avatar"
      size="default"
      :src="Item.user.face"
    />
    <div class="name-box">
      <el-popover
        :content="Item.user.name"
        :show-arrow="false"
        placement="top"
        effect="dark"
        :offset="-40"
        :teleported="false"
      >
        <template #reference>
          <div class="name" :title="Item.user.name">{{ Item.user.name }}</div>
        </template>
      </el-popover>
    </div>
    <div class="score" @click="emit('score_click', Item)">
      {{ props.score_prefix }}
      <span>{{ Item.score }}</span>
      {{ props.score_suffix }}
    </div>
  </div>
</template>

<style scoped>
.rank-item-row {
  height: -webkit-fill-available;
  padding: 0 0.186667rem 0 0.333333rem;
  margin-bottom: 0.213333rem;
  background: rgba(75, 77, 122, 0.2);
  border-radius: 0.266667rem;
  width: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  white-space: nowrap;
}

.rank-item-row .rank-num {
  width: 30px;
  margin-right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hall-avatar {
  cursor: pointer;
  width: 0.97rem;
  height: 0.97rem;
  margin-right: 0.133333rem;
}

.hall-avatar :deep(.avatar.border) {
  border: 0.053333rem solid #42485e;
}

.hall-avatar :deep(.avatar) {
  width: 100%;
  height: 100%;
}

.hall-avatar :deep(.url) {
  width: 100%;
  height: 100%;
}

.rank-item-row .rank-num .num {
  font-weight: 500;
  color: #9499a0;
}

.rank-item-row .name-box {
  min-width: 1rem;
}

.rank-item-row .name-box .name {
  width: 100%;
  color: #fff;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 5px;
}

.rank-item-row .score {
  color: #9499a0;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
}

.rank-item-row .score span {
  color: #fff;
  font-size: larger;
}
</style>
