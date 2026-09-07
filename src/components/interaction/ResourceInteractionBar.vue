<template>
  <div class="resource-interaction-bar inline-flex items-center gap-3 text-sm text-text-placeholder">
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
      :biz-type="bizTypeNum"
      :biz-id="bizId"
      @changed="onFavChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CaretTop, Star, StarFilled } from '@element-plus/icons-vue'
import { thumbMoment, fetchInteractionStatus, fetchInteractionStatusOne } from '@/api/notify/moment-api'
import { InteractionBizTypeEnum } from '@/api/notify/moment-api'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import biliMessage from '@/utils/message'

const props = defineProps<{
  /** 支持数字枚举（LOTTERY 页）或字符串（如 "rpa_workflow"，RPA 资源页） */
  bizType: InteractionBizTypeEnum | string
  bizId: string
  /** detail 页场景：走单资源接口（后端投递 MQ 累计浏览）；默认 false（列表等场景不累计浏览） */
  countView?: boolean
}>()

const isLiked = ref(false)
const isFavorite = ref(false)
const likeCount = ref(0)
const favoriteCount = ref(0)
const thumbLoading = ref(false)
const favDialogVisible = ref(false)

/** 把 bizType 字符串（如 "rpa_workflow"）归一为数字枚举（RPA_WORKFLOW=4），后端契约用数字 */
function toBizTypeNum(v: InteractionBizTypeEnum | string): InteractionBizTypeEnum {
  if (typeof v === 'number') return v
  const num = InteractionBizTypeEnum[
    String(v).toUpperCase() as keyof typeof InteractionBizTypeEnum
  ]
  return typeof num === 'number' ? (num as InteractionBizTypeEnum) : InteractionBizTypeEnum.DYNAMIC
}

const bizTypeNum = computed(() => toBizTypeNum(props.bizType))

async function loadStatus() {
  try {
    // detail 场景（countView=true）走单资源接口（累计浏览）；否则走批量接口（列表不累计浏览）
    const item = props.countView
      ? await fetchInteractionStatusOne(bizTypeNum.value, props.bizId)
      : (await fetchInteractionStatus(bizTypeNum.value, [props.bizId]))?.items?.[0]
    if (item) {
      isLiked.value = item.isLike ?? false
      isFavorite.value = item.isFavorite ?? false
      likeCount.value = item.likeCount ?? 0
      favoriteCount.value = item.favoriteCount ?? 0
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
    const resp = await thumbMoment(props.bizId, targetUp, { bizType: bizTypeNum.value })
    if (resp) {
      likeCount.value = resp.likeCount ?? 0
      isLiked.value = resp.isLike ?? false
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
