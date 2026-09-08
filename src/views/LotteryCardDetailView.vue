<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'
import { useLotteryDetailStore, LOTTERY_COMMENT_TYPE } from '@/stores/lottery_detail.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'
import { fetchInteractionStatusOne, InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import type { AnyLotteryData } from '@/models/api/lottery/lottery_card.ts'

const { t } = useI18n()
const route = useRoute()
const lotteryDetailStore = useLotteryDetailStore()

const lotteryId = computed(() => String(route.query.id ?? ''))
// 定位直达的评论 rpid（来自通知 / 外链），传给评论区滚动定位
const focusRpid = computed(() => String(route.query.rpid ?? '') || null)

// ============ 卡片详情：按 URL 中的 lottery_id 调接口拉取（计划书 Phase 9）============
// 不再依赖 localStorage 旧缓存传参：store 缓存降级为「id 一致性兜底」，
// 接口成功后回写刷新缓存（旧结构 sid 数据自愈为规范 lottery_id 数据）
const fetchedDetail = ref<AnyLotteryData | null>(null)
const detailLoading = ref(false)
const detailLoadFailed = ref(false)
let loadSeq = 0

const detailData = computed<AnyLotteryData | null>(() => {
  if (fetchedDetail.value) return fetchedDetail.value
  // 兜底：仅当缓存卡片的规范化互动 id 与 URL id 一致时才使用（避免串卡 / 旧 sid 数据）
  const cached = lotteryDetailStore.detailData
  if (
    cached &&
    lotteryId.value &&
    String(normalizeLotteryData(cached).id ?? '') === lotteryId.value
  ) {
    return cached
  }
  return null
})

const upMid = computed(() => {
  if (!detailData.value) return undefined
  const uid = normalizeLotteryData(detailData.value).senderInfo.uid
  return uid ?? undefined
})

// 卡片详情 + 评论区按 lotteryId 作为 key，保证切换不同卡片时重新渲染并拉取对应评论
const bodyKey = computed(() => lotteryId.value || 'empty')

async function loadDetail() {
  if (!lotteryId.value) return
  const seq = ++loadSeq
  detailLoading.value = true
  detailLoadFailed.value = false
  try {
    const resp = await lotteryDataBaseApi.getLotteryDetailById(lotteryId.value)
    if (seq !== loadSeq) return
    if (resp.code === 0 && resp.data) {
      fetchedDetail.value = resp.data as unknown as AnyLotteryData
      lotteryDetailStore.setDetail(resp.data as unknown as AnyLotteryData)
    } else {
      detailLoadFailed.value = true
    }
  } catch {
    if (seq === loadSeq) detailLoadFailed.value = true
  } finally {
    if (seq === loadSeq) detailLoading.value = false
  }
}

watch(lotteryId, () => {
  fetchedDetail.value = null
  detailLoadFailed.value = false
  void loadDetail()
})
void loadDetail()

// 详情页互动状态（bizType=lottery）：走单资源接口并累计浏览，供卡片回显浏览数/点赞/收藏等
const status = ref<InteractionStatusItem | null>(null)

async function loadInteractionStatus() {
  if (!lotteryId.value) return
  try {
    status.value = await fetchInteractionStatusOne(InteractionBizTypeEnum.LOTTERY, lotteryId.value)
  } catch {
    // 静默：互动状态加载失败不影响卡片浏览
  }
}

watch(lotteryId, () => {
  status.value = null
  void loadInteractionStatus()
})
void loadInteractionStatus()

/** 卡片内点赞/收藏等变更后，浅合并同步详情页互动状态 */
function handleStatusChange(payload: { bizId: string; status: Partial<InteractionStatusItem> }) {
  status.value = {
    ...(status.value ?? { bizId: payload.bizId, bizType: InteractionBizTypeEnum.LOTTERY }),
    ...payload.status,
  }
}
</script>

<template>
  <FlexContainer class="bg-bg p-4">
    <BiliPageHeader
      :title="t('lottery.cardDetailTitle')"
      :description="t('lottery.cardDetailDesc')"
    />
    <div :key="bodyKey" class="lottery-card-detail__body">
      <div v-if="detailData" class="lottery-card-detail__card mb-6">
        <BiliLotteryCard
          :lottery-data="detailData"
          :status="status ?? undefined"
          @update-status="handleStatusChange"
        />
        <!-- 收藏 / 点赞（2.17.0：抽奖卡片走 be-message 通用互动） -->
        <div v-if="lotteryId" class="lottery-card-detail__interaction mt-3 flex justify-start">
          <ResourceInteractionBar :biz-type="InteractionBizTypeEnum.LOTTERY" :biz-id="lotteryId" count-view />
        </div>
      </div>
      <!-- 详情拉取中 -->
      <el-skeleton
        v-else-if="detailLoading"
        class="lottery-card-detail__loading mb-6"
        :rows="5"
        animated
      />
      <!-- 详情拉取失败：可重试（评论区不受影响，仍可正常浏览） -->
      <BiliError
        v-else-if="detailLoadFailed"
        class="lottery-card-detail__load-failed mb-6 py-16"
        txt="卡片详情加载失败"
        @click-retry="loadDetail"
      />
      <!-- URL 无 id：无法定位资源 -->
      <el-alert
        v-else
        class="lottery-card-detail__empty mb-6"
        :title="t('lottery.missingLotteryId')"
        :description="t('lottery.enterViaCommentBtnShort')"
        type="info"
        :closable="false"
        show-icon
      />

      <section v-if="lotteryId" class="lottery-card-detail__comment">
        <LotteryCommentSection
          :oid="lotteryId"
          :type="LOTTERY_COMMENT_TYPE"
          :up-mid="upMid"
          :focus-rpid="focusRpid"
        />
      </section>
    </div>

    <ScrollButtons></ScrollButtons>
  </FlexContainer>
</template>
