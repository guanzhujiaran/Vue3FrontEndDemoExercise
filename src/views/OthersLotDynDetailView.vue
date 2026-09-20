<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'
import { OTHERS_LOT_DYN_COMMENT_TYPE } from '@/stores/lottery_detail.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'
import { fetchInteractionStatusOne, InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import type { AnyLotteryData } from '@/models/api/lottery/lottery_card.ts'

const route = useRoute()

// 第三方抽奖动态以 dynId 定位（没有 lottery_id，不能复用 /app/lot-data/card-detail）
const dynId = computed(() => String(route.query.dynId ?? ''))
// 定位直达的评论 rpid（来自通知 / 外链），传给评论区滚动定位
const focusRpid = computed(() => String(route.query.rpid ?? '') || null)

// ============ 卡片详情：按 URL 中的 dynId 调 GetOthersLotDynDetail 拉取 ============
const fetchedDetail = ref<AnyLotteryData | null>(null)
const detailLoading = ref(false)
const detailLoadFailed = ref(false)
let loadSeq = 0

const detailData = computed<AnyLotteryData | null>(() => fetchedDetail.value)

const upMid = computed(() => {
  if (!detailData.value) return undefined
  const uid = normalizeLotteryData(detailData.value).senderInfo.uid
  return uid ?? undefined
})

// 详情 + 评论区按 dynId 作为 key，保证切换不同动态时重新渲染并拉取对应评论
const bodyKey = computed(() => dynId.value || 'empty')

async function loadDetail() {
  if (!dynId.value) return
  const seq = ++loadSeq
  detailLoading.value = true
  detailLoadFailed.value = false
  try {
    const resp = await lotteryDataBaseApi.getOthersLotDynDetailById(dynId.value)
    if (seq !== loadSeq) return
    if (resp.code === 0 && resp.data) {
      fetchedDetail.value = resp.data as unknown as AnyLotteryData
    } else {
      fetchedDetail.value = null
      detailLoadFailed.value = true
    }
  } catch {
    if (seq === loadSeq) {
      fetchedDetail.value = null
      detailLoadFailed.value = true
    }
  } finally {
    if (seq === loadSeq) detailLoading.value = false
  }
}

watch(dynId, () => {
  fetchedDetail.value = null
  detailLoadFailed.value = false
  void loadDetail()
})
void loadDetail()

// ============ 详情页互动状态（bizType=others_lot_dyn）：单资源接口并累计浏览 ============
const status = ref<InteractionStatusItem | null>(null)

async function loadInteractionStatus() {
  if (!dynId.value) return
  try {
    status.value = await fetchInteractionStatusOne(
      InteractionBizTypeEnum.OTHERS_LOT_DYN,
      dynId.value
    )
  } catch {
    // 静默：互动状态加载失败不影响卡片浏览
  }
}

watch(dynId, () => {
  status.value = null
  void loadInteractionStatus()
})
void loadInteractionStatus()

/** 卡片内点赞/收藏等变更后，浅合并同步详情页互动状态 */
function handleStatusChange(payload: { bizId: string; status: Partial<InteractionStatusItem> }) {
  status.value = {
    ...(status.value ?? { bizId: payload.bizId, bizType: InteractionBizTypeEnum.OTHERS_LOT_DYN }),
    ...payload.status,
  }
}
</script>

<template>
  <FlexContainer class="others-lot-dyn-detail bg-bg p-4">
    <BiliPageHeader
      title="第三方抽奖动态详情"
      description="B 站第三方（非官方号）发布的抽奖动态详情与评论区"
    />
    <div :key="bodyKey" class="others-lot-dyn-detail__body">
      <div v-if="detailData" class="others-lot-dyn-detail__card mb-6">
        <BiliLotteryCard
          :lottery-data="detailData"
          :status="status ?? undefined"
          @update-status="handleStatusChange"
        />
        <div v-if="dynId" class="others-lot-dyn-detail__interaction mt-3 flex justify-start">
          <ResourceInteractionBar
            :biz-type="InteractionBizTypeEnum.OTHERS_LOT_DYN"
            :biz-id="dynId"
            count-view
          />
        </div>
      </div>
      <el-skeleton
        v-else-if="detailLoading"
        class="others-lot-dyn-detail__loading mb-6"
        :rows="5"
        animated
      />
      <BiliError
        v-else-if="detailLoadFailed"
        class="others-lot-dyn-detail__load-failed py-16"
        txt="动态详情加载失败"
        @click-retry="loadDetail"
      />
      <el-alert
        v-else
        class="others-lot-dyn-detail__empty mb-6"
        title="缺少动态 ID"
        description="请从第三方抽奖列表进入该动态详情"
        type="info"
        :closable="false"
        show-icon
      />

      <section v-if="dynId" class="others-lot-dyn-detail__comment">
        <LotteryCommentSection
          :oid="dynId"
          :type="OTHERS_LOT_DYN_COMMENT_TYPE"
          :up-mid="upMid"
          :focus-rpid="focusRpid"
        />
      </section>
    </div>
  </FlexContainer>
</template>
