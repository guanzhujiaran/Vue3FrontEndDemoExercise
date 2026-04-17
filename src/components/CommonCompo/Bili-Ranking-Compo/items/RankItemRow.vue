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
const rankItemRowEL = useTemplateRef('rank-item-row')
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
} = useAnimate(rankItemRowEL as any, from_right_key_frames, { duration: props.animation.duration })
</script>

<template>
  <div class="rank-item-row" ref="rank-item-row">
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
      <div class="name" :title="Item.user.name">{{ Item.user.name }}</div>
    </div>
    <div class="score" @click="emit('score_click', Item)">
      {{ props.score_prefix }}
      <span>{{ Item.score }}</span>
      {{ props.score_suffix }}
    </div>
  </div>
</template>
