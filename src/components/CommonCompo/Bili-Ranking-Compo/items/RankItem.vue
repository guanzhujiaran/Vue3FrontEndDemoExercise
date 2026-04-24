<script setup lang="ts">
import type { BaseRankItem } from '@/models/compo/ranking/Ranking.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import UserAvatarBox from '@/components/CommonCompo/Bili-User-Compo/UserAvatarBox.vue'
import { gotoBiliUserSpace } from '@/utils/PageOpen/BiliJump.ts'

// 将 v-model 改为 prop 传递
const props = defineProps<{
  item: BaseRankItem
  score_prefix: string
  score_suffix: string
}>()

const emit = defineEmits<{
  (e: 'score_click', item: BaseRankItem): void
}>()
</script>

<template>
  <div class="relative flex flex-col items-center">
    <el-image
      class="absolute bottom-0 w-full h-full z-1"
      :src="
        props.item.rank === 1
          ? BiliImg.ranking.background.one
          : props.item.rank === 2
            ? BiliImg.ranking.background.two
            : BiliImg.ranking.background.three
      "
      referrerpolicy="no-referrer"
      alt=""
    />
    <div
      class="relative z-2 flex flex-col items-center p-6 w-34"
      :class="{
        'order-2 mb-8 min-h-[180px]': props.item.rank === 1,
        'order-1 min-h-[160px]': props.item.rank === 2,
        'order-3 min-h-[140px]': props.item.rank === 3
      }"
    >
      <UserAvatarBox
        @click="gotoBiliUserSpace(props.item.user.uid)"
        class="mb-3 relative"
        size="large"
        :src="props.item.user.face"
      ></UserAvatarBox>
      <el-popover
        :content="props.item.user.name ?? `目前缓存中不存在昵称！UID：${props.item.user.uid}`"
        :show-arrow="false"
        placement="top"
        effect="dark"
        :offset="-70"
        :teleported="false"
      >
        <template #reference>
          <div class="text-sm font-medium mb-2 max-w-30 text-center overflow-hidden text-ellipsis whitespace-nowrap hover:text-primary transition-colors duration-200" :title="props.item.user.name">
            {{ props.item.user.name ?? `目前缓存中不存在昵称！UID：${props.item.user.uid}` }}
          </div>
        </template>
      </el-popover>
      <div class="text-sm cursor-pointer hover:text-primary transition-colors duration-200 text-center" @click="emit('score_click', props.item)">
        {{ props.score_prefix }}
        <span class="text-warning font-bold mx-1 text-base">{{ props.item.score }}</span>
        {{ props.score_suffix }}
      </div>
    </div>
  </div>
</template>
