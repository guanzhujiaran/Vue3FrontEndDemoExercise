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
  <div class="flex items-center p-4 rounded-sm bg-[rgba(255,255,255,0.03)] mb-2" ref="rank-item-row">
    <div class="w-8 h-8 flex items-center justify-center mr-4 font-bold text-sm text-gray-400 rounded-full bg-[rgba(255,255,255,0.05)]">
      <div>{{ Item.rank }}</div>
    </div>
    <UserAvatarBox
      @click="gotoBiliUserSpace(Item.user.uid)"
      class="mr-4"
      size="default"
      :src="Item.user.face"
    />
    <div class="flex-1 overflow-hidden">
      <div class="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap text-white hover:text-primary transition-colors duration-200" :title="Item.user.name">{{ Item.user.name }}</div>
    </div>
    <div class="text-sm text-gray-400 cursor-pointer hover:text-primary transition-colors duration-200 min-w-[100px] text-right" @click="emit('score_click', Item)">
      {{ props.score_prefix }}
      <span class="text-warning font-bold mx-1 text-base">{{ Item.score }}</span>
      {{ props.score_suffix }}
    </div>
  </div>
</template>
