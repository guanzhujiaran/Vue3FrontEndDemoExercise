<template>
  <el-popover
    class="lottery-actions-dropdown"
    placement="bottom-end"
    :width="130"
    :offset="-4"
    :trigger="'manual' as any"
    :show-arrow="false"
    v-model:visible="popVisible"
    popper-class="lottery-actions-dropdown__popper"
  >
    <template #reference>
      <span
        class="lottery-actions-dropdown__trigger inline-flex items-center justify-center w-7 h-7 rounded-md cursor-pointer text-text-primary hover:bg-fill-extra-light transition-colors outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 border border-transparent"
        @click="popVisible = !popVisible"
        @mouseenter="popVisible = true"
        @mouseleave="popVisible = false"
        @contextmenu.prevent="popVisible = true"
      >
        <component :is="MoreIcon" class="w-4 h-4" />
      </span>
    </template>
    <div class="lottery-actions-dropdown__menu flex flex-col gap-1 py-1" @mouseenter="popVisible = true" @mouseleave="popVisible = false">
      <button
        class="lottery-actions-dropdown__item flex items-center gap-1 px-3 py-1.5 text-sm text-text-primary cursor-pointer hover:bg-fill-extra-light text-left transition-colors"
        type="button"
        @click="onLike"
      >
        点赞
        <span :class="likeActive ? 'text-danger font-semibold' : ''">{{ likeCount }}</span>
      </button>
      <button
        class="lottery-actions-dropdown__item flex items-center gap-1 px-3 py-1.5 text-sm text-text-primary cursor-pointer hover:bg-fill-extra-light text-left transition-colors"
        type="button"
        @click="onFavorite"
      >
        收藏
        <span :class="favActive ? 'text-warning font-semibold' : ''">{{ favCount }}</span>
      </button>
      <button
        class="lottery-actions-dropdown__item px-3 py-1.5 text-sm text-text-primary text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-fill-extra-light cursor-pointer"
        type="button"
        :disabled="loading"
        @click="onForward"
      >
        转发到动态
      </button>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MoreIcon from '@/assets/svgs/more.svg?component'
import type { InteractionStatusItem } from '@/api/notify/moment-api'

const props = defineProps<{
  /** 抽奖 lottery_id */
  lotteryId: string
  /** 互动状态（由容器批量拉取后下发） */
  status?: InteractionStatusItem | null
  /** 请求进行中标记 */
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'like'): void
  (e: 'favorite'): void
  (e: 'forward'): void
}>()

const popVisible = ref(false)

const likeActive = computed(() => Boolean(props.status?.isLike))
const likeCount = computed(() => Number(props.status?.likeCount ?? 0))
const favActive = computed(() => Boolean(props.status?.isFavorite))
const favCount = computed(() => Number(props.status?.favoriteCount ?? 0))

function onLike() {
  popVisible.value = false
  emit('like')
}
function onFavorite() {
  popVisible.value = false
  emit('favorite')
}
function onForward() {
  popVisible.value = false
  emit('forward')
}
</script>
