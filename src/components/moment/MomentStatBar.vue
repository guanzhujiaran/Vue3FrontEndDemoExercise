<template>
  <div class="moment-stat-bar flex items-center gap-4 text-sm text-msg-muted">
    <!-- 点赞 -->
    <div
      class="moment-stat-bar__thumb flex items-center gap-1 cursor-pointer select-none"
      :class="{ 'text-msg-pink': isLiked }"
      @click="handleThumb"
    >
      <el-icon :size="16"><CaretTop v-if="isLiked" /><CaretTop v-else /></el-icon>
      <span class="moment-stat-bar__thumb-count">{{ formatNum(stat?.likeCount) }}</span>
    </div>

    <!-- 评论：点击跳详情页评论区（信息流）或滚动到评论区（详情页） -->
    <div
      class="moment-stat-bar__comment flex items-center gap-1 cursor-pointer select-none hover:text-msg-link transition-colors"
      @click="handleComment"
    >
      <el-icon :size="16"><ChatDotRound /></el-icon>
      <span>{{ formatNum(stat?.commentCount) }}</span>
    </div>

    <!-- 转发：点击打开转发弹窗 -->
    <div
      class="moment-stat-bar__repost flex items-center gap-1 cursor-pointer select-none hover:text-msg-link transition-colors"
      @click="handleRepost"
    >
      <el-icon :size="16"><Share /></el-icon>
      <span>{{ formatNum(stat?.repostCount) }}</span>
    </div>

    <!-- 浏览 -->
    <div class="moment-stat-bar__view flex items-center gap-1 ml-auto">
      <el-icon :size="16"><View /></el-icon>
      <span>{{ formatNum(stat?.viewCount) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CaretTop, ChatDotRound, Share, View } from '@element-plus/icons-vue'
import type { MomentFeedItem } from '@/api/notify/moment-api'

const props = defineProps<{
  stat: MomentFeedItem['stat'] | null
  isLiked: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  thumb: []
  comment: []
  repost: []
}>()

function handleThumb() {
  if (props.loading) return
  emit('thumb')
}

function handleComment() {
  emit('comment')
}

function handleRepost() {
  emit('repost')
}

function formatNum(n?: number | null): string {
  if (n == null) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}
</script>
