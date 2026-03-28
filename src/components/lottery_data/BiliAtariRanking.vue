<template>
  <BiliBaseRanking
    :page_size="10"
    score_prefix="中奖"
    score_suffix="次"
    :load_func="load_func"
    :ranking_partitions="ranking_partitions"
    v-model:is-error="isError"
    v-model:sync-ts="syncTs"
  >
    <template #DetailDrawer="{ ActivedUserLotteryResult, activedParams }">
      <div class="lottery-result-drawer" v-loading.fullscreen="isLoadingLotteryResult">
        <el-drawer
          v-model="ActivedUserLotteryResult.isOpenDrawer"
          size="81.0%"
          direction="btt"
          style="
            background:
              linear-gradient(180deg, var(--el-color-black), var(--el-color-info) 96.22%);
          "
        >
          <template #header>
            <div class="user-title">
              <UserAvatarBox
                :size="'large'"
                :src="ActivedUserLotteryResult.user_info.face"
                @click="gotoBiliUserSpace(ActivedUserLotteryResult.user_info.uid)"
              ></UserAvatarBox>
              <p>
                {{ ActivedUserLotteryResult.user_info.name }}
              </p>
              <p>UID: {{ ActivedUserLotteryResult.user_info.uid }}</p>
            </div>
          </template>
          <template #default>
            <BiliAtariResultSlot
              :limit="10"
              :rank_type="activedParams['rank_type'] as LotteryRankType"
              :lot_type="activedParams['lot_type'] as LotteryRankLotType"
              :date="activedParams['date'] as LotteryRankDateType"
              :uid="ActivedUserLotteryResult.user_info.uid"
              v-model:is-loading="isLoadingLotteryResult"
            ></BiliAtariResultSlot>
          </template>
        </el-drawer>
      </div>
    </template>
  </BiliBaseRanking>
</template>

<script setup lang="ts">
import lotteryDataStatisticApi from '@/api/lottery_data/bili/lottery_data_statistic_api.ts'
import {
  LotteryRankDateType,
  LotteryRankLotType,
  LotteryRankType,
  type RankingPartition
} from '@/models/api/lottery/lotdata.ts'
import { ref } from 'vue'
import emitter from '@/utils/mitt.ts'
import type { BaseRankItem } from '@/models/compo/ranking/Ranking.ts'
import BiliBaseRanking from '@/components/CommonCompo/Bili-Ranking-Compo/BiliBaseRanking.vue'
import UserAvatarBox from '@/components/CommonCompo/Bili-User-Compo/UserAvatarBox.vue'
import { gotoBiliUserSpace } from '@/utils/PageOpen/BiliJump.ts'
import BiliAtariResultSlot from '@/components/lottery_data/BiliAtariResultSlot.vue'

const isLoadingLotteryResult = ref(false)
const ranking_partitions = ref<RankingPartition[]>([
  {
    partitionName: '抽奖类型', // 分区的中文名称
    partitionValue: 'lot_type', // 分区的值
    params: [
      {
        displayName: '官抽',
        paramValue: LotteryRankLotType.official
      },
      {
        displayName: '充电',
        paramValue: LotteryRankLotType.charge
      },
      {
        displayName: '预约',
        paramValue: LotteryRankLotType.reserve
      },
      {
        displayName: '全部抽奖',
        paramValue: LotteryRankLotType.total
      }
    ], // 对应的参数名称列表
    activeValue: LotteryRankLotType.official
  },
  {
    partitionName: '奖品类别',
    partitionValue: 'rank_type',
    params: [
      {
        paramValue: LotteryRankType.first,
        displayName: '一等奖'
      },
      {
        paramValue: LotteryRankType.second,
        displayName: '二等奖'
      },
      {
        paramValue: LotteryRankType.third,
        displayName: '三等奖'
      },
      {
        paramValue: LotteryRankType.total,
        displayName: '全部等级'
      }
    ],
    activeValue: LotteryRankType.first
  },
  {
    partitionName: '开奖时间',
    partitionValue: 'date',
    params: [
      {
        paramValue: LotteryRankDateType.month,
        displayName: '当月'
      },
      {
        paramValue: LotteryRankDateType.pre_month,
        displayName: '上月'
      },
      {
        paramValue: LotteryRankDateType.year,
        displayName: '今年'
      },
      {
        paramValue: LotteryRankDateType.pre_year,
        displayName: '去年'
      },
      {
        paramValue: LotteryRankDateType.total,
        displayName: '全部时间'
      }
    ],
    activeValue: LotteryRankDateType.month
  }
])
const isError = ref(false)
const syncTs = ref(0)
const load_func = async (
  cur_offset: number,
  page_size: number,
  filter_params: Record<string, string>
): Promise<BaseRankItem[]> => {
  isError.value = false
  try {
    const resp = await lotteryDataStatisticApi.handle_lottery_rank(
      {
        offset: cur_offset,
        limit: page_size
      },
      filter_params['date'] as LotteryRankDateType,
      filter_params['lot_type'] as LotteryRankLotType,
      filter_params['rank_type'] as LotteryRankType
    )

    if (resp.code) {
      emitter.emit('toast', {
        t: resp.msg,
        e: 'error'
      })
      isError.value = true
      return []
    }

    syncTs.value = resp?.data?.sync_ts ?? 0
    return resp.data.winners.map((el) => {
      return {
        score: el.count,
        ...el
      }
    })
  } catch (err) {
    isError.value = true
    return []
  }
}
</script>

<style scoped>
.user-title {
  flex-direction: column;
  display: flex;
  align-items: center;
}

.user-title p {
  color: var(--el-color-white);
  font-size: calc(var(--component-size) * 0.5); /* 可选：根据需求调整字体大小 */
  line-height: calc(var(--component-line-height) * 1.2); /* 可选：根据需求调整行高 */
}
</style>
