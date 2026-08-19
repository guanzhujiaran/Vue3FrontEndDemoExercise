<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from '@element-plus/icons-vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import { useLotteryDetailStore, LOTTERY_COMMENT_TYPE } from '@/stores/lottery_detail.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const lotteryDetailStore = useLotteryDetailStore()

const lotteryId = computed(() => String(route.query.id ?? ''))
const detailData = computed(() => lotteryDetailStore.detailData)
const upMid = computed(() =>
  detailData.value ? normalizeLotteryData(detailData.value).senderInfo.uid : undefined
)
// 定位直达的评论 rpid（来自通知 / 外链），传给评论区滚动定位
const focusRpid = computed(() => String(route.query.rpid ?? '') || null)

// 卡片详情 + 评论区按 lotteryId 作为 key，保证切换不同卡片时重新渲染并拉取对应评论
const bodyKey = computed(() => lotteryId.value || 'empty')
</script>

<template>
  <FlexContainer class="bg-bg p-4">
    <BiliPageHeader
      :title="t('lottery.cardDetailTitle')"
      :description="t('lottery.cardDetailDesc')"
    />

    <div class="lottery-card-detail__back mb-4">
      <el-button :icon="ArrowLeft" size="default" @click="() => router.back()">{{ t('common.back') }}</el-button>
    </div>

    <div :key="bodyKey" class="lottery-card-detail__body">
      <div v-if="detailData" class="lottery-card-detail__card mb-6">
        <BiliLotteryCard :lottery-data="detailData" />
        <!-- 收藏 / 点赞（2.17.0：抽奖卡片走 be-message 通用互动） -->
        <div v-if="lotteryId" class="lottery-card-detail__interaction mt-3 flex justify-start">
          <ResourceInteractionBar biz-type="lottery" :biz-id="lotteryId" />
        </div>
      </div>
      <el-alert
        v-else
        class="lottery-card-detail__empty mb-6"
        :title="lotteryId ? t('lottery.noCardDetail') : t('lottery.missingLotteryId')"
        :description="lotteryId
          ? t('lottery.enterViaCommentBtn')
          : t('lottery.enterViaCommentBtnShort')"
        type="info"
        :closable="false"
        show-icon
      />

      <section class="lottery-card-detail__comment">
        <LotteryCommentSection
          :oid="lotteryId || '0'"
          :type="LOTTERY_COMMENT_TYPE"
          :up-mid="upMid"
          :focus-rpid="focusRpid"
        />
      </section>
    </div>

    <ScrollButtons></ScrollButtons>
  </FlexContainer>
</template>
