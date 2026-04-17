<script setup lang="ts">
import type { LotteryPrize } from '@/models/api/lottery/lottery_card.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import utils from '@/utils/mixin.ts'
const { prizes } = defineProps<{ prizes: LotteryPrize[] }>()
</script>

<template>
  <div class="lottery__section prize">
    <div class="title">
      <slot name="title"> 奖品 </slot>
    </div>
    <div class="prizes">
      <div class="prizes__list">
        <div class="prize" v-for="(prize, index) in prizes">
          <el-image
            class="prize__picture"
            :src="prize.img || BiliImg.ranking.prize_default"
            referrerpolicy="no-referrer"
            :preview-src-list="prize.img ? [prize.img] : [BiliImg.ranking.prize_default]"
            fit="cover"
            :preview-teleported="true"
            :hide-on-click-modal="true"
          ></el-image>
          <div class="prize__level">{{ utils.arabicToChinese(index + 1) }}等奖</div>
          <div class="prize__desc">
            {{ prize.description}}
            <span>* {{ prize.count }} 份</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>



