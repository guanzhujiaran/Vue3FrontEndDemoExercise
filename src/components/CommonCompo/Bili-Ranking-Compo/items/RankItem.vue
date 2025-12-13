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
  <div class="rank-item-wrapper">
    <el-image
      class="full-bg-img"
      :class="{
        one: props.item.rank === 1,
        two: props.item.rank === 2,
        three: props.item.rank === 3
      }"
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
      class="rank-item"
      :class="{
        one: props.item.rank === 1,
        two: props.item.rank === 2,
        three: props.item.rank === 3
      }"
    >
      <UserAvatarBox
        @click="gotoBiliUserSpace(props.item.user.uid)"
        class="hall-avatar"
        size="large"
        :src="props.item.user.face"
      ></UserAvatarBox>
      <el-popover
        :content="props.item.user.name ?? `目前缓存中不存在昵称！UID：${props.item.user.uid}`"
        :show-arrow="false"
        placement="top"
        effect="dark"
        :offset="-40"
        :teleported="false"
      >
        <template #reference>
          <div class="uname" :title="props.item.user.name">
            {{ props.item.user.name ?? `目前缓存中不存在昵称！UID：${props.item.user.uid}` }}
          </div>
        </template>
      </el-popover>
      <div class="number" @click="emit('score_click', props.item)">
        {{ props.score_prefix }}
        <span>{{ props.item.score }}</span>
        {{ props.score_suffix }}
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/ranking/rank-item-tailwind.css';
</style>
