<template>
  <div class="resource-interaction-bar inline-flex items-center gap-3 text-sm text-text-placeholder">
    <!-- 点赞 -->
    <div
      class="resource-interaction-bar__thumb inline-flex items-center gap-1 cursor-pointer select-none transition-colors"
      :class="{ 'text-msg-pink': isLiked, 'opacity-70': likeMachine.pending }"
      :aria-pressed="isLiked"
      @click="handleThumb"
    >
      <BiliIcon name="like" :size="sizeIcon" />
      <span class="resource-interaction-bar__like-count">{{ formatNum(likeCount) }}</span>
    </div>

    <!-- 收藏 -->
    <div
      class="resource-interaction-bar__fav inline-flex items-center gap-1 cursor-pointer select-none transition-colors"
      :class="{ 'text-warning': isFavorite }"
      :aria-pressed="isFavorite"
      @click="openFavorite"
    >
      <BiliIcon name="favorite" :size="sizeIcon" />
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
import { computed, onMounted, ref, watch } from 'vue'
import BiliIcon from '@/components/CommonCompo/BiliIcon.vue'
import { thumbMoment, fetchInteractionStatus, fetchInteractionStatusOne } from '@/api/notify/moment-api'
import { InteractionBizTypeEnum } from '@/api/notify/moment-api'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import { useInteractionMachine } from '@/composables/useInteractionMachine'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import { formatInteractionCount } from '@/utils/interaction/interactionMachine'
import biliMessage from '@/utils/message'

/** 互动图标统一尺寸（Tailwind 类；颜色由外部 text-* 决定） */
const sizeIcon = 'w-[18px] h-[18px]'

const props = defineProps<{
  /** 支持数字枚举（LOTTERY 页）或字符串（如 "rpa_workflow"，RPA 资源页） */
  bizType: InteractionBizTypeEnum | string
  bizId: string
  /** detail 页场景：走单资源接口（后端投递 MQ 累计浏览）；默认 false（列表等场景不累计浏览） */
  countView?: boolean
}>()

/** 点赞状态机（active=我是否已赞，count=赞数） */
const likeMachine = useInteractionMachine()
/** 收藏状态机（active=我是否已收藏，count=收藏数） */
const favMachine = useInteractionMachine()

const isLiked = likeMachine.active
const likeCount = likeMachine.count
const isFavorite = favMachine.active
const favoriteCount = favMachine.count
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
  likeMachine.syncStart()
  favMachine.syncStart()
  try {
    // detail 场景（countView=true）走单资源接口（累计浏览）；否则走批量接口（列表不累计浏览）
    const item = props.countView
      ? await fetchInteractionStatusOne(bizTypeNum.value, props.bizId)
      : (await fetchInteractionStatus(bizTypeNum.value, [props.bizId]))?.items?.[0]
    if (item) {
      likeMachine.sync(Boolean(item.isLike), item.likeCount ?? 0)
      favMachine.sync(Boolean(item.isFavorite), item.favoriteCount ?? 0)
    } else {
      likeMachine.syncFail()
      favMachine.syncFail()
    }
  } catch {
    // 静默：交互态加载失败不影响浏览
    likeMachine.syncFail()
    favMachine.syncFail()
  }
}

async function handleThumb() {
  // 状态机拒绝并发点击（mutating / syncing 阶段）
  if (!likeMachine.toggle()) return
  const targetUp = likeMachine.active.value ? 1 : 2
  try {
    const resp = await thumbMoment(props.bizId, targetUp, { bizType: bizTypeNum.value })
    if (!resp) {
      likeMachine.toggleFail('点赞失败')
      return
    }
    likeMachine.toggleOk(resp.likeCount, resp.isLike)
  } catch {
    likeMachine.toggleFail('点赞失败')
    biliMessage.error('操作失败，请稍后重试')
  }
}

function openFavorite() {
  favDialogVisible.value = true
}

/** 收藏夹弹窗变更：弹窗已带回最新收藏态，直接写状态机（不再整条重查） */
function onFavChanged(payload: FavoriteChangedPayload) {
  favMachine.apply(payload.isFavorite, payload.favoriteCount)
}

function formatNum(n: number): string {
  return formatInteractionCount(n)
}

onMounted(loadStatus)

/** 资源切换（列表复用场景）：复位状态机并重新拉取，避免旧资源互动态闪回 */
watch(
  () => props.bizId,
  () => {
    likeMachine.reset()
    favMachine.reset()
    void loadStatus()
  }
)
</script>
