<script setup lang="ts">
import type { BaseRankItem } from '@/models/compo/ranking/Ranking.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import UserAvatarBox from '@/components/CommonCompo/Bili-User-Compo/UserAvatarBox.vue'
import { gotoBiliUserSpace } from '@/utils/PageOpen/BiliJump.ts'

const Item = defineModel<BaseRankItem>('item', { required: true })

const props = defineProps<{
  score_prefix: string
  score_suffix: string
}>()
const emit = defineEmits<{
  (e: 'score_click', item: BaseRankItem): void
}>()
</script>

<template>
  <div class="rank-item">
    <el-image
      class="full-bg-img"
      :class="{
        one: Item.rank === 1,
        two: Item.rank === 2,
        three: Item.rank === 3
      }"
      :src="
        Item.rank === 1
          ? BiliImg.ranking.background.one
          : Item.rank === 2
            ? BiliImg.ranking.background.two
            : BiliImg.ranking.background.three
      "
      referrerpolicy="no-referrer"
      alt=""
    />
    <UserAvatarBox
      @click="gotoBiliUserSpace(Item.user.uid)"
      class="hall-avatar"
      size="large"
      :src="Item.user.face"
    ></UserAvatarBox>
    <el-popover
      :content="Item.user.name ?? `目前缓存中不存在昵称！UID：${Item.user.uid}`"
      :show-arrow="false"
      placement="top"
      effect="dark"
      :offset="-40"
      :teleported="false"
    >
      <template #reference>
        <div class="uname" :title="Item.user.name">
          {{ Item.user.name ?? `目前缓存中不存在昵称！UID：${Item.user.uid}` }}
        </div>
      </template>
    </el-popover>
    <div class="number" @click="emit('score_click', Item)">
      {{ props.score_prefix }}
      <span>{{ Item.score }}</span>
      {{ props.score_suffix }}
    </div>
  </div>
</template>

<style scoped>
.rank-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  position: relative;
  width: 150px;
  height: 200px;
}

.hall-avatar {
  cursor: pointer;
}

.rank-item :deep(.avatar-box) {
  margin-right: 0;
  padding-top: 0.1rem;
}

.hall-avatar :deep(.border) {
  border: 2px solid #e2d4a4;
}

.hall-avatar :deep(.avatar) {
  width: 100%;
  height: 100%;
}

.hall-avatar :deep(.url) {
  width: 100%;
  height: 100%;
}

.avatar-box :deep(.url) {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.full-bg-img {
  width: 120px;
  height: 150px;
  object-fit: cover; /* 这会保证图片按比例缩放并覆盖整个 div */
  position: absolute;
}
.full-bg-img.one {
  width: 150px;
  height: 200px;
}

.rank-item .uname {
  z-index: 1;
  padding: 0.266667rem;
  width: 100%;
  color: #ffefdc;
  font-weight: 1000;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
}

.rank-item .number {
  z-index: 1;
  color: hsla(0, 0%, 100%, 0.6);
}

.rank-item .number span {
  color: #fff;
  font-weight: 1000;
}
</style>
