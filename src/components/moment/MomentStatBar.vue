<template>
  <div class="moment-stat-bar flex items-center gap-4 text-sm text-text-placeholder">
    <!-- 点赞 -->
    <div
      class="moment-stat-bar__thumb flex items-center gap-1 cursor-pointer select-none"
      :class="{ 'text-msg-pink': isLiked }"
      :aria-pressed="isLiked"
      @click="handleThumb"
    >
      <BiliIcon name="like" :size="sizeIcon" />
      <span class="moment-stat-bar__thumb-count">{{ formatNum(stat?.likeCount) }}</span>
    </div>

    <!-- 点踩（2.62.0）：不展示点踩数，只体现「我已踩」状态；点踩后该内容对我的推荐流降权 -->
    <div
      class="moment-stat-bar__dislike flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors"
      :class="{ 'text-primary': isDisliked }"
      :aria-pressed="isDisliked"
      @click="handleDislike"
    >
      <BiliIcon name="dislike" :size="sizeIcon" />
    </div>

    <!-- 评论：点击跳详情页评论区（信息流）或滚动到评论区（详情页） -->
    <div
      class="moment-stat-bar__comment flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors"
      @click="handleComment"
    >
      <el-icon :size="16"><ChatDotRound /></el-icon>
      <span>{{ formatNum(stat?.commentCount) }}</span>
    </div>

    <!-- 转发：点击打开转发弹窗 -->
    <div
      class="moment-stat-bar__repost flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors"
      @click="handleRepost"
    >
      <el-icon :size="16"><Share /></el-icon>
      <span>{{ formatNum(stat?.repostCount) }}</span>
    </div>

    <!-- 收藏：点击打开收藏夹选择弹窗 -->
    <div
      class="moment-stat-bar__favorite flex items-center gap-1 cursor-pointer select-none hover:text-primary transition-colors"
      :class="{ 'text-warning': isFavorited }"
      :aria-pressed="isFavorited"
      data-moment-favorite-btn
      @click="handleFavorite"
    >
      <BiliIcon name="favorite" :size="sizeIcon" />
      <span>{{ formatNum(stat?.favoriteCount) }}</span>
    </div>

    <!-- 浏览 -->
    <div class="moment-stat-bar__view flex items-center gap-1 ml-auto">
      <el-icon :size="16"><View /></el-icon>
      <span>{{ formatNum(stat?.viewCount) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound, Share, View } from '@element-plus/icons-vue'
import BiliIcon from '@/components/CommonCompo/BiliIcon.vue'
import type { InteractionStatusItem } from '@/api/notify/moment-api'

/** 互动图标统一尺寸（Tailwind 类，配合 BiliIcon 内部 fill-current 外部染色） */
const sizeIcon = 'w-4 h-4'

const props = defineProps<{
  stat: InteractionStatusItem | null
  isLiked: boolean
  loading?: boolean
  /** 2.62.0：当前用户是否已点踩（只展示状态，不展示点踩数） */
  isDisliked?: boolean
  dislikeLoading?: boolean
  /** 当前用户是否已收藏（来自 InteractionStatusItem.isFavorite） */
  isFavorited?: boolean
}>()

const emit = defineEmits<{
  thumb: []
  comment: []
  repost: []
  dislike: []
  favorite: []
}>()

function handleThumb() {
  if (props.loading) return
  emit('thumb')
}

function handleDislike() {
  if (props.dislikeLoading) return
  emit('dislike')
}

function handleComment() {
  emit('comment')
}

function handleRepost() {
  emit('repost')
}

function handleFavorite() {
  emit('favorite')
}

function formatNum(n?: number | null): string {
  if (n == null) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}
</script>
