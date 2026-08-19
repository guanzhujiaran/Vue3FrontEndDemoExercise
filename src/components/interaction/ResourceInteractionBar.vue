<template>
  <div class="resource-interaction-bar inline-flex items-center gap-3 text-sm text-msg-muted">
    <!-- 点赞 -->
    <div
      class="resource-interaction-bar__thumb inline-flex items-center gap-1 cursor-pointer select-none transition-colors"
      :class="{ 'text-primary': isLiked }"
      @click="handleThumb"
    >
      <el-icon :size="18"><CaretTop /></el-icon>
      <span class="resource-interaction-bar__like-count">{{ formatNum(likeCount) }}</span>
    </div>

    <!-- 收藏 -->
    <div
      class="resource-interaction-bar__fav inline-flex items-center gap-1 cursor-pointer select-none transition-colors"
      :class="{ 'text-warning': isFavorite }"
      @click="openFavorite"
    >
      <el-icon :size="18"><StarFilled v-if="isFavorite" /><Star v-else /></el-icon>
      <span class="resource-interaction-bar__fav-count">{{ formatNum(favoriteCount) }}</span>
    </div>

    <MomentFavoriteDialog
      v-model="favDialogVisible"
      :dyn-id="bizId"
      :biz-type="bizType"
      :biz-id="bizId"
      @changed="onFavChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CaretTop, Star, StarFilled } from '@element-plus/icons-vue'
import { thumbMoment, fetchInteractionStatus } from '@/api/notify/moment-api'
import type { InteractionBizTypeEnum } from '@/api/notify/moment-api'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import biliMessage from '@/utils/message'

const props = defineProps<{
  bizType: InteractionBizTypeEnum
  bizId: string
}>()

const isLiked = ref(false)
const isFavorite = ref(false)
const likeCount = ref(0)
const favoriteCount = ref(0)
const thumbLoading = ref(false)
const favDialogVisible = ref(false)

async function loadStatus() {
  try {
    const resp = await fetchInteractionStatus(props.bizType, [props.bizId])
    const item = resp?.items?.[0]
    if (item) {
      isLiked.value = item.isLike
      isFavorite.value = item.isFavorite
      likeCount.value = item.likeCount
      favoriteCount.value = item.favoriteCount
    }
  } catch {
    // 静默：交互态加载失败不影响浏览
  }
}

async function handleThumb() {
  if (thumbLoading.value) return
  thumbLoading.value = true
  const targetUp = isLiked.value ? 2 : 1
  const prevLike = isLiked.value
  const prevCount = likeCount.value
  // 乐观更新
  isLiked.value = !prevLike
  likeCount.value = Math.max(0, prevCount + (targetUp === 1 ? 1 : -1))
  try {
    const resp = await thumbMoment(props.bizId, targetUp, { bizType: props.bizType })
    if (resp) {
      likeCount.value = resp.likeCount
      isLiked.value = resp.isLike
    }
  } catch {
    // 回滚
    isLiked.value = prevLike
    likeCount.value = prevCount
    biliMessage.error('操作失败，请稍后重试')
  } finally {
    thumbLoading.value = false
  }
}

function openFavorite() {
  favDialogVisible.value = true
}

function onFavChanged() {
  loadStatus()
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}

onMounted(loadStatus)
</script>
