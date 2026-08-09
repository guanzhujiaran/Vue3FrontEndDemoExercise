<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'
import { useLotteryDetailStore, LOTTERY_COMMENT_TYPE } from '@/stores/lottery_detail.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'

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
      title="抽奖卡片详情"
      description="查看抽奖卡片详情，并在底部参与评论区讨论"
    />

    <div class="lottery-card-detail__back mb-4">
      <el-button :icon="ArrowLeft" size="default" @click="() => router.back()">返回</el-button>
    </div>

    <div :key="bodyKey" class="lottery-card-detail__body">
      <div v-if="detailData" class="lottery-card-detail__card mb-6">
        <BiliLotteryCard :lottery-data="detailData" />
      </div>
      <el-alert
        v-else
        class="lottery-card-detail__empty mb-6"
        :title="lotteryId ? '未获取到卡片详情' : '缺少抽奖 ID'"
        :description="lotteryId
          ? '请通过抽奖列表中的「评论区」按钮进入本页面以查看完整卡片，评论区仍可正常浏览。'
          : '请通过抽奖列表中的「评论区」按钮进入本页面。'"
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
