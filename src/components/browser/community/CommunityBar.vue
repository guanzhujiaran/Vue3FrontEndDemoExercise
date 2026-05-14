<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\community\CommunityBar.vue
 * @Description: 社区互动工具栏 - 点赞、举报、认证标识
-->
<template>
  <div class="flex items-center gap-3">
    <!-- 认证徽章 -->
    <el-tag
      v-if="showVerified"
      size="small"
      type="primary"
      effect="dark"
      class="!bg-blue-500 !border-blue-500"
    >
      <el-icon class="mr-0.5"><CircleCheck /></el-icon>
      已认证
    </el-tag>

    <!-- 点赞 -->
    <button
      class="flex items-center gap-1 text-xs transition-colors cursor-pointer"
      :class="isLiked ? 'text-rose-500' : 'text-[var(--el-text-color-secondary)] hover:text-rose-400'"
      @click="handleLike"
      :disabled="liking"
    >
      <el-icon :size="14">
        <component :is="isLiked ? StarFilled : Star" />
      </el-icon>
      <span>{{ formatLikes(likesCount) }}</span>
    </button>

    <!-- 举报 (仅公开资源且非本人) -->
    <button
      v-if="isPublic && !isOwnerResource"
      class="flex items-center gap-1 text-xs text-[var(--el-text-color-placeholder)] hover:text-amber-500 transition-colors cursor-pointer"
      @click="handleReport"
      title="举报"
    >
      <el-icon :size="14"><Warning /></el-icon>
      <span v-if="reportsCount > 0">{{ reportsCount }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Star, StarFilled, CircleCheck, Warning } from '@element-plus/icons-vue'
import { useCommunity } from '@/composables/useCommunity'
import type { CommunityResourceMixin } from '@/types/browser-automation-api'

const props = defineProps<{
  resource: Partial<CommunityResourceMixin>
  resourceType: 'action' | 'workflow'
  resourceId: number
  browserId: string
}>()

const emit = defineEmits<{
  'update:likes_count': [count: number]
  'update:is_liked_by_me': [liked: boolean]
  reported: []
}>()

const { isOwner, showVerifiedBadge, formatLikesCount, toggleLike, reportResource } = useCommunity()

const liking = ref(false)
const likesCount = ref(props.resource.likes_count || 0)
const isLiked = ref(props.resource.is_liked_by_me || false)
const reportsCount = ref(props.resource.reports_count || 0)

const isPublic = computed(() => !!props.resource.is_public)
const isOwnerResource = computed(() => isOwner(props.resource))
const showVerified = computed(() => showVerifiedBadge(props.resource))

const formatLikes = (count: number) => formatLikesCount(count)

const handleLike = async () => {
  if (liking.value) return
  liking.value = true
  try {
    const result = await toggleLike(props.resourceType, props.resourceId, props.browserId)
    if (result) {
      isLiked.value = result.liked
      likesCount.value = result.likes_count
      emit('update:likes_count', result.likes_count)
      emit('update:is_liked_by_me', result.liked)
    }
  } finally {
    liking.value = false
  }
}

const handleReport = async () => {
  const ok = await reportResource({
    resource_type: props.resourceType,
    resource_id: props.resourceId,
    reason: ''
  })
  if (ok) {
    reportsCount.value++
    emit('reported')
  }
}
</script>
